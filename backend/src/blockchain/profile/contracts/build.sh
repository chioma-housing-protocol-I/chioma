#!/bin/bash

# Build script for Soroban user profile contract

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
WASM_SIZE=$(wc -c < target/wasm32-unknown-unknown/release/user_profile_contract.wasm)
OPTIMIZED_SIZE=$(wc -c < target/wasm32-unknown-unknown/release/user_profile_contract.optimized.wasm)

echo ""
echo "Build Summary:"
echo "  Original WASM: $WASM_SIZE bytes"
echo "  Optimized WASM: $OPTIMIZED_SIZE bytes"
echo "  Reduction: $(( (WASM_SIZE - OPTIMIZED_SIZE) * 100 / WASM_SIZE ))%"
echo ""
echo "✓ Build complete!"
