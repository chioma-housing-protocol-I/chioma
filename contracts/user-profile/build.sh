#!/bin/bash

# Build script for Stellar Soroban smart contract

set -e

echo "Building user profile contract..."

# Build the contract
cargo build --target wasm32-unknown-unknown --release

echo "✓ Contract built successfully"

# Optimize the WASM binary
echo "Optimizing WASM binary..."
soroban contract optimize \
  --wasm target/wasm32-unknown-unknown/release/user_profile_contract.wasm

echo "✓ WASM optimized"

# Display file size
echo ""
echo "Contract size:"
ls -lh target/wasm32-unknown-unknown/release/*.wasm

echo ""
echo "Build complete! Contract ready for deployment."
