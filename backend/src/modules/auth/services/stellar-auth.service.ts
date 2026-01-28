import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { 
  TransactionBuilder,
  Networks,
  Keypair,
  Memo,
  Operation,
} from '@stellar/stellar-sdk';
import { User, AuthMethod } from '../../users/entities/user.entity';
import { StellarAuthChallengeDto, StellarAuthVerifyDto } from '../dto/stellar-auth.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';

const CHALLENGE_EXPIRY_MINUTES = 5;
const CHALLENGE_NONCE_LENGTH = 32;
const SALT_ROUNDS = 12;

interface StoredChallenge {
  walletAddress: string;
  challenge: string;
  expiresAt: Date;
  nonce: string;
}

@Injectable()
export class StellarAuthService {
  private readonly logger = new Logger(StellarAuthService.name);
  private readonly challenges = new Map<string, StoredChallenge>();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async generateChallenge(walletAddress: string): Promise<{ challenge: string; expiresAt: string }> {
    if (!this.verifyStellarAddress(walletAddress)) {
      throw new BadRequestException('Invalid Stellar address format');
    }

    // Clean up expired challenges
    this.cleanupExpiredChallenges();

    // Check for existing challenge for this wallet
    const existingChallenge = Array.from(this.challenges.values())
      .find(challenge => challenge.walletAddress === walletAddress);
    
    if (existingChallenge) {
      this.logger.warn(`Challenge already exists for wallet: ${walletAddress}`);
      throw new BadRequestException('Challenge already requested. Please wait for the current challenge to expire.');
    }

    const nonce = crypto.randomBytes(CHALLENGE_NONCE_LENGTH).toString('hex');
    const serverKeypair = this.getServerKeypair();
    
    // Create challenge transaction according to SEP-0010
    const account = await this.getServerAccount();
    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: this.getNetworkPassphrase(),
    })
      .addOperation(Operation.manageData({
        name: `${walletAddress}_auth`,
        value: nonce,
        source: walletAddress,
      }))
      .addMemo(Memo.text('Auth Challenge'))
      .setTimeout(300) // 5 minutes timeout
      .build();

    transaction.sign(serverKeypair);
    const challengeXdr = transaction.toXDR();

    const expiresAt = new Date(Date.now() + CHALLENGE_EXPIRY_MINUTES * 60 * 1000);
    
    // Store challenge
    const challengeId = crypto.createHash('sha256').update(challengeXdr).digest('hex');
    this.challenges.set(challengeId, {
      walletAddress,
      challenge: challengeXdr,
      expiresAt,
      nonce,
    });

    this.logger.log(`Challenge generated for wallet: ${walletAddress}`);

    return {
      challenge: challengeXdr,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async verifySignature(verifyDto: StellarAuthVerifyDto): Promise<AuthResponseDto> {
    const { walletAddress, signature, challenge } = verifyDto;

    if (!this.verifyStellarAddress(walletAddress)) {
      throw new BadRequestException('Invalid Stellar address format');
    }

    // Find stored challenge
    const challengeId = crypto.createHash('sha256').update(challenge).digest('hex');
    const storedChallenge = this.challenges.get(challengeId);

    if (!storedChallenge) {
      this.logger.warn(`Challenge not found for wallet: ${walletAddress}`);
      throw new UnauthorizedException('Invalid or expired challenge');
    }

    if (storedChallenge.expiresAt < new Date()) {
      this.challenges.delete(challengeId);
      this.logger.warn(`Challenge expired for wallet: ${walletAddress}`);
      throw new UnauthorizedException('Challenge has expired');
    }

    if (storedChallenge.walletAddress !== walletAddress) {
      this.logger.warn(`Wallet address mismatch for challenge: ${walletAddress}`);
      throw new UnauthorizedException('Wallet address does not match challenge');
    }

    // Verify the signature
    const isValidSignature = await this.verifyChallengeSignature(
      challenge,
      signature,
      walletAddress,
    );

    if (!isValidSignature) {
      this.logger.warn(`Invalid signature for wallet: ${walletAddress}`);
      throw new UnauthorizedException('Invalid signature');
    }

    // Clean up the challenge
    this.challenges.delete(challengeId);

    // Find or create user
    let user = await this.userRepository.findOne({
      where: { walletAddress },
    });

    if (!user) {
      // Create new user with Stellar auth
      user = this.userRepository.create({
        walletAddress,
        authMethod: AuthMethod.STELLAR,
        emailVerified: true, // Wallet-based auth is considered verified
        failedLoginAttempts: 0,
        isActive: true,
      });
      this.logger.log(`New user created with wallet: ${walletAddress}`);
    } else {
      // Update existing user
      user.authMethod = AuthMethod.STELLAR;
      user.lastLoginAt = new Date();
      user.failedLoginAttempts = 0;
      user.accountLockedUntil = null;
    }

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`Stellar auth successful for user: ${savedUser.id}`);

    // Generate JWT tokens
    const { accessToken, refreshToken } = this.generateTokens(
      savedUser.id,
      savedUser.email || savedUser.walletAddress || '',
      savedUser.role,
    );

    await this.updateRefreshToken(savedUser.id, refreshToken);

    return {
      user: this.sanitizeUser(savedUser),
      accessToken,
      refreshToken,
    };
  }

  verifyStellarAddress(address: string): boolean {
    if (!address) return false;
    
    // Stellar addresses start with 'G' and are 56 characters long
    // They contain only base32 characters (A-Z and 2-7)
    const stellarAddressRegex = /^G[A-Z2-7]{55}$/;
    return stellarAddressRegex.test(address);
  }

  private cleanupExpiredChallenges(): void {
    const now = new Date();
    for (const [key, challenge] of this.challenges.entries()) {
      if (challenge.expiresAt < now) {
        this.challenges.delete(key);
      }
    }
  }

  private getServerKeypair(): Keypair {
    const secretKey = this.configService.get<string>('STELLAR_SERVER_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STELLAR_SERVER_SECRET_KEY environment variable is not set');
    }
    return Keypair.fromSecret(secretKey);
  }

  private async getServerAccount() {
    const serverKeypair = this.getServerKeypair();
    const serverPublicKey = serverKeypair.publicKey();
    
    // Create a proper Account object for the Stellar SDK
    return {
      accountId: () => serverPublicKey,
      sequenceNumber: () => '1',
      incrementSequenceNumber: () => {},
    };
  }

  private getNetworkPassphrase(): string {
    const network = this.configService.get<string>('STELLAR_NETWORK', 'testnet');
    return network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
  }

  private async verifyChallengeSignature(
    challengeXdr: string,
    signature: string,
    walletAddress: string,
  ): Promise<boolean> {
    try {
      const transaction = TransactionBuilder.fromXDR(challengeXdr, this.getNetworkPassphrase());
      
      // Verify the signature using the correct Stellar SDK API
      const keypair = Keypair.fromPublicKey(walletAddress);
      
      // Check if the transaction is signed by the expected keypair
      const signatures = transaction.signatures;
      return signatures.some(sig => {
        try {
          return keypair.verify(transaction.hash(), sig.signature());
        } catch {
          return false;
        }
      });
    } catch (error) {
      this.logger.error(`Signature verification failed: ${error.message}`);
      return false;
    }
  }

  private generateTokens(
    userId: string,
    email: string,
    role: string,
  ): { accessToken: string; refreshToken: string } {
    const accessToken = this.jwtService.sign(
      {
        sub: userId,
        email,
        role,
        type: 'access',
      },
      {
        secret:
          this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
        expiresIn: '15m',
      },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: userId,
        email,
        role,
        type: 'refresh',
      },
      {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'your-refresh-secret-key',
        expiresIn: '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    await this.userRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  private sanitizeUser(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {
      password,
      refreshToken,
      resetToken,
      verificationToken,
      ...sanitized
    } = user;
    return sanitized;
  }
}
