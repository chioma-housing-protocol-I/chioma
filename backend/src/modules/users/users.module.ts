import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { AuditModule } from '../audit/audit.module';
import { UserKycStatusService } from './user-kyc-status.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuditModule],
  controllers: [UsersController],
  providers: [UsersService, UserKycStatusService],
  exports: [UsersService, UserKycStatusService],
})
export class UsersModule {}
