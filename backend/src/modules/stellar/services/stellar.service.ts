import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  StellarAccount,
  StellarAccountType,
} from '../entities/stellar-account.entity';
import {
  StellarTransaction,
  TransactionStatus,
  AssetType,
  MemoType,
} from '../entities/stellar-transaction.entity';
import { StellarEscrow, EscrowStatus } from '../entities/stellar-escrow.entity';
import { EncryptionService } from './encryption.service';
import { StellarConfig } from '../config/stellar.config';
import {
  CreateAccountDto,
  CreatePaymentDto,
  ListTransactionsDto,
  CreateEscrowDto,
  ReleaseEscrowDto,
  RefundEscrowDto,
  ListEscrowsDto,
} from '../dto';

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private readonly horizon: StellarSdk.Horizon.Server;
  private readonly networkPassphrase: string;
  private readonly baseFee: string;
  private readonly stellarConfig: StellarConfig;

  constructor(
    @InjectRepository(StellarAccount)
    private readonly accountRepository: Repository<StellarAccount>,
    @InjectRepository(StellarTransaction)
    private readonly transactionRepository: Repository<StellarTransaction>,
    @InjectRepository(StellarEscrow)
    private readonly escrowRepository: Repository<StellarEscrow>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
  ) {
    this.stellarConfig = this.configService.get<StellarConfig>('stellar')!;
    this.horizon = new StellarSdk.Horizon.Server(this.stellarConfig.horizonUrl);
    this.networkPassphrase = this.stellarConfig.networkPassphrase;
    this.baseFee = this.stellarConfig.baseFee;
  }

  // ==================== Account Management ====================

  /**
   * Creates a new Stellar account with encrypted secret key
   */
  async createAccount(dto: CreateAccountDto): Promise<StellarAccount> {
    try {
      // Generate a new keypair
      const keypair = StellarSdk.Keypair.random();
      const publicKey = keypair.publicKey();
      const secretKey = keypair.secret();

      // Encrypt the secret key before storing
      const secretKeyEncrypted = this.encryptionService.encrypt(secretKey);

      // Create account record
      const account = this.accountRepository.create({
        userId: dto.userId || null,
        publicKey,
        secretKeyEncrypted,
        accountType: dto.accountType || StellarAccountType.USER,
        sequenceNumber: '0',
        balance: '0',
        isActive: true,
      });

      const savedAccount = await this.accountRepository.save(account);
      this.logger.log(`Created Stellar account: ${publicKey}`);

      return savedAccount;
    } catch (error) {
      this.logger.error('Failed to create Stellar account', error);
      throw new InternalServerErrorException(
        'Failed to create Stellar account',
      );
    }
  }

  /**
   * Fund an account using Friendbot (testnet only)
   */
  async fundAccountTestnet(publicKey: string): Promise<boolean> {
    if (this.stellarConfig.network !== 'testnet') {
      throw new BadRequestException(
        'Friendbot funding is only available on testnet',
      );
    }

    try {
      const friendbotUrl = this.stellarConfig.friendbotUrl;
      if (!friendbotUrl) {
        throw new BadRequestException('Friendbot URL not configured');
      }

      const response = await fetch(
        `${friendbotUrl}?addr=${encodeURIComponent(publicKey)}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Friendbot funding failed: ${errorText}`);
        throw new BadRequestException('Failed to fund account via Friendbot');
      }

      // Update account balance
      await this.syncAccountFromNetwork(publicKey);

      this.logger.log(`Funded account via Friendbot: ${publicKey}`);
      return true;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Friendbot funding error', error);
      throw new InternalServerErrorException(
        'Failed to fund account via Friendbot',
      );
    }
  }

  /**
   * Get account by ID
   */
  async getAccountById(id: number): Promise<StellarAccount> {
    const account = await this.accountRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!account) {
      throw new NotFoundException(`Stellar account with ID ${id} not found`);
    }

    return account;
  }

  /**
   * Get account by public key
   */
  async getAccountByPublicKey(publicKey: string): Promise<StellarAccount> {
    const account = await this.accountRepository.findOne({
      where: { publicKey },
      relations: ['user'],
    });

    if (!account) {
      throw new NotFoundException(
        `Stellar account with public key ${publicKey} not found`,
      );
    }

    return account;
  }

  /**
   * Get account info from Stellar network
   */
  async getAccountInfoFromNetwork(
    publicKey: string,
  ): Promise<StellarSdk.Horizon.AccountResponse> {
    try {
      return await this.horizon.loadAccount(publicKey);
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new NotFoundException(
          'Account not found on Stellar network. It may need to be funded.',
        );
      }
      this.logger.error(
        `Failed to load account from network: ${publicKey}`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to load account from Stellar network',
      );
    }
  }

  /**
   * Sync account data from Stellar network
   */
  async syncAccountFromNetwork(publicKey: string): Promise<StellarAccount> {
    const account = await this.getAccountByPublicKey(publicKey);

    try {
      const networkAccount = await this.horizon.loadAccount(publicKey);

      // Get native balance
      const nativeBalance = networkAccount.balances.find(
        (b): b is StellarSdk.Horizon.HorizonApi.BalanceLineNative =>
          b.asset_type === 'native',
      );

      account.balance = nativeBalance?.balance || '0';
      account.sequenceNumber = networkAccount.sequenceNumber();

      return await this.accountRepository.save(account);
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Account not yet created on network
        return account;
      }
      throw error;
    }
  }

  /**
   * Get accounts for a user
   */
  async getAccountsByUserId(userId: string): Promise<StellarAccount[]> {
    return this.accountRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // ==================== Payment Processing ====================

  /**
   * Send a payment from one account to another
   */
  async sendPayment(dto: CreatePaymentDto): Promise<StellarTransaction> {
    // Check for idempotency
    if (dto.idempotencyKey) {
      const existingTx = await this.transactionRepository.findOne({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existingTx) {
        this.logger.log(
          `Returning existing transaction for idempotency key: ${dto.idempotencyKey}`,
        );
        return existingTx;
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get source account
      const sourceAccount = await this.getAccountByPublicKey(
        dto.sourcePublicKey,
      );

      // Decrypt secret key
      const secretKey = this.encryptionService.decrypt(
        sourceAccount.secretKeyEncrypted,
      );
      const sourceKeypair = StellarSdk.Keypair.fromSecret(secretKey);

      // Load account from network
      const networkAccount = await this.horizon.loadAccount(
        dto.sourcePublicKey,
      );

      // Build asset
      let asset: StellarSdk.Asset;
      let assetType = AssetType.NATIVE;
      let assetCode: string | null = null;
      let assetIssuer: string | null = null;

      if (dto.asset && dto.asset.type !== AssetType.NATIVE) {
        if (!dto.asset.code || !dto.asset.issuer) {
          throw new BadRequestException(
            'Asset code and issuer required for non-native assets',
          );
        }
        asset = new StellarSdk.Asset(dto.asset.code, dto.asset.issuer);
        assetType = dto.asset.type;
        assetCode = dto.asset.code;
        assetIssuer = dto.asset.issuer;
      } else {
        asset = StellarSdk.Asset.native();
      }

      // Build transaction
      const transactionBuilder = new StellarSdk.TransactionBuilder(
        networkAccount,
        {
          fee: this.baseFee,
          networkPassphrase: this.networkPassphrase,
        },
      )
        .addOperation(
          StellarSdk.Operation.payment({
            destination: dto.destinationPublicKey,
            asset,
            amount: dto.amount,
          }),
        )
        .setTimeout(180);

      // Add memo if provided
      if (dto.memo) {
        switch (dto.memoType) {
          case MemoType.TEXT:
            transactionBuilder.addMemo(StellarSdk.Memo.text(dto.memo));
            break;
          case MemoType.ID:
            transactionBuilder.addMemo(StellarSdk.Memo.id(dto.memo));
            break;
          case MemoType.HASH:
            transactionBuilder.addMemo(StellarSdk.Memo.hash(dto.memo));
            break;
          case MemoType.RETURN:
            transactionBuilder.addMemo(StellarSdk.Memo.return(dto.memo));
            break;
          default:
            transactionBuilder.addMemo(StellarSdk.Memo.text(dto.memo));
        }
      }

      const transaction = transactionBuilder.build();
      transaction.sign(sourceKeypair);

      // Create pending transaction record
      const txRecord = this.transactionRepository.create({
        transactionHash: transaction.hash().toString('hex'),
        fromAccountId: sourceAccount.id,
        toAccountId: null, // Will update if destination is in our system
        sourceAccount: dto.sourcePublicKey,
        destinationAccount: dto.destinationPublicKey,
        amount: dto.amount,
        assetType,
        assetCode,
        assetIssuer,
        feePaid: parseInt(this.baseFee),
        memo: dto.memo || null,
        memoType: dto.memoType || null,
        status: TransactionStatus.PENDING,
        idempotencyKey: dto.idempotencyKey || null,
      });

      // Try to find destination account in our system
      try {
        const destAccount = await this.getAccountByPublicKey(
          dto.destinationPublicKey,
        );
        txRecord.toAccountId = destAccount.id;
      } catch {
        // Destination not in our system, that's okay
      }

      await queryRunner.manager.save(txRecord);

      // Submit to network
      try {
        const result = await this.horizon.submitTransaction(transaction);

        txRecord.status = TransactionStatus.COMPLETED;
        txRecord.ledger = result.ledger;

        await queryRunner.manager.save(txRecord);
        await queryRunner.commitTransaction();

        // Sync account balances
        this.syncAccountFromNetwork(dto.sourcePublicKey).catch((err) =>
          this.logger.error('Failed to sync source account', err),
        );

        this.logger.log(`Payment successful: ${txRecord.transactionHash}`);
        return txRecord;
      } catch (submitError: any) {
        txRecord.status = TransactionStatus.FAILED;
        txRecord.errorMessage = this.extractErrorMessage(submitError);

        await queryRunner.manager.save(txRecord);
        await queryRunner.commitTransaction();

        this.logger.error(
          `Payment failed: ${txRecord.errorMessage}`,
          submitError,
        );
        throw new BadRequestException(
          `Payment failed: ${txRecord.errorMessage}`,
        );
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * List transactions with filters
   */
  async listTransactions(
    dto: ListTransactionsDto,
  ): Promise<{ transactions: StellarTransaction[]; total: number }> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.fromAccount', 'fromAccount')
      .leftJoinAndSelect('tx.toAccount', 'toAccount');

    if (dto.publicKey) {
      queryBuilder.andWhere(
        '(tx.sourceAccount = :publicKey OR tx.destinationAccount = :publicKey)',
        { publicKey: dto.publicKey },
      );
    }

    if (dto.status) {
      queryBuilder.andWhere('tx.status = :status', { status: dto.status });
    }

    if (dto.startDate) {
      queryBuilder.andWhere('tx.createdAt >= :startDate', {
        startDate: new Date(dto.startDate),
      });
    }

    if (dto.endDate) {
      queryBuilder.andWhere('tx.createdAt <= :endDate', {
        endDate: new Date(dto.endDate),
      });
    }

    const [transactions, total] = await queryBuilder
      .orderBy('tx.createdAt', 'DESC')
      .skip(dto.offset)
      .take(dto.limit)
      .getManyAndCount();

    return { transactions, total };
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: number): Promise<StellarTransaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['fromAccount', 'toAccount'],
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  /**
   * Get transaction by hash
   */
  async getTransactionByHash(hash: string): Promise<StellarTransaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { transactionHash: hash },
      relations: ['fromAccount', 'toAccount'],
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with hash ${hash} not found`);
    }

    return transaction;
  }

  // ==================== Escrow Management ====================

  /**
   * Create an escrow account and fund it
   */
  async createEscrow(dto: CreateEscrowDto): Promise<StellarEscrow> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get source and destination accounts
      const sourceAccount = await this.getAccountByPublicKey(
        dto.sourcePublicKey,
      );
      const destinationAccount = await this.getAccountByPublicKey(
        dto.destinationPublicKey,
      );

      // Create escrow account
      const escrowAccount = await this.createAccount({
        accountType: StellarAccountType.ESCROW,
      });

      // Build asset
      const assetType = dto.assetType || AssetType.NATIVE;
      const assetCode = dto.assetCode || null;
      const assetIssuer = dto.assetIssuer || null;

      // Decrypt source secret key
      const sourceSecretKey = this.encryptionService.decrypt(
        sourceAccount.secretKeyEncrypted,
      );
      const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecretKey);

      // Load source account from network
      const networkAccount = await this.horizon.loadAccount(
        dto.sourcePublicKey,
      );

      // Build transaction to create and fund escrow account
      const createAccountOp = StellarSdk.Operation.createAccount({
        destination: escrowAccount.publicKey,
        startingBalance: dto.amount,
      });

      const transaction = new StellarSdk.TransactionBuilder(networkAccount, {
        fee: this.baseFee,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(createAccountOp)
        .setTimeout(180)
        .build();

      transaction.sign(sourceKeypair);

      // Submit transaction
      const result = await this.horizon.submitTransaction(transaction);

      // Get escrow account sequence number
      const escrowNetworkAccount = await this.horizon.loadAccount(
        escrowAccount.publicKey,
      );

      // Create escrow record
      const escrow = this.escrowRepository.create({
        escrowAccountId: escrowAccount.id,
        sourceAccountId: sourceAccount.id,
        destinationAccountId: destinationAccount.id,
        amount: dto.amount,
        assetType,
        assetCode,
        assetIssuer,
        sequenceNumber: escrowNetworkAccount.sequenceNumber(),
        status: EscrowStatus.ACTIVE,
        releaseConditions: dto.releaseConditions || null,
        expirationDate: dto.expirationDate
          ? new Date(dto.expirationDate)
          : null,
        rentAgreementId: dto.rentAgreementId || null,
      });

      const savedEscrow = await queryRunner.manager.save(escrow);

      // Update escrow account balance
      escrowAccount.balance = dto.amount;
      escrowAccount.sequenceNumber = escrowNetworkAccount.sequenceNumber();
      await queryRunner.manager.save(escrowAccount);

      // Record the funding transaction
      const txRecord = this.transactionRepository.create({
        transactionHash: result.hash,
        fromAccountId: sourceAccount.id,
        toAccountId: escrowAccount.id,
        sourceAccount: dto.sourcePublicKey,
        destinationAccount: escrowAccount.publicKey,
        amount: dto.amount,
        assetType,
        assetCode,
        assetIssuer,
        feePaid: parseInt(this.baseFee),
        memo: `Escrow funding for escrow ${savedEscrow.id}`,
        memoType: MemoType.TEXT,
        status: TransactionStatus.COMPLETED,
        ledger: result.ledger,
      });

      await queryRunner.manager.save(txRecord);
      await queryRunner.commitTransaction();

      this.logger.log(
        `Created escrow ${savedEscrow.id} with account ${escrowAccount.publicKey}`,
      );

      // Reload with relations
      return this.getEscrowById(savedEscrow.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to create escrow', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Release escrow funds to destination
   */
  async releaseEscrow(dto: ReleaseEscrowDto): Promise<StellarEscrow> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const escrow = await this.getEscrowById(dto.escrowId);

      if (escrow.status !== EscrowStatus.ACTIVE) {
        throw new BadRequestException(
          `Cannot release escrow in ${escrow.status} status`,
        );
      }

      // Check release conditions if any
      if (escrow.releaseConditions?.timelock?.releaseAfter) {
        const releaseDate = new Date(
          escrow.releaseConditions.timelock.releaseAfter,
        );
        if (new Date() < releaseDate) {
          throw new BadRequestException(
            `Escrow cannot be released until ${releaseDate.toISOString()}`,
          );
        }
      }

      // Get escrow account
      const escrowAccount = await this.getAccountById(escrow.escrowAccountId);
      const destinationAccount = await this.getAccountById(
        escrow.destinationAccountId,
      );

      // Decrypt escrow secret key
      const escrowSecretKey = this.encryptionService.decrypt(
        escrowAccount.secretKeyEncrypted,
      );
      const escrowKeypair = StellarSdk.Keypair.fromSecret(escrowSecretKey);

      // Load escrow account from network
      const networkAccount = await this.horizon.loadAccount(
        escrowAccount.publicKey,
      );

      // Build asset
      let asset: StellarSdk.Asset;
      if (escrow.assetType === AssetType.NATIVE) {
        asset = StellarSdk.Asset.native();
      } else {
        if (!escrow.assetCode || !escrow.assetIssuer) {
          throw new BadRequestException(
            'Asset code and issuer required for non-native assets',
          );
        }
        asset = new StellarSdk.Asset(escrow.assetCode, escrow.assetIssuer);
      }

      // Calculate amount to send (leave minimum for account deletion)
      const nativeBalance = networkAccount.balances.find(
        (b): b is StellarSdk.Horizon.HorizonApi.BalanceLineNative =>
          b.asset_type === 'native',
      );
      const availableBalance = parseFloat(nativeBalance?.balance || '0');
      const reserveRequired = 1; // Minimum reserve for merge
      const amountToSend = (availableBalance - reserveRequired).toFixed(7);

      // Build transaction to release funds and merge account
      const transaction = new StellarSdk.TransactionBuilder(networkAccount, {
        fee: this.baseFee,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: destinationAccount.publicKey,
            asset: StellarSdk.Asset.native(),
            amount: amountToSend,
          }),
        )
        .addOperation(
          StellarSdk.Operation.accountMerge({
            destination: destinationAccount.publicKey,
          }),
        )
        .setTimeout(180)
        .build();

      if (dto.memo) {
        // Add memo for release
      }

      transaction.sign(escrowKeypair);

      // Submit transaction
      const result = await this.horizon.submitTransaction(transaction);

      // Update escrow status
      escrow.status = EscrowStatus.RELEASED;
      escrow.releasedAt = new Date();
      escrow.releaseTransactionHash = result.hash;
      await queryRunner.manager.save(escrow);

      // Deactivate escrow account
      escrowAccount.isActive = false;
      escrowAccount.balance = '0';
      await queryRunner.manager.save(escrowAccount);

      // Record the release transaction
      const txRecord = this.transactionRepository.create({
        transactionHash: result.hash,
        fromAccountId: escrowAccount.id,
        toAccountId: destinationAccount.id,
        sourceAccount: escrowAccount.publicKey,
        destinationAccount: destinationAccount.publicKey,
        amount: escrow.amount,
        assetType: escrow.assetType,
        assetCode: escrow.assetCode,
        assetIssuer: escrow.assetIssuer,
        feePaid: parseInt(this.baseFee),
        memo: `Escrow release for escrow ${escrow.id}`,
        memoType: MemoType.TEXT,
        status: TransactionStatus.COMPLETED,
        ledger: result.ledger,
      });

      await queryRunner.manager.save(txRecord);
      await queryRunner.commitTransaction();

      this.logger.log(`Released escrow ${escrow.id}`);

      return this.getEscrowById(escrow.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to release escrow', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Refund escrow funds back to source
   */
  async refundEscrow(dto: RefundEscrowDto): Promise<StellarEscrow> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const escrow = await this.getEscrowById(dto.escrowId);

      if (escrow.status !== EscrowStatus.ACTIVE) {
        throw new BadRequestException(
          `Cannot refund escrow in ${escrow.status} status`,
        );
      }

      // Get accounts
      const escrowAccount = await this.getAccountById(escrow.escrowAccountId);
      const sourceAccount = await this.getAccountById(escrow.sourceAccountId);

      // Decrypt escrow secret key
      const escrowSecretKey = this.encryptionService.decrypt(
        escrowAccount.secretKeyEncrypted,
      );
      const escrowKeypair = StellarSdk.Keypair.fromSecret(escrowSecretKey);

      // Load escrow account from network
      const networkAccount = await this.horizon.loadAccount(
        escrowAccount.publicKey,
      );

      // Calculate amount to send
      const nativeBalance = networkAccount.balances.find(
        (b): b is StellarSdk.Horizon.HorizonApi.BalanceLineNative =>
          b.asset_type === 'native',
      );
      const availableBalance = parseFloat(nativeBalance?.balance || '0');
      const reserveRequired = 1;
      const amountToSend = (availableBalance - reserveRequired).toFixed(7);

      // Build transaction to refund and merge account
      const transaction = new StellarSdk.TransactionBuilder(networkAccount, {
        fee: this.baseFee,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: sourceAccount.publicKey,
            asset: StellarSdk.Asset.native(),
            amount: amountToSend,
          }),
        )
        .addOperation(
          StellarSdk.Operation.accountMerge({
            destination: sourceAccount.publicKey,
          }),
        )
        .setTimeout(180)
        .build();

      transaction.sign(escrowKeypair);

      // Submit transaction
      const result = await this.horizon.submitTransaction(transaction);

      // Update escrow status
      escrow.status = EscrowStatus.REFUNDED;
      escrow.refundedAt = new Date();
      escrow.refundTransactionHash = result.hash;
      await queryRunner.manager.save(escrow);

      // Deactivate escrow account
      escrowAccount.isActive = false;
      escrowAccount.balance = '0';
      await queryRunner.manager.save(escrowAccount);

      // Record the refund transaction
      const txRecord = this.transactionRepository.create({
        transactionHash: result.hash,
        fromAccountId: escrowAccount.id,
        toAccountId: sourceAccount.id,
        sourceAccount: escrowAccount.publicKey,
        destinationAccount: sourceAccount.publicKey,
        amount: escrow.amount,
        assetType: escrow.assetType,
        assetCode: escrow.assetCode,
        assetIssuer: escrow.assetIssuer,
        feePaid: parseInt(this.baseFee),
        memo: `Escrow refund for escrow ${escrow.id}: ${dto.reason || 'No reason provided'}`,
        memoType: MemoType.TEXT,
        status: TransactionStatus.COMPLETED,
        ledger: result.ledger,
      });

      await queryRunner.manager.save(txRecord);
      await queryRunner.commitTransaction();

      this.logger.log(`Refunded escrow ${escrow.id}`);

      return this.getEscrowById(escrow.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to refund escrow', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get escrow by ID
   */
  async getEscrowById(id: number): Promise<StellarEscrow> {
    const escrow = await this.escrowRepository.findOne({
      where: { id },
      relations: ['escrowAccount', 'sourceAccount', 'destinationAccount'],
    });

    if (!escrow) {
      throw new NotFoundException(`Escrow with ID ${id} not found`);
    }

    return escrow;
  }

  /**
   * List escrows with filters
   */
  async listEscrows(
    dto: ListEscrowsDto,
  ): Promise<{ escrows: StellarEscrow[]; total: number }> {
    const queryBuilder = this.escrowRepository
      .createQueryBuilder('escrow')
      .leftJoinAndSelect('escrow.escrowAccount', 'escrowAccount')
      .leftJoinAndSelect('escrow.sourceAccount', 'sourceAccount')
      .leftJoinAndSelect('escrow.destinationAccount', 'destinationAccount');

    if (dto.publicKey) {
      queryBuilder.andWhere(
        '(sourceAccount.publicKey = :publicKey OR destinationAccount.publicKey = :publicKey)',
        { publicKey: dto.publicKey },
      );
    }

    if (dto.status) {
      queryBuilder.andWhere('escrow.status = :status', { status: dto.status });
    }

    const [escrows, total] = await queryBuilder
      .orderBy('escrow.createdAt', 'DESC')
      .skip(dto.offset)
      .take(dto.limit)
      .getManyAndCount();

    return { escrows, total };
  }

  /**
   * Check and process expired escrows
   */
  async processExpiredEscrows(): Promise<void> {
    const expiredEscrows = await this.escrowRepository.find({
      where: {
        status: EscrowStatus.ACTIVE,
      },
      relations: ['escrowAccount', 'sourceAccount'],
    });

    for (const escrow of expiredEscrows) {
      if (escrow.expirationDate && new Date() > escrow.expirationDate) {
        try {
          await this.refundEscrow({
            escrowId: escrow.id,
            reason: 'Escrow expired',
          });
          this.logger.log(`Processed expired escrow ${escrow.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to process expired escrow ${escrow.id}`,
            error,
          );
        }
      }
    }
  }

  // ==================== Helper Methods ====================

  private extractErrorMessage(error: any): string {
    if (error.response?.data?.extras?.result_codes) {
      const codes = error.response.data.extras.result_codes;
      if (codes.operations) {
        return `Operation failed: ${codes.operations.join(', ')}`;
      }
      if (codes.transaction) {
        return `Transaction failed: ${codes.transaction}`;
      }
    }
    return error.message || 'Unknown error';
  }
}
