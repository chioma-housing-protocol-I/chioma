import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EmailService } from '../../notifications/email.service';

export interface EmailJobData {
  type: 'verification' | 'password-reset' | 'notification' | 'alert';
  email: string;
  token?: string;
  subject?: string;
  template?: string;
  data?: Record<string, any>;
}

@Processor('email')
export class EmailQueueProcessor {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  constructor(private emailService: EmailService) {}

  @Process()
  async handleEmailJob(job: Job<EmailJobData>): Promise<void> {
    this.logger.log(
      `Processing email job ${job.id}: ${job.data.type} to ${job.data.email}`,
    );

    try {
      switch (job.data.type) {
        case 'verification':
          await this.emailService.sendVerificationEmail(
            job.data.email,
            job.data.token || '',
          );
          break;

        case 'password-reset':
          await this.emailService.sendPasswordResetEmail(
            job.data.email,
            job.data.token || '',
          );
          break;

        case 'notification':
          await this.emailService.sendNotificationEmail(
            job.data.email,
            job.data.subject || 'Notification',
            job.data.template || 'default',
            job.data.data || {},
          );
          break;

        case 'alert':
          await this.emailService.sendAlertEmail(
            job.data.email,
            job.data.subject || 'Alert',
            job.data.data || {},
          );
          break;

        default:
          throw new Error(`Unknown email type: ${String(job.data.type)}`);
      }

      this.logger.log(`Email job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Email job ${job.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : '',
      );
      throw error;
    }
  }
}
