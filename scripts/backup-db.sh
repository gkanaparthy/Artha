#!/bin/bash

# Configuration
PROJECT_DIR="/Users/gautham/AI/Pravaha"
BACKUP_DIR="$PROJECT_DIR/backups"
ENV_FILE="$PROJECT_DIR/.env"

set -o pipefail

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
else
    echo ".env file not found at $ENV_FILE"
    exit 1
fi

# Add common local paths to PATH
export PATH="/usr/local/bin:/opt/homebrew/bin:/opt/homebrew/opt/libpq/bin:/usr/local/opt/libpq/bin:/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"

# Use DIRECT_URL for pg_dump
# Extract parts from DIRECT_URL or use individual variables if available
# Since DIRECT_URL is a connection string, pg_dump can take it directly.
# postgres://postgres.fiuakyqqmxbskbzbjadi:jp4celeA8xE2BYB6@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require

# Output filename
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
OUTPUT_FILE="$BACKUP_DIR/supabase_backup_$TIMESTAMP.sql.gz"

echo "Starting backup to $OUTPUT_FILE..."

# Find pg_dump
PG_DUMP=$(which pg_dump)

if [ -z "$PG_DUMP" ]; then
    echo "ERROR: pg_dump not found in PATH ($PATH)"
    exit 1
fi

echo "Using pg_dump at $PG_DUMP"

# Run pg_dump and compress
"$PG_DUMP" "$DIRECT_URL" | gzip > "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
    echo "Backup successful: $OUTPUT_FILE"
    # Prune backups older than 30 days
    find "$BACKUP_DIR" -name "supabase_backup_*.sql.gz" -mtime +30 -delete
    echo "Old backups pruned."
else
    echo "Backup failed!"
    exit 1
fi
