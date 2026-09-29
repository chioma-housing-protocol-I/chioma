import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Retry } from '../../common/decorators/retry.decorator';
import { I18nService } from '../i18n/i18n.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  private readonly passwordResetEmailLimit: number;
  private readonly passwordResetEmailWindowSeconds: number;

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly i18nService: I18nService,
  ) {
    const service = this.configService.get<string>('EMAIL_SERVICE');
    const user = this.configService.get<string>('EMAIL_USER');
    const pass = this.configService.get<string>('EMAIL_PASSWORD');

    this.transporter = nodemailer.createTransport({
      service,
      auth: {
        user,
        pass,
      },
    });

    this.passwordResetEmailLimit = this.parsePositiveInt(
      this.configService.get<string>('PASSWORD_RESET_EMAIL_LIMIT'),
      3,
    );
    this.passwordResetEmailWindowSeconds = this.parsePositiveInt(
      this.configService.get<string>('PASSWORD_RESET_EMAIL_WINDOW_SECONDS'),
      3600,
    );

    this.logger.log(`Email service configured with ${service}`);
  }

  @Retry({
    maxAttempts: 3,
    delay: 1000,
    backoff: 'exponential',
    backoffMultiplier: 2,
  })
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM'),
      to: email,
      subject: 'Verify your Chioma App Email',
      html: `
        <h1>Email Verification</h1>
        <p>Thank you for registering. Please verify your email by clicking the link below:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${email}`,
        error instanceof Error ? error.stack : 'Unknown error',
      );
      throw new Error('Failed to send verification email');
    }
  }

  @Retry({
    maxAttempts: 3,
    delay: 1000,
    backoff: 'exponential',
    backoffMultiplier: 2,
  })
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const limited = await this.isRateLimited(
      `password-reset:${normalizedEmail}`,
      this.passwordResetEmailLimit,
      this.passwordResetEmailWindowSeconds,
    );

    if (limited) {
      this.logger.warn(
        `Password reset email suppressed: rate limit exceeded for ${normalizedEmail}`,
      );
      return;
    }

    const resetUrl =
      this.configService.get<string>('PASSWORD_RESET_URL') ||
      `${this.configService.get<string>('FRONTEND_URL')}/reset-password`;
    const finalUrl = `${resetUrl}?token=${token}`;

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM'),
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset</h1>
        <p>You requested a password reset. Please click the link below to set a new password:</p>
        <a href="${finalUrl}">${finalUrl}</a>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error instanceof Error ? error.stack : 'Unknown error',
      );
      throw new Error('Failed to send password reset email');
    }
  }

  @Retry({
    maxAttempts: 3,
    delay: 1000,
    backoff: 'exponential',
    backoffMultiplier: 2,
  })
  async sendNotificationEmail(
    email: string,
    subject: string,
    template: string,
    data: Record<string, any>,
    language?: string,
  ): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM'),
      to: email,
      subject,
      html: this.renderTemplate(template, data, language),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Notification email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send notification email to ${email}`,
        error instanceof Error ? error.stack : 'Unknown error',
      );
      throw new Error('Failed to send notification email');
    }
  }

  @Retry({
    maxAttempts: 3,
    delay: 1000,
    backoff: 'exponential',
    backoffMultiplier: 2,
  })
  async sendAlertEmail(
    email: string,
    subject: string,
    data: Record<string, any>,
  ): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM'),
      to: email,
      subject,
      html: `
        <h1>${subject}</h1>
        <p>${data.message || 'An alert has been triggered'}</p>
        ${data.details ? `<pre>${JSON.stringify(data.details, null, 2)}</pre>` : ''}
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Alert email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send alert email to ${email}`,
        error instanceof Error ? error.stack : 'Unknown error',
      );
      throw new Error('Failed to send alert email');
    }
  }

  private renderTemplate(
    template: string,
    data: Record<string, any>,
    language?: string,
  ): string {
    // Simple template rendering - can be extended with more sophisticated
    // templating. The recipient's language localizes the chrome (default
    // title and call-to-action) so emails honour a stored preference even
    // when the caller only supplies English content.
    const lang = this.i18nService.resolveLanguage(language);
    const title =
      data.title || this.i18nService.t('notifications.emailTitle', lang);
    const actionText =
      data.actionText || this.i18nService.t('notifications.viewDetails', lang);

    let html = `<h1>${title}</h1>`;
    html += `<p>${data.message || ''}</p>`;

    if (data.items && Array.isArray(data.items)) {
      html += '<ul>';
      for (const item of data.items) {
        html += `<li>${item}</li>`;
      }
      html += '</ul>';
    }

    if (data.actionUrl) {
      html += `<a href="${data.actionUrl}">${actionText}</a>`;
    }

    return html;
  }

  /**
   * Fixed-window counter, keyed independently of the caller's IP so it
   * can't be bypassed by rotating source addresses. Blocked attempts don't
   * refresh the TTL, so the window always expires `windowSeconds` after the
   * last *allowed* send - sustained spam can't extend the lockout forever.
   */
  private async isRateLimited(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<boolean> {
    const cacheKey = `email_rate_limit:${key}`;

    try {
      const current = await this.cacheManager.get<number>(cacheKey);
      const count = (typeof current === 'number' ? current : 0) + 1;

      if (count > limit) {
        return true;
      }

      await this.cacheManager.set(cacheKey, count, windowSeconds * 1000);
      return false;
    } catch (error) {
      this.logger.error(
        `Email rate limit check failed for key "${key}", allowing send`,
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  private parsePositiveInt(
    value: string | undefined,
    fallback: number,
  ): number {
    if (!value) {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
