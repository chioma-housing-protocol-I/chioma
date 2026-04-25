# Contract Debugging Guide

This guide provides step-by-step procedures for debugging Chioma smart contracts, including local testing, deployment issues, and production troubleshooting.

## Table of Contents

1. [Local Development Debugging](#1-local-development-debugging)
2. [Test Debugging](#2-test-debugging)
3. [Deployment Debugging](#3-deployment-debugging)
4. [Transaction Debugging](#4-transaction-debugging)
5. [State Inspection](#5-state-inspection)
6. [Event Monitoring](#6-event-monitoring)
7. [Performance Debugging](#7-performance-debugging)
8. [Remote Debugging](#8-remote-debugging)

---

## 1. Local Development Debugging

### Setting Up Debug Environment

1. **Install Soroban CLI with debug support**:

   ```bash
   cargo install --locked soroban-cli --features debug
   ```

2. **Enable debug logging in tests**:

   ```rust
   use soroban_sdk::testutils::Logger;

   #[test]
   fn test_with_logging() {
       let env = Env::default();
       env.logger().enable();
       // Your test code
   }
   ```

3. **Run tests with verbose output**:
   ```bash
   cargo test -- --nocapture
   ```

### Common Debug Commands

```bash
# Check compilation
cargo check

# Build with debug symbols
cargo build --target wasm32-unknown-unknown --release

# Run specific test
cargo test test_name -- --nocapture

# Run all tests with backtrace
RUST_BACKTRACE=1 cargo test
```

---

## 2. Test Debugging

### Debugging Test Failures

1. **Enable panic backtraces**:

   ```bash
   RUST_BACKTRACE=full cargo test
   ```

2. **Add debug prints in tests**:

   ```rust
   use soroban_sdk::{log, Env};

   #[test]
   fn debug_test() {
       let env = Env::default();
       log!(&env, "Debug: value = {}", some_value);
       // Test logic
   }
   ```

3. **Use test utilities for inspection**:

   ```rust
   use soroban_sdk::testutils::{Ledger, Events};

   #[test]
   fn inspect_state() {
       let env = Env::default();

       // Check ledger state
       assert_eq!(env.ledger().sequence(), 1);

       // Inspect events after operation
       let events = env.events().all();
       assert_eq!(events.len(), 1);
   }
   ```

### Debugging Specific Contract Methods

1. **Test contract initialization**:

   ```rust
   #[test]
   fn test_initialization() {
       let env = Env::default();
       let contract_id = env.register_contract(None, Contract);

       // Test initialization
       let result = env.call(
           &contract_id,
           &Symbol::new(&env, "initialize"),
           vec![&env, admin_address],
       );

       assert!(result.is_ok());
   }
   ```

2. **Debug state changes**:

   ```rust
   #[test]
   fn debug_state_changes() {
       let env = Env::default();
       let contract_id = env.register_contract(None, Contract);

       // Get initial state
       let initial_state = env.call(&contract_id, &Symbol::new(&env, "get_state"), vec![]);

       // Perform operation
       env.call(&contract_id, &Symbol::new(&env, "some_operation"), vec![]);

       // Check state after operation
       let final_state = env.call(&contract_id, &Symbol::new(&env, "get_state"), vec![]);

       log!(&env, "State changed from {:?} to {:?}", initial_state, final_state);
   }
   ```

---

## 3. Deployment Debugging

### Pre-deployment Checks

1. **Validate WASM file**:

   ```bash
   # Check file size
   ls -lh target/wasm32-unknown-unknown/release/*.wasm

   # Verify WASM is valid
   wasm-validate target/wasm32-unknown-unknown/release/contract.wasm
   ```

2. **Test deployment locally**:

   ```bash
   # Create local network
   soroban network start --local

   # Deploy to local network
   soroban contract deploy \
     --wasm target/wasm32-unknown-unknown/release/contract.wasm \
     --source alice \
     --network local
   ```

3. **Check account balance**:
   ```bash
   soroban keys show alice --network testnet
   ```

### Deployment Issue Resolution

1. **Insufficient funds error**:

   ```bash
   # Fund account
   soroban keys fund alice --network testnet
   ```

2. **Contract already exists**:

   ```bash
   # Use different salt
   soroban contract deploy \
     --wasm contract.wasm \
     --salt $(openssl rand -hex 32) \
     --source alice \
     --network testnet
   ```

3. **Invalid WASM error**:
   ```bash
   # Rebuild contract
   cargo clean
   cargo build --target wasm32-unknown-unknown --release
   ```

---

## 4. Transaction Debugging

### Analyzing Failed Transactions

1. **Get transaction details**:

   ```bash
   soroban transaction get --id <tx_hash> --network testnet
   ```

2. **Check transaction result**:

   ```bash
   soroban transaction status --id <tx_hash> --network testnet
   ```

3. **Decode error codes**:
   - Check the returned error code against [ERROR-CODES.md](ERROR-CODES.md)
   - Use Soroban CLI to decode: `soroban transaction decode --xdr <result_xdr>`

### Simulating Transactions

1. **Dry run transaction**:

   ```bash
   soroban contract invoke \
     --id <contract_id> \
     --source alice \
     --network testnet \
     --build-only \
     -- <method> <args>
   ```

2. **Simulate with specific parameters**:
   ```bash
   soroban contract invoke \
     --id <contract_id> \
     --source alice \
     --network testnet \
     --build-only \
     --fee 1000000 \
     -- <method> <args>
   ```

### Common Transaction Issues

1. **Sequence number problems**:

   ```bash
   # Check current sequence
   soroban keys show alice --network testnet

   # Wait for pending transactions
   sleep 10
   ```

2. **Timeout issues**:
   - Increase fee for faster inclusion
   - Break complex operations into multiple transactions
   - Check network congestion

---

## 5. State Inspection

### Inspecting Contract Storage

1. **View persistent storage**:

   ```bash
   soroban contract read \
     --id <contract_id> \
     --key <storage_key> \
     --network testnet
   ```

2. **List all storage keys**:

   ```bash
   soroban contract storage \
     --id <contract_id> \
     --network testnet
   ```

3. **Inspect instance storage**:
   ```rust
   // In test code
   let storage = env.storage().instance();
   let value = storage.get(&key).unwrap();
   log!(&env, "Instance storage value: {:?}", value);
   ```

### Debugging State Changes

1. **Add state logging**:

   ```rust
   fn debug_state(env: &Env, context: &str) {
       let current_state = get_current_state(env);
       log!(env, "{} - State: {:?}", context, current_state);
   }
   ```

2. **Use test assertions for state**:

   ```rust
   #[test]
   fn test_state_transitions() {
       // Initial state
       assert_eq!(get_state(&env), State::Inactive);

       // After operation
       perform_operation(&env);
       assert_eq!(get_state(&env), State::Active);
   }
   ```

---

## 6. Event Monitoring

### Monitoring Contract Events

1. **View recent events**:

   ```bash
   soroban events \
     --id <contract_id> \
     --network testnet \
     --count 10
   ```

2. **Filter events by topic**:

   ```bash
   soroban events \
     --id <contract_id> \
     --network testnet \
     --topic "payment_processed"
   ```

3. **Monitor events in real-time**:
   ```bash
   soroban events stream \
     --id <contract_id> \
     --network testnet
   ```

### Debugging Event Emission

1. **Verify events in tests**:

   ```rust
   #[test]
   fn test_event_emission() {
       let env = Env::default();

       // Clear previous events
       env.events().clear();

       // Perform operation that should emit event
       perform_operation(&env);

       // Check events
       let events = env.events().all();
       assert_eq!(events.len(), 1);
       assert_eq!(events[0].topic, vec![Symbol::new(&env, "operation_completed")]);
   }
   ```

2. **Add debug event logging**:
   ```rust
   soroban_sdk::event!(env, operation_debug, value1, value2);
   ```

---

## 7. Performance Debugging

### Profiling Contract Execution

1. **Measure gas usage in tests**:

   ```rust
   use soroban_sdk::testutils::Ledger;

   #[test]
   fn profile_gas_usage() {
       let env = Env::default();

       // Record initial ledger state
       let initial_instructions = env.ledger().cpu_instructions();

       // Perform operation
       perform_operation(&env);

       // Check gas used
       let final_instructions = env.ledger().cpu_instructions();
       let gas_used = final_instructions - initial_instructions;

       log!(&env, "Gas used: {}", gas_used);
       assert!(gas_used < 1000000); // Reasonable limit
   }
   ```

2. **Benchmark contract methods**:
   ```bash
   cargo bench
   ```

### Optimizing Performance

1. **Identify bottlenecks**:
   - Use `env.ledger().timestamp()` to measure execution time
   - Profile storage access patterns
   - Check loop efficiency

2. **Common optimizations**:
   - Cache frequently accessed data
   - Use `temporary` storage for transient data
   - Minimize cross-contract calls
   - Batch operations when possible

---

## 8. Remote Debugging

### Production Issue Investigation

1. **Check contract logs** (if available):

   ```bash
   # Check backend logs for contract interactions
   tail -f /var/log/chioma/backend.log | grep contract
   ```

2. **Monitor network transactions**:

   ```bash
   # Watch for failed transactions
   soroban transaction watch --network mainnet --filter "failed"
   ```

3. **Inspect live contract state**:
   ```bash
   soroban contract read \
     --id <contract_id> \
     --key "config" \
     --network mainnet
   ```

### Remote Debug Tools

1. **Use Stellar Explorer**:
   - View transaction details
   - Check contract interactions
   - Monitor network status

2. **Backend integration debugging**:
   - Check API logs for contract calls
   - Verify parameter encoding/decoding
   - Test with isolated contract calls

---

## Debugging Checklist

### Before Deployment

- [ ] `cargo check` passes
- [ ] `cargo test` passes
- [ ] `cargo clippy` passes with no warnings
- [ ] WASM builds successfully
- [ ] Local deployment test succeeds
- [ ] Gas usage is within limits

### During Development

- [ ] Enable logging in tests
- [ ] Add debug assertions
- [ ] Test edge cases
- [ ] Verify event emission
- [ ] Check state transitions

### Production Issues

- [ ] Check error codes
- [ ] Verify network status
- [ ] Inspect contract state
- [ ] Review transaction history
- [ ] Monitor events
- [ ] Check backend logs

### Performance Issues

- [ ] Profile gas usage
- [ ] Check storage access patterns
- [ ] Monitor ledger limits
- [ ] Optimize hot paths
- [ ] Consider caching strategies

## Advanced Debugging Techniques

### Custom Debug Macros

```rust
#[macro_export]
macro_rules! debug_log {
    ($env:expr, $($arg:tt)*) => {
        #[cfg(feature = "debug")]
        {
            use soroban_sdk::log;
            log!($env, $($arg)*);
        }
    };
}
```

### Conditional Compilation

```rust
#[cfg(feature = "debug")]
fn debug_function(env: &Env) {
    // Debug-only code
}

#[cfg(not(feature = "debug"))]
fn debug_function(_env: &Env) {
    // Release code
}
```

### Memory Debugging

```rust
// Check memory usage in tests
let initial_memory = env.ledger().memory_bytes();
perform_operation(env);
let final_memory = env.ledger().memory_bytes();
assert!(final_memory - initial_memory < 10000); // Memory limit
```

For additional help, see:

- [COMMON-ISSUES.md](COMMON-ISSUES.md) - Common problems and solutions
- [ERROR-CODES.md](ERROR-CODES.md) - Complete error code reference
- [FAQ.md](FAQ.md) - Frequently asked questions
