import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '../../users/entities/user.entity';
import { MFA_SETTINGS } from '../../../common/constants/security.constants';

/**
 * TOTP (Time-based One-Time Password) implementation
 * RFC 6238 compliant
 */
@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly TOTP_DIGITS = 6;
  private readonly TOTP_PERIOD = 30; // seconds

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Generate a new MFA secret for a user
   */
  async generateSecret(userId: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate a random 20-byte secret (base32 encoded)
    const secret = this.generateBase32Secret(20);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(
      MFA_SETTINGS.BACKUP_CODES_COUNT,
    );

    // Create otpauth URL for QR code
    const qrCodeUrl = this.generateOtpAuthUrl(user.email, secret);

    // Store encrypted secret and backup codes (not enabled yet)
    await this.userRepository.update(userId, {
      mfaSecret: this.encryptSecret(secret),
      mfaBackupCodes: this.hashBackupCodes(backupCodes),
      mfaEnabled: false, // Will be enabled after verification
    });

    this.logger.log(`MFA secret generated for user: ${userId}`);

    return {
      secret,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verify TOTP code and enable MFA
   */
  async enableMfa(userId: string, code: string): Promise<{ enabled: boolean }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.mfaSecret) {
      throw new BadRequestException('MFA not set up for this user');
    }

    const secret = this.decryptSecret(user.mfaSecret);
    const isValid = this.verifyTotp(secret, code);

    if (!isValid) {
      this.logger.warn(`Invalid MFA code during enable for user: ${userId}`);
      throw new BadRequestException('Invalid verification code');
    }

    await this.userRepository.update(userId, { mfaEnabled: true });
    this.logger.log(`MFA enabled for user: ${userId}`);

    return { enabled: true };
  }

  /**
   * Disable MFA for a user
   */
  async disableMfa(
    userId: string,
    code: string,
  ): Promise<{ disabled: boolean }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled for this user');
    }

    const secret = this.decryptSecret(user.mfaSecret!);
    const isValid = this.verifyTotp(secret, code);

    if (!isValid) {
      this.logger.warn(`Invalid MFA code during disable for user: ${userId}`);
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.userRepository.update(userId, {
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: null,
    });

    this.logger.log(`MFA disabled for user: ${userId}`);

    return { disabled: true };
  }

  /**
   * Verify TOTP code during login
   */
  async verifyMfaCode(userId: string, code: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return true; // MFA not enabled, skip verification
    }

    // Validate code format (must be alphanumeric, 6-8 chars)
    if (!/^[A-Za-z0-9]{6,8}$/.test(code)) {
      this.logger.warn(`Invalid MFA code format for user: ${userId}`);
      return false;
    }

    const secret = this.decryptSecret(user.mfaSecret);

    // Always try TOTP verification first
    const isTotpValid = this.verifyTotp(secret, code);
    if (isTotpValid) {
      return true;
    }

    // If TOTP fails and backup codes exist, try backup code verification
    if (user.mfaBackupCodes) {
      const isBackupValid = await this.verifyBackupCode(user, code);
      if (isBackupValid) {
        return true;
      }
    }

    this.logger.warn(`Invalid MFA code for user: ${userId}`);
    return false;
  }

  /**
   * Check if user has MFA enabled
   */
  async isMfaEnabled(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['mfaEnabled'],
    });

    return user?.mfaEnabled ?? false;
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(
    userId: string,
    code: string,
  ): Promise<{ backupCodes: string[] }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled for this user');
    }

    const secret = this.decryptSecret(user.mfaSecret);
    const isValid = this.verifyTotp(secret, code);

    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    const backupCodes = this.generateBackupCodes(
      MFA_SETTINGS.BACKUP_CODES_COUNT,
    );

    await this.userRepository.update(userId, {
      mfaBackupCodes: this.hashBackupCodes(backupCodes),
    });

    this.logger.log(`Backup codes regenerated for user: ${userId}`);

    return { backupCodes };
  }

  // Private helper methods

  private generateBase32Secret(length: number): string {
    const bytes = crypto.randomBytes(length);
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';

    for (let i = 0; i < bytes.length; i++) {
      result += base32Chars[bytes[i] % 32];
    }

    return result;
  }

  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }

    return codes;
  }

  private hashBackupCodes(codes: string[]): string {
    return codes
      .map((code) => crypto.createHash('sha256').update(code).digest('hex'))
      .join(',');
  }

  private async verifyBackupCode(user: User, code: string): Promise<boolean> {
    if (!user.mfaBackupCodes) return false;

    const hashedCodes = user.mfaBackupCodes.split(',');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const codeIndex = hashedCodes.indexOf(codeHash);

    if (codeIndex === -1) return false;

    // Remove used backup code
    hashedCodes.splice(codeIndex, 1);
    await this.userRepository.update(user.id, {
      mfaBackupCodes: hashedCodes.join(','),
    });

    this.logger.log(`Backup code used for user: ${user.id}`);

    return true;
  }

  private generateOtpAuthUrl(email: string, secret: string): string {
    const issuer = encodeURIComponent(MFA_SETTINGS.ISSUER);
    const account = encodeURIComponent(email);
    return `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${this.TOTP_DIGITS}&period=${this.TOTP_PERIOD}`;
  }

  private encryptSecret(secret: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  private decryptSecret(encryptedSecret: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedSecret.split(':');

    const key = this.getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private getEncryptionKey(): Buffer {
    const secret =
      process.env.MFA_ENCRYPTION_KEY ||
      process.env.JWT_SECRET ||
      'default-key-change-me';

    // Derive a 32-byte key using PBKDF2
    return crypto.pbkdf2Sync(secret, 'mfa-salt', 100000, 32, 'sha256');
  }

  private verifyTotp(secret: string, code: string): boolean {
    // Check current and adjacent time windows (for clock drift)
    const window = MFA_SETTINGS.TOTP_WINDOW;

    for (let i = -window; i <= window; i++) {
      const expectedCode = this.generateTotp(secret, i);
      if (this.timingSafeEqual(code, expectedCode)) {
        return true;
      }
    }

    return false;
  }

  private generateTotp(secret: string, offset: number = 0): string {
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / this.TOTP_PERIOD) + offset;

    // Convert counter to 8-byte buffer (big-endian)
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));

    // Decode base32 secret
    const secretBuffer = this.base32Decode(secret);

    // Generate HMAC-SHA1
    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(counterBuffer);
    const hash = hmac.digest();

    // Dynamic truncation
    const offset_val = hash[hash.length - 1] & 0x0f;
    const code =
      ((hash[offset_val] & 0x7f) << 24) |
      ((hash[offset_val + 1] & 0xff) << 16) |
      ((hash[offset_val + 2] & 0xff) << 8) |
      (hash[offset_val + 3] & 0xff);

    // Get last 6 digits
    const otp = (code % Math.pow(10, this.TOTP_DIGITS))
      .toString()
      .padStart(this.TOTP_DIGITS, '0');

    return otp;
  }

  private base32Decode(base32: string): Buffer {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';

    for (const char of base32.toUpperCase()) {
      const index = base32Chars.indexOf(char);
      if (index === -1) continue;
      bits += index.toString(2).padStart(5, '0');
    }

    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }

    return Buffer.from(bytes);
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
