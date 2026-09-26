# Common Issues and Solutions

This document outlines the most frequently encountered issues when working with Chioma smart contracts, along with their causes and step-by-step resolution procedures.

## Table of Contents

1. [Compilation Issues](#1-compilation-issues)
2. [Deployment Failures](#2-deployment-failures)
3. [Transaction Failures](#3-transaction-failures)
4. [State Management Issues](#4-state-management-issues)
5. [Authorization Problems](#5-authorization-problems)
6. [Resource Limit Exceeded](#6-resource-limit-exceeded)
7. [Network and Connectivity Issues](#7-network-and-connectivity-issues)
8. [Testing Problems](#8-testing-problems)

---

## 1. Compilation Issues

### Issue: `wasm32-unknown-unknown` target not found

**Symptoms:**

```
error[E0463]: can't find crate for `std`
```

**Cause:** The WebAssembly target is not installed.

**Solution:**

```bash
rustup target add wasm32-unknown-unknown
```

### Issue: Clippy warnings treated as errors

**Symptoms:**

```
error: clippy found lint
```

**Cause:** Strict linting is enabled in CI/CD.

**Solution:**

- Fix all clippy warnings: `cargo clippy --all-targets --all-features -- -D warnings`
- Common fixes:
  - Add `#[allow(clippy::lint_name)]` for justified cases
  - Use `cargo fmt --all` to format code
  - Address unused variables, imports, or dead code

### Issue: Contract exceeds size limits

**Symptoms:**

```
error: the resulting WASM is too large
```

**Cause:** Contract code is too large for deployment.

**Solution:**

1. Check contract size: `ls -lh target/wasm32-unknown-unknown/release/*.wasm`
2. Optimize imports: Remove unused dependencies
3. Split functionality: Consider separating concerns into multiple contracts
4. Use `temporary` storage instead of `persistent` where appropriate

---

## 2. Deployment Failures

### Issue: Contract deployment fails with "insufficient funds"

**Symptoms:**

```
soroban contract deploy failed: insufficient balance
```

**Cause:** Account doesn't have enough XLM for deployment fees.

**Solution:**

1. Fund the account: `soroban keys fund <address> --network testnet`
2. Check balance: `soroban keys show <key> --network testnet`
3. Ensure minimum balance requirements are met

### Issue: Contract already exists at address

**Symptoms:**

```
error: contract already exists
```

**Cause:** Attempting to deploy to an occupied address.

**Solution:**

1. Use a new address: Remove `--salt` or change the salt value
2. Check existing contracts: `soroban contract list --network testnet`

### Issue: Invalid WASM file

**Symptoms:**

```
error: invalid wasm file
```

**Cause:** Corrupted or incompatible WASM binary.

**Solution:**

1. Clean and rebuild: `cargo clean && cargo build --target wasm32-unknown-unknown --release`
2. Verify Soroban SDK version compatibility
3. Check for compilation errors before deployment

---

## 3. Transaction Failures

### Issue: Transaction fails with `InvokeHostFunction`

**Symptoms:**

```
Transaction failed: InvokeHostFunction
```

**Cause:** Contract panic or error during execution.

**Solution:**

1. Check error code in transaction result
2. Cross-reference with [ERROR-CODES.md](ERROR-CODES.md)
3. Enable debug logging in tests: `cargo test -- --nocapture`
4. Use Soroban CLI to simulate: `soroban contract invoke --id <contract_id> --source <source> --network testnet -- <method> <args>`

### Issue: Sequence number out of sync

**Symptoms:**

```
error: tx_bad_seq
```

**Cause:** Account sequence number mismatch.

**Solution:**

1. Get current sequence: `soroban keys show <key> --network testnet`
2. Wait for pending transactions to complete
3. Use `--build-only` flag to check sequence without submitting

### Issue: Transaction timeout

**Symptoms:**

```
error: timeout
```

**Cause:** Transaction took too long to process.

**Solution:**

1. Optimize contract logic for gas efficiency
2. Break complex operations into multiple transactions
3. Check network status and retry during low congestion

---

## 4. State Management Issues

### Issue: Data not persisting between calls

**Symptoms:** Contract state resets unexpectedly.

**Cause:** Using `temporary` storage instead of `persistent`.

**Solution:**

1. Check storage type in contract code
2. Use `env.storage().persistent()` for long-term data
3. Verify TTL settings for temporary storage

### Issue: Storage key conflicts

**Symptoms:** Unexpected data overwrites.

**Cause:** Reusing storage keys across different data types.

**Solution:**

1. Use unique keys for different data types
2. Implement proper key prefixes
3. Refer to [STORAGE-KEYS.md](../reference/STORAGE-KEYS.md)

### Issue: Storage quota exceeded

**Symptoms:**

```
error: storage quota exceeded
```

**Cause:** Too much data stored in contract.

**Solution:**

1. Archive old data to external storage
2. Use more efficient data structures
3. Implement data cleanup procedures

---

## 5. Authorization Problems

### Issue: Unauthorized access errors

**Symptoms:** Contract returns authorization errors.

**Cause:** Incorrect caller permissions.

**Solution:**

1. Verify caller address matches authorized roles
2. Check contract initialization for correct admin addresses
3. Ensure proper authentication flow in frontend/backend

### Issue: Contract paused unexpectedly

**Symptoms:**

```
error: ContractPaused
```

**Cause:** Emergency pause activated.

**Solution:**

1. Check pause status: Call contract's `is_paused()` method
2. Contact administrator for unpause procedure
3. Monitor emergency pause events

---

## 6. Resource Limit Exceeded

### Issue: CPU instruction limit exceeded

**Symptoms:**

```
error: ResourcesExceeded (CPU)
```

**Cause:** Contract logic is too computationally expensive.

**Solution:**

1. Profile contract performance: `cargo bench`
2. Optimize algorithms (avoid O(n²) operations)
3. Break complex operations into multiple transactions
4. Use more efficient data structures

### Issue: RAM limit exceeded

**Symptoms:**

```
error: ResourcesExceeded (RAM)
```

**Cause:** Excessive memory usage.

**Solution:**

1. Reduce data processing in single transactions
2. Use streaming approaches for large datasets
3. Optimize data structures for memory efficiency

### Issue: Ledger I/O limit exceeded

**Symptoms:**

```
error: ResourcesExceeded (I/O)
```

**Cause:** Too many storage operations.

**Solution:**

1. Batch storage operations
2. Cache frequently accessed data
3. Use `instance` storage for configuration data

---

## 7. Network and Connectivity Issues

### Issue: Network connection failures

**Symptoms:** Unable to connect to Stellar network.

**Cause:** Network configuration or connectivity issues.

**Solution:**

1. Check network status: `soroban network status --network testnet`
2. Verify RPC endpoint configuration
3. Use alternative RPC providers if needed
4. Check firewall and proxy settings

### Issue: Horizon API rate limits

**Symptoms:** API requests being throttled.

**Cause:** Exceeding rate limits.

**Solution:**

1. Implement exponential backoff retry logic
2. Cache responses where possible
3. Use WebSocket connections for real-time data
4. Consider paid API tiers for production

---

## 8. Testing Problems

### Issue: Tests fail with random errors

**Symptoms:** Intermittent test failures.

**Cause:** Race conditions or state pollution between tests.

**Solution:**

1. Use `#[test]` isolation
2. Clean up state between tests
3. Use unique identifiers for test data
4. Run tests sequentially: `cargo test -- --test-threads=1`

### Issue: Test environment differs from production

**Symptoms:** Tests pass but production fails.

**Cause:** Environment differences.

**Solution:**

1. Use same Soroban version in tests and production
2. Test with realistic data volumes
3. Simulate network conditions in tests
4. Use integration tests with actual network

---

## Quick Troubleshooting Checklist

- [ ] Run `cargo check` to verify compilation
- [ ] Execute `cargo test` to ensure tests pass
- [ ] Check `cargo clippy` for linting issues
- [ ] Verify WASM builds successfully
- [ ] Test deployment on testnet
- [ ] Check error codes in transaction failures
- [ ] Verify network connectivity
- [ ] Confirm account has sufficient funds
- [ ] Check contract storage usage
- [ ] Review authorization logic

For additional help, see:

- [DEBUGGING-GUIDE.md](DEBUGGING-GUIDE.md) - Step-by-step debugging procedures
- [FAQ.md](FAQ.md) - Frequently asked questions
- [ERROR-CODES.md](ERROR-CODES.md) - Complete error code reference
