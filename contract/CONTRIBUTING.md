# Smart Contract Contributing Guide

> **New here?** Follow the [root Quickstart](../QUICKSTART.md) to go from a clean clone to a running full stack.

This document provides comprehensive guidelines for contributing to the Chioma smart contracts. It covers Soroban contract architecture, development standards, security considerations, testing requirements, and CI/CD pipeline expectations.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Soroban Basics](#soroban-basics)
3. [Project Structure](#project-structure)
4. [Contract Development](#contract-development)
5. [Testing Strategy](#testing-strategy)
6. [Security Considerations](#security-considerations)
7. [PR Requirements & CI/CD Pipeline](#pr-requirements--cicd-pipeline)
8. [Development Workflow](#development-workflow)
9. [Best Practices](#best-practices)

---

## Project Overview

**Chioma Smart Contracts** are Soroban contracts built on the Stellar blockchain for property rental transactions.

### Tech Stack

```
Language: Rust
Blockchain: Stellar (Soroban)
SDK: Soroban SDK v23
Testing: Rust test framework
Code Quality: Clippy, Rustfmt
```

### Key Contracts

1. **Chioma Contract** - Main contract for property listings and bookings
2. **Escrow Contract** - Secure fund holding for transactions
3. **Dispute Resolution** - Dispute handling and resolution
4. **Payment Contract** - Payment processing
5. **Rent Obligation** - Rent obligation NFTs
6. **User Profile** - User profile management
7. **Property Registry** - Property registration
8. **Agent Registry** - Agent registration

### Key Features

- Emergency pause mechanism for circuit-breaking
- Timeout mechanisms for escrow and disputes
- Multi-signature support
- Event logging for all operations
- Comprehensive error handling

---

## Soroban Basics

### What is Soroban?

Soroban is Stellar's smart contract platform. Key concepts:

- **Contracts**: Compiled Rust code running on Stellar
- **Ledger**: Persistent storage on the blockchain
- **Tokens**: Native and custom assets
- **Events**: Immutable logs of contract actions
- **Invocations**: Function calls to contracts

### Contract Structure

```rust
use soroban_sdk::{contract, contractimpl, Env, Symbol, Vec};

#[contract]
pub struct MyContract;

#[contractimpl]
impl MyContract {
    pub fn hello(env: Env, name: Symbol) -> Symbol {
        Symbol::new(&env, "Hello")
    }
}
```

### Common Types

```rust
// Soroban types
use soroban_sdk::{
    Address,           // Account or contract address
    Bytes,             // Byte array
    BytesN,            // Fixed-size byte array
    Env,               // Contract environment
    Map,               // Key-value map
    Symbol,            // String identifier
    Vec,               // Dynamic vector
    I128, U128,        // 128-bit integers
    String,            // UTF-8 string
};

// Stellar types
use soroban_sdk::token::Client as TokenClient;
use soroban_sdk::token::Interface as TokenInterface;
```

---

## Project Structure

```
contract/
├── contracts/                        # Smart contracts
│   ├── chioma/                       # Main contract
│   │   ├── src/
│   │   │   ├── lib.rs               # Contract definition
│   │   │   ├── test.rs              # Tests
│   │   │   └── [modules]/           # Feature modules
│   │   └── Cargo.toml               # Contract dependencies
│   │
│   ├── escrow/                       # Escrow contract
│   ├── dispute_resolution/           # Dispute resolution
│   ├── payment/                      # Payment processing
│   ├── rent_obligation/              # Rent obligation NFTs
│   ├── user_profile/                 # User profiles
│   ├── property_registry/            # Property registry
│   └── agent_registry/               # Agent registry
│
├── target/                           # Build artifacts
│   ├── debug/                        # Debug builds
│   ├── release/                      # Release builds
│   └── wasm32-unknown-unknown/       # WASM builds
│
├── Cargo.toml                        # Workspace configuration
├── Cargo.lock                        # Dependency lock file
├── check-all.sh                      # Validation script
└── README.md                         # Documentation
```

### Contract Organization

Each contract follows this structure:

```
contracts/my-contract/
├── src/
│   ├── lib.rs                        # Main contract file
│   ├── test.rs                       # Tests
│   ├── error.rs                      # Error types
│   ├── storage.rs                    # Storage keys
│   ├── types.rs                      # Custom types
│   └── [modules]/                    # Feature modules
└── Cargo.toml                        # Dependencies
```

---

## Contract Development

### Creating a New Contract

**Step 1: Generate contract structure**

```bash
cd contract
cargo new --lib contracts/my-contract
```

**Step 2: Update Cargo.toml**

```toml
# contracts/my-contract/Cargo.toml

[package]
name = "my-contract"
version = "0.1.0"
edition = "2021"

[dependencies]
soroban-sdk = { workspace = true }

[lib]
crate-type = ["cdylib"]

[profile.release]
opt-level = "z"
overflow-checks = true
debug = 0
strip = "symbols"
debug-assertions = false
panic = "abort"
codegen-units = 1
lto = true
```

**Step 3: Create contract**

```rust
// contracts/my-contract/src/lib.rs

#![no_std]

use soroban_sdk::{contract, contractimpl, Env, Symbol, String};

#[contract]
pub struct MyContract;

#[contractimpl]
impl MyContract {
    /// Initialize the contract
    pub fn init(env: Env, admin: soroban_sdk::Address) -> Result<(), String> {
        // Store admin address
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "admin"), &admin);
        Ok(())
    }

    /// Get admin address
    pub fn get_admin(env: Env) -> Result<soroban_sdk::Address, String> {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "admin"))
            .ok_or_else(|| String::from_slice(&env, "Admin not set"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_init() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MyContract);
        let client = MyContractClient::new(&env, &contract_id);

        let admin = soroban_sdk::Address::generate(&env);
        let result = client.init(&admin);

        assert!(result.is_ok());
    }
}
```

### Contract Patterns

**Storage Pattern**

```rust
use soroban_sdk::{contract, contractimpl, Env, Symbol, Address, Map};

#[contract]
pub struct MyContract;

#[contractimpl]
impl MyContract {
    pub fn set_value(env: Env, key: Symbol, value: u32) {
        env.storage()
            .instance()
            .set(&key, &value);
    }

    pub fn get_value(env: Env, key: Symbol) -> Option<u32> {
        env.storage()
            .instance()
            .get(&key)
    }
}
```

**Event Pattern**

```rust
use soroban_sdk::{contract, contractimpl, Env, Symbol, Address};

#[contract]
pub struct MyContract;

#[contractimpl]
impl MyContract {
    pub fn do_something(env: Env, user: Address) {
        // Emit event
        env.events().publish(
            (Symbol::new(&env, "contract"), Symbol::new(&env, "action")),
            (user, "Something happened"),
        );
    }
}
```

**Error Handling Pattern**

```rust
use soroban_sdk::{contract, contractimpl, Env, String};

#[derive(Debug)]
pub enum ContractError {
    NotFound,
    Unauthorized,
    InvalidAmount,
}

impl ContractError {
    pub fn to_string(&self, env: &Env) -> String {
        match self {
            ContractError::NotFound => String::from_slice(env, "Not found"),
            ContractError::Unauthorized => String::from_slice(env, "Unauthorized"),
            ContractError::InvalidAmount => String::from_slice(env, "Invalid amount"),
        }
    }
}

#[contract]
pub struct MyContract;

#[contractimpl]
impl MyContract {
    pub fn do_something(env: Env) -> Result<(), String> {
        Err(ContractError::NotFound.to_string(&env))
    }
}
```

**Authorization Pattern**

```rust
use soroban_sdk::{contract, contractimpl, Env, Address, Symbol, String};

#[contract]
pub struct MyContract;

#[contractimpl]
impl MyContract {
    pub fn admin_only(env: Env, caller: Address) -> Result<(), String> {
        let admin = env.storage()
            .instance()
            .get::<_, Address>(&Symbol::new(&env, "admin"))
            .ok_or_else(|| String::from_slice(&env, "Admin not set"))?;

        if caller != admin {
            return Err(String::from_slice(&env, "Unauthorized"));
        }

        Ok(())
    }
}
```

### Emergency Pause Mechanism

```rust
use soroban_sdk::{contract, contractimpl, Env, Address, Symbol, String};

#[contract]
pub struct MyContract;

#[contractimpl]
impl MyContract {
    pub fn pause(env: Env, admin: Address, reason: String) -> Result<(), String> {
        // Verify admin
        let stored_admin = env.storage()
            .instance()
            .get::<_, Address>(&Symbol::new(&env, "admin"))
            .ok_or_else(|| String::from_slice(&env, "Admin not set"))?;

        if admin != stored_admin {
            return Err(String::from_slice(&env, "Unauthorized"));
        }

        // Set pause state
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "paused"), &true);

        env.storage()
            .instance()
            .set(&Symbol::new(&env, "pause_reason"), &reason);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "contract"), Symbol::new(&env, "paused")),
            reason,
        );

        Ok(())
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get::<_, bool>(&Symbol::new(&env, "paused"))
            .unwrap_or(false)
    }

    pub fn unpause(env: Env, admin: Address) -> Result<(), String> {
        // Verify admin
        let stored_admin = env.storage()
            .instance()
            .get::<_, Address>(&Symbol::new(&env, "admin"))
            .ok_or_else(|| String::from_slice(&env, "Admin not set"))?;

        if admin != stored_admin {
            return Err(String::from_slice(&env, "Unauthorized"));
        }

        // Clear pause state
        env.storage()
            .instance()
            .remove(&Symbol::new(&env, "paused"));

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "contract"), Symbol::new(&env, "unpaused")),
            (),
        );

        Ok(())
    }
}
```

---

## Testing Strategy

### Unit Tests

```rust
// contracts/my-contract/src/lib.rs

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_init() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MyContract);
        let client = MyContractClient::new(&env, &contract_id);

        let admin = soroban_sdk::Address::generate(&env);
        let result = client.init(&admin);

        assert!(result.is_ok());
    }

    #[test]
    fn test_get_admin() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MyContract);
        let client = MyContractClient::new(&env, &contract_id);

        let admin = soroban_sdk::Address::generate(&env);
        client.init(&admin).unwrap();

        let retrieved_admin = client.get_admin().unwrap();
        assert_eq!(retrieved_admin, admin);
    }

    #[test]
    fn test_unauthorized_access() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MyContract);
        let client = MyContractClient::new(&env, &contract_id);

        let admin = soroban_sdk::Address::generate(&env);
        let unauthorized = soroban_sdk::Address::generate(&env);

        client.init(&admin).unwrap();

        // Try to call admin-only function as unauthorized user
        let result = client.admin_only(&unauthorized);
        assert!(result.is_err());
    }
}
```

### Running Tests

```bash
cd contract

# Run all tests
cargo test --all

# Run tests for specific contract
cargo test -p my-contract

# Run tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_init
```

---

## Security Considerations

### Input Validation

```rust
pub fn transfer(env: Env, amount: u128) -> Result<(), String> {
    // Validate amount
    if amount == 0 {
        return Err(String::from_slice(&env, "Amount must be greater than 0"));
    }

    if amount > u128::MAX / 2 {
        return Err(String::from_slice(&env, "Amount too large"));
    }

    Ok(())
}
```

### Authorization Checks

```rust
pub fn admin_action(env: Env, caller: Address) -> Result<(), String> {
    let admin = env.storage()
        .instance()
        .get::<_, Address>(&Symbol::new(&env, "admin"))
        .ok_or_else(|| String::from_slice(&env, "Admin not set"))?;

    if caller != admin {
        return Err(String::from_slice(&env, "Unauthorized"));
    }

    Ok(())
}
```

### Overflow Protection

```rust
pub fn add(a: u128, b: u128) -> Result<u128, String> {
    a.checked_add(b)
        .ok_or_else(|| String::from_slice(&env, "Overflow"))
}
```

### Reentrancy Protection

```rust
pub fn transfer(env: Env, to: Address, amount: u128) -> Result<(), String> {
    // Check if already transferring
    if env.storage()
        .instance()
        .get::<_, bool>(&Symbol::new(&env, "transferring"))
        .unwrap_or(false)
    {
        return Err(String::from_slice(&env, "Reentrancy detected"));
    }

    // Set transferring flag
    env.storage()
        .instance()
        .set(&Symbol::new(&env, "transferring"), &true);

    // Do transfer
    // ...

    // Clear flag
    env.storage()
        .instance()
        .remove(&Symbol::new(&env, "transferring"));

    Ok(())
}
```

---

## PR Requirements & CI/CD Pipeline

### Before Creating a PR

Run the complete validation locally:

```bash
cd contract
./check-all.sh
```

Or run individual checks:

```bash
# Build
cargo build --release

# Format check
cargo fmt --all -- --check

# Linting
cargo clippy --all-targets --all-features -- -D warnings

# Tests
cargo test --all
```

### What the Pipeline Checks

#### 1. Build (cargo build)

Compiles all contracts to WASM.

**Fix build errors:**

```bash
cd contract
cargo build --release
```

#### 2. Format (cargo fmt)

Ensures consistent code formatting.

**Format your code:**

```bash
cd contract
cargo fmt --all
```

#### 3. Clippy (cargo clippy)

Linting and code quality checks.

**Fix Clippy warnings:**

```bash
cd contract
cargo clippy --all-targets --all-features -- -D warnings
```

#### 4. Tests (cargo test)

Runs all unit tests.

**Run tests:**

```bash
cd contract
cargo test --all
```

### PR Checklist

Before submitting a PR:

- [ ] Code compiles without errors (`cargo build --release`)
- [ ] Code is formatted (`cargo fmt --all`)
- [ ] No Clippy warnings (`cargo clippy --all-targets --all-features -- -D warnings`)
- [ ] All tests pass (`cargo test --all`)
- [ ] Security considerations are addressed
- [ ] Events are emitted for important actions
- [ ] Error handling is comprehensive
- [ ] Documentation is updated
- [ ] No breaking changes to contract interfaces
- [ ] Commit messages are clear and descriptive

### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Security fix
- [ ] Documentation update

## Related Issues

Closes #123

## Testing

How to test these changes

## Security Considerations

Any security implications

## Contract Changes

Any changes to contract interfaces or storage

## Checklist

- [ ] Code compiles without errors
- [ ] Code is formatted (`cargo fmt --all`)
- [ ] No Clippy warnings
- [ ] Tests pass (`cargo test --all`)
- [ ] Security reviewed
- [ ] Documentation updated
```

### Common CI/CD Failures & Fixes

**Build Errors**

```bash
# Check for compilation errors
cargo build --release

# View detailed error
cargo build --release --verbose
```

**Format Issues**

```bash
# Check formatting
cargo fmt --all -- --check

# Auto-format
cargo fmt --all
```

**Clippy Warnings**

```bash
# Check for warnings
cargo clippy --all-targets --all-features -- -D warnings

# View specific warning
cargo clippy --all-targets --all-features
```

**Test Failures**

```bash
# Run tests with output
cargo test --all -- --nocapture

# Run specific test
cargo test test_name

# Run tests for specific contract
cargo test -p my-contract
```

---

## Development Workflow

### Setting Up Your Environment

```bash
# 1. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Add Soroban target
rustup target add wasm32-unknown-unknown

# 3. Clone the repository
git clone <repo-url>
cd chioma/contract

# 4. Build contracts
cargo build --release

# 5. Run tests
cargo test --all
```

### Daily Development Commands

```bash
# Build contracts
cargo build --release

# Run tests
cargo test --all

# Check formatting
cargo fmt --all -- --check

# Check for warnings
cargo clippy --all-targets --all-features -- -D warnings

# Full validation (before PR)
./check-all.sh

# Format code
cargo fmt --all

# Fix Clippy warnings
cargo clippy --fix --all-targets --all-features
```

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new contract feature"

# 3. Run validation
./check-all.sh

# 4. Push and create PR
git push origin feature/my-feature
```

### Debugging Tips

**Print Debugging**

```rust
use soroban_sdk::log;

pub fn my_function(env: Env) {
    log!(&env, "Debug message: {}", value);
}
```

**Test Debugging**

```bash
# Run tests with output
cargo test -- --nocapture

# Run specific test with output
cargo test test_name -- --nocapture
```

**Build Debugging**

```bash
# Verbose build output
cargo build --release --verbose

# Check generated WASM
cargo build --release --target wasm32-unknown-unknown
```

---

## Best Practices

### Code Organization

1. **Separate concerns**
   - Keep storage logic separate from business logic
   - Use modules for different features

2. **Clear naming**
   - Use descriptive function names
   - Use clear variable names

3. **Documentation**
   - Document public functions
   - Explain complex logic

### Error Handling

```rust
// ✅ Good - specific error messages
pub fn transfer(env: Env, amount: u128) -> Result<(), String> {
    if amount == 0 {
        return Err(String::from_slice(&env, "Amount must be greater than 0"));
    }
    Ok(())
}

// ❌ Avoid - generic errors
pub fn transfer(env: Env, amount: u128) -> Result<(), String> {
    if amount == 0 {
        return Err(String::from_slice(&env, "Error"));
    }
    Ok(())
}
```

### Event Logging

```rust
// ✅ Good - emit events for important actions
pub fn transfer(env: Env, to: Address, amount: u128) -> Result<(), String> {
    // Do transfer

    // Emit event
    env.events().publish(
        (Symbol::new(&env, "contract"), Symbol::new(&env, "transfer")),
        (to, amount),
    );

    Ok(())
}
```

### Testing

1. **Test happy path**
   - Test normal operation

2. **Test error cases**
   - Test invalid inputs
   - Test unauthorized access
   - Test edge cases

3. **Test state changes**
   - Verify storage is updated correctly
   - Verify events are emitted

### Performance

1. **Minimize storage operations**
   - Cache values when possible
   - Batch operations

2. **Optimize gas usage**
   - Avoid unnecessary computations
   - Use efficient algorithms

3. **Monitor contract size**
   - Keep WASM size reasonable
   - Remove unused code

---

## Troubleshooting

### Common Issues

**Compilation Errors**

```bash
# Update Rust
rustup update

# Clean build
cargo clean
cargo build --release
```

**Test Failures**

```bash
# Run with output
cargo test -- --nocapture

# Run specific test
cargo test test_name
```

**Clippy Warnings**

```bash
# View all warnings
cargo clippy --all-targets --all-features

# Fix automatically
cargo clippy --fix --all-targets --all-features
```

---

## Resources

- [Soroban Documentation](https://soroban.stellar.org)
- [Soroban SDK](https://docs.rs/soroban-sdk)
- [Rust Book](https://doc.rust-lang.org/book)
- [Stellar Documentation](https://developers.stellar.org)

---

## Support and Communication

For questions or assistance:

- Review existing issues and pull requests for similar cases
- Examine established contracts for architectural patterns
- Participate in team discussions and code reviews
- Submit detailed issue reports for bugs or feature requests

We appreciate your contributions to the Chioma platform.
