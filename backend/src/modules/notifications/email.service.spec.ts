import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';

jest.mock('nodemailer');
const mockedNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

describe('EmailService', () => {
  let service: EmailService;
  let sendMailMock: jest.Mock;
  let configService: any;

  const mockConfig: Record<string, string> = {
    EMAIL_SERVICE: 'gmail',
    EMAIL_USER: 'test@chioma.app',
    EMAIL_PASSWORD: 'test-password',
    EMAIL_FROM: '"Chioma App" <noreply@chioma.app>',
    FRONTEND_URL: 'https://app.chioma.io',
    PASSWORD_RESET_URL: 'https://app.chioma.io/reset-password',
  };

  beforeEach(async () => {
    sendMailMock = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });

    mockedNodemailer.createTransport.mockReturnValue({
      sendMail: sendMailMock,
    } as any);

    configService = {
      get: jest.fn((key: string) => mockConfig[key] ?? null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── sendVerificationEmail ──────────────────────────────────────────────────

  describe('sendVerificationEmail', () => {
    it('sends email to the correct address', async () => {
      await service.sendVerificationEmail('user@example.com', 'verify-token-123');
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'user@example.com' }),
      );
    });

    it('includes the verification token in the email body', async () => {
      await service.sendVerificationEmail('user@example.com', 'abc-token');
      const mailOptions = sendMailMock.mock.calls[0][0];
      expect(mailOptions.html).toContain('abc-token');
    });

    it('includes a verification URL pointing to the frontend', async () => {
      await service.sendVerificationEmail('user@example.com', 'tok123');
      const mailOptions = sendMailMock.mock.calls[0][0];
      expect(mailOptions.html).toContain('https://app.chioma.io/verify-email?token=tok123');
    });

    it('uses configured FROM address', async () => {
      await service.sendVerificationEmail('user@example.com', 'tok');
      const mailOptions = sendMailMock.mock.calls[0][0];
      expect(mailOptions.from).toBe('"Chioma App" <noreply@chioma.app>');
    });

    it('throws when transporter fails', async () => {
      sendMailMock.mockRejectedValue(new Error('SMTP connection failed'));
      await expect(
        service.sendVerificationEmail('user@example.com', 'tok'),
      ).rejects.toThrow('Failed to send verification email');
    });

    it('retries on transient failure (retry decorator wired)', async () => {
      sendMailMock
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce({ messageId: 'ok' });

      await expect(
        service.sendVerificationEmail('user@example.com', 'tok'),
      ).resolves.toBeUndefined();
    });
  });

  // ── sendPasswordResetEmail ─────────────────────────────────────────────────

  describe('sendPasswordResetEmail', () => {
    it('sends to the correct address', async () => {
      await service.sendPasswordResetEmail('reset@example.com', 'reset-token');
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'reset@example.com' }),
      );
    });

    it('includes the reset token in the email body', async () => {
      await service.sendPasswordResetEmail('reset@example.com', 'my-reset-token');
      const mailOptions = sendMailMock.mock.calls[0][0];
      expect(mailOptions.html).toContain('my-reset-token');
    });

    it('builds reset URL from PASSWORD_RESET_URL config', async () => {
      await service.sendPasswordResetEmail('reset@example.com', 'tok');
      const mailOptions = sendMailMock.mock.calls[0][0];
      expect(mailOptions.html).toContain('https://app.chioma.io/reset-password?token=tok');
    });

    it('falls back to FRONTEND_URL when PASSWORD_RESET_URL is not set', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'PASSWORD_RESET_URL') return null;
        return mockConfig[key] ?? null;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();
      const svc = module.get<EmailService>(EmailService);

      await svc.sendPasswordResetEmail('reset@example.com', 'tok');
      const mailOptions = sendMailMock.mock.calls[0][0];
      expect(mailOptions.html).toContain('https://app.chioma.io/reset-password?token=tok');
    });

    it('throws when transporter fails', async () => {
      sendMailMock.mockRejectedValue(new Error('Auth error'));
      await expect(
        service.sendPasswordResetEmail('reset@example.com', 'tok'),
      ).rejects.toThrow('Failed to send password reset email');
    });

    it('includes expiry warning in the body', async () => {
      await service.sendPasswordResetEmail('reset@example.com', 'tok');
      const mailOptions = sendMailMock.mock.calls[0][0];
      expect(mailOptions.html).toContain('1 hour');
    });
  });

  // ── sendNotificationEmail ──────────────────────────────────────────────────

  describe('sendNotificationEmail', () => {
    it('sends with the provided subject', async () => {
      await service.sendNotificationEmail(
        'notify@example.com',
        'Your booking is confirmed',
        'booking',
        { title: 'Booking Confirmed', message: 'Your property is booked.' },
      );
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Your booking is confirmed' }),
      );
    });

    it('renders title and message in the HTML body', async () => {
      await service.sendNotificationEmail('n@example.com', 'Test', 'tmpl', {
        title: 'Hello',
        message: 'World',
      });
      const mailOptions = sendMailMock.mock.calls[0][0];
      expect(mailOptions.html).toContain('Hello');
      expect(mailOptions.html).toContain('World');
    });

    it('renders list items when data.items is provided', async () => {
      await service.sendNotificationEmail('n@example.com', 'Items', 'tmpl', {
        title: 'List',
        message: '',
        items: ['Item 1', 'Item 2'],
      });
      const mailOptions = sendMailMock.mock.calls[0][0];
      expect(mailOptions.html).toContain('<li>Item 1</li>');
      expect(mailOptions.html).toContain('<li>Item 2</li>');
    });

    it('renders action link when data.actionUrl is provided', async () => {
      await service.sendNotificationEmail('n@example.com', 'Action', 'tmpl', {
        title: 'Click',
        message: '',
        actionUrl: 'https://app.chioma.io/action',
        actionText: 'View Now',
      });
      const mailOptions = sendMailMock.mock.calls[0][0];
      expect(mailOptions.html).toContain('https://app.chioma.io/action');
      expect(mailOptions.html).toContain('View Now');
    });

    it('throws when transporter fails', async () => {
      sendMailMock.mockRejectedValue(new Error('send failed'));
      await expect(
        service.sendNotificationEmail('n@example.com', 'S', 'tmpl', {}),
      ).rejects.toThrow('Failed to send notification email');
    });
  });

  // ── sendAlertEmail ─────────────────────────────────────────────────────────

  describe('sendAlertEmail', () => {
    it('sends alert to the given address with correct subject', async () => {
      await service.sendAlertEmail('admin@chioma.app', 'High CPU Alert', {
        message: 'CPU usage exceeded 90%',
      });
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@chioma.app',
          subject: 'High CPU Alert',
        }),
      );
    });

    it('includes the alert message in the body', async () => {
      await service.sendAlertEmail('admin@chioma.app', 'Alert', {
        message: 'Something went wrong',
      });
      const mailOptions = sendMailMock.mock.calls[0][0];
      expect(mailOptions.html).toContain('Something went wrong');
    });

    it('includes serialised details when provided', async () => {
      await service.sendAlertEmail('admin@chioma.app', 'Alert', {
        message: 'Error',
        details: { code: 500, path: '/api/health' },
      });
      const mailOptions = sendMailMock.mock.calls[0][0];
      expect(mailOptions.html).toContain('"code": 500');
    });

    it('omits details block when details is absent', async () => {
      await service.sendAlertEmail('admin@chioma.app', 'Alert', { message: 'msg' });
      const mailOptions = sendMailMock.mock.calls[0][0];
      expect(mailOptions.html).not.toContain('<pre>');
    });

    it('uses default message when data.message is absent', async () => {
      await service.sendAlertEmail('admin@chioma.app', 'Alert', {});
      const mailOptions = sendMailMock.mock.calls[0][0];
      expect(mailOptions.html).toContain('An alert has been triggered');
    });

    it('throws when transporter fails', async () => {
      sendMailMock.mockRejectedValue(new Error('relay error'));
      await expect(
        service.sendAlertEmail('admin@chioma.app', 'Alert', { message: 'x' }),
      ).rejects.toThrow('Failed to send alert email');
    });
  });

  // ── transporter initialisation ─────────────────────────────────────────────

  describe('transporter setup', () => {
    it('creates transporter with config values at construction', () => {
      expect(mockedNodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'gmail',
          auth: expect.objectContaining({
            user: 'test@chioma.app',
            pass: 'test-password',
          }),
        }),
      );
    });
  });
});
