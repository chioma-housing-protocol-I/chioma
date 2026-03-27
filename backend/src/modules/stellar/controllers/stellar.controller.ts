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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { StellarService } from '../services/stellar.service';
import { EscrowContractService } from '../services/escrow-contract.service';
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
import {
  CreateMultiSigEscrowDto,
  AddSignatureDto,
  ReleaseWithSignaturesDto,
  CreateTimeLockedEscrowDto,
  CreateConditionalEscrowDto,
  IntegrateWithDisputeDto,
  ReleaseOnDisputeResolutionDto,
} from '../dto/escrow-enhanced.dto';
import { StellarAccount } from '../entities/stellar-account.entity';
import { StellarTransaction } from '../entities/stellar-transaction.entity';
import { StellarEscrow } from '../entities/stellar-escrow.entity';

@ApiTags('Stellar')
@Controller('stellar')
export class StellarController {
  constructor(
    private readonly stellarService: StellarService,
    private readonly escrowContractService: EscrowContractService,
  ) {}

  // ==================== Account Endpoints ====================

  /**
   * Create a new managed Stellar account
   */
  @Post('accounts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a managed Stellar account' })
  @ApiResponse({
    status: 201,
    description: 'Account created',
    type: AccountResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
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
  @ApiOperation({ summary: 'Get account by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: AccountResponseDto })
  @ApiResponse({ status: 404, description: 'Account not found' })
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
  @ApiOperation({ summary: 'Fund account via Friendbot (testnet only)' })
  @ApiResponse({ status: 200, description: 'Account funded' })
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
  @ApiOperation({ summary: 'Send a Stellar payment' })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Validation or insufficient balance',
  })
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
  @ApiOperation({ summary: 'Create an escrow' })
  @ApiResponse({ status: 201, type: EscrowResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
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

  // ==================== Enhanced Escrow Endpoints ====================

  /**
   * Create a multi-signature escrow
   */
  @Post('escrow/multi-sig')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a multi-signature escrow' })
  @ApiResponse({ status: 201, description: 'Multi-sig escrow created' })
  async createMultiSigEscrow(
    @Body() dto: CreateMultiSigEscrowDto,
  ): Promise<{ escrowId: string; message: string }> {
    const escrowId = await this.escrowContractService.createMultiSigEscrow(dto);
    return {
      escrowId,
      message: `Multi-sig escrow created with ${dto.requiredSignatures}/${dto.participants.length} required signatures`,
    };
  }

  /**
   * Add signature to multi-sig escrow
   */
  @Post('escrow/signature')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add signature to multi-sig escrow' })
  @ApiResponse({ status: 200, description: 'Signature added' })
  async addSignature(
    @Body() dto: AddSignatureDto,
  ): Promise<{ message: string }> {
    const message = await this.escrowContractService.addSignature(dto);
    return { message };
  }

  /**
   * Release escrow with collected signatures
   */
  @Post('escrow/release-with-signatures')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release escrow with multi-signatures' })
  @ApiResponse({ status: 200, description: 'Escrow released' })
  async releaseWithSignatures(
    @Body() dto: ReleaseWithSignaturesDto,
  ): Promise<{ transactionHash: string; message: string }> {
    const txHash = await this.escrowContractService.releaseWithSignatures(
      dto.escrowId,
      dto.signatures,
    );
    return {
      transactionHash: txHash,
      message: 'Escrow released successfully',
    };
  }

  /**
   * Create a time-locked escrow
   */
  @Post('escrow/time-locked')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a time-locked escrow' })
  @ApiResponse({ status: 201, description: 'Time-locked escrow created' })
  async createTimeLockedEscrow(
    @Body() dto: CreateTimeLockedEscrowDto,
  ): Promise<{ escrowId: string; releaseTime: number; message: string }> {
    const escrowId =
      await this.escrowContractService.createTimeLockedEscrow(dto);
    return {
      escrowId,
      releaseTime: dto.releaseTime,
      message: `Time-locked escrow created. Funds will be available at ${new Date(dto.releaseTime * 1000).toISOString()}`,
    };
  }

  /**
   * Check time-lock conditions
   */
  @Get('escrow/:escrowId/time-lock-status')
  @ApiOperation({ summary: 'Check if time-lock conditions are met' })
  @ApiResponse({ status: 200, description: 'Time-lock status' })
  async checkTimeLockConditions(
    @Param('escrowId') escrowId: string,
  ): Promise<{ isUnlocked: boolean; message: string }> {
    const isUnlocked =
      await this.escrowContractService.checkTimeLockConditions(escrowId);
    return {
      isUnlocked,
      message: isUnlocked
        ? 'Time-lock has expired, funds can be released'
        : 'Time-lock is still active',
    };
  }

  /**
   * Create a conditional escrow
   */
  @Post('escrow/conditional')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a conditional escrow' })
  @ApiResponse({ status: 201, description: 'Conditional escrow created' })
  async createConditionalEscrow(
    @Body() dto: CreateConditionalEscrowDto,
  ): Promise<{ escrowId: string; conditions: number; message: string }> {
    const escrowId =
      await this.escrowContractService.createConditionalEscrow(dto);
    return {
      escrowId,
      conditions: dto.conditions.length,
      message: `Conditional escrow created with ${dto.conditions.length} conditions`,
    };
  }

  /**
   * Validate escrow conditions
   */
  @Get('escrow/:escrowId/conditions')
  @ApiOperation({ summary: 'Validate all escrow conditions' })
  @ApiResponse({ status: 200, description: 'Condition validation results' })
  async validateConditions(@Param('escrowId') escrowId: string) {
    return await this.escrowContractService.validateConditions(escrowId);
  }

  /**
   * Integrate escrow with dispute
   */
  @Post('escrow/integrate-dispute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Integrate escrow with dispute resolution' })
  @ApiResponse({ status: 200, description: 'Escrow integrated with dispute' })
  async integrateWithDispute(
    @Body() dto: IntegrateWithDisputeDto,
  ): Promise<{ message: string }> {
    const message = await this.escrowContractService.integrateWithDispute(
      dto.escrowId,
      dto.disputeId,
    );
    return { message };
  }

  /**
   * Release escrow based on dispute resolution
   */
  @Post('escrow/release-dispute-resolution')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release escrow based on dispute outcome' })
  @ApiResponse({ status: 200, description: 'Escrow released' })
  async releaseOnDisputeResolution(
    @Body() dto: ReleaseOnDisputeResolutionDto,
  ): Promise<{ transactionHash: string; message: string }> {
    const txHash = await this.escrowContractService.releaseOnDisputeResolution(
      dto.escrowId,
      dto.disputeOutcome,
    );
    return {
      transactionHash: txHash,
      message: `Escrow released based on dispute outcome: ${dto.disputeOutcome}`,
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
