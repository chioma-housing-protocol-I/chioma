import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Kyc } from './kyc.entity';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Kyc]), forwardRef(() => UsersModule)],
  providers: [KycService],
  controllers: [KycController],
  exports: [KycService],
})
export class KycModule {}
