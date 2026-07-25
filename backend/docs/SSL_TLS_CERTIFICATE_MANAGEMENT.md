# SSL/TLS Certificate Management

This document covers how Chioma obtains, installs, and automatically renews
SSL/TLS certificates using [Let's Encrypt](https://letsencrypt.org) and
[Certbot](https://certbot.eff.org).

---

## Overview

| Component                         | Role                                                 |
| --------------------------------- | ---------------------------------------------------- |
| **Certbot**                       | Obtains and renews certificates from Let's Encrypt   |
| **nginx**                         | Terminates TLS and serves the ACME HTTP-01 challenge |
| **ssl-setup.sh**                  | One-time certificate provisioning script             |
| **ssl-renew.sh**                  | Manual or cron-triggered renewal script              |
| **docker-compose.production.yml** | Wires nginx + certbot together with shared volumes   |

Certificates are stored in `/etc/letsencrypt/live/<domain>/` by Certbot and
copied to the paths nginx expects:

- **Certificate chain**: `/etc/ssl/certs/chioma.crt`
- **Private key**: `/etc/ssl/private/chioma.key`

---

## First-Time Setup

### Prerequisites

- Domain `api.chioma.app` (or your domain) must resolve to the server's public IP.
- Ports **80** and **443** must be open in your firewall/security group.
- Docker and Docker Compose must be installed.

### Step 1 — Start nginx (HTTP only)

Before obtaining a certificate, nginx must be reachable on port 80 to serve
the ACME challenge. Start only the nginx and backend services:

```bash
cd backend
docker compose -f docker-compose.production.yml up -d nginx backend
```

### Step 2 — Obtain the certificate

Run the setup script as root (or with `sudo`):

```bash
sudo bash backend/scripts/ssl-setup.sh api.chioma.app admin@chioma.app
```

The script will:

1. Install Certbot if not present.
2. Obtain a certificate via the HTTP-01 webroot challenge.
3. Copy the certificate and key to `/etc/ssl/certs/chioma.crt` and
   `/etc/ssl/private/chioma.key`.
4. Install a daily cron job at `/etc/cron.d/chioma-ssl-renew`.

### Step 3 — Reload nginx with TLS enabled

```bash
docker exec chioma-nginx nginx -s reload
```

### Step 4 — Start remaining services

```bash
docker compose -f docker-compose.production.yml up -d
```

---

## Docker Compose Setup

`docker-compose.production.yml` includes two SSL-related services:

### nginx

```yaml
nginx:
  image: nginx:1.27-alpine
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    - ssl-certs:/etc/ssl/certs # certificate chain
    - ssl-private:/etc/ssl/private # private key
    - certbot-webroot:/var/www/certbot # ACME challenge files
```

### certbot

```yaml
certbot:
  image: certbot/certbot:latest
  volumes:
    - letsencrypt:/etc/letsencrypt # Certbot's certificate store
    - certbot-webroot:/var/www/certbot # shared with nginx
```

The certbot container runs a renewal loop that checks every 12 hours and
renews certificates that expire within 30 days.

---

## Certificate Renewal

### Automatic (Docker)

The `certbot` service in `docker-compose.production.yml` handles renewal
automatically. No manual action is required.

### Automatic (bare-metal / cron)

`ssl-setup.sh` installs a cron job at `/etc/cron.d/chioma-ssl-renew` that
runs `certbot renew` daily at 03:00 and reloads nginx on success.

### Manual renewal

```bash
# Renew if expiring within 30 days
sudo bash backend/scripts/ssl-renew.sh

# Force renewal regardless of expiry
sudo bash backend/scripts/ssl-renew.sh --force
```

---

## nginx Configuration

The HTTP server block in `nginx/nginx.conf` serves the ACME challenge before
redirecting to HTTPS:

```nginx
server {
    listen 80;
    server_name api.chioma.app;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}
```

The HTTPS server block uses TLS 1.2/1.3 with strong ciphers and HSTS:

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

## Troubleshooting

### Challenge fails (403 / connection refused)

- Confirm port 80 is open and nginx is running.
- Confirm the domain resolves to this server: `dig api.chioma.app`.
- Check nginx logs: `docker logs chioma-nginx`.

### Certificate not found after renewal

- Confirm `/etc/letsencrypt/live/<domain>/fullchain.pem` exists.
- Re-run `ssl-renew.sh --force` to copy certs to the nginx paths.

### nginx reports "certificate file not found"

- The `ssl-certs` and `ssl-private` Docker volumes may be empty.
- Run `ssl-setup.sh` first, then restart nginx.

### Let's Encrypt rate limits

Let's Encrypt enforces [rate limits](https://letsencrypt.org/docs/rate-limits/).
Use the staging environment for testing:

```bash
# Add --staging flag to certbot in ssl-setup.sh for testing
certbot certonly --staging --webroot ...
```

---

## Security Notes

- The private key (`chioma.key`) is chmod `600` — readable only by root.
- Certificates auto-renew before expiry; no manual intervention needed.
- HSTS is enabled with a 1-year max-age to prevent downgrade attacks.
- TLS 1.0 and 1.1 are disabled; only TLS 1.2 and 1.3 are accepted.
