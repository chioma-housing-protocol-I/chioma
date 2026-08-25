import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RentReminderService } from './rent-reminder.service';
import {
  RentReminder,
  ReminderStatus,
  ReminderType,
} from './entities/rent-reminder.entity';
import { EmailService } from '../notifications/email.service';

describe('RentReminderService', () => {
  let service: RentReminderService;
  let reminderRepository: jest.Mocked<Repository<RentReminder>>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentReminderService,
        {
          provide: getRepositoryToken(RentReminder),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: { sendNotificationEmail: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<RentReminderService>(RentReminderService);
    reminderRepository = module.get(getRepositoryToken(RentReminder));
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRemindersForAgreement', () => {
    it('creates one reminder per configured day-offset', async () => {
      reminderRepository.create.mockImplementation(
        (data) => data as RentReminder,
      );
      reminderRepository.save.mockImplementation((data) =>
        Promise.resolve(data as RentReminder[]),
      );

      const dueDate = new Date('2026-07-01T00:00:00.000Z');
      const result = await service.createRemindersForAgreement(
        'agreement-1',
        'tenant-1',
        'tenant@example.com',
        dueDate,
        1500,
      );

      // REMINDER_OFFSETS = [7, 3, 1, 0, -1]
      expect(result).toHaveLength(5);
      expect(reminderRepository.create).toHaveBeenCalledTimes(5);
      expect(reminderRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sets every reminder to PENDING status and EMAIL type by default', async () => {
      const created: Partial<RentReminder>[] = [];
      reminderRepository.create.mockImplementation((data) => {
        created.push(data as RentReminder);
        return data as RentReminder;
      });
      reminderRepository.save.mockImplementation((data) =>
        Promise.resolve(data as RentReminder[]),
      );

      await service.createRemindersForAgreement(
        'agreement-1',
        'tenant-1',
        'tenant@example.com',
        new Date('2026-07-01T00:00:00.000Z'),
        1500,
      );

      for (const reminder of created) {
        expect(reminder.status).toBe(ReminderStatus.PENDING);
        expect(reminder.type).toBe(ReminderType.EMAIL);
        expect(reminder.sent).toBe(false);
        expect(reminder.agreementId).toBe('agreement-1');
        expect(reminder.tenantId).toBe('tenant-1');
        expect(reminder.tenantEmail).toBe('tenant@example.com');
        expect(reminder.amount).toBe(1500);
      }
    });

    it('includes the exact set of day-offsets from due date', async () => {
      const created: Partial<RentReminder>[] = [];
      reminderRepository.create.mockImplementation((data) => {
        created.push(data as RentReminder);
        return data as RentReminder;
      });
      reminderRepository.save.mockImplementation((data) =>
        Promise.resolve(data as RentReminder[]),
      );

      await service.createRemindersForAgreement(
        'agreement-1',
        'tenant-1',
        'tenant@example.com',
        new Date('2026-07-01T00:00:00.000Z'),
        1500,
      );

      expect(created.map((r) => r.daysBefore).sort((a, b) => a! - b!)).toEqual([
        -1, 0, 1, 3, 7,
      ]);
    });
  });

  describe('processPendingReminders', () => {
    it('sends reminders whose scheduled send date has arrived', async () => {
      const now = new Date('2026-07-01T12:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);

      const dueReminder = {
        id: 'r1',
        dueDate: new Date('2026-07-01T00:00:00.000Z'),
        daysBefore: 0,
        tenantEmail: 'a@example.com',
        amount: 100,
        status: ReminderStatus.PENDING,
      } as RentReminder;

      reminderRepository.find.mockResolvedValue([dueReminder]);
      reminderRepository.save.mockResolvedValue(dueReminder);
      emailService.sendNotificationEmail.mockResolvedValue(undefined);

      const sentCount = await service.processPendingReminders();

      expect(sentCount).toBe(1);
      expect(emailService.sendNotificationEmail).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('skips reminders whose scheduled send date is still in the future', async () => {
      const now = new Date('2026-06-01T00:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);

      const futureReminder = {
        id: 'r1',
        dueDate: new Date('2026-07-01T00:00:00.000Z'),
        daysBefore: 7, // send date = June 24, still after "now" of June 1
        tenantEmail: 'a@example.com',
        amount: 100,
        status: ReminderStatus.PENDING,
      } as RentReminder;

      reminderRepository.find.mockResolvedValue([futureReminder]);

      const sentCount = await service.processPendingReminders();

      expect(sentCount).toBe(0);
      expect(emailService.sendNotificationEmail).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('continues processing remaining reminders when one fails to send', async () => {
      const now = new Date('2026-07-01T12:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);

      const failing = {
        id: 'r-fail',
        dueDate: new Date('2026-07-01T00:00:00.000Z'),
        daysBefore: 0,
        tenantEmail: 'fail@example.com',
        amount: 100,
        status: ReminderStatus.PENDING,
      } as RentReminder;
      const succeeding = {
        id: 'r-ok',
        dueDate: new Date('2026-07-01T00:00:00.000Z'),
        daysBefore: 0,
        tenantEmail: 'ok@example.com',
        amount: 200,
        status: ReminderStatus.PENDING,
      } as RentReminder;

      reminderRepository.find.mockResolvedValue([failing, succeeding]);
      reminderRepository.save.mockImplementation((r) =>
        Promise.resolve(r as RentReminder),
      );
      emailService.sendNotificationEmail
        .mockRejectedValueOnce(new Error('SMTP down'))
        .mockResolvedValueOnce(undefined);

      const sentCount = await service.processPendingReminders();

      expect(sentCount).toBe(1);
      expect(emailService.sendNotificationEmail).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('returns zero when there are no pending reminders', async () => {
      reminderRepository.find.mockResolvedValue([]);

      const sentCount = await service.processPendingReminders();

      expect(sentCount).toBe(0);
      expect(emailService.sendNotificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('sendReminder', () => {
    it('marks the reminder as SENT on successful delivery', async () => {
      const reminder = {
        id: 'r1',
        tenantEmail: 'a@example.com',
        amount: 100,
        daysBefore: 3,
        dueDate: new Date('2026-07-01T00:00:00.000Z'),
        agreementId: 'agreement-1',
        status: ReminderStatus.PENDING,
      } as RentReminder;

      emailService.sendNotificationEmail.mockResolvedValue(undefined);
      reminderRepository.save.mockResolvedValue(reminder);

      await service.sendReminder(reminder);

      expect(reminder.status).toBe(ReminderStatus.SENT);
      expect(reminder.sent).toBe(true);
      expect(reminder.sentAt).toBeInstanceOf(Date);
      expect(reminderRepository.save).toHaveBeenCalledWith(reminder);
    });

    it('marks the reminder as FAILED and rethrows on delivery error', async () => {
      const reminder = {
        id: 'r1',
        tenantEmail: 'a@example.com',
        amount: 100,
        daysBefore: 3,
        dueDate: new Date('2026-07-01T00:00:00.000Z'),
        agreementId: 'agreement-1',
        status: ReminderStatus.PENDING,
      } as RentReminder;

      emailService.sendNotificationEmail.mockRejectedValue(
        new Error('SMTP down'),
      );
      reminderRepository.save.mockResolvedValue(reminder);

      await expect(service.sendReminder(reminder)).rejects.toThrow('SMTP down');

      expect(reminder.status).toBe(ReminderStatus.FAILED);
      expect(reminder.errorMessage).toBe('SMTP down');
    });

    it('builds a due-today subject line when daysBefore is zero', async () => {
      const reminder = {
        id: 'r1',
        tenantEmail: 'a@example.com',
        amount: 100,
        daysBefore: 0,
        dueDate: new Date('2026-07-01T00:00:00.000Z'),
        agreementId: 'agreement-1',
        status: ReminderStatus.PENDING,
      } as RentReminder;

      emailService.sendNotificationEmail.mockResolvedValue(undefined);
      reminderRepository.save.mockResolvedValue(reminder);

      await service.sendReminder(reminder);

      const [, subject] = emailService.sendNotificationEmail.mock.calls[0];
      expect(subject).toContain('Rent Due Today');
    });

    it('builds an overdue subject line when daysBefore is negative', async () => {
      const reminder = {
        id: 'r1',
        tenantEmail: 'a@example.com',
        amount: 100,
        daysBefore: -1,
        dueDate: new Date('2026-07-01T00:00:00.000Z'),
        agreementId: 'agreement-1',
        status: ReminderStatus.PENDING,
      } as RentReminder;

      emailService.sendNotificationEmail.mockResolvedValue(undefined);
      reminderRepository.save.mockResolvedValue(reminder);

      await service.sendReminder(reminder);

      const [, subject] = emailService.sendNotificationEmail.mock.calls[0];
      expect(subject).toContain('Overdue Rent');
    });

    it('builds an upcoming subject line when daysBefore is positive', async () => {
      const reminder = {
        id: 'r1',
        tenantEmail: 'a@example.com',
        amount: 100,
        daysBefore: 7,
        dueDate: new Date('2026-07-01T00:00:00.000Z'),
        agreementId: 'agreement-1',
        status: ReminderStatus.PENDING,
      } as RentReminder;

      emailService.sendNotificationEmail.mockResolvedValue(undefined);
      reminderRepository.save.mockResolvedValue(reminder);

      await service.sendReminder(reminder);

      const [, subject] = emailService.sendNotificationEmail.mock.calls[0];
      expect(subject).toContain('Rent Reminder');
      expect(subject).toContain('7 day(s)');
    });
  });

  describe('getReminders', () => {
    it('queries by agreement id ordered by due date then days-before descending', async () => {
      reminderRepository.find.mockResolvedValue([]);

      await service.getReminders('agreement-1');

      expect(reminderRepository.find).toHaveBeenCalledWith({
        where: { agreementId: 'agreement-1' },
        order: { dueDate: 'ASC', daysBefore: 'DESC' },
      });
    });

    it('returns the reminders found for the agreement', async () => {
      const reminders = [{ id: 'r1' }, { id: 'r2' }] as RentReminder[];
      reminderRepository.find.mockResolvedValue(reminders);

      const result = await service.getReminders('agreement-1');

      expect(result).toEqual(reminders);
    });
  });

  describe('cancelReminder', () => {
    it('throws NotFoundException when the reminder does not exist', async () => {
      reminderRepository.findOne.mockResolvedValue(null);

      await expect(service.cancelReminder('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('marks an existing reminder as CANCELLED and saves it', async () => {
      const reminder = {
        id: 'r1',
        status: ReminderStatus.PENDING,
      } as RentReminder;

      reminderRepository.findOne.mockResolvedValue(reminder);
      reminderRepository.save.mockResolvedValue({
        ...reminder,
        status: ReminderStatus.CANCELLED,
      } as RentReminder);

      const result = await service.cancelReminder('r1');

      expect(reminder.status).toBe(ReminderStatus.CANCELLED);
      expect(reminderRepository.save).toHaveBeenCalledWith(reminder);
      expect(result.status).toBe(ReminderStatus.CANCELLED);
    });
  });
});
