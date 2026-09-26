#!/usr/bin/env bash
#
# Coordinated admin key rotation — Chioma protocol
#
# Rotates the admin address on every (or a subset of) Chioma protocol contracts
# in a single scripted operation, then updates the Upgrade Registry so the new
# state is immediately visible via get_protocol_status.
#
# The rotation goes through a multi-step, on-chain governance process:
#
#   1. propose_rotation  — create an AdminRotationProposal in the registry
#   2. approve_rotation  — M-of-N registry admins approve (interactive pause)
#   3. Per-contract call — set the new admin on each target contract
#   4. update_admin      — record the new admin for each contract in the registry
#   5. execute_rotation  — mark the registry proposal as executed (close it out)
#
# Usage (from contract/):
#   ./scripts/rotate-admin.sh <new_admin_address> [options]
#
# Arguments:
#   new_admin_address   The Stellar address that should become the new admin
#
# Options:
#   --contracts LIST    Comma-separated subset, e.g. "escrow,payment"
#                       Default: all 8 contracts
#   --proposal-id ID    Custom proposal id (default: auto-generated)
#   --notes TEXT        Notes stored in the rotation proposal
#   --dry-run           Print all stellar commands without executing them
#   --network NET       Network to use (default: testnet)
#   --deployer-key KEY  Stellar identity name for the CURRENT admin (default: testnet-deployer)
#   --env-file FILE     Path to the env file with contract IDs (default: .env.testnet)
#   --skip-registry     Skip registry proposal steps (use if registry not deployed)
#
# Environment variables (override defaults):
#   NETWORK, DEPLOYER_KEY, ENV_FILE, UPGRADE_REGISTRY_CONTRACT_ID

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$CONTRACT_ROOT"

# ── Defaults ─────────────────────────────────────────────────────────────────
NETWORK="${NETWORK:-testnet}"
DEPLOYER_KEY="${DEPLOYER_KEY:-testnet-deployer}"
ENV_FILE="${ENV_FILE:-.env.testnet}"
NOTES=""
PROPOSAL_ID=""
DRY_RUN=0
SKIP_REGISTRY=0
CONTRACTS_FILTER=""  # empty = all

ALL_CONTRACTS=(user_profile property_registry agent_registry rent_obligation
               escrow payment dispute_resolution chioma)

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

header() { echo -e "${BLUE}${BOLD}=== $1 ===${NC}"; }
log()    { echo -e "${GREEN}[*]${NC} $*"; }
warn()   { echo -e "${YELLOW}[!]${NC} $*"; }
err()    { echo -e "${RED}[!]${NC} $*" >&2; }
step()   { echo -e "${CYAN}  >${NC} $*"; }

# ── Argument parsing ──────────────────────────────────────────────────────────
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <new_admin_address> [options]"
  echo "Run '$0 --help' for full usage."
  exit 1
fi

NEW_ADMIN="$1"; shift

while [[ $# -gt 0 ]]; do
  case "$1" in
    --contracts)    CONTRACTS_FILTER="$2"; shift 2 ;;
    --proposal-id)  PROPOSAL_ID="$2"; shift 2 ;;
    --notes)        NOTES="$2"; shift 2 ;;
    --dry-run)      DRY_RUN=1; shift ;;
    --network)      NETWORK="$2"; shift 2 ;;
    --deployer-key) DEPLOYER_KEY="$2"; shift 2 ;;
    --env-file)     ENV_FILE="$2"; shift 2 ;;
    --skip-registry) SKIP_REGISTRY=1; shift ;;
    --help|-h)
      sed -n '2,45p' "$0"
      exit 0
      ;;
    *) err "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Resolve target contract list ──────────────────────────────────────────────
if [[ -n "$CONTRACTS_FILTER" ]]; then
  IFS=',' read -ra TARGET_CONTRACTS <<< "$CONTRACTS_FILTER"
else
  TARGET_CONTRACTS=("${ALL_CONTRACTS[@]}")
fi

# ── Load env file ─────────────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  err "Env file not found: $ENV_FILE"
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

CURRENT_ADMIN="$(stellar keys public-key "$DEPLOYER_KEY")"
REGISTRY_ID="${UPGRADE_REGISTRY_CONTRACT_ID:-}"

NOTES="${NOTES:-Admin rotation to $NEW_ADMIN via rotate-admin.sh $(date -u +"%Y-%m-%dT%H:%M:%SZ")}"
if [[ -z "$PROPOSAL_ID" ]]; then
  PROPOSAL_ID="rotation_$(date +%s)"
fi

contract_env_var() { echo "${1^^}_CONTRACT_ID" | tr '-' '_'; }

stellar_invoke() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[DRY-RUN] stellar contract invoke $*"
    return 0
  fi
  stellar contract invoke "$@"
}

# ── Pre-flight: print current admin / version state ──────────────────────────
header "Pre-flight: current protocol status"
echo ""
printf "%-25s %-64s %s\n" "CONTRACT" "CONTRACT_ID" "CURRENT_ADMIN_SOURCE"
printf "%-25s %-64s %s\n" "--------" "-----------" "--------------------"
for c in "${TARGET_CONTRACTS[@]}"; do
  cv="$(contract_env_var "$c")"
  cid="${!cv:-}"
  printf "%-25s %-64s %s\n" "$c" "${cid:-(not set)}" "(see registry or contract state)"
done
echo ""
echo "  Current admin key : $CURRENT_ADMIN"
echo "  New admin address : $NEW_ADMIN"
echo ""
warn "This operation will rotate the admin on ${#TARGET_CONTRACTS[@]} contract(s)."
read -rp "Proceed? [y/N] " CONFIRM
if [[ "${CONFIRM,,}" != "y" ]]; then
  log "Rotation cancelled."
  exit 0
fi

# ── Step 1: Create rotation proposal in registry ─────────────────────────────
if [[ "$SKIP_REGISTRY" -eq 0 && -n "$REGISTRY_ID" ]]; then
  header "Step 1: Propose rotation in Upgrade Registry"

  # Build the target_contracts JSON array for the CLI
  CONTRACTS_JSON="["
  for i in "${!TARGET_CONTRACTS[@]}"; do
    CONTRACTS_JSON+="\"${TARGET_CONTRACTS[$i]}\""
    [[ $i -lt $(( ${#TARGET_CONTRACTS[@]} - 1 )) ]] && CONTRACTS_JSON+=","
  done
  CONTRACTS_JSON+="]"

  step "propose_rotation on registry ($REGISTRY_ID)..."
  stellar_invoke \
    --id "$REGISTRY_ID" \
    --source-account "$DEPLOYER_KEY" \
    --network "$NETWORK" \
    --send yes \
    -- propose_rotation \
    --proposer "$CURRENT_ADMIN" \
    --proposal_id "$PROPOSAL_ID" \
    --new_admin "$NEW_ADMIN" \
    --target_contracts "$CONTRACTS_JSON" \
    --notes "$NOTES"

  log "Rotation proposal '$PROPOSAL_ID' created."
  echo ""
  warn "Any additional registry admins must now approve via:"
  echo ""
  echo "  stellar contract invoke \\"
  echo "    --id $REGISTRY_ID \\"
  echo "    --source-account <CO_SIGNER_KEY> \\"
  echo "    --network $NETWORK \\"
  echo "    --send yes \\"
  echo "    -- approve_rotation \\"
  echo "    --approver <CO_SIGNER_ADDRESS> \\"
  echo "    --proposal_id $PROPOSAL_ID"
  echo ""
  read -rp "Press ENTER once all required approvals are in place..."
else
  header "Step 1: Skipped (registry not configured or --skip-registry)"
fi

# ── Step 2: Apply admin rotation per contract ─────────────────────────────────
header "Step 2: Apply new admin to each target contract"

SUCCEEDED=()
FAILED=()

for CONTRACT_NAME in "${TARGET_CONTRACTS[@]}"; do
  cv="$(contract_env_var "$CONTRACT_NAME")"
  CONTRACT_ID="${!cv:-}"

  if [[ -z "$CONTRACT_ID" ]]; then
    warn "Skipping $CONTRACT_NAME — $cv not set in $ENV_FILE"
    FAILED+=("$CONTRACT_NAME")
    continue
  fi

  step "Updating admin on $CONTRACT_NAME ($CONTRACT_ID)..."

  # Each contract exposes admin management differently.
  # chioma: multi_sig::propose_action + execute_action for AddAdmin
  # Others: direct update_admin or set_admin call (where implemented).
  #
  # NOTE: The exact function name depends on what is exposed in each contract's
  # ExecuteMsg.  If your contract does not expose a direct set_admin function,
  # use the multi-sig propose/approve/execute flow for the UpdateAdmin ActionType.
  # The cases below reflect the Chioma codebase as of this writing.
  case "$CONTRACT_NAME" in
    user_profile|property_registry|agent_registry|dispute_resolution)
      # These contracts store admin in ContractState.  Currently there is no
      # single-call set_admin exposed — rotation must go through the multi-sig
      # propose/execute path with ActionType::UpdateAdmin (chioma) or a direct
      # state mutation if a set_admin function is added.
      warn "$CONTRACT_NAME: no direct set_admin function found."
      warn "  → You must rotate via the multi-sig admin proposal flow or add a"
      warn "    set_admin function to this contract.  Skipping for now."
      FAILED+=("$CONTRACT_NAME")
      continue
      ;;
    escrow)
      # Escrow has DataKey::SystemAdmin; expose via initialize_admin or add set_admin.
      warn "$CONTRACT_NAME: verify a set_admin / update_system_admin function exists."
      stellar_invoke \
        --id "$CONTRACT_ID" \
        --source-account "$DEPLOYER_KEY" \
        --network "$NETWORK" \
        --send yes \
        -- set_admin \
        --caller "$CURRENT_ADMIN" \
        --new_admin "$NEW_ADMIN" || {
          warn "  → set_admin failed for escrow. Add or expose the function and retry."
          FAILED+=("$CONTRACT_NAME")
          continue
        }
      SUCCEEDED+=("$CONTRACT_NAME")
      ;;
    payment)
      # Payment uses set_platform_fee_collector for the admin equivalent.
      stellar_invoke \
        --id "$CONTRACT_ID" \
        --source-account "$DEPLOYER_KEY" \
        --network "$NETWORK" \
        --send yes \
        -- set_platform_fee_collector \
        --collector "$NEW_ADMIN" || {
          warn "  → set_platform_fee_collector failed for payment. Retry manually."
          FAILED+=("$CONTRACT_NAME")
          continue
        }
      SUCCEEDED+=("$CONTRACT_NAME")
      ;;
    rent_obligation)
      warn "$CONTRACT_NAME: no admin stored — skipping."
      continue
      ;;
    chioma)
      # chioma admin is rotated via the multi-sig AddAdmin proposal then the old
      # admin can be removed.  This is done via propose_action / approve_action /
      # execute_action with ActionType::AddAdmin then ActionType::RemoveAdmin.
      warn "$CONTRACT_NAME: admin rotation requires the multi-sig governance flow."
      warn "  → Use propose_action(AddAdmin, new_admin) + execute_action, then"
      warn "    propose_action(RemoveAdmin, old_admin) + execute_action."
      warn "  → This script cannot automate that flow without signing keys for each admin."
      FAILED+=("$CONTRACT_NAME")
      continue
      ;;
  esac
done

echo ""
log "Admin rotation applied: ${#SUCCEEDED[@]} succeeded, ${#FAILED[@]} need manual action."
[[ ${#SUCCEEDED[@]} -gt 0 ]] && echo "  Succeeded: ${SUCCEEDED[*]}"
[[ ${#FAILED[@]} -gt 0 ]]    && echo "  Manual   : ${FAILED[*]}"

# ── Step 3: Update registry records ──────────────────────────────────────────
if [[ "$SKIP_REGISTRY" -eq 0 && -n "$REGISTRY_ID" && ${#SUCCEEDED[@]} -gt 0 ]]; then
  header "Step 3: Update Upgrade Registry with new admin"

  for CONTRACT_NAME in "${SUCCEEDED[@]}"; do
    step "update_admin for $CONTRACT_NAME in registry..."
    stellar_invoke \
      --id "$REGISTRY_ID" \
      --source-account "$DEPLOYER_KEY" \
      --network "$NETWORK" \
      --send yes \
      -- update_admin \
      --caller "$CURRENT_ADMIN" \
      --name "$CONTRACT_NAME" \
      --new_admin "$NEW_ADMIN" || warn "  → update_admin failed for $CONTRACT_NAME in registry."
  done

  # ── Step 4: Execute (close) the rotation proposal ─────────────────────────
  header "Step 4: Execute rotation proposal in registry"
  step "execute_rotation on registry..."
  stellar_invoke \
    --id "$REGISTRY_ID" \
    --source-account "$DEPLOYER_KEY" \
    --network "$NETWORK" \
    --send yes \
    -- execute_rotation \
    --executor "$CURRENT_ADMIN" \
    --proposal_id "$PROPOSAL_ID" || warn "  → execute_rotation failed (may need more approvals)."

  log "Registry rotation proposal '$PROPOSAL_ID' closed."
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
header "Admin rotation summary"
echo ""
echo "  Old admin : $CURRENT_ADMIN"
echo "  New admin : $NEW_ADMIN"
echo "  Proposal  : $PROPOSAL_ID"
echo ""
if [[ ${#FAILED[@]} -gt 0 ]]; then
  warn "The following contracts require manual rotation (see notes above):"
  for c in "${FAILED[@]}"; do echo "    - $c"; done
  echo ""
  warn "See contract/docs/deployment/UPGRADES.md §4 (Admin Key Rotation) for"
  warn "the manual steps required for multi-sig and no-admin contracts."
fi

echo "  Next: run verify-deployment.sh and confirm registry get_protocol_status."
