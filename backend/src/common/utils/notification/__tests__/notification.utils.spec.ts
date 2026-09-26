import { NotificationUtils } from '../notification.utils';

describe('NotificationUtils', () => {
  describe('formatEmailNotification', () => {
    it('should return formatted template', () => {
      const result = NotificationUtils.formatEmailNotification(
        'Welcome',
        'Hello World',
      );
      expect(result.subject).toBe('Welcome');
      expect(result.html).toContain('<h2>Welcome</h2>');
      expect(result.html).toContain('<p>Hello World</p>');
    });
  });

  describe('formatSmsNotification', () => {
    it('should return wrapped content', () => {
      const result = NotificationUtils.formatSmsNotification(
        'Verification code: 123',
      );
      expect(result.content).toBe('Verification code: 123');
    });
  });

  describe('formatPushNotification', () => {
    it('should populate title and body', () => {
      const result = NotificationUtils.formatPushNotification(
        'Alert',
        'New message',
      );
      expect(result.title).toBe('Alert');
      expect(result.body).toBe('New message');
    });
  });

  describe('buildNotificationContext', () => {
    it('should append timestamp', () => {
      const context = NotificationUtils.buildNotificationContext({ id: 1 });
      expect(context.id).toBe(1);
      expect(context.timestamp).toBeDefined();
    });
  });
});
