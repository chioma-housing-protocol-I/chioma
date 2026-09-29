#!/usr/bin/env bash
#
# Deploy all Chioma Soroban contracts to Stellar MAINNET (pubnet).
#
# This is a safety-focused wrapper around deploy-testnet.sh, which is already
# network-parameterized and drives both networks (see "Option A — scripted"
# in docs/deployment/MAINNET_DEPLOYMENT.md). Unlike a hand-run
# `NETWORK=mainnet ... ./deploy-testnet.sh`, this script:
#   - refuses to run without an explicit --confirm flag and a typed
#     confirmation phrase
#   - refuses to auto-generate a deployer identity (mainnet keys must be
#     hardware-backed / offline, provisioned out of band)
#   - never attempts Friendbot funding (mainnet has none)
#   - refuses to deploy from a dirty git tree (mainnet must ship the exact
#     audited commit)
#   - records the commit, deployer, and every deployed contract address to
#     an append-only log, instead of leaving that history only in a shell
#   - automatically runs verify-deployment.sh once the deploy completes
#
# Read docs/deployment/MAINNET_DEPLOYMENT.md in full — in particular the
# Production Launch Gate — before running this script.
#
# Usage (from contract/):
#   ./scripts/deploy-mainnet.sh --confirm
#
# Options:
#   --confirm         Required. Without it the script exits immediately.
#   --skip-build      Use existing WASM artifacts
#   --deploy-only     Deploy WASM; skip initialization
#   --init-only       Initialize using IDs in .env.mainnet (skip deploy)
#   --allow-dirty     Bypass the clean-git-tree check (NOT recommended)
#
# Environment:
#   DEPLOYER_KEY       Stellar identity name — MUST already exist and be
#                      hardware/offline-backed (default: mainnet-deployer)
#   PLATFORM_FEE_BPS   Default 500
#   MIN_DISPUTE_VOTES  Default 3
#   ALIAS_PREFIX       Default chioma_mainnet
#   ENV_FILE           Default .env.mainnet
#   DEPLOY_LOG         Default docs/deployment/MAINNET_DEPLOYMENTS.log
#   CONFIRM_PHRASE     Non-interactive substitute for the typed prompt
#                      (must equal "DEPLOY TO MAINNET")

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$CONTRACT_ROOT"

NETWORK=mainnet
DEPLOYER_KEY="${DEPLOYER_KEY:-mainnet-deployer}"
ENV_FILE="${ENV_FILE:-.env.mainnet}"
ALIAS_PREFIX="${ALIAS_PREFIX:-chioma_mainnet}"
PLATFORM_FEE_BPS="${PLATFORM_FEE_BPS:-500}"
MIN_DISPUTE_VOTES="${MIN_DISPUTE_VOTES:-3}"
DEPLOY_LOG="${DEPLOY_LOG:-docs/deployment/MAINNET_DEPLOYMENTS.log}"

CONFIRM=0
ALLOW_DIRTY=0
PASSTHROUGH_ARGS=()

for arg in "$@"; do
  case "$arg" in
    --confirm) CONFIRM=1 ;;
    --allow-dirty) ALLOW_DIRTY=1 ;;
    --skip-build | --deploy-only | --init-only) PASSTHROUGH_ARGS+=("$arg") ;;
    -h | --help)
      sed -n '2,38p' "$0"
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

require_cli() {
  if ! command -v stellar >/dev/null 2>&1; then
    err "Stellar CLI not found. Install: https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli"
    exit 1
  fi
}

require_confirm_flag() {
  if [[ "$CONFIRM" -ne 1 ]]; then
    err "Refusing to run: this deploys to Stellar MAINNET with real funds."
    err "Re-run with --confirm only after the Production Launch Gate in"
    err "docs/deployment/MAINNET_DEPLOYMENT.md is fully satisfied (independent"
    err "audit, pre-deployment checklist, multisig ready, etc.)."
    exit 1
  fi
}

require_clean_tree() {
  if [[ "$ALLOW_DIRTY" -eq 1 ]]; then
    warn "Skipping git-clean check (--allow-dirty). Not recommended for mainnet."
    return 0
  fi
  if [[ -n "$(git status --porcelain)" ]]; then
    err "Working tree is not clean. Mainnet MUST deploy from the exact commit"
    err "covered by the security audit. Commit or stash changes, or pass"
    err "--allow-dirty to override (not recommended)."
    exit 1
  fi
}

require_existing_identity() {
  if ! stellar keys ls 2>/dev/null | grep -qx "$DEPLOYER_KEY"; then
    err "Identity '$DEPLOYER_KEY' not found."
    err "Mainnet deployer keys must be provisioned out of band (hardware"
    err "wallet / offline signer) — this script will not auto-generate one."
    err "See 'Key custody and admin model' in docs/deployment/MAINNET_DEPLOYMENT.md."
    exit 1
  fi
}

confirm_interactively() {
  local admin="$1"
  echo ""
  warn "==================================================================="
  warn " MAINNET DEPLOYMENT"
  warn " Network:   $NETWORK"
  warn " Deployer:  $DEPLOYER_KEY ($admin)"
  warn " Env file:  $ENV_FILE"
  warn " Commit:    $(git rev-parse --short HEAD)"
  warn " escrow/payment will hold REAL FUNDS once this goes live."
  warn "==================================================================="
  echo ""

  local reply
  if [[ -t 0 ]]; then
    read -r -p "Type 'DEPLOY TO MAINNET' to continue: " reply
  else
    reply="${CONFIRM_PHRASE:-}"
    log "Non-interactive shell: reading confirmation from \$CONFIRM_PHRASE."
  fi

  if [[ "$reply" != "DEPLOY TO MAINNET" ]]; then
    err "Confirmation phrase did not match. Aborting."
    exit 1
  fi
}

record_deployment() {
  local admin="$1" commit
  commit="$(git rev-parse HEAD)"
  mkdir -p "$(dirname "$DEPLOY_LOG")"
  {
    echo "## Mainnet deployment — $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo "- Commit: $commit"
    echo "- Deployer identity: $DEPLOYER_KEY ($admin)"
    echo "- Env file: $ENV_FILE"
    if [[ -f "$ENV_FILE" ]]; then
      grep '_CONTRACT_ID=' "$ENV_FILE" | sed 's/^/- /'
    fi
    echo ""
  } >>"$DEPLOY_LOG"
  log "Deployment recorded in $DEPLOY_LOG"
}

main() {
  require_cli
  require_confirm_flag
  require_clean_tree
  require_existing_identity

  local admin
  admin="$(stellar keys public-key "$DEPLOYER_KEY")"

  confirm_interactively "$admin"

  log "Delegating to deploy-testnet.sh with mainnet parameters (--skip-fund; mainnet has no Friendbot)..."
  export NETWORK DEPLOYER_KEY ENV_FILE ALIAS_PREFIX PLATFORM_FEE_BPS MIN_DISPUTE_VOTES
  if [[ ${#PASSTHROUGH_ARGS[@]} -gt 0 ]]; then
    "$SCRIPT_DIR/deploy-testnet.sh" --skip-fund "${PASSTHROUGH_ARGS[@]}"
  else
    "$SCRIPT_DIR/deploy-testnet.sh" --skip-fund
  fi

  record_deployment "$admin"

  log "Running post-deploy verification..."
  NETWORK="$NETWORK" ENV_FILE="$ENV_FILE" DEPLOYER_KEY="$DEPLOYER_KEY" \
    "$SCRIPT_DIR/verify-deployment.sh"

  echo ""
  warn "Deployment used '$DEPLOYER_KEY' as bootstrap admin. Immediately hand"
  warn "off admin to the multisig — see 'Post-deployment hardening' in"
  warn "docs/deployment/MAINNET_DEPLOYMENT.md."
}

main "$@"
