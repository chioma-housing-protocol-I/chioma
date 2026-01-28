import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async notify(
    userId: string,
    title: string,
    message: string,
    type: string,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      user: { id: userId } as Notification['user'],
      title,
      message,
      type,
    });

    const saved = await this.notificationRepository.save(notification);
    this.logger.log(`Notification sent to user ${userId}: ${title}`);
    return saved;
  }
}
