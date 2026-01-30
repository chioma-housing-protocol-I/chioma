import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StellarService } from '../services/stellar.service';
import {
  CreateAccountDto,
  AccountResponseDto,
  FundAccountDto,
  CreatePaymentDto,
  PaymentResponseDto,
  ListTransactionsDto,
  TransactionResponseDto,
  CreateEscrowDto,
  ReleaseEscrowDto,
  RefundEscrowDto,
  EscrowResponseDto,
  ListEscrowsDto,
} from '../dto';
import { StellarAccount } from '../entities/stellar-account.entity';
import { StellarTransaction } from '../entities/stellar-transaction.entity';
import { StellarEscrow } from '../entities/stellar-escrow.entity';

@Controller('api/stellar')
export class StellarController {
  constructor(private readonly stellarService: StellarService) {}

  // ==================== Account Endpoints ====================

  /**
   * Create a new managed Stellar account
   */
  @Post('accounts')
  @HttpCode(HttpStatus.CREATED)
  async createAccount(
    @Body() dto: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    const account = await this.stellarService.createAccount(dto);
    return this.mapAccountToResponse(account);
  }

  /**
   * Get account info by ID
   */
  @Get('accounts/:id')
  async getAccountById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AccountResponseDto> {
    const account = await this.stellarService.getAccountById(id);
    return this.mapAccountToResponse(account);
  }

  /**
   * Get account info by public key
   */
  @Get('accounts/public-key/:publicKey')
  async getAccountByPublicKey(
    @Param('publicKey') publicKey: string,
  ): Promise<AccountResponseDto> {
    const account = await this.stellarService.getAccountByPublicKey(publicKey);
    return this.mapAccountToResponse(account);
  }

  /**
   * Get accounts for a user
   */
  @Get('accounts/user/:userId')
  async getAccountsByUserId(
    @Param('userId') userId: string,
  ): Promise<AccountResponseDto[]> {
    const accounts = await this.stellarService.getAccountsByUserId(userId);
    return accounts.map((account) => this.mapAccountToResponse(account));
  }

  /**
   * Fund account via Friendbot (testnet only)
   */
  @Post('accounts/fund')
  @HttpCode(HttpStatus.OK)
  async fundAccount(
    @Body() dto: FundAccountDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.stellarService.fundAccountTestnet(dto.publicKey);
    return {
      success: true,
      message: `Account ${dto.publicKey} funded successfully via Friendbot`,
    };
  }

  /**
   * Sync account from Stellar network
   */
  @Post('accounts/:publicKey/sync')
  @HttpCode(HttpStatus.OK)
  async syncAccount(
    @Param('publicKey') publicKey: string,
  ): Promise<AccountResponseDto> {
    const account = await this.stellarService.syncAccountFromNetwork(publicKey);
    return this.mapAccountToResponse(account);
  }

  /**
   * Get account info directly from Stellar network
   */
  @Get('accounts/:publicKey/network')
  async getNetworkAccountInfo(
    @Param('publicKey') publicKey: string,
  ): Promise<any> {
    const networkAccount =
      await this.stellarService.getAccountInfoFromNetwork(publicKey);
    return {
      publicKey: networkAccount.accountId(),
      sequenceNumber: networkAccount.sequenceNumber(),
      balances: networkAccount.balances,
      subentryCount: networkAccount.subentry_count,
      thresholds: networkAccount.thresholds,
      signers: networkAccount.signers,
      flags: networkAccount.flags,
    };
  }

  // ==================== Payment Endpoints ====================

  /**
   * Send a payment
   */
  @Post('payments')
  @HttpCode(HttpStatus.CREATED)
  async sendPayment(
    @Body() dto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    const transaction = await this.stellarService.sendPayment(dto);
    return this.mapTransactionToPaymentResponse(transaction);
  }

  /**
   * List transactions with filters
   */
  @Get('transactions')
  async listTransactions(@Query() dto: ListTransactionsDto): Promise<{
    transactions: TransactionResponseDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const { transactions, total } =
      await this.stellarService.listTransactions(dto);
    return {
      transactions: transactions.map((tx) => this.mapTransactionToResponse(tx)),
      total,
      limit: dto.limit || 20,
      offset: dto.offset || 0,
    };
  }

  /**
   * Get transaction by ID
   */
  @Get('transactions/:id')
  async getTransactionById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.stellarService.getTransactionById(id);
    return this.mapTransactionToResponse(transaction);
  }

  /**
   * Get transaction by hash
   */
  @Get('transactions/hash/:hash')
  async getTransactionByHash(
    @Param('hash') hash: string,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.stellarService.getTransactionByHash(hash);
    return this.mapTransactionToResponse(transaction);
  }

  // ==================== Escrow Endpoints ====================

  /**
   * Create an escrow
   */
  @Post('escrow')
  @HttpCode(HttpStatus.CREATED)
  async createEscrow(@Body() dto: CreateEscrowDto): Promise<EscrowResponseDto> {
    const escrow = await this.stellarService.createEscrow(dto);
    return this.mapEscrowToResponse(escrow);
  }

  /**
   * Release escrow funds to destination
   */
  @Post('escrow/release')
  @HttpCode(HttpStatus.OK)
  async releaseEscrow(
    @Body() dto: ReleaseEscrowDto,
  ): Promise<EscrowResponseDto> {
    const escrow = await this.stellarService.releaseEscrow(dto);
    return this.mapEscrowToResponse(escrow);
  }

  /**
   * Refund escrow funds to source
   */
  @Post('escrow/refund')
  @HttpCode(HttpStatus.OK)
  async refundEscrow(@Body() dto: RefundEscrowDto): Promise<EscrowResponseDto> {
    const escrow = await this.stellarService.refundEscrow(dto);
    return this.mapEscrowToResponse(escrow);
  }

  /**
   * Get escrow by ID
   */
  @Get('escrow/:id')
  async getEscrowById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<EscrowResponseDto> {
    const escrow = await this.stellarService.getEscrowById(id);
    return this.mapEscrowToResponse(escrow);
  }

  /**
   * List escrows with filters
   */
  @Get('escrows')
  async listEscrows(@Query() dto: ListEscrowsDto): Promise<{
    escrows: EscrowResponseDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const { escrows, total } = await this.stellarService.listEscrows(dto);
    return {
      escrows: escrows.map((escrow) => this.mapEscrowToResponse(escrow)),
      total,
      limit: dto.limit || 20,
      offset: dto.offset || 0,
    };
  }

  // ==================== Response Mappers ====================

  private mapAccountToResponse(account: StellarAccount): AccountResponseDto {
    return {
      id: account.id,
      publicKey: account.publicKey,
      accountType: account.accountType,
      balance: account.balance,
      sequenceNumber: account.sequenceNumber,
      isActive: account.isActive,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  private mapTransactionToPaymentResponse(
    transaction: StellarTransaction,
  ): PaymentResponseDto {
    return {
      id: transaction.id,
      transactionHash: transaction.transactionHash,
      sourceAccount: transaction.sourceAccount || '',
      destinationAccount: transaction.destinationAccount || '',
      amount: transaction.amount,
      assetType: transaction.assetType,
      assetCode: transaction.assetCode || undefined,
      status: transaction.status,
      feePaid: transaction.feePaid,
      ledger: transaction.ledger || undefined,
      memo: transaction.memo || undefined,
      createdAt: transaction.createdAt,
    };
  }

  private mapTransactionToResponse(
    transaction: StellarTransaction,
  ): TransactionResponseDto {
    return {
      id: transaction.id,
      transactionHash: transaction.transactionHash,
      sourceAccount: transaction.sourceAccount || '',
      destinationAccount: transaction.destinationAccount || '',
      amount: transaction.amount,
      assetType: transaction.assetType,
      assetCode: transaction.assetCode || undefined,
      assetIssuer: transaction.assetIssuer || undefined,
      feePaid: transaction.feePaid,
      memo: transaction.memo || undefined,
      memoType: transaction.memoType || undefined,
      status: transaction.status,
      ledger: transaction.ledger || undefined,
      errorMessage: transaction.errorMessage || undefined,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

  private mapEscrowToResponse(escrow: StellarEscrow): EscrowResponseDto {
    return {
      id: escrow.id,
      escrowPublicKey: escrow.escrowAccount?.publicKey || '',
      sourcePublicKey: escrow.sourceAccount?.publicKey || '',
      destinationPublicKey: escrow.destinationAccount?.publicKey || '',
      amount: escrow.amount,
      assetType: escrow.assetType,
      assetCode: escrow.assetCode || undefined,
      assetIssuer: escrow.assetIssuer || undefined,
      status: escrow.status,
      releaseConditions: escrow.releaseConditions || undefined,
      expirationDate: escrow.expirationDate || undefined,
      releasedAt: escrow.releasedAt || undefined,
      refundedAt: escrow.refundedAt || undefined,
      releaseTransactionHash: escrow.releaseTransactionHash || undefined,
      refundTransactionHash: escrow.refundTransactionHash || undefined,
      rentAgreementId: escrow.rentAgreementId || undefined,
      createdAt: escrow.createdAt,
      updatedAt: escrow.updatedAt,
    };
  }
}
