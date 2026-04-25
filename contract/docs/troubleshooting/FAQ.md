# Frequently Asked Questions (FAQ)

**Priority:** MEDIUM
**Category:** Documentation
**Type:** Documentation
**Status:** Completed
**Related Issues:** #754, #20, #24, #25

## 1. Getting Started

### What is Chioma?

Chioma is a housing protocol built on the Stellar blockchain (Soroban) that facilitates secure and automated rental agreements, escrows, and interest-bearing deposits.

### How do I set up the development environment?

1. Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2. Add WASM target: `rustup target add wasm32-unknown-unknown`
3. Install Soroban CLI: `cargo install --locked soroban-cli`
4. Clone the repo and navigate to the `contract` directory.

### Where can I find the contract source code?

All smart contracts are located in the `contract/contracts/` directory.

## 2. Development

### Which Soroban version does Chioma use?

Chioma uses Soroban SDK **v23**.

### How do I create a new contract?

Navigate to the `contract` folder and run: `cargo new --lib contracts/your-contract-name`. Ensure you update the `Cargo.toml` to inherit workspace dependencies.

### How do I handle contract state?

Chioma uses an `instance` storage pattern for core configurations and `persistent` storage for user/agreement data. See `storage.rs` in individual contracts for key definitions.

## 3. Testing

### How do I run the unit tests?

Run `cargo test --all` from the `contract` directory to execute all tests across all contracts.

### How do I see log output in tests?

Use the `--nocapture` flag: `cargo test -- --nocapture`.

### What is the testing strategy?

We use the built-in Rust test framework along with `soroban-sdk` test utilities. We aim for 100% logic coverage, including edge cases like unauthorized access and mathematical overflows.

## 4. Deployment

### How do I deploy to Testnet?

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/chioma.wasm \
  --source <YOUR_SECRET> \
  --network testnet
```

### What is the contract versioning system?

Chioma implements a custom versioning system. Use `record_version` to track deployments and `update_version_status` to manage the lifecycle (Active, Deprecated, Revoked) of contract instances.

## 5. Integration

### How do I integrate with the Stellar SDK?

Use the `@stellar/stellar-sdk` library. Common operations are documented in [STELLAR-INTEGRATION.md](../integration/STELLAR-INTEGRATION.md).

### How are payments handled?

Payments can be made in native XLM or any supported custom Stellar asset. Use `make_payment_with_token` to interact with the protocol.

## 6. Performance

### How can I minimize gas costs?

- Optimize storage access (group related data).
- Use `temporary` storage for transient data.
- Avoid $O(N^2)$ algorithms.
- Refer to the [BENCHMARKING.md](../performance/BENCHMARKING.md) for measurement techniques.

### What are the ledger limits?

Soroban has limits on CPU instructions, RAM, and ledger read/write bytes per transaction. Exceeding these will cause the transaction to fail with `ResourcesExceeded`.

## 7. Troubleshooting

### Why did my transaction fail with `InvokeHostFunction`?

This usually indicates a panic within the contract. Check the error code in the CLI output and cross-reference it with [ERROR-CODES.md](ERROR-CODES.md).

### My sequence numbers are out of sync. What should I do?

On the backend, ensure you are using the latest account sequence from the network. The `StellarService` includes a rebuild-and-retry mechanism for `tx_bad_seq` errors.

### "Contract Paused" error?

The contract administrator has activated the emergency pause. Refer to [EMERGENCY-PROCEDURES.md](../security/EMERGENCY-PROCEDURES.md) for details on why this happens and how it is resolved.

### Contract deployment fails with "insufficient funds"

Ensure your account has enough XLM for deployment fees. Use `soroban keys fund <address> --network testnet` to fund your account.

### Tests are failing randomly

This often indicates state pollution between tests. Use unique identifiers for test data and ensure proper cleanup. Run tests sequentially with `cargo test -- --test-threads=1`.

### WASM compilation fails

Ensure you have the `wasm32-unknown-unknown` target installed: `rustup target add wasm32-unknown-unknown`. Also check for Rust version compatibility with Soroban SDK v23.

### Transaction exceeds resource limits

Optimize your contract logic to reduce CPU and memory usage. Break complex operations into multiple transactions. Refer to [COMMON-ISSUES.md](COMMON-ISSUES.md) for optimization tips.

### Contract state is not persisting

Check if you're using `persistent` storage for data that needs to survive transactions. `temporary` storage is cleared after each ledger close.

### Events are not being emitted

Ensure you're calling `soroban_sdk::event!()` in your contract methods. Events are crucial for frontend synchronization and monitoring.

### Cross-contract calls are failing

Verify the target contract ID and ensure the calling contract has permission to invoke the target contract. Check method signatures match exactly.

### Where can I find detailed troubleshooting guides?

- [COMMON-ISSUES.md](COMMON-ISSUES.md) - Common problems and solutions
- [DEBUGGING-GUIDE.md](DEBUGGING-GUIDE.md) - Step-by-step debugging procedures
- [ERROR-CODES.md](ERROR-CODES.md) - Complete error code reference

### How do I debug contract execution?

Use `cargo test -- --nocapture` to see debug output. Enable logging in your contract with `env.logger().enable()` in tests. Refer to [DEBUGGING-GUIDE.md](DEBUGGING-GUIDE.md) for detailed procedures.

### My contract works in tests but fails on network

This often indicates environment differences. Test with realistic data volumes and simulate network conditions. Check for hardcoded test values that don't work in production.

### How do I monitor contract performance?

Use the Soroban CLI to check gas usage: `soroban contract invoke --build-only`. Monitor ledger limits and optimize storage access patterns. See [DEBUGGING-GUIDE.md](DEBUGGING-GUIDE.md) for profiling techniques.

## 8. Security

### Are the contracts audited?

Refer to the `SECURITY.md` in the root directory for the latest audit status and reporting procedures.

### How do I report a vulnerability?

Please do NOT open a public issue. Use the contact details in `SECURITY.md` for responsible disclosure.

## 9. Best Practices

- **Always emit events:** Crucial for frontend synchronization.
- **Use `checked` math:** Prevent overflows/underflows.
- **Validate inputs:** Never trust user-provided values without checking bounds.
- **Admin Multi-sig:** Use a multi-sig for production administrator addresses.

## 10. Support

### Where can I get help?

- Join our [Discord community](https://discord.gg/chioma).
- Open a GitHub Issue for feature requests or non-security bugs.
- Consult the [official Soroban documentation](https://soroban.stellar.org/docs).
