import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionService } from './transaction.service';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
