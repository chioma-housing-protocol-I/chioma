# Blockchain Integration Guide

This document describes how Chioma integrates with the Stellar blockchain, including SDK usage, account and wallet management, transaction handling, smart contract interaction, security considerations, error handling, testing, monitoring, troubleshooting, and a checklist.

---

## Stellar SDK

### Purpose

Chioma uses the Stellar SDK to:

- build and sign transactions
- submit transactions to Horizon
- query accounts, balances, and ledgers
- verify SEP-0010 authentication challenges

### Network selection

- **Testnet** must be used for local development and CI.
- **Mainnet** must be used only in production.

Avoid hardcoding network passphrases. Read network configuration from environment.

### SDK usage guidelines

- centralize Stellar SDK configuration in one module/service
- reuse Horizon server clients rather than recreating them per request
- do not log secrets, signed transactions, or mnemonic material

---

## Accounts

### Account types

Common account roles used by backend integrations:

- **server/operator account**: submits backend-initiated transactions where applicable
- **user accounts**: externally owned accounts controlled by wallets
- **distribution/escrow accounts** (if used): accounts with restricted signing policies

### Account creation

- use **friendbot** for testnet-only account funding
- never attempt to fund mainnet accounts programmatically without explicit business controls

### Account validation

Validate incoming Stellar addresses:

- must be a valid Stellar public key (typically starts with `G`)
- reject malformed addresses early with a `400`

### Balance and trustlines

When working with assets (e.g. USDC), ensure:

- the account has the required trustline
- you handle “no trustline” errors as a distinct, user-actionable failure

---

## Transactions

### Transaction lifecycle

1. **Build** transaction
2. **Sign** transaction
3. **Submit** to Horizon
4. **Observe** result (success/failure)
5. **Persist** relevant metadata (hash, ledger, envelope XDR only if needed, timestamps)

### Building transactions

- set timebounds to prevent replay/execution far in the future
- set an appropriate fee (do not assume a static fee in all environments)
- include a memo only when needed and keep it within Stellar limits

### Signing transactions

- only sign with keys that the backend is allowed to use
- never accept a secret key from clients
- prefer hardware-backed or managed secrets for operational keys

### Submitting transactions

- treat submission as unreliable: transient failures and timeouts are expected
- on timeout, treat the transaction as “unknown” and reconcile by hash later

### Handling duplicates and idempotency

- transaction submission can be retried
- ensure idempotency at the application level using:
  - a stable idempotency key
  - stored transaction hash and status

### Example: common operations (high-level)

Operations commonly used in Stellar integrations:

- payment
- create account
- change trust
- manage data

Prefer writing and reusing small helpers for these operations instead of duplicating transaction builder logic.

---

## Smart Contracts

### Scope

If Chioma interacts with Stellar smart contracts (Soroban), apply the same principles:

- keep contract invocation behind a dedicated service
- validate and sanitize all inputs to contract calls
- handle simulation/preflight errors explicitly

### Interaction patterns

- **read-only** contract calls (query state)
- **state-changing** invocations (requires signing and submission)

### Versioning and upgrades

- do not assume contract addresses are immutable across environments
- store per-environment contract addresses in configuration
- plan for upgrades by supporting multiple contract versions when required

---

## Wallets

### Wallet ownership verification

Chioma must verify a user controls a wallet address before linking it.

Use SEP-0010 (see `backend/docs/blockchain/stellar-auth.md`) and enforce:

- challenge expiration
- single-use challenges
- rate limiting
- replay prevention

### Wallet linking best practices

- allow users to re-link/rotate wallets with explicit confirmation
- audit log wallet link/unlink actions
- do not store user secret keys or mnemonics

### Custodial vs non-custodial

- treat user wallets as non-custodial by default
- if custodial keys exist for any reason, isolate them behind additional controls and approvals

---

## Security

Follow the repository security policy (`SECURITY.md`) and apply blockchain-specific controls.

### Key management

- never commit secrets
- store secrets in a managed secret store in production
- rotate operational keys
- restrict access to operational keys using least privilege

### Multi-signature and critical operations

For high-impact operations:

- use multi-signature
- require additional authorization checks
- consider two-person review for key changes and contract upgrades

### Input validation

- validate addresses, amounts, asset identifiers, and memos
- reject negative/zero amounts
- enforce min/max amount limits per business policy

### Network safety

- test on testnet first
- never run friendbot or testnet-only code in production

### Operational hardening

- rate limit blockchain-related endpoints
- protect webhooks (signature verification, replay protection)
- minimize logging of transaction details

---

## Error Handling

### Error categories

- **Validation errors (4xx)**: malformed address, invalid amount, missing fields
- **Business rule errors (4xx/422)**: insufficient balance, missing trustline, blocked user
- **Transient errors (5xx)**: Horizon timeouts, network failures, rate limiting upstream
- **Unknown outcome**: timeout after submission attempt (requires reconciliation)

### Common error scenarios

- **Insufficient balance**: user needs funding or smaller amount
- **No trustline**: user must add trustline before receiving asset
- **Bad sequence**: sequence mismatch due to concurrent submissions
- **Timeout / connection reset**: treat as unknown and reconcile by hash

### Error response guidance

- return stable error codes
- do not leak sensitive configuration
- include a request id / correlation id for support

---

## Testing

### Testnet-first strategy

- all automated tests must run on testnet or mocked Horizon clients
- never require mainnet connectivity for CI

### What to test

- transaction building correctness (unit)
- signing paths and permission checks (unit)
- Horizon submission handling (integration)
- timeout and reconciliation behavior (integration)
- SEP-0010 auth flow (e2e)

---

## Monitoring

### Metrics to track

- transaction submission success rate
- transaction confirmation latency
- Horizon error rates (by category)
- reconciliation job backlog (if applicable)
- SEP-0010 failures (invalid signature, expired challenge)

### Logs

Log:

- transaction hash
- operation type
- environment/network
- result category (success/failed/unknown)

Do not log:

- secret keys
- mnemonics
- unredacted signed payloads

---

## Troubleshooting

### Transactions failing intermittently

- check Horizon availability and rate limiting
- verify network passphrase and Horizon URL
- confirm time synchronization (clock skew affects timebounds)

### “Bad sequence” errors

- confirm you are loading the latest account sequence
- avoid concurrent submissions from the same operational account

### Asset receive failures

- check trustlines
- verify asset issuer and code

### SEP-0010 authentication failures

- confirm challenge expiration settings
- check signature verification
- check rate limiting and replay prevention

---

## Blockchain Integration Checklist

### Stellar SDK

- [ ] Network selection is environment-driven (testnet vs mainnet)
- [ ] Horizon client configuration is centralized

### Accounts

- [ ] Addresses validated
- [ ] Trustlines handled and user-actionable errors returned

### Transactions

- [ ] Timebounds set
- [ ] Fee strategy defined
- [ ] Submission handles timeouts as unknown outcomes
- [ ] Idempotency strategy implemented

### Wallets

- [ ] Wallet ownership verified via SEP-0010
- [ ] No secrets/mnemonics stored
- [ ] Audit logging for wallet link/unlink

### Security

- [ ] Secrets stored securely and rotated
- [ ] Rate limiting on blockchain endpoints
- [ ] Monitoring and alerting configured

### Error handling

- [ ] Stable error codes used
- [ ] Common blockchain error scenarios covered
