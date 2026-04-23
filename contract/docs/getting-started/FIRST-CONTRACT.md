# Your First Soroban Contract

> **Chioma Housing Protocol** — Developer Onboarding  
> Related Issues: [#01](https://github.com/Listoncrypt/chioma/issues/1), [#04](https://github.com/Listoncrypt/chioma/issues/4), [#12](https://github.com/Listoncrypt/chioma/issues/12)

In this guide, you will create a simple **Housing Registry** contract from scratch — a miniature version of Chioma's own `property_registry` contract. By the end, you will understand the anatomy of a Soroban contract, how to build it to WebAssembly, and where the compiled artifacts live.

**Prerequisites:** Complete the [Environment Setup](./SETUP.md) guide before proceeding.

---

## What You'll Build

A `HousingRegistry` contract with two functions:

| Function            | Description                                       |
| ------------------- | ------------------------------------------------- |
| `register_property` | Records a property with an ID and description     |
| `get_property`      | Retrieves a property's description by its ID      |

This is intentionally simple — the goal is to learn the **structure and workflow**, not to build a production contract.

---

## Step 1 — Initialize the Project

Soroban provides a CLI command to scaffold a new contract project. From the repository root:

```bash
cd contract
stellar contract init contracts/hello_housing
```

This creates the following file structure:

```
contracts/hello_housing/
├── src/
│   ├── lib.rs          # Contract entry point and logic
│   └── test.rs         # Unit tests
├── Cargo.toml          # Package manifest and dependencies
└── README.md           # Auto-generated documentation
```

> **Note:** If `stellar contract init` is not available in your CLI version, you can manually create the project with `cargo new --lib contracts/hello_housing`.

---

## Step 2 — Understand the File Structure

### `Cargo.toml` — The Package Manifest

Open `contracts/hello_housing/Cargo.toml` and replace its contents with:

```toml
[package]
name = "hello_housing"
version = "0.0.0"
edition = "2021"
publish = false

[lib]
crate-type = ["lib", "cdylib"]
doctest = false

[dependencies]
soroban-sdk = { workspace = true }

[dev-dependencies]
soroban-sdk = { workspace = true, features = ["testutils"] }
```

Let's break down the key fields:

| Field                 | Purpose                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------- |
| **`name`**            | The crate name — used in `cargo build -p hello_housing`                                       |
| **`crate-type`**      | `"cdylib"` produces a `.wasm` binary; `"lib"` allows importing in tests and other crates      |
| **`doctest = false`** | Disables doc-tests, which are not supported in `no_std` environments                          |
| **`soroban-sdk`**     | The core SDK — `workspace = true` inherits the version (v23) from the root `Cargo.toml`       |
| **`testutils`**       | Test utilities (mock auth, generated addresses, etc.) — only included in `dev-dependencies`   |

### `src/lib.rs` — The Contract Entry Point

This is where your contract logic lives. Every Soroban contract has three foundational elements:

1. **`#![no_std]`** — Soroban contracts run in a WebAssembly sandbox without the standard library.
2. **`#[contract]`** — Marks a struct as a Soroban smart contract.
3. **`#[contractimpl]`** — Marks the `impl` block whose public functions become callable contract methods.

---

## Step 3 — Write the Contract

Replace the contents of `contracts/hello_housing/src/lib.rs` with:

```rust
#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Env, String, Symbol};

/// Storage key for property records.
/// Each property is stored under `Property(property_id)`.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Property(String),
}

/// Represents a registered property.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PropertyRecord {
    pub property_id: String,
    pub description: String,
}

// ── Contract Definition ──────────────────────────────────────────────

#[contract]
pub struct HousingRegistryContract;

#[contractimpl]
impl HousingRegistryContract {
    /// Register a new property in the housing registry.
    ///
    /// # Arguments
    /// * `env`          - The contract environment
    /// * `property_id`  - A unique identifier for the property (e.g., `"PROP-001"`)
    /// * `description`  - A human-readable description of the property
    ///
    /// # Returns
    /// * `Symbol` - A confirmation symbol: `"registered"`
    pub fn register_property(
        env: Env,
        property_id: String,
        description: String,
    ) -> Symbol {
        // Build the property record
        let record = PropertyRecord {
            property_id: property_id.clone(),
            description,
        };

        // Store the record in persistent storage
        env.storage()
            .persistent()
            .set(&DataKey::Property(property_id), &record);

        // Return a confirmation
        Symbol::new(&env, "registered")
    }

    /// Retrieve a property record by its ID.
    ///
    /// # Arguments
    /// * `env`         - The contract environment
    /// * `property_id` - The ID of the property to look up
    ///
    /// # Returns
    /// * `Option<PropertyRecord>` - The property record if it exists, or `None`
    pub fn get_property(env: Env, property_id: String) -> Option<PropertyRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Property(property_id))
    }
}

#[cfg(test)]
mod tests;
```

### Code Walkthrough

#### 1. `#![no_std]`

```rust
#![no_std]
```

Soroban contracts execute inside a WASM virtual machine that does **not** provide Rust's standard library. The `soroban_sdk` provides replacements for common types like `String`, `Vec`, and `Map`.

#### 2. Storage Keys with `#[contracttype]`

```rust
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Property(String),
}
```

The `#[contracttype]` attribute makes this type serializable for on-chain storage. We use an **enum** so that each property gets its own unique storage key — `DataKey::Property("PROP-001")` is a different key from `DataKey::Property("PROP-002")`.

#### 3. Data Structures

```rust
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PropertyRecord {
    pub property_id: String,
    pub description: String,
}
```

This struct defines the shape of data stored on-chain. The `#[contracttype]` attribute is required for any type that is stored in ledger storage or returned from a contract function.

#### 4. Contract Methods

```rust
#[contract]
pub struct HousingRegistryContract;

#[contractimpl]
impl HousingRegistryContract {
    pub fn register_property(...) -> Symbol { ... }
    pub fn get_property(...) -> Option<PropertyRecord> { ... }
}
```

- **`#[contract]`** — Registers `HousingRegistryContract` as a deployable Soroban contract.
- **`#[contractimpl]`** — Exposes the `pub fn` methods as on-chain callable functions.
- The first parameter of every method is **`env: Env`** — the Soroban runtime environment that provides access to storage, events, authentication, and more.

---

## Step 4 — Build the Contract

### Standard Build

From the `contract/` directory:

```bash
cargo build --target wasm32-unknown-unknown --release
```

This compiles **all** workspace contracts (including your new `hello_housing`) to WebAssembly.

### Build a Specific Contract

To build only your new contract:

```bash
cargo build -p hello_housing --target wasm32-unknown-unknown --release
```

### Using the Soroban CLI

The Soroban CLI provides an optimized build command:

```bash
stellar contract build
```

This is equivalent to the `cargo build` command above but also applies Soroban-specific optimizations.

---

## Step 5 — Locate the Build Artifacts

After a successful build, the compiled `.wasm` file is located at:

```
contract/target/wasm32-unknown-unknown/release/hello_housing.wasm
```

The full artifact tree looks like this:

```
contract/
└── target/
    └── wasm32-unknown-unknown/
        └── release/
            ├── hello_housing.wasm        ← Your compiled contract
            ├── property_registry.wasm     ← Chioma's property registry
            ├── escrow.wasm                ← Chioma's escrow contract
            └── ...                        ← Other workspace contracts
```

> **Important:** The `.wasm` file name is derived from the `name` field in your `Cargo.toml`, with hyphens converted to underscores. A crate named `hello-housing` would produce `hello_housing.wasm`.

### Inspect the WASM Binary

You can view the size of your compiled contract:

```bash
# macOS / Linux
ls -lh target/wasm32-unknown-unknown/release/hello_housing.wasm

# Windows (PowerShell)
Get-Item target\wasm32-unknown-unknown\release\hello_housing.wasm | Select-Object Name, Length
```

A typical minimal Soroban contract is between **1 KB and 50 KB**. The Chioma workspace's `Cargo.toml` already configures aggressive optimizations:

```toml
[profile.release]
opt-level = "z"       # Optimize for size
strip = "symbols"     # Remove debug symbols
lto = true            # Link-time optimization
panic = "abort"       # Smaller panic handling
```

---

## Step 6 — Validate Your Code

Before committing, run the Chioma quality checks:

```bash
# Format your code
cargo fmt --all

# Lint with Clippy (zero-warning policy)
cargo clippy --all-targets --all-features -- -D warnings

# Run the full test suite
cargo test

# Build for WASM
cargo build --target wasm32-unknown-unknown --release
```

Or use the convenience script:

```bash
./check-all.sh
```

---

## Step 7 — Deploy to Testnet

Now that your contract builds and tests pass, let's deploy it to the **Stellar Testnet** — a free, public network for development and experimentation.

### 7a. Create a Deployer Identity

The Soroban CLI manages **identities** (keypairs) for signing transactions. Create one with a name you'll remember:

```bash
stellar keys generate --global chioma-dev --network testnet
```

Replace `chioma-dev` with any name you like — this is a local label, not visible on-chain.

> **What this does:** Generates a new Stellar keypair and stores it in your global CLI config (`~/.config/stellar/` on Linux/macOS, `%APPDATA%\stellar\` on Windows). The `--network testnet` flag automatically configures the identity for the Stellar Testnet and funds it via Friendbot.

Verify the identity was created:

```bash
stellar keys ls
```

You should see your identity listed:

```
chioma-dev
```

To view the public address associated with your identity:

```bash
stellar keys address chioma-dev
```

### 7b. Fund the Account via Friendbot

The **Stellar Friendbot** dispenses free Testnet XLM (lumens) to any account. If your account wasn't automatically funded during key generation, fund it manually:

```bash
curl "https://friendbot.stellar.org/?addr=$(stellar keys address chioma-dev)"
```

Or on **Windows (PowerShell)**:

```powershell
$addr = stellar keys address chioma-dev
Invoke-WebRequest -Uri "https://friendbot.stellar.org/?addr=$addr"
```

You can also visit the Friendbot URL directly in your browser:

```
https://friendbot.stellar.org/?addr=YOUR_PUBLIC_ADDRESS_HERE
```

Replace `YOUR_PUBLIC_ADDRESS_HERE` with the output from `stellar keys address chioma-dev`.

> **Note:** Friendbot is **Testnet only**. On Mainnet, you need real XLM from an exchange or another account.

### 7c. Deploy the Contract

Deploy your compiled WASM to the Testnet:

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/hello_housing.wasm \
  --source chioma-dev \
  --network testnet
```

On **Windows (PowerShell)**, use backticks for line continuation:

```powershell
stellar contract deploy `
  --wasm target\wasm32-unknown-unknown\release\hello_housing.wasm `
  --source chioma-dev `
  --network testnet
```

On success, the CLI prints the **Contract ID** — a long alphanumeric string like:

```
CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2OOTGW6P
```

**Save this Contract ID!** You will need it to invoke your contract's functions.

### 7d. Invoke the Contract on Testnet

Register a property:

```bash
stellar contract invoke \
  --id CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2OOTGW6P \
  --source chioma-dev \
  --network testnet \
  -- \
  register_property \
  --property_id PROP-001 \
  --description "3-bedroom apartment in Lagos"
```

> **Important:** Replace the `--id` value with the Contract ID from your deployment output.

Retrieve the property:

```bash
stellar contract invoke \
  --id CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2OOTGW6P \
  --source chioma-dev \
  --network testnet \
  -- \
  get_property \
  --property_id PROP-001
```

You should see a JSON response containing your registered property data. 🎉

### Deployment Troubleshooting

| Error | Cause | Fix |
| ----- | ----- | --- |
| `Account not found` | Identity not funded | Run the Friendbot command from [Step 7b](#7b-fund-the-account-via-friendbot) |
| `Transaction simulation failed` | WASM too large or invalid | Rebuild with `--release` and verify the `.wasm` file exists |
| `Error: identity not found` | Typo in identity name | Run `stellar keys ls` to check available identities |

---

## Understanding the Chioma Contract Structure

Now that you've built your first contract, take a look at how the production `property_registry` contract is organized:

```
contracts/property_registry/
├── src/
│   ├── lib.rs         # Contract definition and public API
│   ├── errors.rs      # Error enum (PropertyError)
│   ├── events.rs      # Event emission helpers
│   ├── property.rs    # Core property logic
│   ├── storage.rs     # Storage key definitions (DataKey)
│   ├── types.rs       # Shared types (PropertyDetails, ContractState)
│   └── tests.rs       # Comprehensive test suite
├── Cargo.toml
└── README.md
```

**Key differences** from your `hello_housing` contract:

| Aspect               | `hello_housing` (tutorial)   | `property_registry` (production)  |
| -------------------- | ---------------------------- | --------------------------------- |
| **Error handling**   | Returns `Symbol`             | Returns `Result<(), PropertyError>` with a `#[contracterror]` enum |
| **Authorization**    | None                         | `require_auth()` on sensitive operations |
| **Events**           | None                         | Emits events for monitoring       |
| **Module structure** | Single `lib.rs`              | Split across multiple modules     |
| **Admin control**    | None                         | Admin initialization + verification |

As you contribute to Chioma, you'll follow the production patterns. But the fundamentals — `#[contract]`, `#[contractimpl]`, storage, and types — are exactly what you've learned here.

---

## Quick Reference

> **Note:** In the table below, `<name>` is a placeholder — replace it with your actual crate name (e.g., `hello_housing`).

| Task                          | Command                                                          |
| ----------------------------- | ---------------------------------------------------------------- |
| Initialize a new contract     | `stellar contract init contracts/<name>`                         |
| Build all contracts (WASM)    | `cargo build --target wasm32-unknown-unknown --release`          |
| Build a specific contract     | `cargo build -p <name> --target wasm32-unknown-unknown --release`|
| Build with Soroban CLI        | `stellar contract build`                                         |
| Format code                   | `cargo fmt --all`                                                |
| Lint code                     | `cargo clippy --all-targets --all-features -- -D warnings`       |
| Run all tests                 | `cargo test`                                                     |
| Run tests for one contract    | `cargo test -p <name>`                                           |
| Create a deployer identity    | `stellar keys generate --global <your-name> --network testnet`   |
| Fund via Friendbot             | `curl "https://friendbot.stellar.org/?addr=$(stellar keys address <your-name>)"` |
| Deploy to Testnet             | `stellar contract deploy --wasm <path>.wasm --source <your-name> --network testnet` |

---

## Next Steps

Your first contract is built! Continue to the next guide:

➡️ **[Testing Basics →](./TESTING-BASICS.md)** — Learn how to write and run unit tests for your Soroban contracts.

---

*Last updated: April 2026 · Chioma Housing Protocol · [CONTRIBUTING.md](../../CONTRIBUTING.md)*
