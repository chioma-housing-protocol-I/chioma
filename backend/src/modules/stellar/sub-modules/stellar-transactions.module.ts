import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { IndexedTransaction } from '../../transactions/entities/indexed-transaction.entity';
import { AgentTransaction } from '../entities/agent-transaction.entity';
import { StellarPayment } from '../entities/stellar-payment.entity';
import { IndexedTransactionsService } from '../services/indexed-transactions.service';
import { PaymentProcessingService } from '../services/payment-processing.service';
import { BlockchainEventService } from '../services/blockchain-event.service';
import { IndexedTransactionsController } from '../controllers/indexed-transactions.controller';
import { PaymentProcessingController } from '../controllers/payment-processing.controller';
import { StellarAccountsModule } from './stellar-accounts.module';
import { WebhooksModule } from '../../webhooks/webhooks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IndexedTransaction,
      AgentTransaction,
      StellarPayment,
    ]),
    EventEmitterModule.forRoot(),
    StellarAccountsModule,
    WebhooksModule,
  ],
  controllers: [IndexedTransactionsController, PaymentProcessingController],
  providers: [
    IndexedTransactionsService,
    PaymentProcessingService,
    BlockchainEventService,
  ],
  exports: [
    IndexedTransactionsService,
    PaymentProcessingService,
    BlockchainEventService,
  ],
})
export class StellarTransactionsModule {}
