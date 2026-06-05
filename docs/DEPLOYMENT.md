# VOXO First Deployment Guide

Step-by-step guide for deploying VOXO to a fresh production server.

---

## Prerequisites

- Ubuntu 22.04 LTS server with a public IP
- DNS A records pointing to the server:
  - `api.voxo.uz` → server IP
  - `admin.voxo.uz` → server IP
  - `voxo.uz` → server IP
  - `www.voxo.uz` → server IP
- SSH access to the server

---

## Step 1 — Install Dependencies

```bash
ssh user@your-server

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install required packages
sudo apt-get install -y git curl wget unzip certbot

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker
docker --version
docker compose version
```

---

## Step 2 — Clone Repository

```bash
sudo mkdir -p /opt/voxo
sudo chown $USER:$USER /opt/voxo
cd /opt/voxo

git clone https://github.com/YOUR_ORG/voxo.git .
chmod +x scripts/*.sh
```

---

## Step 3 — Configure Environment

```bash
# Backend / Docker env
cp .env.production.example .env

# Edit with your values
nano .env

# Key secrets to generate:
openssl rand -hex 64  # paste into JWT_SECRET
openssl rand -hex 64  # paste into JWT_REFRESH_SECRET
openssl rand -hex 32  # paste into NEXTAUTH_SECRET

# Admin panel env
cp admin/.env.example admin/.env
nano admin/.env
```

Minimum required values in `.env`:
```
POSTGRES_PASSWORD=<strong-password>
REDIS_PASSWORD=<strong-password>
MINIO_ROOT_PASSWORD=<min-8-chars>
JWT_SECRET=<64-hex-chars>
JWT_REFRESH_SECRET=<64-hex-chars>
NEXTAUTH_SECRET=<32-chars>
```

---

## Step 4 — Issue SSL Certificates

```bash
# Start nginx on port 80 only (no HTTPS yet)
docker compose -f docker-compose.prod.yml up -d nginx

# Wait a few seconds, then issue certs
sudo certbot certonly --webroot \
  -w /opt/voxo/nginx/certbot \
  -d api.voxo.uz \
  -d admin.voxo.uz \
  -d voxo.uz \
  -d www.voxo.uz \
  --email admin@voxo.uz \
  --agree-tos \
  --non-interactive

# Verify certs exist
ls /etc/letsencrypt/live/

# Stop nginx; we'll restart everything together
docker compose -f docker-compose.prod.yml down
```

---

## Step 5 — Start Infrastructure Services

```bash
cd /opt/voxo

# Start Postgres, Redis, MinIO first
docker compose -f docker-compose.prod.yml up -d postgres redis minio

# Wait for Postgres to be ready
until docker compose -f docker-compose.prod.yml exec postgres pg_isready -U voxo; do
  echo "Waiting for postgres..."
  sleep 2
done
echo "Postgres ready"
```

---

## Step 6 — Run Database Migrations

```bash
docker compose -f docker-compose.prod.yml run --rm voxo-backend npx prisma migrate deploy
```

If this is a fresh database, also run:
```bash
docker compose -f docker-compose.prod.yml run --rm voxo-backend npx prisma db seed
```

---

## Step 7 — Start All Services

```bash
docker compose -f docker-compose.prod.yml up -d

# Check all containers are running
docker compose -f docker-compose.prod.yml ps
```

Expected output: all services should show `running` or `healthy`.

---

## Step 8 — Create Super Admin

```bash
ADMIN_EMAIL=admin@voxo.uz \
ADMIN_PASSWORD=YourSecurePassword \
DATABASE_URL=$(grep DATABASE_URL .env | cut -d= -f2-) \
bash scripts/init-admin.sh
```

---

## Step 9 — Verify Deployment

```bash
# API health check
curl -sf https://api.voxo.uz/health
# Expected: {"status":"ok","uptime":...}

# Admin panel
curl -sf -o /dev/null -w "%{http_code}" https://admin.voxo.uz
# Expected: 200

# Check SSL
curl -vI https://api.voxo.uz 2>&1 | grep -E "SSL|issuer|expire"
```

---

## Step 10 — Configure Auto-Renewal and Backups

```bash
# SSL renewal
echo "0 3 * * * root certbot renew --quiet --post-hook 'docker compose -f /opt/voxo/docker-compose.prod.yml exec nginx nginx -s reload'" \
  | sudo tee /etc/cron.d/certbot-renewal

# Database backups (daily at 2am)
echo "0 2 * * * root BACKUP_DIR=/backups/postgres bash /opt/voxo/scripts/backup-postgres.sh >> /var/log/voxo-backup.log 2>&1" \
  | sudo tee /etc/cron.d/voxo-backup

sudo mkdir -p /backups/postgres
```

---

## Troubleshooting

**Container fails to start:**
```bash
docker compose -f docker-compose.prod.yml logs voxo-backend --tail=50
```

**Nginx 502 Bad Gateway:**
```bash
# Check backend is running
docker compose -f docker-compose.prod.yml ps voxo-backend
# Check backend logs
docker compose -f docker-compose.prod.yml logs voxo-backend
```

**SSL certificate error:**
```bash
# Check cert paths
ls /etc/letsencrypt/live/api.voxo.uz/
# Test nginx config
docker compose -f docker-compose.prod.yml exec nginx nginx -t
```

**Database connection refused:**
```bash
# Check postgres status
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U voxo
# Check DATABASE_URL in .env matches postgres container credentials
```
