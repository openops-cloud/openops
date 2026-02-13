#!/bin/bash
set -e

BACKUP_DIR="/backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
SCHEDULE="${BACKUP_SCHEDULE:-0 2 * * *}"

echo "PostgreSQL Backup Service Started"
echo "Backup directory: $BACKUP_DIR"
echo "Retention period: $RETENTION_DAYS days"
echo "Backup schedule: $SCHEDULE"

# Install cronie for scheduled backups
apt-get update -qq && apt-get install -y -qq cron > /dev/null 2>&1

perform_backup() {
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="${BACKUP_DIR}/backup_${timestamp}.sql.gz"
  
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup to $backup_file"
  
  # Perform the backup
  PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --verbose \
    2>&1 | gzip > "$backup_file"
  
  if [ ${PIPESTATUS[0]} -eq 0 ]; then
    local size=$(du -h "$backup_file" | cut -f1)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completed successfully: $backup_file ($size)"
    
    # Cleanup old backups
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaning up backups older than $RETENTION_DAYS days"
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    local remaining=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f | wc -l)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Retained backups: $remaining"
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Backup failed" >&2
    rm -f "$backup_file"
    return 1
  fi
}

# Backup on all databases (including analytics)
backup_all_databases() {
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="${BACKUP_DIR}/backup_all_${timestamp}.sql.gz"
  
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting full cluster backup to $backup_file"
  
  PGPASSWORD="$POSTGRES_PASSWORD" pg_dumpall \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    --verbose \
    2>&1 | gzip > "$backup_file"
  
  if [ ${PIPESTATUS[0]} -eq 0 ]; then
    local size=$(du -h "$backup_file" | cut -f1)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Full backup completed successfully: $backup_file ($size)"
    
    # Cleanup old full backups
    find "$BACKUP_DIR" -name "backup_all_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Full backup failed" >&2
    rm -f "$backup_file"
    return 1
  fi
}

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until PGPASSWORD="$POSTGRES_PASSWORD" pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER"; do
  sleep 2
done
echo "PostgreSQL is ready"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Perform initial backup
echo "Performing initial backup..."
perform_backup
backup_all_databases

# Setup cron job
echo "$SCHEDULE root /usr/local/bin/backup-job.sh >> /var/log/backup.log 2>&1" > /etc/cron.d/postgres-backup
chmod 0644 /etc/cron.d/postgres-backup

# Create the backup job script
cat > /usr/local/bin/backup-job.sh << 'EOF'
#!/bin/bash
source /etc/environment
perform_backup
EOF

chmod +x /usr/local/bin/backup-job.sh

# Export functions and variables for cron
export -f perform_backup
export BACKUP_DIR RETENTION_DAYS POSTGRES_HOST POSTGRES_PORT POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB
env | grep -E '^(BACKUP_|POSTGRES_|RETENTION_)' > /etc/environment

# Start cron in foreground
echo "Starting cron scheduler..."
cron && tail -f /var/log/cron.log /var/log/backup.log
