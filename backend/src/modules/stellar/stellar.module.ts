import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { StellarController } from './stellar.controller';
import { AnchorService } from './services/anchor-service';
import { EscrowService } from './services/escrow.service';
import { AnchorTransaction } from './entities/anchor-transaction.entity';
import { SupportedCurrency } from './entities/supported-currency.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnchorTransaction, SupportedCurrency, User]),
    HttpModule,
  ],
  controllers: [StellarController],
  providers: [AnchorService, EscrowService],
  exports: [AnchorService, EscrowService],
})
export class StellarModule {}