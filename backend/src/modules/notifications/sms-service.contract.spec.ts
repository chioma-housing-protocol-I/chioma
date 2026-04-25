/**
 * Contract Tests for SMS Service Integration
 *
 * These tests define the expected contract for an SMS service provider.
 * They ensure that any SMS service implementation adheres to the required interface
 * and behavior patterns for sending SMS notifications.
 */

export interface SmsServiceContract {
  sendSms(phoneNumber: string, message: string): Promise<SmsResponse>;
  sendBulkSms(recipients: SmsRecipient[]): Promise<BulkSmsResponse>;
}

export interface SmsResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryStatus?: 'sent' | 'pending' | 'failed';
}

export interface BulkSmsResponse {
  success: boolean;
  totalSent: number;
  totalFailed: number;
  results: SmsResponse[];
}

export interface SmsRecipient {
  phoneNumber: string;
  message: string;
}

/**
 * Mock SMS Service for Contract Testing
 */
class MockSmsService implements SmsServiceContract {
  async sendSms(phoneNumber: string, message: string): Promise<SmsResponse> {
    // Simulate successful SMS sending
    if (phoneNumber && message) {
      return {
        success: true,
        messageId: `sms_${Date.now()}`,
        deliveryStatus: 'sent',
      };
    }
    return {
      success: false,
      error: 'Invalid phone number or message',
      deliveryStatus: 'failed',
    };
  }

  async sendBulkSms(recipients: SmsRecipient[]): Promise<BulkSmsResponse> {
    const results: SmsResponse[] = [];
    let totalSent = 0;
    let totalFailed = 0;

    for (const recipient of recipients) {
      const result = await this.sendSms(
        recipient.phoneNumber,
        recipient.message,
      );
      results.push(result);
      if (result.success) {
        totalSent++;
      } else {
        totalFailed++;
      }
    }

    return {
      success: totalSent > 0,
      totalSent,
      totalFailed,
      results,
    };
  }
}

describe('SmsService - Contract Tests', () => {
  let smsService: SmsServiceContract;

  beforeEach(() => {
    smsService = new MockSmsService();
  });

  describe('Contract: sendSms', () => {
    it('should return a response conforming to SmsResponse contract', async () => {
      const phoneNumber = '+1234567890';
      const message = 'Your verification code is 123456';

      const result: SmsResponse = await smsService.sendSms(
        phoneNumber,
        message,
      );

      // Contract validation: Response must have success field
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');

      // Contract validation: If successful, must have messageId and deliveryStatus
      if (result.success) {
        expect(result).toHaveProperty('messageId');
        expect(typeof result.messageId).toBe('string');
        expect(result.messageId).toBeTruthy();

        expect(result).toHaveProperty('deliveryStatus');
        expect(['sent', 'pending', 'failed']).toContain(result.deliveryStatus);
      }

      // Contract validation: If failed, must have error message
      if (!result.success) {
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
      }
    });

    it('should handle various phone number formats and message content', async () => {
      const testCases = [
        {
          phoneNumber: '+1234567890',
          message: 'Test message',
          shouldSucceed: true,
        },
        {
          phoneNumber: '+44123456789',
          message: 'Payment reminder: Your rent is due',
          shouldSucceed: true,
        },
      ];

      for (const testCase of testCases) {
        const result = await smsService.sendSms(
          testCase.phoneNumber,
          testCase.message,
        );

        // Contract: Must return valid response structure
        expect(result).toBeDefined();
        expect(result).toHaveProperty('success');

        // Contract: Response type must match SmsResponse
        const validKeys = ['success', 'messageId', 'error', 'deliveryStatus'];
        Object.keys(result).forEach((key) => {
          expect(validKeys).toContain(key);
        });

        if (testCase.shouldSucceed) {
          expect(result.success).toBe(true);
          expect(result.messageId).toBeDefined();
        }
      }
    });
  });

  describe('Contract: sendBulkSms', () => {
    it('should return a response conforming to BulkSmsResponse contract', async () => {
      const recipients: SmsRecipient[] = [
        { phoneNumber: '+1234567890', message: 'Message 1' },
        { phoneNumber: '+9876543210', message: 'Message 2' },
        { phoneNumber: '+1122334455', message: 'Message 3' },
      ];

      const result: BulkSmsResponse = await smsService.sendBulkSms(recipients);

      // Contract validation: Response must have required fields
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');

      expect(result).toHaveProperty('totalSent');
      expect(typeof result.totalSent).toBe('number');
      expect(result.totalSent).toBeGreaterThanOrEqual(0);

      expect(result).toHaveProperty('totalFailed');
      expect(typeof result.totalFailed).toBe('number');
      expect(result.totalFailed).toBeGreaterThanOrEqual(0);

      expect(result).toHaveProperty('results');
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBe(recipients.length);

      // Contract validation: Each result must conform to SmsResponse
      result.results.forEach((smsResult) => {
        expect(smsResult).toHaveProperty('success');
        expect(typeof smsResult.success).toBe('boolean');
      });

      // Contract validation: Totals must match results
      const successCount = result.results.filter((r) => r.success).length;
      const failureCount = result.results.filter((r) => !r.success).length;
      expect(result.totalSent).toBe(successCount);
      expect(result.totalFailed).toBe(failureCount);
    });

    it('should handle bulk sending with consistent response structure', async () => {
      const recipients: SmsRecipient[] = [
        { phoneNumber: '+1111111111', message: 'Rent reminder' },
        { phoneNumber: '+2222222222', message: 'Maintenance notice' },
      ];

      const result = await smsService.sendBulkSms(recipients);

      // Contract: Must return valid response structure
      expect(result).toBeDefined();
      const validKeys = ['success', 'totalSent', 'totalFailed', 'results'];
      Object.keys(result).forEach((key) => {
        expect(validKeys).toContain(key);
      });

      // Contract: Results array must match input length
      expect(result.results.length).toBe(recipients.length);

      // Contract: Each result must be a valid SmsResponse
      result.results.forEach((smsResult, index) => {
        expect(smsResult).toHaveProperty('success');
        const resultKeys = ['success', 'messageId', 'error', 'deliveryStatus'];
        Object.keys(smsResult).forEach((key) => {
          expect(resultKeys).toContain(key);
        });
      });
    });
  });
});
