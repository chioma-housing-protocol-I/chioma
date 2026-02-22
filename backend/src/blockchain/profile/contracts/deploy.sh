#!/bin/bash

# Deployment script for Soroban user profile contract

set -e

# Configuration
NETWORK=${1:-testnet}
ADMIN_SECRET=${STELLAR_ADMIN_SECRET:-}

if [ -z "$ADMIN_SECRET" ]; then
  echo "Error: STELLAR_ADMIN_SECRET environment variable not set"
  echo "Usage: STELLAR_ADMIN_SECRET=<secret_key> ./deploy.sh [network]"
  exit 1
fi

echo "Deploying user profile contract to $NETWORK..."

# Build the contract first
./build.sh

# Deploy the contract
echo "Deploying contract..."
CONTRACT_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/user_profile_contract.optimized.wasm \
  --source "$ADMIN_SECRET" \
  --network "$NETWORK" \
  2>&1 | tail -n 1)

echo "✓ Contract deployed"
echo "  Contract ID: $CONTRACT_ID"

# Get admin public key
ADMIN_PUBLIC=$(soroban keys address admin 2>/dev/null || echo "")

if [ -z "$ADMIN_PUBLIC" ]; then
  echo ""
  echo "Warning: Could not determine admin public key"
  echo "Please initialize the contract manually:"
  echo ""
  echo "soroban contract invoke \\"
  echo "  --id $CONTRACT_ID \\"
  echo "  --source \$ADMIN_SECRET \\"
  echo "  --network $NETWORK \\"
  echo "  -- init_profiles \\"
  echo "  --admin <ADMIN_PUBLIC_KEY>"
else
  # Initialize the contract
  echo ""
  echo "Initializing contract..."
  soroban contract invoke \
    --id "$CONTRACT_ID" \
    --source "$ADMIN_SECRET" \
    --network "$NETWORK" \
    -- init_profiles \
    --admin "$ADMIN_PUBLIC"

  echo "✓ Contract initialized"
  echo "  Admin: $ADMIN_PUBLIC"
fi

echo ""
echo "Deployment Summary:"
echo "  Network: $NETWORK"
echo "  Contract ID: $CONTRACT_ID"
echo ""
echo "Add this to your .env file:"
echo "PROFILE_CONTRACT_ID=$CONTRACT_ID"
echo ""
echo "✓ Deployment complete!"
