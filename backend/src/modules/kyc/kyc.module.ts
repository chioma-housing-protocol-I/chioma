import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Kyc } from './kyc.entity';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { UsersModule } from '../users/users.module';
import { SecurityModule } from '../security/security.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Kyc]),
    forwardRef(() => UsersModule),
    SecurityModule,
    AuditModule,
  ],
  providers: [KycService],
  controllers: [KycController],
  exports: [KycService],
})
export class KycModule {}
