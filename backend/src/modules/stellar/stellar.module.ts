import { Module } from '@nestjs/common';
import { StellarAccountsModule } from './sub-modules/stellar-accounts.module';
import { StellarAnchorsModule } from './sub-modules/stellar-anchors.module';
import { StellarContractsModule } from './sub-modules/stellar-contracts.module';
import { StellarTransactionsModule } from './sub-modules/stellar-transactions.module';

/**
 * StellarModule composes four independently-testable sub-modules:
 *  - StellarAccountsModule  : account management + encryption
 *  - StellarAnchorsModule   : SEP-24 anchor deposit/withdrawal
 *  - StellarTransactionsModule : indexed transactions + payment processing
 *  - StellarContractsModule : Soroban contract clients (escrow, dispute, NFT, registry)
 *
 * No circular imports: Anchors, Transactions, and Contracts all import
 * StellarAccountsModule for StellarService/EncryptionService; none import
 * each other.
 */
@Module({
  imports: [
    StellarAccountsModule,
    StellarAnchorsModule,
    StellarTransactionsModule,
    StellarContractsModule,
  ],
  exports: [
    StellarAccountsModule,
    StellarAnchorsModule,
    StellarTransactionsModule,
    StellarContractsModule,
  ],
})
export class StellarModule {}
