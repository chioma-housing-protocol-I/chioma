import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Retry } from '../../common/decorators/retry.decorator';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
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
  ): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM'),
      to: email,
      subject,
      html: this.renderTemplate(template, data),
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

  private renderTemplate(template: string, data: Record<string, any>): string {
    // Simple template rendering - can be extended with more sophisticated templating
    let html = `<h1>${data.title || 'Notification'}</h1>`;
    html += `<p>${data.message || ''}</p>`;

    if (data.items && Array.isArray(data.items)) {
      html += '<ul>';
      for (const item of data.items) {
        html += `<li>${item}</li>`;
      }
      html += '</ul>';
    }

    if (data.actionUrl) {
      html += `<a href="${data.actionUrl}">${data.actionText || 'View Details'}</a>`;
    }

    return html;
  }
}
