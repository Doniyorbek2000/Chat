# VOXO Production Operations Guide

## Server Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU       | 2 vCPU  | 4 vCPU      |
| RAM       | 4 GB    | 8 GB        |
| Disk      | 40 GB SSD | 100 GB SSD |
| OS        | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Docker    | 24.x    | latest      |
| Docker Compose | v2.x | latest |

Open ports: `22` (SSH), `80` (HTTP), `443` (HTTPS).

---

## Initial Server Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose plugin
sudo apt-get install -y docker-compose-plugin

# Create app directory
sudo mkdir -p /opt/voxo
sudo chown $USER:$USER /opt/voxo
cd /opt/voxo

# Clone repository
git clone https://github.com/YOUR_ORG/voxo.git .

# Make scripts executable
chmod +x scripts/*.sh
```

---

## Environment Setup

```bash
# Copy and fill in production env
cp .env.production.example .env
nano .env

# Generate secure secrets
openssl rand -hex 64   # JWT_SECRET, JWT_REFRESH_SECRET
openssl rand -hex 32   # NEXTAUTH_SECRET

# Copy admin env
cp admin/.env.example admin/.env
```

Required values to set before starting:
- `DATABASE_URL` — PostgreSQL connection string with strong password
- `REDIS_URL` — Redis with password
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — minimum 64 hex chars
- `NEXTAUTH_SECRET` — minimum 32 chars
- `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `MINIO_ROOT_PASSWORD`

---

## SSL Certificates

```bash
# Install Certbot
sudo apt-get install -y certbot

# Issue certificates (HTTP must be accessible first — start nginx on port 80)
docker compose -f docker-compose.prod.yml up -d nginx

sudo certbot certonly --webroot \
  -w /opt/voxo/nginx/certbot \
  -d api.voxo.uz -d admin.voxo.uz -d voxo.uz -d www.voxo.uz

# Auto-renewal (add to crontab)
echo "0 3 * * * root certbot renew --quiet --post-hook 'docker compose -f /opt/voxo/docker-compose.prod.yml exec nginx nginx -s reload'" \
  | sudo tee /etc/cron.d/certbot-renewal
```

---

## Starting the Stack

```bash
cd /opt/voxo

# Pull images
docker compose -f docker-compose.prod.yml pull

# Run database migrations
docker compose -f docker-compose.prod.yml run --rm voxo-backend npx prisma migrate deploy

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Create first admin user
ADMIN_EMAIL=admin@voxo.uz ADMIN_PASSWORD=SecurePass123! bash scripts/init-admin.sh

# Verify
docker compose -f docker-compose.prod.yml ps
curl -sf https://api.voxo.uz/health
```

---

## Monitoring

```bash
# Live logs
docker compose -f docker-compose.prod.yml logs -f voxo-backend

# Resource usage
docker stats

# Check nginx access log
docker compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/access.log

# Check error log
docker compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/error.log
```

### Uptime Monitoring

Configure an external probe (e.g. UptimeRobot, Betterstack) to hit `https://api.voxo.uz/health` every 60 seconds. Set alert threshold at 2 consecutive failures.

---

## Backup Schedule

```bash
# Add to crontab (runs every day at 2am)
echo "0 2 * * * root BACKUP_DIR=/backups/postgres POSTGRES_CONTAINER=voxo-postgres bash /opt/voxo/scripts/backup-postgres.sh >> /var/log/voxo-backup.log 2>&1" \
  | sudo tee /etc/cron.d/voxo-backup
```

Backups older than 7 days are pruned automatically. Set `S3_BUCKET` and `S3_ENDPOINT` in env to also push to object storage.

---

## Rollback Procedure

```bash
cd /opt/voxo

# Set the previous image tag
export IMAGE_TAG=main-abc1234   # replace with previous tag

# Pull old image
docker compose -f docker-compose.prod.yml pull voxo-backend

# Restart with old image
docker compose -f docker-compose.prod.yml up -d --no-deps voxo-backend

# Verify
curl -sf https://api.voxo.uz/health && echo "Rollback OK"
```

For database rollbacks, restore from a pre-deploy backup — see `BACKUP_RESTORE.md`.

---

## Useful Commands

```bash
# Restart a single service
docker compose -f docker-compose.prod.yml restart voxo-backend

# Reload nginx config without downtime
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

# Run a one-off Prisma command
docker compose -f docker-compose.prod.yml exec voxo-backend npx prisma studio

# View all container IPs
docker network inspect voxo_default

# Prune unused images (run monthly)
docker image prune -f
```
