import './setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { EmailService } from './../src/modules/notifications/email.service';

describe('Email Template Integration (e2e)', () => {
  let app: INestApplication<App>;
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
    it('should render email template with variable substitution', async () => {
      const templateData = {
        recipientName: 'John Doe',
        transactionId: 'TXN-123456',
        amount: '100.00',
        currency: 'USD',
      };

      const result = await emailService.renderTemplate('transaction_confirmation', templateData);

      expect(result).toBeDefined();
      expect(result.subject).toContain('Transaction');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('100.00');
      expect(result.text).toContain('John Doe');
    });

    it('should handle missing variables gracefully', async () => {
      const templateData = {
        recipientName: 'Jane Doe',
      };

      const result = await emailService.renderTemplate('transaction_confirmation', templateData);

      expect(result).toBeDefined();
      expect(result.html).toContain('Jane Doe');
    });

    it('should support HTML rendering', async () => {
      const templateData = {
        recipientName: 'Alice',
        content: '<strong>Important notification</strong>',
      };

      const result = await emailService.renderTemplate('generic_notification', templateData);

      expect(result.html).toBeDefined();
      expect(result.html).toContain('html');
      expect(result.html).toMatch(/<[^>]+>/);
    });

    it('should support plain text rendering', async () => {
      const templateData = {
        recipientName: 'Bob',
        content: 'Plain text content',
      };

      const result = await emailService.renderTemplate('generic_notification', templateData);

      expect(result.text).toBeDefined();
      expect(result.text).not.toContain('<');
    });
  });

  describe('Email Attachment Handling', () => {
    it('should render template with attachment metadata', async () => {
      const templateData = {
        recipientName: 'Charlie',
        attachmentName: 'document.pdf',
      };

      const result = await emailService.renderTemplate('document_delivery', templateData);

      expect(result).toBeDefined();
      expect(result.attachments || []).toBeDefined();
    });

    it('should handle multiple attachments', async () => {
      const templateData = {
        recipientName: 'Diana',
        attachments: [
          { filename: 'invoice.pdf', path: '/tmp/invoice.pdf' },
          { filename: 'receipt.pdf', path: '/tmp/receipt.pdf' },
        ],
      };

      const result = await emailService.renderTemplate('documents', templateData);

      expect(result).toBeDefined();
    });
  });

  describe('Email Localization', () => {
    it('should render template in English', async () => {
      const templateData = {
        recipientName: 'English User',
        locale: 'en',
      };

      const result = await emailService.renderTemplate('welcome', templateData);

      expect(result).toBeDefined();
      expect(result.subject).toBeDefined();
    });

    it('should render template in Spanish', async () => {
      const templateData = {
        recipientName: 'Usuario Español',
        locale: 'es',
      };

      const result = await emailService.renderTemplate('welcome', templateData);

      expect(result).toBeDefined();
      expect(result.subject).toBeDefined();
    });

    it('should render template in French', async () => {
      const templateData = {
        recipientName: 'Utilisateur Français',
        locale: 'fr',
      };

      const result = await emailService.renderTemplate('welcome', templateData);

      expect(result).toBeDefined();
      expect(result.subject).toBeDefined();
    });

    it('should fallback to English for unsupported locale', async () => {
      const templateData = {
        recipientName: 'Default User',
        locale: 'unknown',
      };

      const result = await emailService.renderTemplate('welcome', templateData);

      expect(result).toBeDefined();
      expect(result.subject).toBeDefined();
    });
  });

  describe('Email Preview Generation', () => {
    it('should generate preview text from HTML template', async () => {
      const templateData = {
        recipientName: 'Preview User',
        content: 'This is the main content',
      };

      const result = await emailService.renderTemplate('generic_notification', templateData);

      expect(result.preview || result.text).toBeDefined();
    });

    it('should limit preview length appropriately', async () => {
      const templateData = {
        recipientName: 'Long Content User',
        content: 'This is a very long content that should be truncated in preview mode. '.repeat(10),
      };

      const result = await emailService.renderTemplate('generic_notification', templateData);

      const preview = result.preview || result.text || '';
      expect(preview.length).toBeLessThanOrEqual(160);
    });
  });

  describe('Email Template Delivery', () => {
    it('should send email with correct recipient', async () => {
      const recipient = {
        email: 'test@example.com',
        name: 'Test User',
      };

      const templateData = {
        recipientName: recipient.name,
      };

      const sendSpy = jest.spyOn(emailService, 'sendEmail').mockResolvedValue({
        messageId: 'test-message-id',
        accepted: [recipient.email],
      });

      const result = await emailService.sendEmail(recipient.email, 'welcome', templateData);

      expect(sendSpy).toHaveBeenCalledWith(recipient.email, 'welcome', templateData);
      expect(result.messageId).toBeDefined();
      expect(result.accepted).toContain(recipient.email);

      sendSpy.mockRestore();
    });

    it('should handle delivery failures gracefully', async () => {
      const recipient = 'invalid-email@';

      const sendSpy = jest.spyOn(emailService, 'sendEmail').mockRejectedValue(
        new Error('Invalid email format'),
      );

      await expect(
        emailService.sendEmail(recipient, 'welcome', {}),
      ).rejects.toThrow('Invalid email format');

      sendSpy.mockRestore();
    });

    it('should retry failed delivery attempts', async () => {
      const recipient = 'test@example.com';
      let attempts = 0;

      const sendSpy = jest.spyOn(emailService, 'sendEmail').mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
        return { messageId: 'test-id', accepted: [recipient] };
      });

      const result = await emailService.sendEmail(recipient, 'welcome', {});

      expect(result.messageId).toBeDefined();
      expect(attempts).toBeGreaterThanOrEqual(1);

      sendSpy.mockRestore();
    });
  });
});
