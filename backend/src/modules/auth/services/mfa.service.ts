import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from '../../users/entities/user.entity';
import {
  MfaDevice,
  MfaDeviceType,
  MfaDeviceStatus,
} from '../entities/mfa-device.entity';
import {
  AuthSuccessResponseDto,
  MfaRequiredResponseDto,
} from '../dto/auth-response.dto';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(MfaDevice)
    private mfaDeviceRepository: Repository<MfaDevice>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {
    const key = this.configService.get<string>('SECURITY_ENCRYPTION_KEY');
    if (!key) {
      throw new Error('SECURITY_ENCRYPTION_KEY is required');
    }
    this.encryptionKey = key;
  }

  /**
   * Generate TOTP secret and QR code for a user
   */
  async generateMfaSecret(
    userId: string,
    deviceName?: string,
  ): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if user already has an active MFA device
    const existingDevice = await this.mfaDeviceRepository.findOne({
      where: {
        userId,
        type: MfaDeviceType.TOTP,
        status: MfaDeviceStatus.ACTIVE,
      },
    });

    if (existingDevice) {
      throw new BadRequestException('MFA is already enabled for this user');
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `Chioma (${user.email})`,
      length: 32,
    });

    // Encrypt the secret before storing
    const encryptedSecret = this.encryptSecret(secret.base32);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10)),
    );

    // Create MFA device
    const mfaDevice = this.mfaDeviceRepository.create({
      userId,
      type: MfaDeviceType.TOTP,
      status: MfaDeviceStatus.ACTIVE,
      deviceName: deviceName || 'Authenticator App',
      secretKey: encryptedSecret,
      backupCodes: JSON.stringify(hashedBackupCodes),
    });

    await this.mfaDeviceRepository.save(mfaDevice);

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || '');

    this.logger.log(`MFA secret generated for user: ${userId}`);

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verify TOTP token by user ID
   */
  async verifyTotpToken(userId: string, token: string): Promise<boolean> {
    const device = await this.mfaDeviceRepository.findOne({
      where: {
        userId,
        type: MfaDeviceType.TOTP,
        status: MfaDeviceStatus.ACTIVE,
      },
    });

    if (!device || !device.secretKey) {
      throw new UnauthorizedException('MFA not enabled for this user');
    }

    // Decrypt the secret
    const secret = this.decryptSecret(device.secretKey);

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps (60 seconds) of tolerance
    });

    if (verified) {
      device.lastUsedAt = new Date();
      await this.mfaDeviceRepository.save(device);
      this.logger.log(`MFA token verified for user: ${userId}`);
    }

    return verified;
  }

  /**
   * Verify TOTP token by MFA token (extracts userId from token)
   */
  verifyTotpTokenByMfaToken(
    _mfaToken: string,
    _token: string,
  ): Promise<{ userId: string; isValid: boolean }> {
    void _mfaToken;
    void _token;
    // This will be called from controller with decoded token
    return Promise.reject(new Error('Use verifyTotpToken with userId instead'));
  }

  /**
   * Verify backup code by user ID
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const device = await this.mfaDeviceRepository.findOne({
      where: {
        userId,
        type: MfaDeviceType.TOTP,
        status: MfaDeviceStatus.ACTIVE,
      },
    });

    if (!device || !device.backupCodes) {
      throw new UnauthorizedException('MFA not enabled for this user');
    }

    const hashedCodes: string[] = JSON.parse(device.backupCodes) as string[];

    // Check if code matches any backup code
    for (let i = 0; i < hashedCodes.length; i++) {
      const isValid = await bcrypt.compare(code, hashedCodes[i]);
      if (isValid) {
        // Remove used backup code
        hashedCodes.splice(i, 1);
        device.backupCodes =
          hashedCodes.length > 0 ? JSON.stringify(hashedCodes) : null;
        await this.mfaDeviceRepository.save(device);
        this.logger.log(`Backup code used for user: ${userId}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user has MFA enabled
   */
  async isMfaEnabled(userId: string): Promise<boolean> {
    const device = await this.mfaDeviceRepository.findOne({
      where: {
        userId,
        type: MfaDeviceType.TOTP,
        status: MfaDeviceStatus.ACTIVE,
      },
    });
    return !!device;
  }

  /**
   * Disable MFA for a user
   */
  async disableMfa(userId: string): Promise<void> {
    const devices = await this.mfaDeviceRepository.find({
      where: {
        userId,
        status: MfaDeviceStatus.ACTIVE,
      },
    });

    for (const device of devices) {
      device.status = MfaDeviceStatus.DISABLED;
      await this.mfaDeviceRepository.save(device);
    }

    this.logger.log(`MFA disabled for user: ${userId}`);
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const device = await this.mfaDeviceRepository.findOne({
      where: {
        userId,
        type: MfaDeviceType.TOTP,
        status: MfaDeviceStatus.ACTIVE,
      },
    });

    if (!device) {
      throw new BadRequestException('MFA not enabled for this user');
    }

    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10)),
    );

    device.backupCodes = JSON.stringify(hashedBackupCodes);
    await this.mfaDeviceRepository.save(device);

    this.logger.log(`Backup codes regenerated for user: ${userId}`);

    return backupCodes;
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Encrypt secret key
   */
  private encryptSecret(secret: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(this.encryptionKey).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt secret key
   */
  private decryptSecret(encryptedSecret: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(this.encryptionKey).digest();
    const parts = encryptedSecret.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Verify MFA token during login flow
   *
   * @param mfaToken
   * @param authService
   * @returns
   */
  async verifyMfaToken(
    mfaToken: string,
    authService: AuthService,
  ): Promise<AuthSuccessResponseDto> {
    try {
      // Verify temporary MFA token
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        role: string;
        type: string;
      }>(mfaToken, {
        secret: authService.getJwtSecret(),
      });

      if (payload.type !== 'mfa_required') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate final tokens
      const { accessToken, refreshToken } = authService.generateTokens(
        user.id,
        user.email,
        user.role,
      );

      await authService.updateRefreshToken(user.id, refreshToken);

      this.logger.log(`MFA login completed for user: ${user.id}`);

      return {
        user: authService.sanitizeUser(user),
        accessToken,
        refreshToken,
        mfaRequired: false,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Invalid or expired MFA token';
      this.logger.error(`MFA login failed: ${message}`);
      throw new UnauthorizedException('Invalid or expired MFA token');
    }
  }
  async generateMfaToken(
    user: User,
    authService: AuthService,
  ): Promise<MfaRequiredResponseDto> {
    // Generate temporary token for MFA verification
    const tempToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: 'mfa_required',
      },
      {
        secret: authService.getJwtSecret(),
        expiresIn: '5m', // Short-lived token for MFA verification
      },
    );

    this.logger.log(`MFA required for user: ${user.id}`);
    const mfaResponse: MfaRequiredResponseDto = {
      user: authService.sanitizeUser(user),
      mfaRequired: true,
      mfaToken: tempToken,
    };

    return mfaResponse;
  }

  async checkMfaRequired(userId: string) {
    // Check if MFA is enabled
    return await this.mfaDeviceRepository.findOne({
      where: {
        userId,
        type: MfaDeviceType.TOTP,
        status: MfaDeviceStatus.ACTIVE,
      },
    });
  }
}
