import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnchorTransaction } from '../../transactions/entities/anchor-transaction.entity';
import { SupportedCurrency } from '../../transactions/entities/supported-currency.entity';
import { AnchorService } from '../services/anchor.service';
import { AnchorController } from '../controllers/anchor.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AnchorTransaction, SupportedCurrency])],
  controllers: [AnchorController],
  providers: [AnchorService],
  exports: [AnchorService],
})
export class StellarAnchorsModule {}
