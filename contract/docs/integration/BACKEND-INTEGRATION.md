# Backend Integration Guide

**Status:** Completed  
**Category:** Documentation  
**Type:** Integration Guide  

## Overview

This guide explains how the Chioma backend integrates with Stellar smart contracts, handles payments, manages escrows, and coordinates with external services.

## 1. Backend Architecture Overview

The backend follows a layered architecture:

```
API Controllers
    ↓
Business Services
    ↓
Contract Adapters
    ↓
Stellar SDK
    ↓
Stellar Network
```

### Key Layers

- **Controllers**: Handle HTTP requests and validation
- **Services**: Business logic for payments, agreements, escrows
- **Adapters**: Abstract contract interactions
- **Stellar SDK**: Low-level Stellar operations

## 2. Stellar Contract Integration

### 2.1 Contract Service

The `StellarContractService` manages all contract interactions:

```typescript
@Injectable()
export class StellarContractService {
  async invokeContract(
    contractId: string,
    method: string,
    args: any[],
    sourceKeypair: Keypair,
    fee?: number
  ): Promise<TransactionResult> {
    // Implementation
  }

  async readContractData(
    contractId: string,
    key: string
  ): Promise<any> {
    // Implementation
  }
}
```

### 2.2 Contract Invocation

```typescript
// Invoke payment contract
const result = await this.contractService.invokeContract(
  contractIds.payment,
  'process_payment',
  [
    agreement_id,
    amount,
    source_address,
    destination_address
  ],
  sourcKeypair,
  BASE_FEE
);
```

### 2.3 Error Handling

Contract invocations can fail for multiple reasons:

```typescript
try {
  const result = await contractService.invokeContract(...);
} catch (error) {
  if (error.code === 'op_underfunded') {
    // Handle insufficient balance
  } else if (error.code === 'tx_bad_seq') {
    // Handle sequence number mismatch - retry
  } else {
    // Handle other errors
  }
}
```

## 3. Payment Processing

### 3.1 Payment Flow

```
1. Tenant initiates payment request
2. Backend validates payment amount and agreement status
3. Backend builds and signs Stellar transaction
4. Backend invokes Payment contract
5. Contract validates and processes payment
6. Backend records payment in database
7. Backend sends confirmation to frontend
```

### 3.2 Payment Service Implementation

```typescript
@Injectable()
export class PaymentService {
  async processPayment(
    agreementId: string,
    amount: u128,
    tenantKeypair: Keypair
  ): Promise<PaymentResult> {
    // Validate agreement exists and is active
    const agreement = await this.agreementRepository.findById(agreementId);
    if (!agreement) throw new NotFoundException();

    // Build and sign transaction
    const txBuilder = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET
    });

    // Invoke payment contract
    const contractOp = Operation.invokeHostFunction({
      func: new ContractClient(this.contractIds.payment).processPayment(
        agreementId,
        amount,
        agreement.tenant,
        agreement.landlord
      )
    });

    const tx = txBuilder.addOperation(contractOp).setTimeout(180).build();
    tx.sign(tenantKeypair);

    // Submit and confirm
    return await this.submitAndConfirm(tx);
  }

  async recordPayment(
    agreementId: string,
    transactionHash: string,
    amount: string
  ): Promise<void> {
    // Store payment record in database
    await this.paymentRepository.create({
      agreement_id: agreementId,
      transaction_hash: transactionHash,
      amount: new Decimal(amount),
      status: PaymentStatus.CONFIRMED,
      confirmed_at: new Date()
    });
  }
}
```

## 4. Escrow Management

### 4.1 Escrow Creation

When a rental agreement is created, funds are held in escrow:

```typescript
async createEscrow(
  agreement_id: string,
  payer: Address,
  payee: Address,
  amount: u128,
  timeout_days: u32
): Promise<EscrowResult> {
  const escrowId = generateHash(agreement_id);

  const result = await this.contractService.invokeContract(
    contractIds.escrow,
    'create_escrow',
    [escrowId, payer, payee, amount, timeout_days],
    payerKeypair
  );

  // Record escrow in database
  await this.escrowRepository.create({
    id: escrowId,
    agreement_id,
    payer,
    payee,
    amount,
    status: EscrowStatus.HELD,
    contract_transaction: result.hash
  });

  return result;
}
```

### 4.2 Escrow Release

Release held funds when conditions are met:

```typescript
async releaseEscrow(
  escrow_id: string,
  requester: Address
): Promise<ReleaseResult> {
  // Verify conditions are met
  const escrow = await this.escrowRepository.findById(escrow_id);
  if (!escrow) throw new NotFoundException();
  if (escrow.status !== EscrowStatus.HELD) {
    throw new ConflictException('Escrow not in held state');
  }

  // Invoke contract
  const result = await this.contractService.invokeContract(
    contractIds.escrow,
    'release_escrow',
    [escrow_id, requester],
    requesterKeypair
  );

  // Update status
  await this.escrowRepository.update(escrow_id, {
    status: EscrowStatus.RELEASED,
    released_at: new Date()
  });

  return result;
}
```

## 5. Event Handling

### 5.1 Contract Event Listener

Monitor contract events for off-chain updates:

```typescript
@Injectable()
export class ContractEventListener {
  constructor(private eventBus: EventBus) {}

  async startListening(): Promise<void> {
    // Subscribe to Stellar events
    this.stellarService.streamPayments((payment) => {
      this.handlePaymentEvent(payment);
    });

    this.stellarService.streamOperations((operation) => {
      this.handleOperationEvent(operation);
    });
  }

  private async handlePaymentEvent(payment: any): Promise<void> {
    // Emit domain event for backend processors
    this.eventBus.publish(
      new PaymentProcessedEvent(
        payment.id,
        payment.amount,
        payment.source,
        payment.destination
      )
    );
  }
}
```

### 5.2 Event Processing

```typescript
@EventHandler(PaymentProcessedEvent)
async handlePaymentProcessed(event: PaymentProcessedEvent) {
  // Update payment record
  const payment = await this.paymentRepository.findByTransactionId(event.id);
  if (payment) {
    payment.status = PaymentStatus.CONFIRMED;
    await this.paymentRepository.update(payment);
  }

  // Send notification
  await this.notificationService.notifyPaymentConfirmed(
    event.source,
    event.destination,
    event.amount
  );
}
```

## 6. Account Management

### 6.1 Account Creation for Users

Create Stellar accounts for new users:

```typescript
async createUserAccount(userId: string): Promise<UserAccount> {
  // Generate keypair
  const keypair = Keypair.random();

  // Fund account (testnet only)
  if (isTestnet()) {
    await fetch(
      `https://friendbot.stellar.org?addr=${keypair.publicKey()}`
    );
  }

  // Store encrypted keypair
  const encryptedSecret = await this.encryptionService.encrypt(
    keypair.secret()
  );

  const account = await this.userAccountRepository.create({
    user_id: userId,
    public_key: keypair.publicKey(),
    secret_key_encrypted: encryptedSecret,
    created_at: new Date()
  });

  return account;
}
```

### 6.2 Account Synchronization

Sync account balances from Stellar network:

```typescript
async syncAccountBalance(publicKey: string): Promise<void> {
  const horizonAccount = await this.horizon.loadAccount(publicKey);

  const balances = horizonAccount.balances.map((balance) => ({
    asset_code: balance.asset_code || 'XLM',
    asset_issuer: balance.asset_issuer,
    balance: new Decimal(balance.balance),
    synced_at: new Date()
  }));

  await this.accountBalanceRepository.upsert(publicKey, balances);
}
```

## 7. Transaction Building and Submission

### 7.1 Transaction Builder Pattern

```typescript
async buildAndSubmitTransaction(
  sourceAccount: Account,
  operations: Operation[],
  signer: Keypair,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const txBuilder = new TransactionBuilder(sourceAccount, {
    fee: options?.fee || BASE_FEE,
    networkPassphrase: this.networkPassphrase
  });

  operations.forEach(op => txBuilder.addOperation(op));

  const tx = txBuilder
    .setTimeout(options?.timeout || 180)
    .build();

  tx.sign(signer);

  return await this.submitTransaction(tx);
}
```

### 7.2 Transaction Submission with Retries

```typescript
async submitTransaction(
  tx: Transaction,
  maxRetries: number = 3
): Promise<TransactionResult> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await this.horizon.submitTransaction(tx);
      return response;
    } catch (error) {
      lastError = error;

      if (error.status === 400 && error.data?.extras?.tx_bad_seq) {
        // Sequence number out of sync, reload and retry
        console.log(`Retry ${attempt}/${maxRetries}: Sequence mismatch`);
        await this.reloadAccountSequence(tx.source);
        continue;
      }

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

## 8. Security Considerations

### 8.1 Key Management

- Never store unencrypted keypairs in logs or memory
- Use HSM or secure vault for production keys
- Implement key rotation policies
- Use different keys for different operations

### 8.2 Transaction Validation

```typescript
async validateTransaction(tx: Transaction): Promise<void> {
  // Verify signature count
  if (tx.signatures.length === 0) {
    throw new Error('Transaction must be signed');
  }

  // Verify operation count
  if (tx.operations.length === 0) {
    throw new Error('Transaction must contain operations');
  }

  // Verify fee
  if (tx.fee < BASE_FEE * tx.operations.length) {
    throw new Error('Insufficient fee');
  }

  // Verify timeout
  const timebounds = tx.timebounds;
  if (timebounds.minTime === 0 && timebounds.maxTime === 0) {
    throw new Error('Transaction must have timebounds');
  }
}
```

### 8.3 Rate Limiting

```typescript
@UseGuards(ThrottleGuard)
@Throttle(10, 60) // 10 requests per 60 seconds
@Post('payments')
async createPayment(@Body() dto: CreatePaymentDto) {
  return this.paymentService.processPayment(dto);
}
```

## 9. Error Recovery

### 9.1 Failed Transaction Handling

```typescript
async handleFailedTransaction(
  tx: Transaction,
  error: StellarError
): Promise<void> {
  const failureRecord = {
    transaction_hash: tx.hash(),
    error_code: error.code,
    error_message: error.message,
    retry_count: 0,
    next_retry_at: new Date(Date.now() + 5 * 60000) // 5 minutes
  };

  await this.failedTransactionRepository.create(failureRecord);

  // Emit event for recovery handler
  this.eventBus.publish(
    new TransactionFailedEvent(failureRecord)
  );
}
```

### 9.2 Idempotency

```typescript
async processPaymentIdempotent(
  idempotencyKey: string,
  agreementId: string,
  amount: u128,
  signer: Keypair
): Promise<PaymentResult> {
  // Check if already processed
  const existing = await this.paymentRepository.findByIdempotencyKey(
    idempotencyKey
  );
  if (existing) {
    return existing;
  }

  // Process payment
  const result = await this.paymentService.processPayment(
    agreementId,
    amount,
    signer
  );

  // Store with idempotency key
  result.idempotency_key = idempotencyKey;
  await this.paymentRepository.save(result);

  return result;
}
```

## 10. Testing

### 10.1 Integration Tests

```typescript
describe('PaymentService', () => {
  it('should process payment successfully', async () => {
    const agreement = await createTestAgreement();
    const tenant = await createTestUser();

    const result = await paymentService.processPayment(
      agreement.id,
      amount,
      tenant.keypair
    );

    expect(result.status).toBe('confirmed');
    expect(result.amount).toBe(amount.toString());
  });

  it('should fail with insufficient balance', async () => {
    const agreement = await createTestAgreement();
    const tenant = createUserWithoutFunds();

    await expect(
      paymentService.processPayment(
        agreement.id,
        amount,
        tenant.keypair
      )
    ).rejects.toThrow('Insufficient balance');
  });
});
```

### 10.2 Contract Testing

```typescript
describe('Payment Contract', () => {
  it('should accept valid payments', async () => {
    const tx = await invokePaymentContract({
      method: 'process_payment',
      args: [agreementId, amount, tenant, landlord]
    });

    expect(tx.status).toBe('success');
  });

  it('should reject overpayments', async () => {
    const tx = await invokePaymentContract({
      method: 'process_payment',
      args: [agreementId, tooLargeAmount, tenant, landlord]
    });

    expect(tx.status).toBe('failure');
  });
});
```

## Related Documentation

- [Storage Keys Reference](../reference/STORAGE-KEYS.md)
- [Stellar Integration](./STELLAR-INTEGRATION.md)
- [Testing Strategy](../testing/TESTING-STRATEGY.md)
- [Contract Architecture](../architecture/CONTRACT-ARCHITECTURE.md)
