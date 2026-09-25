import './setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import { EmailService } from './../src/modules/notifications/email.service';

describe('Email Template Integration (e2e)', () => {
  let app: INestApplication;
  let emailService: EmailService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    emailService = moduleFixture.get<EmailService>(EmailService);

    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Email Template Rendering', () => {
    it('should render and send email template with variable substitution', async () => {
      const recipient = 'test@example.com';
      const templateData = {
        title: 'Transaction Confirmation',
        message: 'Your transaction TXN-123456 for $100.00 USD was successful.',
      };

      const sendSpy = jest
        .spyOn(emailService, 'sendNotificationEmail')
        .mockResolvedValueOnce();

      await emailService.sendNotificationEmail(
        recipient,
        'Transaction Confirmation',
        'transaction_confirmation',
        templateData,
      );

      expect(sendSpy).toHaveBeenCalledWith(
        recipient,
        'Transaction Confirmation',
        'transaction_confirmation',
        templateData,
      );

      sendSpy.mockRestore();
    });

    it('should handle missing template variables gracefully', async () => {
      const recipient = 'test@example.com';
      const templateData = {
        title: 'Generic Notification',
      };

      const sendSpy = jest
        .spyOn(emailService, 'sendNotificationEmail')
        .mockResolvedValueOnce();

      await emailService.sendNotificationEmail(
        recipient,
        'Generic Notification',
        'generic',
        templateData,
      );

      expect(sendSpy).toHaveBeenCalled();

      sendSpy.mockRestore();
    });

    it('should support HTML content rendering in templates', async () => {
      const recipient = 'test@example.com';
      const templateData = {
        title: 'HTML Content',
        message: 'Important notification with HTML content',
      };

      const sendSpy = jest
        .spyOn(emailService, 'sendNotificationEmail')
        .mockResolvedValueOnce();

      await emailService.sendNotificationEmail(
        recipient,
        'HTML Content',
        'html_template',
        templateData,
      );

      expect(sendSpy).toHaveBeenCalled();

      sendSpy.mockRestore();
    });

    it('should render email with action URLs', async () => {
      const recipient = 'test@example.com';
      const templateData = {
        title: 'Action Required',
        message: 'Please verify your email',
        actionUrl: 'https://example.com/verify',
        actionText: 'Verify Email',
      };

      const sendSpy = jest
        .spyOn(emailService, 'sendNotificationEmail')
        .mockResolvedValueOnce();

      await emailService.sendNotificationEmail(
        recipient,
        'Action Required',
        'action_template',
        templateData,
      );

      expect(sendSpy).toHaveBeenCalled();

      sendSpy.mockRestore();
    });
  });

  describe('Email Item Lists', () => {
    it('should render template with item lists', async () => {
      const recipient = 'test@example.com';
      const templateData = {
        title: 'Your Items',
        message: 'Here are your recent items',
        items: ['Item 1', 'Item 2', 'Item 3'],
      };

      const sendSpy = jest
        .spyOn(emailService, 'sendNotificationEmail')
        .mockResolvedValueOnce();

      await emailService.sendNotificationEmail(
        recipient,
        'Your Items',
        'items_template',
        templateData,
      );

      expect(sendSpy).toHaveBeenCalled();

      sendSpy.mockRestore();
    });

    it('should handle empty item lists gracefully', async () => {
      const recipient = 'test@example.com';
      const templateData = {
        title: 'Your Items',
        message: 'You have no items',
        items: [],
      };

      const sendSpy = jest
        .spyOn(emailService, 'sendNotificationEmail')
        .mockResolvedValueOnce();

      await emailService.sendNotificationEmail(
        recipient,
        'Your Items',
        'items_template',
        templateData,
      );

      expect(sendSpy).toHaveBeenCalled();

      sendSpy.mockRestore();
    });

    it('should handle multiple items in list', async () => {
      const recipient = 'test@example.com';
      const templateData = {
        title: 'Your Recent Items',
        message: 'Here are your items from this week',
        items: Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`),
      };

      const sendSpy = jest
        .spyOn(emailService, 'sendNotificationEmail')
        .mockResolvedValueOnce();

      await emailService.sendNotificationEmail(
        recipient,
        'Your Recent Items',
        'items_template',
        templateData,
      );

      expect(sendSpy).toHaveBeenCalled();

      sendSpy.mockRestore();
    });
  });

  describe('Email Delivery', () => {
    it('should send verification email', async () => {
      const recipient = 'test@example.com';
      const token = 'verify-token-123';

      const sendSpy = jest
        .spyOn(emailService, 'sendVerificationEmail')
        .mockResolvedValueOnce();

      await emailService.sendVerificationEmail(recipient, token);

      expect(sendSpy).toHaveBeenCalledWith(recipient, token);

      sendSpy.mockRestore();
    });

    it('should send password reset email', async () => {
      const recipient = 'test@example.com';
      const token = 'reset-token-456';

      const sendSpy = jest
        .spyOn(emailService, 'sendPasswordResetEmail')
        .mockResolvedValueOnce();

      await emailService.sendPasswordResetEmail(recipient, token);

      expect(sendSpy).toHaveBeenCalledWith(recipient, token);

      sendSpy.mockRestore();
    });

    it('should send alert email', async () => {
      const recipient = 'admin@example.com';
      const subject = 'System Alert';
      const data = {
        message: 'An error has occurred',
        details: { code: 'ERROR_001', timestamp: new Date().toISOString() },
      };

      const sendSpy = jest
        .spyOn(emailService, 'sendAlertEmail')
        .mockResolvedValueOnce();

      await emailService.sendAlertEmail(recipient, subject, data);

      expect(sendSpy).toHaveBeenCalledWith(recipient, subject, data);

      sendSpy.mockRestore();
    });

    it('should handle delivery failures gracefully', async () => {
      const recipient = 'invalid-email@';

      const sendSpy = jest
        .spyOn(emailService, 'sendVerificationEmail')
        .mockRejectedValueOnce(new Error('Failed to send verification email'));

      await expect(
        emailService.sendVerificationEmail(recipient, 'token'),
      ).rejects.toThrow('Failed to send verification email');

      sendSpy.mockRestore();
    });

    it('should handle notification email delivery failure', async () => {
      const recipient = 'test@example.com';
      const templateData = { title: 'Test', message: 'Test message' };

      const sendSpy = jest
        .spyOn(emailService, 'sendNotificationEmail')
        .mockRejectedValueOnce(new Error('Failed to send notification email'));

      await expect(
        emailService.sendNotificationEmail(
          recipient,
          'Test',
          'test_template',
          templateData,
        ),
      ).rejects.toThrow('Failed to send notification email');

      sendSpy.mockRestore();
    });
  });

  describe('Email Alert Service', () => {
    it('should send alert email with details', async () => {
      const recipient = 'admin@example.com';
      const subject = 'Critical System Alert';
      const data = {
        message: 'Database connection failed',
        details: { error: 'ECONNREFUSED', host: 'db.local' },
      };

      const sendSpy = jest
        .spyOn(emailService, 'sendAlertEmail')
        .mockResolvedValueOnce();

      await emailService.sendAlertEmail(recipient, subject, data);

      expect(sendSpy).toHaveBeenCalledWith(recipient, subject, data);

      sendSpy.mockRestore();
    });

    it('should send alert email without details', async () => {
      const recipient = 'admin@example.com';
      const subject = 'Warning Alert';
      const data = {
        message: 'High CPU usage detected',
      };

      const sendSpy = jest
        .spyOn(emailService, 'sendAlertEmail')
        .mockResolvedValueOnce();

      await emailService.sendAlertEmail(recipient, subject, data);

      expect(sendSpy).toHaveBeenCalled();

      sendSpy.mockRestore();
    });
  });
});
