# Testing Basics

> **Chioma Housing Protocol** — Developer Onboarding  
> Related Issues: [#01](https://github.com/Listoncrypt/chioma/issues/1), [#04](https://github.com/Listoncrypt/chioma/issues/4)

Testing is a **non-negotiable** part of Chioma contract development. Every new function must ship with corresponding tests. 

## Intro

Soroban tests are written in **standard Rust** and run **entirely locally without a blockchain node**. You do not need to run a local Stellar network, connect to a testnet, or fund accounts with a faucet. Instead, the Soroban SDK provides a simulated ledger environment that behaves exactly like the real Stellar network, allowing tests to execute in milliseconds.

## The Test Structure

Tests are typically placed in the `src/test.rs` (or `src/tests.rs`) file. Because they are written in standard Rust, they use the `#[cfg(test)]` attribute so they are only compiled during testing, not in your final WebAssembly artifact.

To test a contract, we use the `soroban_sdk::testutils` module. This module allows you to "mock" the contract environment. You start by creating a default `Env` (Environment), which acts as your simulated blockchain. From there, you can register your contract, generate mock addresses, manipulate ledger timestamps, and simulate authorization.

## Code Example

Below is a simple, copy-pasteable test case for the Housing Registry contract we built previously. Add this to `contracts/hello_housing/src/test.rs` (ensure you have `#[cfg(test)] mod test;` in your `lib.rs`).

```rust
#![cfg(test)]

use super::*;
use soroban_sdk::{Env, String, Symbol};

#[test]
fn test_register_property() {
    // 1. Create a simulated contract environment ("mock" the blockchain)
    let env = Env::default();
    
    // 2. Register the contract in the environment
    let contract_id = env.register(HousingRegistryContract, ());
    let client = HousingRegistryContractClient::new(&env, &contract_id);

    // 3. Define the inputs
    let property_id = String::from_str(&env, "PROP-001");
    let description = String::from_str(&env, "3-bedroom apartment in Lagos");

    // 4. Call the contract function
    let result = client.register_property(&property_id, &description);

    // 5. Verify the output using standard Rust assert_eq!
    assert_eq!(result, Symbol::new(&env, "registered"));
}
```

## Commands

To run your tests, use the standard Cargo test command from your contract directory:

```bash
cargo test
```

### Reading the Output

**Success:** If your tests pass, you will see an output like this:

```text
running 1 test
test test::test_register_property ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**Failure:** If a test fails (e.g., if the output didn't match the `assert_eq!`), Rust will print a detailed panic message showing the `left` (actual) and `right` (expected) values:

```text
running 1 test
test test::test_register_property ... FAILED

failures:
---- test::test_register_property stdout ----
thread 'test::test_register_property' panicked at 'assertion failed: `(left == right)`
  left: `"registered"`,
 right: `"wrong_value"`'
```

## Troubleshooting

### Viewing Print Statements

By default, `cargo test` captures all output printed to the standard output (like `println!` logs) and hides it unless the test fails. 

If you want to debug your contract and see logs during successful tests, add the `--nocapture` flag:

```bash
cargo test -- --nocapture
```

> **Note:** To print debug information from within your contract code, you can use `soroban_sdk::log!(&env, "Message: {}", variable);`. The `--nocapture` flag will ensure these logs appear in your terminal during testing.

---

> For advanced users and comprehensive details on testing patterns (like manipulating time, testing auth, and complex state setup), please link back to **[Issue #12: Testing Strategy](https://github.com/Listoncrypt/chioma/issues/12)** and refer to the project's `CONTRIBUTING.md`.
