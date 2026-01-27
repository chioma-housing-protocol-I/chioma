import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { User } from './entities/user.entity';
import { SecurityAuditService } from '../../common/services/security-audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController, PrivacyController],
  providers: [UsersService, PrivacyService, SecurityAuditService],
  exports: [UsersService, PrivacyService],
})
export class UsersModule {}
