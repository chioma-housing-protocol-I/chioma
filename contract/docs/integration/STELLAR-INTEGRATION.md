# Stellar Integration Guide

**Priority:** HIGH
**Category:** Documentation
**Type:** Documentation
**Status:** Completed
**Related Issues:** #751, #18, #02, #05

## 1. Introduction

Chioma integrates with the Stellar network to provide secure, fast, and low-cost housing financial transactions. This guide covers the usage of the Stellar SDK, account management, token handling, and transaction processing within the Chioma ecosystem.

## 2. Stellar SDK Integration

Chioma uses the official `@stellar/stellar-sdk` for JavaScript/TypeScript environments.

### 2.1 Initialization

The `StellarService` initializes the Horizon server connection using configuration from the environment.

```typescript
import * as StellarSdk from "@stellar/stellar-sdk";

const horizon = new StellarSdk.Horizon.Server(process.env.STELLAR_HORIZON_URL);
const networkPassphrase = StellarSdk.Networks.TESTNET; // or PUBLIC
```

## 3. Account Management

### 3.1 Account Creation

Accounts are generated using `StellarSdk.Keypair.random()`. The public key is stored in the database, while the secret key is encrypted before storage.

```typescript
const keypair = StellarSdk.Keypair.random();
const publicKey = keypair.publicKey();
const secretKey = keypair.secret();
// Encrypt secretKey storage
```

### 3.2 Funding (Testnet)

On Testnet, accounts can be funded using Friendbot.

```typescript
const response = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
```

### 3.3 Account Synchronization

Chioma synchronizes account balances and sequence numbers from the network to ensure local data accuracy.

## 4. Token Handling

Chioma supports both the native XLM asset and custom Stellar assets (tokens).

### 4.1 Native Asset (XLM)

```typescript
const asset = StellarSdk.Asset.native();
```

### 4.2 Custom Assets

```typescript
const asset = new StellarSdk.Asset("USDC", "G...ISSUER...ID");
```

## 5. Transaction Creation and Submission

### 5.1 Building a Payment Transaction

```typescript
const account = await horizon.loadAccount(sourcePublicKey);
const transaction = new StellarSdk.TransactionBuilder(account, {
  fee: StellarSdk.BASE_FEE,
  networkPassphrase,
})
  .addOperation(
    StellarSdk.Operation.payment({
      destination: destinationPublicKey,
      asset: StellarSdk.Asset.native(),
      amount: "100.00",
    }),
  )
  .setTimeout(180)
  .build();

transaction.sign(sourceKeypair);
```

### 5.2 Idempotency

Chioma uses an `idempotencyKey` to prevent duplicate transactions. Before submitting, the system checks if a transaction with the same key already exists.

### 5.3 Resilience and Retries

- **Timeout Management:** Transactions have a set timeout (typically 180s).
- **Retry Mechanism:** Failed submissions due to transient errors (e.g., network timeout) are retried with exponential backoff.
- **Sequence Management:** Rebuilds and re-signs transactions if sequence numbers get out of sync.

## 6. Escrow Implementation

Chioma implements escrows by creating temporary Stellar accounts.

1. **Create Account:** A new random keypair is generated.
2. **Fund:** The source account sends a `createAccount` operation with the required collateral.
3. **Release:** When conditions are met, the escrow account sends its balance to the destination and performs an `accountMerge` to close itself.

## 7. Event Handling

Chioma monitors the Stellar network for events using Horizon's streaming capabilities.

- **Payments:** Detected via the `/payments` stream.
- **Ledgers:** Monitored to confirm transaction finality.

## 8. Error Handling

Stellar-specific errors are extracted and mapped to internal error types:

- `op_underfunded`: Insufficient balance.
- `tx_bad_seq`: Sequence number mismatch (triggers retry).
- `op_no_destination`: Destination account does not exist.

## 9. Best Practices

- **Security:** Never store secret keys in plain text. Use a dedicated `EncryptionService`.
- **Fees:** Always use appropriate base fees to ensure inclusion in ledgers during high traffic.
- **Timebounds:** Always set timebounds on transactions to prevent them from hanging indefinitely.
- **Cold Wallets:** Use multi-sig for high-value admin accounts.

## 10. Examples

### Sending USDC

```typescript
const tx = await stellarService.sendPayment({
  sourcePublicKey: "G...",
  destinationPublicKey: "G...",
  amount: "50.00",
  asset: {
    type: AssetType.CREDIT_ALPHANUM4,
    code: "USDC",
    issuer: "G...ISSUER...",
  },
});
```
