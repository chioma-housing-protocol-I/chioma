#!/bin/bash

# Test script for Stellar Soroban smart contract

set -e

echo "Running contract tests..."
echo ""

# Run all tests with output
cargo test -- --nocapture

echo ""
echo "✓ All tests passed!"

# Run tests with coverage (if cargo-tarpaulin is installed)
if command -v cargo-tarpaulin &> /dev/null; then
  echo ""
  echo "Generating test coverage report..."
  cargo tarpaulin --out Html --output-dir coverage
  echo "✓ Coverage report generated in coverage/index.html"
fi
