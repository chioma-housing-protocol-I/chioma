#!/bin/bash

# Deployment script for Stellar Soroban smart contract

set -e

# Check if network argument is provided
if [ -z "$1" ]; then
  echo "Usage: ./deploy.sh <network>"
  echo "Networks: testnet, mainnet"
  exit 1
fi

NETWORK=$1

# Validate network
if [ "$NETWORK" != "testnet" ] && [ "$NETWORK" != "mainnet" ]; then
  echo "Error: Invalid network. Use 'testnet' or 'mainnet'"
  exit 1
fi

echo "Deploying to $NETWORK..."

# Check if WASM file exists
WASM_FILE="target/wasm32-unknown-unknown/release/user_profile_contract.wasm"
if [ ! -f "$WASM_FILE" ]; then
  echo "Error: WASM file not found. Run ./build.sh first"
  exit 1
fi

# Check for admin secret key
if [ -z "$STELLAR_ADMIN_SECRET" ]; then
  echo "Error: STELLAR_ADMIN_SECRET environment variable not set"
  exit 1
fi

# Deploy the contract
echo "Deploying contract..."
CONTRACT_ID=$(soroban contract deploy \
  --wasm "$WASM_FILE" \
  --source "$STELLAR_ADMIN_SECRET" \
  --network "$NETWORK")

echo "✓ Contract deployed successfully!"
echo ""
echo "Contract ID: $CONTRACT_ID"
echo ""

# Initialize the contract
echo "Initializing contract..."
ADMIN_ADDRESS=$(soroban keys address admin 2>/dev/null || echo "")

if [ -z "$ADMIN_ADDRESS" ]; then
  echo "Warning: Could not get admin address. Initialize manually with:"
  echo "soroban contract invoke --id $CONTRACT_ID --source \$STELLAR_ADMIN_SECRET --network $NETWORK -- initialize --admin <ADMIN_ADDRESS>"
else
  soroban contract invoke \
    --id "$CONTRACT_ID" \
    --source "$STELLAR_ADMIN_SECRET" \
    --network "$NETWORK" \
    -- initialize \
    --admin "$ADMIN_ADDRESS"
  
  echo "✓ Contract initialized with admin: $ADMIN_ADDRESS"
fi

echo ""
echo "Deployment complete!"
echo ""
echo "Save this contract ID for your application:"
echo "export PROFILE_CONTRACT_ID=$CONTRACT_ID"
