import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RentReminder,
  ReminderStatus,
  ReminderType,
} from './entities/rent-reminder.entity';
import { EmailService } from '../notifications/email.service';

/** The day-offsets at which reminders are created relative to the due date. */
const REMINDER_OFFSETS = [7, 3, 1, 0, -1];

@Injectable()
export class RentReminderService {
  private readonly logger = new Logger(RentReminderService.name);

  constructor(
    @InjectRepository(RentReminder)
    private readonly reminderRepository: Repository<RentReminder>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Creates a set of reminders for a rent agreement.
   *
   * Reminders are scheduled at 7 days before, 3 days before, 1 day before,
   * on the due date, and 1 day after the due date.
   *
   * @param agreementId - The agreement identifier
   * @param tenantId - The tenant identifier
   * @param tenantEmail - The tenant's email address
   * @param dueDate - The payment due date
   * @param amount - The amount due
   * @returns The created RentReminder entities
   */
  async createRemindersForAgreement(
    agreementId: string,
    tenantId: string,
    tenantEmail: string,
    dueDate: Date,
    amount: number,
  ): Promise<RentReminder[]> {
    const due = new Date(dueDate);
    const reminders: RentReminder[] = [];

    for (const daysBefore of REMINDER_OFFSETS) {
      const reminder = this.reminderRepository.create({
        agreementId,
        tenantId,
        tenantEmail,
        dueDate: due,
        daysBefore,
        amount,
        type: ReminderType.EMAIL,
        status: ReminderStatus.PENDING,
        sent: false,
      });
      reminders.push(reminder);
    }

    const saved = await this.reminderRepository.save(reminders);

    this.logger.log(
      `Created ${saved.length} reminders for agreement ${agreementId} (due ${due.toISOString()})`,
    );

    return saved;
  }

  /**
   * Processes all pending reminders whose scheduled send date is now or in the past.
   *
   * The scheduled send date is calculated as `dueDate - daysBefore` days.
   * Each eligible reminder is sent via {@link sendReminder}.
   *
   * @returns The number of reminders that were successfully sent
   */
  async processPendingReminders(): Promise<number> {
    const now = new Date();

    const pendingReminders = await this.reminderRepository.find({
      where: { status: ReminderStatus.PENDING },
    });

    // Filter to reminders whose send date has arrived
    const dueReminders = pendingReminders.filter((reminder) => {
      const sendDate = new Date(reminder.dueDate);
      sendDate.setDate(sendDate.getDate() - reminder.daysBefore);
      return sendDate <= now;
    });

    this.logger.log(
      `Found ${dueReminders.length} reminders ready to send out of ${pendingReminders.length} pending`,
    );

    let sentCount = 0;

    for (const reminder of dueReminders) {
      try {
        await this.sendReminder(reminder);
        sentCount++;
      } catch (error) {
        this.logger.error(
          `Failed to process reminder ${reminder.id}`,
          error instanceof Error ? error.stack : 'Unknown error',
        );
      }
    }

    return sentCount;
  }

  /**
   * Sends a single rent reminder via email and updates its status.
   *
   * @param reminder - The RentReminder entity to send
   */
  async sendReminder(reminder: RentReminder): Promise<void> {
    const subject = this.buildSubject(reminder);
    const data = this.buildEmailData(reminder);

    try {
      await this.emailService.sendNotificationEmail(
        reminder.tenantEmail,
        subject,
        'rent-reminder',
        data,
      );

      reminder.status = ReminderStatus.SENT;
      reminder.sent = true;
      reminder.sentAt = new Date();

      await this.reminderRepository.save(reminder);

      this.logger.log(
        `Sent reminder ${reminder.id} to ${reminder.tenantEmail}`,
      );
    } catch (error) {
      reminder.status = ReminderStatus.FAILED;
      reminder.errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await this.reminderRepository.save(reminder);

      this.logger.error(
        `Failed to send reminder ${reminder.id}: ${reminder.errorMessage}`,
      );

      throw error;
    }
  }

  /**
   * Lists all reminders for a given agreement.
   *
   * @param agreementId - The agreement identifier
   * @returns An array of RentReminder entities ordered by due date ascending
   */
  async getReminders(agreementId: string): Promise<RentReminder[]> {
    return this.reminderRepository.find({
      where: { agreementId },
      order: { dueDate: 'ASC', daysBefore: 'DESC' },
    });
  }

  /**
   * Cancels a reminder by marking it as CANCELLED.
   *
   * @param reminderId - The reminder identifier
   * @returns The updated RentReminder entity
   * @throws NotFoundException if the reminder does not exist
   */
  async cancelReminder(reminderId: string): Promise<RentReminder> {
    const reminder = await this.reminderRepository.findOne({
      where: { id: reminderId },
    });

    if (!reminder) {
      throw new NotFoundException(`Reminder with id ${reminderId} not found`);
    }

    reminder.status = ReminderStatus.CANCELLED;
    const saved = await this.reminderRepository.save(reminder);

    this.logger.log(`Cancelled reminder ${reminderId}`);

    return saved;
  }

  /**
   * Builds the email subject line based on how many days remain before the due date.
   */
  private buildSubject(reminder: RentReminder): string {
    if (reminder.daysBefore > 0) {
      return `Rent Reminder: Payment of $${reminder.amount} due in ${reminder.daysBefore} day(s)`;
    } else if (reminder.daysBefore === 0) {
      return `Rent Due Today: Payment of $${reminder.amount} is due`;
    } else {
      return `Overdue Rent: Payment of $${reminder.amount} was due ${Math.abs(reminder.daysBefore)} day(s) ago`;
    }
  }

  /**
   * Builds the data payload for the notification email template.
   */
  private buildEmailData(reminder: RentReminder): Record<string, any> {
    const dueDate = new Date(reminder.dueDate);

    return {
      title: 'Rent Payment Reminder',
      message: this.buildMessage(reminder),
      items: [
        `Amount Due: $${reminder.amount}`,
        `Due Date: ${dueDate.toLocaleDateString()}`,
        `Agreement: ${reminder.agreementId}`,
      ],
      actionUrl: '#',
      actionText: 'Make Payment',
    };
  }

  /**
   * Builds the body message text for a reminder email.
   */
  private buildMessage(reminder: RentReminder): string {
    if (reminder.daysBefore > 0) {
      return `Your rent payment of $${reminder.amount} is due in ${reminder.daysBefore} day(s). Please ensure your payment is submitted on time.`;
    } else if (reminder.daysBefore === 0) {
      return `Your rent payment of $${reminder.amount} is due today. Please submit your payment as soon as possible.`;
    } else {
      return `Your rent payment of $${reminder.amount} is overdue by ${Math.abs(reminder.daysBefore)} day(s). Please submit your payment immediately to avoid additional fees.`;
    }
  }
}
