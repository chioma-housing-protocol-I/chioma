import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminUsersController } from './admin-users.controller';
import { User } from './entities/user.entity';
import { UserNotificationPreference } from './entities/user-notification-preference.entity';
import { AuditModule } from '../audit/audit.module';
import { UserKycStatusService } from './user-kyc-status.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserNotificationPreference]),
    AuditModule,
  ],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService, UserKycStatusService],
  exports: [UsersService, UserKycStatusService],
})
export class UsersModule {}
