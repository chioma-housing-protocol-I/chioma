import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../notifications/entities/notification.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    relatedEntityType?: string,
    relatedEntityId?: string,
  ): Promise<Notification> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const notification = this.notificationRepository.create({
      user,
      type,
      title,
      message,
    });

    return await this.notificationRepository.save(notification);
  }

  async notifyDisputeCreated(disputeId: string, userIds: string[]): Promise<void> {
    for (const userId of userIds) {
      await this.createNotification(
        userId,
        'dispute_opened',
        'New Dispute Created',
        `A new dispute has been created. Dispute ID: ${disputeId}`,
        'dispute',
        disputeId,
      );
    }
  }

  async notifyDisputeStatusChanged(
    disputeId: string,
    userIds: string[],
    status: string,
  ): Promise<void> {
    for (const userId of userIds) {
      await this.createNotification(
        userId,
        'dispute_status_changed',
        'Dispute Status Updated',
        `Dispute status has been updated to: ${status}`,
        'dispute',
        disputeId,
      );
    }
  }

  async notifyDisputeResolved(disputeId: string, userIds: string[]): Promise<void> {
    for (const userId of userIds) {
      await this.createNotification(
        userId,
        'dispute_resolved',
        'Dispute Resolved',
        `Dispute has been resolved. Dispute ID: ${disputeId}`,
        'dispute',
        disputeId,
      );
    }
  }

  async notifyEvidenceAdded(disputeId: string, userIds: string[]): Promise<void> {
    for (const userId of userIds) {
      await this.createNotification(
        userId,
        'dispute_evidence_added',
        'New Evidence Added',
        `New evidence has been added to dispute. Dispute ID: ${disputeId}`,
        'dispute',
        disputeId,
      );
    }
  }

  async notifyCommentAdded(disputeId: string, userIds: string[]): Promise<void> {
    for (const userId of userIds) {
      await this.createNotification(
        userId,
        'dispute_comment_added',
        'New Comment Added',
        `A new comment has been added to dispute. Dispute ID: ${disputeId}`,
        'dispute',
        disputeId,
      );
    }
  }
}
