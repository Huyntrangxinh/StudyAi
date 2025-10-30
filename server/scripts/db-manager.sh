#!/bin/bash

# Database management script
DB_PATH="/Users/tranthihuyentrang/Study1/server/database/app.db"

case "$1" in
    "info")
        echo "=== DATABASE INFO ==="
        echo "File: $DB_PATH"
        echo "Size: $(du -h "$DB_PATH" | cut -f1)"
        echo "Tables: $(sqlite3 "$DB_PATH" ".tables" | tr '\n' ' ')"
        ;;
    "backup")
        BACKUP_DIR="/Users/tranthihuyentrang/Study1/server/database/backups"
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        BACKUP_FILE="$BACKUP_DIR/app_backup_$TIMESTAMP.db"
        mkdir -p "$BACKUP_DIR"
        cp "$DB_PATH" "$BACKUP_FILE"
        echo "Backup created: $BACKUP_FILE"
        ;;
    "restore")
        if [ -z "$2" ]; then
            echo "Usage: $0 restore <backup_file>"
            exit 1
        fi
        if [ -f "$2" ]; then
            cp "$2" "$DB_PATH"
            echo "Database restored from: $2"
        else
            echo "Backup file not found: $2"
            exit 1
        fi
        ;;
    "reset")
        echo "WARNING: This will delete all data!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -f "$DB_PATH"
            echo "Database reset. Restart the server to recreate."
        else
            echo "Operation cancelled."
        fi
        ;;
    "users")
        echo "=== USERS ==="
        sqlite3 "$DB_PATH" "SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC;"
        ;;
    "files")
        echo "=== FILES ==="
        sqlite3 "$DB_PATH" "SELECT id, name, bytes, created_at FROM files ORDER BY created_at DESC;"
        ;;
    "summaries")
        echo "=== SUMMARIES ==="
        sqlite3 "$DB_PATH" "SELECT id, file_id, created_at FROM summaries ORDER BY created_at DESC;"
        ;;
    *)
        echo "Database Manager"
        echo "Usage: $0 {info|backup|restore|reset|users|files|summaries}"
        echo ""
        echo "Commands:"
        echo "  info      - Show database information"
        echo "  backup    - Create a backup"
        echo "  restore   - Restore from backup"
        echo "  reset     - Reset database (WARNING: deletes all data)"
        echo "  users     - Show all users"
        echo "  files     - Show all files"
        echo "  summaries - Show all summaries"
        ;;
esac


