import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { AnchorTransaction } from '../entities/anchor-transaction.entity';
import { SupportedCurrency } from '../entities/supported-currency.entity';

interface EscrowRecord {
  transactionId: string;
  userWallet: string;
  amount: number;
  assetCode: string;
  assetIssuer: string;
  status: 'locked' | 'released' | 'cancelled';
  lockedAt: Date;
  releasedAt?: Date;
}

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);
  private readonly escrowRecords = new Map<string, EscrowRecord>(); // In-memory for now, should be database in production

  constructor(
    @InjectRepository(AnchorTransaction)
    private readonly anchorTransactionRepository: Repository<AnchorTransaction>,
    @InjectRepository(SupportedCurrency)
    private readonly supportedCurrencyRepository: Repository<SupportedCurrency>,
    private readonly configService: ConfigService,
  ) {}

  async lockUSDCForWithdrawal(transaction: AnchorTransaction): Promise<boolean> {
    try {
      // Get USDC currency configuration
      const usdcCurrency = await this.supportedCurrencyRepository.findOne({
        where: { code: 'USDC', type: 'crypto', isActive: true },
      });

      if (!usdcCurrency) {
        throw new BadRequestException('USDC currency not configured');
      }

      // Calculate USDC amount based on fiat amount and exchange rate
      const usdcAmount = transaction.amount / (usdcCurrency.exchangeRateToUsd || 1);

      // Create escrow record
      const escrowRecord: EscrowRecord = {
        transactionId: transaction.id,
        userWallet: transaction.walletAddress,
        amount: usdcAmount,
        assetCode: usdcCurrency.anchorAssetCode || 'USDC',
        assetIssuer: usdcCurrency.anchorAssetIssuer || 'GA5ZSEJYB37JYG2FYGN2G6XCZMJEJRVO5N4X7XRQOV7P6B3M3Q5YHJMX',
        status: 'locked',
        lockedAt: new Date(),
      };

      // Store escrow record (in-memory for now)
      this.escrowRecords.set(transaction.id, escrowRecord);

      // TODO: Implement actual Stellar transaction to lock USDC in escrow account
      // This would involve:
      // 1. Creating an escrow account or using existing one
      // 2. Transferring USDC from user's wallet to escrow
      // 3. Recording the escrow transaction hash

      this.logger.log(`Locked ${usdcAmount} USDC for transaction ${transaction.id}`);

      // Update transaction with USDC amount
      transaction.usdcAmount = usdcAmount;
      await this.anchorTransactionRepository.save(transaction);

      return true;
    } catch (error) {
      this.logger.error(`Failed to lock USDC for transaction ${transaction.id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to lock USDC in escrow');
    }
  }

  async releaseUSDCFromEscrow(transactionId: string): Promise<boolean> {
    try {
      const escrowRecord = this.escrowRecords.get(transactionId);

      if (!escrowRecord) {
        throw new BadRequestException('Escrow record not found');
      }

      if (escrowRecord.status !== 'locked') {
        throw new BadRequestException('USDC is not locked in escrow');
      }

      // Update escrow status
      escrowRecord.status = 'released';
      escrowRecord.releasedAt = new Date();
      this.escrowRecords.set(transactionId, escrowRecord);

      // TODO: Implement actual Stellar transaction to release USDC from escrow
      // This would involve:
      // 1. Transferring USDC back to user's wallet
      // 2. Or transferring to anchor's wallet for the withdrawal

      this.logger.log(`Released ${escrowRecord.amount} USDC from escrow for transaction ${transactionId}`);

      return true;
    } catch (error) {
      this.logger.error(`Failed to release USDC from escrow for transaction ${transactionId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to release USDC from escrow');
    }
  }

  async cancelEscrow(transactionId: string): Promise<boolean> {
    try {
      const escrowRecord = this.escrowRecords.get(transactionId);

      if (!escrowRecord) {
        return false; // No escrow to cancel
      }

      if (escrowRecord.status !== 'locked') {
        throw new BadRequestException('Cannot cancel escrow that is not locked');
      }

      // Update escrow status
      escrowRecord.status = 'cancelled';
      escrowRecord.releasedAt = new Date();
      this.escrowRecords.set(transactionId, escrowRecord);

      // TODO: Return USDC to user's wallet

      this.logger.log(`Cancelled escrow for transaction ${transactionId}, returning ${escrowRecord.amount} USDC`);

      return true;
    } catch (error) {
      this.logger.error(`Failed to cancel escrow for transaction ${transactionId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to cancel escrow');
    }
  }

  getEscrowStatus(transactionId: string): EscrowRecord | null {
    return this.escrowRecords.get(transactionId) || null;
  }

  // Verify wallet ownership (basic implementation)
  async verifyWalletOwnership(walletAddress: string, userId: string): Promise<boolean> {
    // TODO: Implement proper wallet ownership verification
    // This could involve:
    // 1. Checking if wallet is registered to user
    // 2. Challenge-response verification
    // 3. Smart contract verification

    // For now, just return true
    this.logger.warn(`Wallet ownership verification not implemented for wallet ${walletAddress} and user ${userId}`);
    return true;
  }
}