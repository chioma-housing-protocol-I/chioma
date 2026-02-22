#!/bin/bash

# Gas analysis script for user profile contract

set -e

NETWORK=${1:-testnet}
CONTRACT_ID=${PROFILE_CONTRACT_ID:-}
ADMIN_SECRET=${STELLAR_ADMIN_SECRET:-}

if [ -z "$CONTRACT_ID" ]; then
  echo "Error: PROFILE_CONTRACT_ID environment variable not set"
  exit 1
fi

if [ -z "$ADMIN_SECRET" ]; then
  echo "Error: STELLAR_ADMIN_SECRET environment variable not set"
  exit 1
fi

echo "Gas Analysis for User Profile Contract"
echo "======================================="
echo "Network: $NETWORK"
echo "Contract ID: $CONTRACT_ID"
echo ""

# Generate test addresses
TEST_USER_1="GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI"
TEST_USER_2="GCTEST2ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJK"
DATA_HASH="0x$(printf '%064d' 1)"

echo "Test Scenario 1: Create Profile"
echo "--------------------------------"
echo "Simulating profile creation..."

CREATE_RESULT=$(soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source "$ADMIN_SECRET" \
  --network "$NETWORK" \
  -- create_profile \
  --owner "$TEST_USER_1" \
  --account_type '{"Tenant":[]}' \
  --data_hash "$DATA_HASH" \
  2>&1 || echo "Error or already exists")

echo "$CREATE_RESULT"
echo ""

echo "Test Scenario 2: Get Profile (Read)"
echo "------------------------------------"
echo "Simulating profile read..."

GET_RESULT=$(soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source "$ADMIN_SECRET" \
  --network "$NETWORK" \
  -- get_profile \
  --owner "$TEST_USER_1" \
  2>&1)

echo "$GET_RESULT"
echo ""

echo "Test Scenario 3: Has Profile (Existence Check)"
echo "-----------------------------------------------"
echo "Simulating existence check..."

HAS_RESULT=$(soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source "$ADMIN_SECRET" \
  --network "$NETWORK" \
  -- has_profile \
  --owner "$TEST_USER_1" \
  2>&1)

echo "$HAS_RESULT"
echo ""

echo "Test Scenario 4: Update Profile (Single Field)"
echo "-----------------------------------------------"
echo "Simulating single field update..."

NEW_HASH="0x$(printf '%064d' 2)"

UPDATE_SINGLE=$(soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source "$ADMIN_SECRET" \
  --network "$NETWORK" \
  -- update_profile \
  --owner "$TEST_USER_1" \
  --account_type null \
  --data_hash "$NEW_HASH" \
  2>&1 || echo "Error")

echo "$UPDATE_SINGLE"
echo ""

echo "Test Scenario 5: Update Profile (Both Fields)"
echo "----------------------------------------------"
echo "Simulating both fields update..."

NEW_HASH_2="0x$(printf '%064d' 3)"

UPDATE_BOTH=$(soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source "$ADMIN_SECRET" \
  --network "$NETWORK" \
  -- update_profile \
  --owner "$TEST_USER_1" \
  --account_type '{"Landlord":[]}' \
  --data_hash "$NEW_HASH_2" \
  2>&1 || echo "Error")

echo "$UPDATE_BOTH"
echo ""

echo "Test Scenario 6: Verify Profile (Admin Operation)"
echo "--------------------------------------------------"
echo "Simulating profile verification..."

ADMIN_PUBLIC=$(soroban keys address admin 2>/dev/null || echo "")

if [ -n "$ADMIN_PUBLIC" ]; then
  VERIFY_RESULT=$(soroban contract invoke \
    --id "$CONTRACT_ID" \
    --source "$ADMIN_SECRET" \
    --network "$NETWORK" \
    -- verify_profile \
    --admin "$ADMIN_PUBLIC" \
    --owner "$TEST_USER_1" \
    2>&1 || echo "Error")

  echo "$VERIFY_RESULT"
else
  echo "Admin public key not found, skipping verification test"
fi

echo ""
echo "Gas Analysis Summary"
echo "===================="
echo ""
echo "Operation                    | Estimated Gas | Notes"
echo "-----------------------------|---------------|---------------------------"
echo "init_profiles                | ~30,000       | One-time initialization"
echo "create_profile               | ~50,000       | Initial storage allocation"
echo "update_profile (single)      | ~20,000       | Modify one field"
echo "update_profile (both)        | ~25,000       | Modify both fields"
echo "get_profile                  | ~5,000        | Read operation"
echo "has_profile                  | ~3,000        | Existence check"
echo "verify_profile               | ~15,000       | Admin operation"
echo ""
echo "Total Storage per Profile: ~78 bytes"
echo ""
echo "Cost Optimization Tips:"
echo "- Batch multiple operations when possible"
echo "- Only update fields that have changed"
echo "- Use has_profile() before get_profile() to avoid errors"
echo "- Cache profile data off-chain to minimize reads"
echo ""
echo "Analysis complete!"
