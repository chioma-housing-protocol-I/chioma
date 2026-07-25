#!/usr/bin/env bash
#
# Verify Chioma testnet deployment using contract IDs in .env.testnet

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$CONTRACT_ROOT"

NETWORK="${NETWORK:-testnet}"
DEPLOYER_KEY="${DEPLOYER_KEY:-testnet-deployer}"
ENV_FILE="${ENV_FILE:-.env.testnet}"
WASM_DIR="${WASM_DIR:-target/wasm32v1-none/release}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

header() { echo -e "${BLUE}=== $1 ===${NC}"; }
pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }

if [[ ! -f "$ENV_FILE" ]]; then
  fail "Environment file not found: $ENV_FILE"
  echo "Run: ./scripts/deploy-testnet.sh"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

header "Deployment Verification"

verify_exists() {
  local name="$1"
  local id="$2"
  if [[ -z "$id" ]]; then
    fail "$name: contract id not set"
    return 1
  fi
  if stellar contract info --id "$id" --network "$NETWORK" &>/dev/null; then
    pass "$name deployed: $id"
    return 0
  fi
  fail "$name not found on network: $id"
  return 1
}

test_view() {
  local name="$1"
  local id="$2"
  shift 2
  if stellar contract invoke \
    --id "$id" \
    --source-account "$DEPLOYER_KEY" \
    --network "$NETWORK" \
    --send no \
    -- "$@" &>/dev/null; then
    pass "$name: ${*}() ok"
  else
    warn "$name: ${*}() failed (may need init or different args)"
  fi
}

FAILED=0

header "On-chain presence"
verify_exists "User Profile" "${USER_PROFILE_CONTRACT_ID:-}" || FAILED=$((FAILED + 1))
verify_exists "Property Registry" "${PROPERTY_REGISTRY_CONTRACT_ID:-}" || FAILED=$((FAILED + 1))
verify_exists "Agent Registry" "${AGENT_REGISTRY_CONTRACT_ID:-}" || FAILED=$((FAILED + 1))
verify_exists "Rent Obligation" "${RENT_OBLIGATION_CONTRACT_ID:-}" || FAILED=$((FAILED + 1))
verify_exists "Escrow" "${ESCROW_CONTRACT_ID:-}" || FAILED=$((FAILED + 1))
verify_exists "Payment" "${PAYMENT_CONTRACT_ID:-}" || FAILED=$((FAILED + 1))
verify_exists "Dispute Resolution" "${DISPUTE_RESOLUTION_CONTRACT_ID:-}" || FAILED=$((FAILED + 1))
verify_exists "Chioma" "${CHIOMA_CONTRACT_ID:-}" || FAILED=$((FAILED + 1))

echo ""
header "Read-only smoke tests"
test_view "User Profile" "${USER_PROFILE_CONTRACT_ID:-}" get_admin
test_view "Property Registry" "${PROPERTY_REGISTRY_CONTRACT_ID:-}" get_property_count
test_view "Agent Registry" "${AGENT_REGISTRY_CONTRACT_ID:-}" get_agent_count
test_view "Rent Obligation" "${RENT_OBLIGATION_CONTRACT_ID:-}" get_obligation_count
test_view "Escrow" "${ESCROW_CONTRACT_ID:-}" get_admin
test_view "Dispute Resolution" "${DISPUTE_RESOLUTION_CONTRACT_ID:-}" get_arbiter_count
test_view "Chioma" "${CHIOMA_CONTRACT_ID:-}" get_state

echo ""
header "Local WASM sizes"
for contract in user_profile property_registry agent_registry rent_obligation escrow payment dispute_resolution chioma; do
  if [[ -f "$WASM_DIR/${contract}.wasm" ]]; then
    echo "  $contract: $(du -h "$WASM_DIR/${contract}.wasm" | cut -f1)"
  fi
done

echo ""
header "Contract IDs"
grep '_CONTRACT_ID=' "$ENV_FILE" || true

echo ""
if [[ "$FAILED" -eq 0 ]]; then
  pass "All contracts verified on $NETWORK"
  exit 0
fi

fail "$FAILED contract(s) failed verification"
exit 1
