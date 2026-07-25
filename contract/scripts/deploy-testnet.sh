#!/usr/bin/env bash
#
# Deploy all Chioma Soroban contracts to Stellar testnet.
# Based on: https://developers.stellar.org/docs/build/smart-contracts/getting-started/deploy-to-testnet
#
# Usage (from contract/):
#   ./scripts/deploy-testnet.sh
#
# Options:
#   --skip-build     Use existing WASM artifacts
#   --skip-fund      Do not request Friendbot funding
#   --deploy-only    Deploy WASM; skip initialization
#   --init-only      Initialize using IDs in .env.testnet (skip deploy)
#
# Environment:
#   DEPLOYER_KEY     Stellar identity name (default: testnet-deployer)
#   NETWORK          Network name (default: testnet)
#   PLATFORM_FEE_BPS Default 500
#   MIN_DISPUTE_VOTES Default 3

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$CONTRACT_ROOT"

NETWORK="${NETWORK:-testnet}"
DEPLOYER_KEY="${DEPLOYER_KEY:-testnet-deployer}"
WASM_DIR="${WASM_DIR:-target/wasm32v1-none/release}"
ENV_FILE="${ENV_FILE:-.env.testnet}"
PLATFORM_FEE_BPS="${PLATFORM_FEE_BPS:-500}"
MIN_DISPUTE_VOTES="${MIN_DISPUTE_VOTES:-3}"
ALIAS_PREFIX="${ALIAS_PREFIX:-chioma_testnet}"

SKIP_BUILD=0
SKIP_FUND=0
DEPLOY_ONLY=0
INIT_ONLY=0

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    --skip-fund) SKIP_FUND=1 ;;
    --deploy-only) DEPLOY_ONLY=1 ;;
    --init-only) INIT_ONLY=1 ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[*]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err() { echo -e "${RED}[!]${NC} $*" >&2; }

# Deploy order (no cross-contract WASM deps)
CONTRACTS=(
  user_profile
  property_registry
  agent_registry
  rent_obligation
  escrow
  payment
  dispute_resolution
  chioma
)

# Init order: chioma before dispute_resolution
INIT_CONTRACTS=(
  user_profile
  property_registry
  agent_registry
  rent_obligation
  escrow
  payment
  chioma
  dispute_resolution
)

env_var_for() {
  local contract="$1"
  echo "${contract^^}_CONTRACT_ID" | tr '-' '_'
}

require_cli() {
  if ! command -v stellar >/dev/null 2>&1; then
    err "Stellar CLI not found. Install: https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli"
    exit 1
  fi
}

ensure_identity() {
  if ! stellar keys ls 2>/dev/null | grep -qx "$DEPLOYER_KEY"; then
    log "Creating identity '$DEPLOYER_KEY' on $NETWORK..."
    stellar keys generate "$DEPLOYER_KEY" --network "$NETWORK"
  fi
}

fund_identity() {
  if [[ "$SKIP_FUND" -eq 1 ]]; then
    return 0
  fi
  log "Funding '$DEPLOYER_KEY' via Friendbot (if needed)..."
  stellar keys fund "$DEPLOYER_KEY" --network "$NETWORK" || warn "Friendbot funding skipped or failed; ensure the account has XLM"
}

build_contracts() {
  if [[ "$SKIP_BUILD" -eq 1 ]]; then
    log "Skipping build (--skip-build)"
    return 0
  fi
  log "Building contracts (stellar contract build)..."
  # Cursor sandbox sets CARGO_TARGET_DIR; use the project target for reproducible paths.
  env -u CARGO_TARGET_DIR stellar contract build
  log "Build complete"
}

admin_address() {
  stellar keys public-key "$DEPLOYER_KEY"
}

parse_contract_id() {
  # Deploy output ends with the contract id (C...).
  grep -Eo 'C[A-Z2-7]{55}' | tail -1
}

deploy_contract() {
  local contract="$1"
  local wasm="$WASM_DIR/${contract}.wasm"
  local alias="${ALIAS_PREFIX}_${contract}"

  if [[ ! -f "$wasm" ]]; then
    err "WASM not found: $wasm (run build first or check WASM_DIR)"
    return 1
  fi

  log "Deploying $contract..."
  local output
  output="$(
    stellar contract deploy \
      --wasm "$wasm" \
      --source-account "$DEPLOYER_KEY" \
      --network "$NETWORK" \
      --alias "$alias" 2>&1
  )" || {
    err "Deploy failed for $contract"
    echo "$output" >&2
    return 1
  }

  local contract_id
  contract_id="$(echo "$output" | parse_contract_id)"
  if [[ -z "$contract_id" ]]; then
    err "Could not parse contract id for $contract"
    echo "$output" >&2
    return 1
  fi

  log "$contract deployed: $contract_id (alias: $alias)"
  local var
  var="$(env_var_for "$contract")"
  echo "${var}=${contract_id}" >>"$ENV_FILE"
}

invoke_write() {
  stellar contract invoke \
    --id "$1" \
    --source-account "$DEPLOYER_KEY" \
    --network "$NETWORK" \
    --send yes \
    -- "${@:2}"
}

initialize_contract() {
  local contract="$1"
  local contract_id="$2"
  local admin="$3"

  log "Initializing $contract ($contract_id)..."

  case "$contract" in
    user_profile|property_registry|agent_registry)
      invoke_write "$contract_id" initialize --admin "$admin"
      ;;
    rent_obligation)
      invoke_write "$contract_id" initialize
      ;;
    escrow)
      invoke_write "$contract_id" initialize_admin --admin "$admin"
      ;;
    payment)
      invoke_write "$contract_id" set_platform_fee_collector --collector "$admin"
      ;;
    chioma)
      invoke_write "$contract_id" initialize \
        --admin "$admin" \
        --config "{\"fee_bps\": ${PLATFORM_FEE_BPS}, \"fee_collector\": \"${admin}\", \"paused\": false}"
      ;;
    dispute_resolution)
      # shellcheck disable=SC1090
      source "$ENV_FILE"
      if [[ -z "${CHIOMA_CONTRACT_ID:-}" ]]; then
        err "CHIOMA_CONTRACT_ID missing; cannot initialize dispute_resolution"
        return 1
      fi
      invoke_write "$contract_id" initialize \
        --admin "$admin" \
        --min_votes_required "$MIN_DISPUTE_VOTES" \
        --chioma_contract "$CHIOMA_CONTRACT_ID"
      ;;
    *)
      warn "No initializer for $contract"
      return 0
      ;;
  esac

  log "$contract initialized"
}

write_env_header() {
  local admin="$1"
  cat >"$ENV_FILE" <<EOF
# Chioma testnet deployment — $(date -u +"%Y-%m-%dT%H:%M:%SZ")
DEPLOYER_KEY=${DEPLOYER_KEY}
NETWORK=${NETWORK}
ADMIN_ADDRESS=${admin}
PLATFORM_FEE_BPS=${PLATFORM_FEE_BPS}
MIN_DISPUTE_VOTES=${MIN_DISPUTE_VOTES}
EOF
}

main() {
  require_cli
  ensure_identity
  fund_identity

  local admin
  admin="$(admin_address)"
  log "Deployer: $DEPLOYER_KEY ($admin)"
  log "Network: $NETWORK"

  if [[ "$INIT_ONLY" -eq 0 ]]; then
    build_contracts

    for wasm in "${CONTRACTS[@]}"; do
      if [[ ! -f "$WASM_DIR/${wasm}.wasm" ]]; then
        err "Missing $WASM_DIR/${wasm}.wasm"
        exit 1
      fi
    done

    write_env_header "$admin"

    for contract in "${CONTRACTS[@]}"; do
      deploy_contract "$contract"
      sleep 1
    done

    log "All contracts deployed. IDs written to $ENV_FILE"
  else
    if [[ ! -f "$ENV_FILE" ]]; then
      err "$ENV_FILE not found. Run deploy first or create it from .env.testnet.example"
      exit 1
    fi
    log "Init-only mode using $ENV_FILE"
  fi

  if [[ "$DEPLOY_ONLY" -eq 1 ]]; then
    log "Skipping initialization (--deploy-only)"
    exit 0
  fi

  for contract in "${INIT_CONTRACTS[@]}"; do
    local var id
    var="$(env_var_for "$contract")"
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    id="${!var:-}"
    if [[ -z "$id" ]]; then
      err "Missing $var in $ENV_FILE"
      exit 1
    fi
    initialize_contract "$contract" "$id" "$admin" || {
      err "Initialization failed for $contract"
      exit 1
    }
    sleep 1
  done

  log "Deployment and initialization complete."
  echo ""
  cat "$ENV_FILE"
}

main "$@"
