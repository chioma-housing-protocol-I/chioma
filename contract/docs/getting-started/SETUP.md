# Environment Setup Guide

> **Chioma Housing Protocol** — Developer Onboarding  
> Related Issues: [#01](https://github.com/Listoncrypt/chioma/issues/1), [#04](https://github.com/Listoncrypt/chioma/issues/4), [#12](https://github.com/Listoncrypt/chioma/issues/12)

Welcome to the Chioma Housing Protocol! This guide will walk you through setting up your local development environment so you can build, test, and deploy **Soroban smart contracts** on the Stellar blockchain.

By the end of this guide you will have:

- A working **Rust** toolchain managed by `rustup`
- The **`wasm32-unknown-unknown`** compilation target for WebAssembly
- The **Soroban CLI** for building, deploying, and interacting with contracts
- A validated environment ready for contract development

---

## Prerequisites

Before you begin, ensure you have the following:

| Requirement       | Details                                                   |
| ----------------- | --------------------------------------------------------- |
| **Operating System** | Windows 10/11, macOS 12+, or Linux (Ubuntu 20.04+)     |
| **Terminal**       | PowerShell (Windows), Terminal (macOS), or Bash (Linux)   |
| **Git**            | Version 2.30+ — [Download Git](https://git-scm.com/)    |
| **Internet Access** | Required for downloading toolchains and dependencies     |

---

## Step 1 — Install Rust via `rustup`

**Rust** is the primary language for Soroban smart contract development. We use [`rustup`](https://rustup.rs/) to manage the Rust toolchain.

### macOS / Linux

Open your terminal and run:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

When prompted, select **option 1** (default installation). This installs:

- `rustc` — the Rust compiler
- `cargo` — the Rust package manager and build system
- `rustup` — the toolchain manager itself

After installation, **load the environment** into your current shell:

```bash
source "$HOME/.cargo/env"
```

### Windows

> ⚠️ **REQUIRED FOR WINDOWS USERS — Install C++ Build Tools First**
>
> Rust requires the **Visual Studio C++ Build Tools** to compile native code on Windows.
> If you skip this step, you will see `error: linker 'link.exe' not found` when building.
>
> 1. Download the installer from [https://visualstudio.microsoft.com/visual-cpp-build-tools/](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
> 2. Run the installer and select the **"Desktop development with C++"** workload.
> 3. Complete the installation and **restart your machine**.
>
> This is the **#1 cause of setup failures** for new contributors. Do not skip it.

Once the C++ Build Tools are installed:

1. Download the Rust installer from [https://rustup.rs](https://rustup.rs/).
2. Run `rustup-init.exe` and follow the on-screen prompts.
3. Select **option 1** for the default installation.
4. **Restart your terminal** (or open a new PowerShell window) after installation.

### Verify the Installation

```bash
rustc --version
cargo --version
rustup --version
```

You should see output similar to:

```
rustc 1.82.0 (f6e511eec 2024-10-15)
cargo 1.82.0 (8f40fc59f 2024-10-07)
rustup 1.27.1 (2024-11-15)
```

> **Tip:** The exact versions may differ. Soroban SDK v23 requires Rust **1.74.0** or newer.

---

## Step 2 — Add the `wasm32-unknown-unknown` Target

Soroban contracts compile to **WebAssembly (WASM)**. You need to add the `wasm32-unknown-unknown` target to your Rust toolchain:

```bash
rustup target add wasm32-unknown-unknown
```

### Verify the Target

```bash
rustup target list --installed
```

You should see `wasm32-unknown-unknown` in the output:

```
wasm32-unknown-unknown
x86_64-unknown-linux-gnu
```

> **Note:** The second line shows your host platform triple and will vary by OS (e.g., `x86_64-pc-windows-msvc` on Windows, `aarch64-apple-darwin` on Apple Silicon).

---

## Step 3 — Install the Soroban CLI

The **Soroban CLI** (`stellar`) is your primary tool for building, deploying, and interacting with smart contracts on the Stellar network.

### Install via Cargo

```bash
cargo install --locked stellar-cli
```

> **Note:** This may take several minutes on the first run, as it compiles the CLI from source.

### Verify the Installation

```bash
stellar --version
```

Expected output (version may vary):

```
stellar 22.0.0
```

### Alternative: Install a Specific Version

If the project requires a specific CLI version, you can pin it:

```bash
cargo install --locked stellar-cli --version 22.0.0
```

---

## Step 4 — Clone the Repository

If you haven't already, clone the Chioma repository:

```bash
git clone https://github.com/Listoncrypt/chioma.git
cd chioma/contract
```

### Verify the Workspace Builds

Run a quick build to confirm everything is set up correctly:

```bash
cargo build --release
```

Then run the test suite:

```bash
cargo test
```

If both commands complete without errors, **your environment is ready!** 🎉

---

## Step 5 — (Optional) Install Development Tools

These tools are not strictly required but are highly recommended for a productive development workflow.

### `cargo-watch` — Auto-Rebuild on Save

```bash
cargo install cargo-watch
```

Usage:

```bash
cargo watch -x test
```

This automatically re-runs your tests every time you save a file.

### `cargo-expand` — Macro Expansion Viewer

`cargo-expand` lets you inspect the code generated by Soroban's procedural macros (`#[contract]`, `#[contractimpl]`, `#[contracttype]`, etc.).

```bash
cargo install cargo-expand
```

> **Important:** `cargo-expand` requires the **Rust nightly toolchain** to function. Install it with:
>
> ```bash
> rustup install nightly
> ```
>
> You do **not** need to switch your default toolchain to nightly. `cargo-expand` will use it automatically.

Usage:

```bash
cargo expand -p property_registry
```

### `cargo-fmt` and `cargo-clippy` — Code Quality

These ship with the default Rust installation. The Chioma project enforces:

- **`cargo fmt --all`** — Consistent code formatting
- **`cargo clippy --all-targets --all-features -- -D warnings`** — Zero-warning linting policy

---

## Troubleshooting

### `rustc` or `cargo` Not Found (PATH Issues)

This is the most common setup issue, especially on **Windows**.

#### Symptoms

```
'rustc' is not recognized as an internal or external command
```

```
cargo: command not found
```

#### Solution — macOS / Linux

Ensure the Cargo bin directory is in your `PATH`. Add the following line to your shell configuration file (`~/.bashrc`, `~/.zshrc`, or `~/.profile`):

```bash
export PATH="$HOME/.cargo/bin:$PATH"
```

Then reload your shell:

```bash
source ~/.bashrc   # or ~/.zshrc
```

#### Solution — Windows

1. Open **Settings → System → About → Advanced system settings → Environment Variables**.
2. Under **User variables**, find `Path` and click **Edit**.
3. Verify that the following entry exists:

   ```
   %USERPROFILE%\.cargo\bin
   ```

4. If it is missing, click **New** and add it.
5. Click **OK** on all dialogs, then **restart your terminal**.

> **Windows Tip:** If you installed Rust via the `.msi` installer instead of `rustup`, the PATH may not be set automatically. We strongly recommend using `rustup` as described in [Step 1](#step-1--install-rust-via-rustup).

#### Quick Diagnostic

Run the following to check where your tools are located:

```bash
# macOS / Linux
which rustc
which cargo

# Windows (PowerShell)
Get-Command rustc
Get-Command cargo
```

---

### `wasm32-unknown-unknown` Target Errors

#### Symptom

```
error[E0463]: can't find crate for `core`
  |
  = note: the `wasm32-unknown-unknown` target may not be installed
```

#### Solution

```bash
rustup target add wasm32-unknown-unknown
```

If you are using a specific toolchain override, ensure the target is added to **that** toolchain:

```bash
rustup target add wasm32-unknown-unknown --toolchain stable
```

---

### `cargo-expand` Fails With "No Nightly Toolchain"

#### Symptom

```
error: toolchain 'nightly' is not installed
```

#### Solution

Install the nightly toolchain (it will not affect your default toolchain):

```bash
rustup install nightly
```

Then run `cargo-expand` normally:

```bash
cargo expand -p property_registry
```

---

### Build Failures — Dependency Resolution

#### Symptom

```
error: failed to select a version for the requirement `soroban-sdk = "^23"`
```

#### Solution

1. Ensure you are using a recent stable Rust version:

   ```bash
   rustup update stable
   ```

2. Clear the build cache and re-download dependencies:

   ```bash
   cargo clean
   cargo build --release
   ```

---

### Windows-Specific: Visual Studio Build Tools Missing

This is the **most common Windows error** and is covered in detail in [Step 1](#step-1--install-rust-via-rustup). Here is a quick summary.

#### Symptoms

```
error: linker `link.exe` not found
```

```
note: the msvc targets depend on the msvc linker but `link.exe` was not found
```

#### Solution

1. Download the [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
2. Run the installer and select the **"Desktop development with C++"** workload.
3. Ensure the following components are checked:
   - **MSVC v143 - VS 2022 C++ x64/x86 build tools**
   - **Windows 10/11 SDK**
4. Complete the installation and **restart your machine** (not just the terminal).

---

### Windows-Specific: Long Path Support

Some Rust/Cargo dependency trees can exceed the Windows 260-character path limit.

#### Solution

1. Open **Group Policy Editor** (`gpedit.msc`).
2. Navigate to **Computer Configuration → Administrative Templates → System → Filesystem**.
3. Enable **"Enable Win32 long paths"**.
4. Alternatively, set the registry key:

   ```powershell
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
     -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```

5. Restart your machine.

---

## Summary

| Step | Command                                         | Purpose                          |
| ---- | ----------------------------------------------- | -------------------------------- |
| 1    | `curl ... \| sh` or `rustup-init.exe`           | Install Rust via `rustup`        |
| 2    | `rustup target add wasm32-unknown-unknown`      | Add WASM compilation target      |
| 3    | `cargo install --locked stellar-cli`            | Install Soroban CLI              |
| 4    | `git clone ... && cd chioma/contract`           | Clone the repository             |
| 5    | `cargo build --release && cargo test`           | Verify the environment           |

---

## Next Steps

Your environment is ready! Continue to the next guide:

➡️ **[Your First Contract →](./FIRST-CONTRACT.md)** — Initialize, build, and understand your first Soroban contract.

---

*Last updated: April 2026 · Chioma Housing Protocol · [CONTRIBUTING.md](../../CONTRIBUTING.md)*
