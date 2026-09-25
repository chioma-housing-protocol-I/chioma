#!/bin/bash
# SSL/TLS Certificate Renewal Script
# Renews Let's Encrypt certificates and reloads nginx.
# Intended to be run by cron or manually.
# Usage: ./scripts/ssl-renew.sh [--force]

set -euo pipefail

DOMAIN="${DOMAIN:-api.chioma.app}"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
FORCE="${1:-}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

if [[ $EUID -ne 0 ]]; then
  log_error "This script must be run as root (use sudo)"
  exit 1
fi

if ! command -v certbot &>/dev/null; then
  log_error "Certbot is not installed. Run ssl-setup.sh first."
  exit 1
fi

log_info "Checking certificate expiry for ${DOMAIN}..."

# Check days until expiry
EXPIRY_SECONDS=$(certbot certificates --domain "${DOMAIN}" 2>/dev/null \
  | grep -oP '(?<=VALID: )\d+(?= days)' | head -1 || echo "0")

if [[ -z "$EXPIRY_SECONDS" ]]; then
  log_warn "Could not determine expiry — attempting renewal anyway"
  EXPIRY_SECONDS=0
fi

if [[ "$FORCE" == "--force" ]]; then
  log_info "Force renewal requested"
  RENEW_FLAGS="--force-renewal"
else
  RENEW_FLAGS=""
  if (( EXPIRY_SECONDS > 30 )); then
    log_ok "Certificate is valid for ${EXPIRY_SECONDS} days — no renewal needed"
    exit 0
  fi
  log_info "Certificate expires in ${EXPIRY_SECONDS} days — renewing..."
fi

# Renew
certbot renew ${RENEW_FLAGS} --quiet --cert-name "${DOMAIN}"

# Copy renewed certs to nginx paths
log_info "Updating nginx certificate files..."
cp "${CERT_DIR}/fullchain.pem" /etc/ssl/certs/chioma.crt
cp "${CERT_DIR}/privkey.pem"   /etc/ssl/private/chioma.key
chmod 644 /etc/ssl/certs/chioma.crt
chmod 600 /etc/ssl/private/chioma.key

# Reload nginx (works both bare-metal and Docker)
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "chioma-nginx"; then
  log_info "Reloading nginx in Docker container..."
  docker exec chioma-nginx nginx -s reload
elif command -v nginx &>/dev/null; then
  log_info "Reloading nginx..."
  nginx -s reload
else
  log_warn "nginx not found — reload manually after this script"
fi

log_ok "Certificate renewed and nginx reloaded"
