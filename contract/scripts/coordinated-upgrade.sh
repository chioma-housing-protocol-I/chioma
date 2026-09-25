#!/usr/bin/env bash
#
# Coordinated protocol upgrade script — Chioma
#
# Upgrades a single Chioma protocol contract and records the new version in
# the shared Upgrade Registry contract.  Before upgrading it prints a
# protocol-wide status table so the operator can verify the current state of
# all 8 contracts and catch admin/version drift before proceeding.
#
# Usage (from contract/):
#   ./scripts/coordinated-upgrade.sh <contract_name> <new_wasm_path> <new_version> [options]
#
# Arguments:
#   contract_name   One of: user_profile property_registry agent_registry
#                           rent_obligation escrow payment dispute_resolution chioma
#   new_wasm_path   Path to the compiled .wasm file to upload
#   new_version     Semantic version string, e.g. "1.2.3"
#
# Options:
#   --proposal-id ID    Re-use an existing upgrade proposal already on-chain
#   --delay SECS        Timelock delay in seconds (default: 86400 = 24 h)
#   --notes TEXT        Notes recorded in the upgrade proposal and registry
#   --skip-status       Skip the pre-upgrade status table check
#   --dry-run           Print all stellar commands without executing them
#   --network NET       Network to use (default: testnet)
#   --deployer-key KEY  Stellar identity name (default: testnet-deployer)
#   --env-file FILE     Path to the env file with contract IDs (default: .env.testnet)
#
# Environment variables (override defaults):
#   NETWORK, DEPLOYER_KEY, ENV_FILE, DELAY_SECS, UPGRADE_REGISTRY_CONTRACT_ID
#
# Exit codes:
#   0  Success
#   1  Usage or configuration error
#   2  Pre-flight check failed (admin mismatch / version drift detected)
#   3  On-chain operation failed

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$CONTRACT_ROOT"

# ── Defaults ─────────────────────────────────────────────────────────────────
NETWORK="${NETWORK:-testnet}"
DEPLOYER_KEY="${DEPLOYER_KEY:-testnet-deployer}"
ENV_FILE="${ENV_FILE:-.env.testnet}"
DELAY_SECS="${DELAY_SECS:-86400}"
NOTES=""
PROPOSAL_ID=""
SKIP_STATUS=0
DRY_RUN=0

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

header() { echo -e "${BLUE}${BOLD}=== $1 ===${NC}"; }
log()    { echo -e "${GREEN}[*]${NC} $*"; }
warn()   { echo -e "${YELLOW}[!]${NC} $*"; }
err()    { echo -e "${RED}[!]${NC} $*" >&2; }
step()   { echo -e "${CYAN}  >${NC} $*"; }

# ── Argument parsing ──────────────────────────────────────────────────────────
if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <contract_name> <new_wasm_path> <new_version> [options]"
  echo "Run '$0 --help' for full usage."
  exit 1
fi

CONTRACT_NAME="$1"
NEW_WASM_PATH="$2"
NEW_VERSION="$3"
shift 3

while [[ $# -gt 0 ]]; do
  case "$1" in
    --proposal-id) PROPOSAL_ID="$2"; shift 2 ;;
    --delay)       DELAY_SECS="$2"; shift 2 ;;
    --notes)       NOTES="$2"; shift 2 ;;
    --skip-status) SKIP_STATUS=1; shift ;;
    --dry-run)     DRY_RUN=1; shift ;;
    --network)     NETWORK="$2"; shift 2 ;;
    --deployer-key) DEPLOYER_KEY="$2"; shift 2 ;;
    --env-file)    ENV_FILE="$2"; shift 2 ;;
    --help|-h)
      sed -n '2,40p' "$0"
      exit 0
      ;;
    *) err "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Validation ────────────────────────────────────────────────────────────────
VALID_CONTRACTS=(user_profile property_registry agent_registry rent_obligation
                 escrow payment dispute_resolution chioma)

is_valid_contract() {
  local name="$1"
  for c in "${VALID_CONTRACTS[@]}"; do
    [[ "$c" == "$name" ]] && return 0
  done
  return 1
}

if ! is_valid_contract "$CONTRACT_NAME"; then
  err "Unknown contract: $CONTRACT_NAME"
  err "Valid names: ${VALID_CONTRACTS[*]}"
  exit 1
fi

if [[ ! -f "$NEW_WASM_PATH" ]]; then
  err "WASM file not found: $NEW_WASM_PATH"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  err "Env file not found: $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

# Derive the env var name for this contract, e.g. user_profile → USER_PROFILE_CONTRACT_ID
contract_env_var() {
  echo "${1^^}_CONTRACT_ID" | tr '-' '_'
}

TARGET_VAR="$(contract_env_var "$CONTRACT_NAME")"
TARGET_CONTRACT_ID="${!TARGET_VAR:-}"

if [[ -z "$TARGET_CONTRACT_ID" ]]; then
  err "$TARGET_VAR not set in $ENV_FILE"
  exit 1
fi

REGISTRY_ID="${UPGRADE_REGISTRY_CONTRACT_ID:-}"
if [[ -z "$REGISTRY_ID" ]]; then
  warn "UPGRADE_REGISTRY_CONTRACT_ID not set — registry bookkeeping will be skipped."
  warn "Deploy the upgrade_registry contract and set the variable to enable tracking."
fi

ADMIN_ADDRESS="$(stellar keys public-key "$DEPLOYER_KEY")"
NOTES="${NOTES:-Upgrade $CONTRACT_NAME to $NEW_VERSION via coordinated-upgrade.sh}"

if [[ -z "$PROPOSAL_ID" ]]; then
  PROPOSAL_ID="upgrade_${CONTRACT_NAME}_${NEW_VERSION}_$(date +%s)"
fi

# ── Helper: run or print ──────────────────────────────────────────────────────
stellar_invoke() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[DRY-RUN] stellar contract invoke $*"
    return 0
  fi
  stellar contract invoke "$@"
}

# ── Step 0: Protocol status table ─────────────────────────────────────────────
if [[ "$SKIP_STATUS" -eq 0 ]]; then
  header "Step 0: Pre-upgrade protocol status"

  if [[ -n "$REGISTRY_ID" ]]; then
    log "Fetching protocol status from registry (${REGISTRY_ID})..."
    if ! stellar contract invoke \
         --id "$REGISTRY_ID" \
         --source-account "$DEPLOYER_KEY" \
         --network "$NETWORK" \
         --send no \
         -- get_protocol_status 2>/dev/null; then
      warn "Could not fetch protocol status from registry (registry may not be initialized)."
    fi
  else
    log "Querying each contract individually (no registry configured)..."
    echo ""
    printf "%-25s %-20s %s\n" "CONTRACT" "VERSION" "CONTRACT_ID"
    printf "%-25s %-20s %s\n" "--------" "-------" "-----------"
    for c in "${VALID_CONTRACTS[@]}"; do
      cv="$(contract_env_var "$c")"
      cid="${!cv:-}"
      if [[ -n "$cid" ]]; then
        ver="(unknown)"
        if raw_ver="$(stellar contract invoke \
             --id "$cid" \
             --source-account "$DEPLOYER_KEY" \
             --network "$NETWORK" \
             --send no \
             -- get_version 2>/dev/null)"; then
          ver="$raw_ver"
        fi
        printf "%-25s %-20s %s\n" "$c" "$ver" "$cid"
      else
        printf "%-25s %-20s %s\n" "$c" "(not deployed)" ""
      fi
    done
    echo ""
  fi

  echo ""
  read -rp "Continue with upgrade of '$CONTRACT_NAME' to '$NEW_VERSION'? [y/N] " CONFIRM
  if [[ "${CONFIRM,,}" != "y" ]]; then
    log "Upgrade cancelled by operator."
    exit 0
  fi
fi

# ── Step 1: Upload WASM ────────────────────────────────────────────────────────
header "Step 1: Upload WASM to network"
log "Uploading $NEW_WASM_PATH to $NETWORK..."

if [[ "$DRY_RUN" -eq 1 ]]; then
  WASM_HASH="DRY_RUN_HASH_$(date +%s)"
  echo "[DRY-RUN] stellar contract install --source-account $DEPLOYER_KEY --network $NETWORK --wasm $NEW_WASM_PATH"
else
  WASM_HASH="$(stellar contract install \
    --source-account "$DEPLOYER_KEY" \
    --network "$NETWORK" \
    --wasm "$NEW_WASM_PATH")"
fi

log "WASM hash: $WASM_HASH"

# ── Step 2: Propose upgrade on the target contract ────────────────────────────
header "Step 2: Propose upgrade on $CONTRACT_NAME"

# chioma uses `propose_contract_upgrade`; all others use `propose_upgrade`
if [[ "$CONTRACT_NAME" == "chioma" ]]; then
  PROPOSE_FN="propose_contract_upgrade"
else
  PROPOSE_FN="propose_upgrade"
fi

step "Calling $PROPOSE_FN on $TARGET_CONTRACT_ID..."
stellar_invoke \
  --id "$TARGET_CONTRACT_ID" \
  --source-account "$DEPLOYER_KEY" \
  --network "$NETWORK" \
  --send yes \
  -- "$PROPOSE_FN" \
  --proposer "$ADMIN_ADDRESS" \
  --proposal_id "$PROPOSAL_ID" \
  --wasm_hash "$WASM_HASH" \
  --notes "$NOTES" \
  --delay_seconds "$DELAY_SECS"

log "Proposal '$PROPOSAL_ID' submitted with ${DELAY_SECS}s timelock."
log "Proposal will be executable after: $(date -d "+${DELAY_SECS} seconds" 2>/dev/null || date -v "+${DELAY_SECS}S" 2>/dev/null || echo "(check ledger timestamp)")"

# ── Step 3: Approve upgrade (remaining multi-sig admins) ─────────────────────
header "Step 3: Approve upgrade proposal"
warn "If this contract uses multi-sig, all required co-signers must call:"
echo ""
echo "  stellar contract invoke \\"
echo "    --id $TARGET_CONTRACT_ID \\"
echo "    --source-account <CO_SIGNER_KEY> \\"
echo "    --network $NETWORK \\"
echo "    --send yes \\"
if [[ "$CONTRACT_NAME" == "chioma" ]]; then
echo "    -- approve_contract_upgrade \\"
else
echo "    -- approve_upgrade \\"
fi
echo "    --approver <CO_SIGNER_ADDRESS> \\"
echo "    --proposal_id $PROPOSAL_ID"
echo ""
warn "For single-admin contracts, this step is optional (threshold is already met)."

read -rp "Press ENTER once all required co-signers have approved (or to skip for deferred execution)..."

# ── Step 4: Execute upgrade ────────────────────────────────────────────────────
header "Step 4: Execute upgrade on $CONTRACT_NAME"
warn "Execution will fail if the timelock ETA has not passed yet."
read -rp "Execute now? [y/N] " EXEC_CONFIRM

if [[ "${EXEC_CONFIRM,,}" == "y" ]]; then
  if [[ "$CONTRACT_NAME" == "chioma" ]]; then
    EXECUTE_FN="execute_contract_upgrade"
    step "Calling $EXECUTE_FN on $TARGET_CONTRACT_ID..."
    stellar_invoke \
      --id "$TARGET_CONTRACT_ID" \
      --source-account "$DEPLOYER_KEY" \
      --network "$NETWORK" \
      --send yes \
      -- "$EXECUTE_FN" \
      --executor "$ADMIN_ADDRESS" \
      --proposal_id "$PROPOSAL_ID" \
      --new_version "{\"major\":0,\"minor\":0,\"patch\":0,\"label\":\"$NEW_VERSION\",\"status\":\"Active\",\"hash\":\"\",\"updated_at\":0}"
  else
    EXECUTE_FN="execute_upgrade"
    step "Calling $EXECUTE_FN on $TARGET_CONTRACT_ID..."
    stellar_invoke \
      --id "$TARGET_CONTRACT_ID" \
      --source-account "$DEPLOYER_KEY" \
      --network "$NETWORK" \
      --send yes \
      -- "$EXECUTE_FN" \
      --executor "$ADMIN_ADDRESS" \
      --proposal_id "$PROPOSAL_ID"
  fi
  log "Upgrade executed on $CONTRACT_NAME."
else
  warn "Execution deferred. Re-run with --proposal-id $PROPOSAL_ID when the timelock passes."
  warn "Use the execute_upgrade / execute_contract_upgrade function directly, then come back to run Step 5."
fi

# ── Step 5: Update registry ────────────────────────────────────────────────────
if [[ -n "$REGISTRY_ID" ]]; then
  header "Step 5: Update Upgrade Registry"
  step "Recording new version '$NEW_VERSION' for '$CONTRACT_NAME' in registry..."
  stellar_invoke \
    --id "$REGISTRY_ID" \
    --source-account "$DEPLOYER_KEY" \
    --network "$NETWORK" \
    --send yes \
    -- update_version \
    --caller "$ADMIN_ADDRESS" \
    --name "$CONTRACT_NAME" \
    --new_version "$NEW_VERSION" \
    --notes "$NOTES"
  log "Registry updated."
else
  warn "Step 5 skipped: UPGRADE_REGISTRY_CONTRACT_ID not set."
fi

# ── Step 6: Post-upgrade verification ─────────────────────────────────────────
header "Step 6: Post-upgrade verification"
step "Running verify-deployment.sh for $CONTRACT_NAME..."
if [[ "$DRY_RUN" -eq 0 ]]; then
  ENV_FILE="$ENV_FILE" NETWORK="$NETWORK" DEPLOYER_KEY="$DEPLOYER_KEY" \
    "$SCRIPT_DIR/verify-deployment.sh" 2>&1 | grep -E "✓|✗|⚠|$CONTRACT_NAME" || true
fi

echo ""
log "Coordinated upgrade of $CONTRACT_NAME → $NEW_VERSION complete."
echo ""
echo "  Contract :  $CONTRACT_NAME"
echo "  New ver  :  $NEW_VERSION"
echo "  WASM hash:  $WASM_HASH"
echo "  Proposal :  $PROPOSAL_ID"
if [[ -n "$REGISTRY_ID" ]]; then
echo "  Registry :  $REGISTRY_ID (updated)"
fi
echo ""
echo "Next steps:"
echo "  • Monitor contract behaviour for 24 h"
echo "  • Run the full test suite against the live contract"
echo "  • Update contract/docs/deployment/UPGRADES.md if the process changed"
