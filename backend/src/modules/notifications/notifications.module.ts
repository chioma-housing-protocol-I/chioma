import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { UserNotificationPreference } from '../users/entities/user-notification-preference.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailService } from './email.service';
import { MessagingModule } from '../messaging/messaging.module';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsRealtimeService } from './notifications-realtime.service';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User, UserNotificationPreference]),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    MessagingModule,
    forwardRef(() => MonitoringModule),
    AuditModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailService,
    NotificationsGateway,
    NotificationsRealtimeService,
  ],
  exports: [NotificationsService, EmailService, NotificationsRealtimeService],
})
export class NotificationsModule {}
