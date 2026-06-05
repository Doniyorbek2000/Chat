#!/bin/bash
set -e

BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
CONTAINER="${POSTGRES_CONTAINER:-voxo-postgres}"
DB="${POSTGRES_DB:-voxo}"
USER="${POSTGRES_USER:-voxo}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/voxo_${DATE}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup: $BACKUP_FILE"
docker exec "$CONTAINER" pg_dump -U "$USER" "$DB" | gzip > "$BACKUP_FILE"
echo "[$(date)] Backup complete: $(du -sh $BACKUP_FILE | cut -f1)"

# Delete old backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
echo "[$(date)] Cleaned up backups older than $RETENTION_DAYS days"

# Optional: upload to S3
if [ -n "$S3_BUCKET" ] && [ -n "$S3_ENDPOINT" ]; then
    aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/postgres/$(basename $BACKUP_FILE)" \
        --endpoint-url "$S3_ENDPOINT" || echo "S3 upload failed (non-fatal)"
fi

echo "[$(date)] Done."
