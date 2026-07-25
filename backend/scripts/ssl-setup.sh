#!/bin/bash
# SSL/TLS Certificate Setup Script using Certbot (Let's Encrypt)
# Usage: ./scripts/ssl-setup.sh <domain> <email>

set -euo pipefail

DOMAIN="${1:-api.chioma.app}"
EMAIL="${2:-}"
WEBROOT="/var/www/certbot"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Validate inputs
if [[ -z "$EMAIL" ]]; then
  log_error "Usage: $0 <domain> <email>"
  log_error "Example: $0 api.chioma.app admin@chioma.app"
  exit 1
fi

if [[ $EUID -ne 0 ]]; then
  log_error "This script must be run as root (use sudo)"
  exit 1
fi

log_info "Starting SSL/TLS certificate setup for ${DOMAIN}"

# Install Certbot if not present
if ! command -v certbot &>/dev/null; then
  log_info "Installing Certbot..."
  if command -v apt-get &>/dev/null; then
    apt-get update -qq
    apt-get install -y certbot
  elif command -v yum &>/dev/null; then
    yum install -y certbot
  else
    log_error "Unsupported package manager. Install Certbot manually: https://certbot.eff.org"
    exit 1
  fi
  log_ok "Certbot installed"
fi

# Create webroot directory for ACME challenge
mkdir -p "${WEBROOT}"

# Obtain certificate using webroot method
log_info "Obtaining certificate for ${DOMAIN} via webroot challenge..."
certbot certonly \
  --webroot \
  --webroot-path "${WEBROOT}" \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email \
  --non-interactive \
  --domains "${DOMAIN}"

log_ok "Certificate obtained at ${CERT_DIR}"

# Copy certs to the paths expected by nginx.conf
log_info "Installing certificates to nginx paths..."
mkdir -p /etc/ssl/certs /etc/ssl/private

cp "${CERT_DIR}/fullchain.pem" /etc/ssl/certs/chioma.crt
cp "${CERT_DIR}/privkey.pem"   /etc/ssl/private/chioma.key
chmod 644 /etc/ssl/certs/chioma.crt
chmod 600 /etc/ssl/private/chioma.key

log_ok "Certificates installed"

# Install renewal cron job
CRON_JOB="0 3 * * * root certbot renew --quiet --deploy-hook 'cp ${CERT_DIR}/fullchain.pem /etc/ssl/certs/chioma.crt && cp ${CERT_DIR}/privkey.pem /etc/ssl/private/chioma.key && nginx -s reload'"
CRON_FILE="/etc/cron.d/chioma-ssl-renew"

if [[ ! -f "${CRON_FILE}" ]]; then
  echo "${CRON_JOB}" > "${CRON_FILE}"
  chmod 644 "${CRON_FILE}"
  log_ok "Renewal cron job installed at ${CRON_FILE}"
else
  log_warn "Cron job already exists at ${CRON_FILE} — skipping"
fi

log_ok "SSL/TLS setup complete for ${DOMAIN}"
echo ""
echo "  Certificate: /etc/ssl/certs/chioma.crt"
echo "  Private key: /etc/ssl/private/chioma.key"
echo "  Auto-renew:  ${CRON_FILE} (daily at 03:00)"
echo ""
log_info "Reload nginx to apply: nginx -s reload"
