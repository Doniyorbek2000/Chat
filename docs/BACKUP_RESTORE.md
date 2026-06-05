# VOXO Backup and Restore Procedures

---

## PostgreSQL Backups

### Manual Backup

```bash
cd /opt/voxo

# Run backup script
BACKUP_DIR=/backups/postgres \
POSTGRES_CONTAINER=voxo-postgres \
POSTGRES_DB=voxo \
POSTGRES_USER=voxo \
bash scripts/backup-postgres.sh
```

The script creates a gzip-compressed SQL dump at `/backups/postgres/voxo_YYYYMMDD_HHMMSS.sql.gz`.

### Automated Backup (Cron)

```bash
# Daily at 2am — add to /etc/cron.d/voxo-backup
0 2 * * * root \
  BACKUP_DIR=/backups/postgres \
  POSTGRES_CONTAINER=voxo-postgres \
  bash /opt/voxo/scripts/backup-postgres.sh \
  >> /var/log/voxo-backup.log 2>&1
```

### S3 Offsite Upload

Set in `.env` before running the script:
```bash
S3_BUCKET=voxo-backups
S3_ENDPOINT=https://s3.your-provider.com
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

The script will automatically upload to `s3://$S3_BUCKET/backups/postgres/`.

### List Available Backups

```bash
ls -lh /backups/postgres/
```

---

## PostgreSQL Restore

### Restore to Staging Database (safe path)

```bash
cd /opt/voxo

# Restore the backup to a `_restore` copy of the database
bash scripts/restore-postgres.sh /backups/postgres/voxo_20260605_020001.sql.gz
```

The script restores to `voxo_restore` (not the live `voxo` database), giving you a chance to verify.

### Verify the Restore

```bash
docker exec voxo-postgres psql -U voxo -d voxo_restore -c "\dt"
docker exec voxo-postgres psql -U voxo -d voxo_restore -c "SELECT COUNT(*) FROM users;"
```

### Swap to Live (if verified)

```bash
# Stop the backend to prevent new writes
docker compose -f docker-compose.prod.yml stop voxo-backend

# Rename databases
docker exec voxo-postgres psql -U voxo postgres -c "
  ALTER DATABASE voxo RENAME TO voxo_old;
  ALTER DATABASE voxo_restore RENAME TO voxo;
"

# Restart backend
docker compose -f docker-compose.prod.yml start voxo-backend

# Verify
curl -sf https://api.voxo.uz/health
```

### Cleanup Old Database

```bash
# After confirming the restore is stable (wait 24-48 hours)
docker exec voxo-postgres psql -U voxo postgres -c "DROP DATABASE voxo_old;"
```

---

## MinIO / Object Storage Backup

```bash
# Install mc (MinIO Client)
docker run --rm --network voxo_default \
  minio/mc alias set voxo http://minio:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD

# Mirror bucket to local directory
docker run --rm --network voxo_default \
  -v /backups/minio:/data \
  minio/mc mirror voxo/voxo /data/voxo

# Mirror to remote S3
docker run --rm --network voxo_default \
  minio/mc mirror voxo/voxo s3/voxo-backups/minio/
```

---

## Redis Backup

Redis is used for cache and short-lived session data. Data loss on Redis does not require user-facing recovery — the backend handles cold cache gracefully.

```bash
# Manual snapshot
docker exec voxo-redis redis-cli -a $REDIS_PASSWORD BGSAVE
docker cp voxo-redis:/data/dump.rdb /backups/redis/dump_$(date +%Y%m%d).rdb
```

---

## Retention Policy

| Storage | Retention | Location |
|---------|-----------|----------|
| PostgreSQL daily dumps | 7 days local | `/backups/postgres/` |
| PostgreSQL dumps (S3) | 30 days | `s3://$S3_BUCKET/backups/postgres/` |
| MinIO mirror | On-demand | `/backups/minio/` |
| Redis snapshots | 3 days | `/backups/redis/` |

---

## Pre-Deploy Backup

The deploy workflow (`deploy.yml`) automatically runs `backup-postgres.sh` before pulling new images. If you deploy manually, always run a backup first:

```bash
bash scripts/backup-postgres.sh
echo "Latest backup: $(ls -t /backups/postgres/*.sql.gz | head -1)"
```
