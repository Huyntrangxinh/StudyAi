#!/bin/bash

# Database backup script
DB_PATH="/Users/tranthihuyentrang/Study1/server/database/app.db"
BACKUP_DIR="/Users/tranthihuyentrang/Study1/server/database/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/app_backup_$TIMESTAMP.db"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
echo "Creating database backup..."
cp "$DB_PATH" "$BACKUP_FILE"

echo "Backup created: $BACKUP_FILE"
echo "Database size: $(du -h "$DB_PATH" | cut -f1)"
echo "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"


