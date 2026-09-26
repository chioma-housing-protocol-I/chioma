import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionService } from './transaction.service';

/**
 * No controller here by design (see issue #1571).
 *
 * `TransactionService` in this module is a generic DB-transaction wrapper
 * (execute/executeWithRetry over a TypeORM QueryRunner) — it does not own
 * the anchor/indexed-transaction data and has no read/write methods to
 * expose over HTTP.
 *
 * The `AnchorTransaction`, `IndexedTransaction`, and `SupportedCurrency`
 * entities that live under `./entities/` in this module ARE the actual
 * transaction data, but they are owned and exposed by the `stellar` module:
 * - `StellarModule` registers them via `TypeOrmModule.forFeature([...])`
 *   (see `../stellar/stellar.module.ts`).
 * - `AnchorController` (`../stellar/controllers/anchor.controller.ts`)
 *   already exposes list/detail/stats endpoints for anchor transactions.
 * - `IndexedTransactionsController`
 *   (`../stellar/controllers/indexed-transactions.controller.ts`) already
 *   exposes list/detail/stats endpoints for indexed transactions.
 *
 * Both existing controllers have DTO-validated query params, Swagger docs,
 * and admin-role guards, which already satisfy the acceptance criteria in
 * #1571. Adding a second controller here would duplicate that API surface
 * under different routes for the same underlying data, so no controller
 * was added to this module — this comment records that decision instead.
 */
@Module({
  imports: [TypeOrmModule.forFeature([])],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
