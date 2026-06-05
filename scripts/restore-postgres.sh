#!/bin/bash
set -e

BACKUP_FILE="${1}"
CONTAINER="${POSTGRES_CONTAINER:-voxo-postgres}"
DB="${POSTGRES_DB:-voxo}"
USER="${POSTGRES_USER:-voxo}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file.sql.gz>"
    echo "Available backups:"
    ls -lh "${BACKUP_DIR:-/backups/postgres}/*.sql.gz" 2>/dev/null || echo "None found"
    exit 1
fi

echo "[$(date)] Restoring from: $BACKUP_FILE"
echo "WARNING: This will DROP and recreate the database. Press Ctrl+C within 5s to cancel."
sleep 5

# Drop and recreate
docker exec "$CONTAINER" psql -U "$USER" -c "DROP DATABASE IF EXISTS ${DB}_restore;" postgres
docker exec "$CONTAINER" psql -U "$USER" -c "CREATE DATABASE ${DB}_restore;" postgres
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$USER" "${DB}_restore"

echo "[$(date)] Restore complete to ${DB}_restore."
echo "To swap: docker exec $CONTAINER psql -U $USER -c 'ALTER DATABASE $DB RENAME TO ${DB}_old; ALTER DATABASE ${DB}_restore RENAME TO $DB;' postgres"
