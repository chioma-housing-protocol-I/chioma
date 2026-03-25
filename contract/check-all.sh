#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

# Ensure `cargo` is available
if ! command -v cargo >/dev/null 2>&1; then
	echo "cargo not found. Install the Rust toolchain (https://rustup.rs/) and re-run this script."
	exit 1
fi

# Format, lint (clippy), test, and build for wasm
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo build --target wasm32-unknown-unknown --release
