#!/bin/bash

# Check all database files
echo "=== DATABASE FILES CHECK ==="
echo ""

echo "1. Current database:"
if [ -f "/Users/tranthihuyentrang/Study1/server/database/app.db" ]; then
    echo "✅ app.db exists"
    echo "   Size: $(du -h /Users/tranthihuyentrang/Study1/server/database/app.db | cut -f1)"
    echo "   Modified: $(stat -f "%Sm" /Users/tranthihuyentrang/Study1/server/database/app.db)"
else
    echo "❌ app.db not found"
fi
echo ""

echo "2. Backup files:"
BACKUP_DIR="/Users/tranthihuyentrang/Study1/server/database/backups"
if [ -d "$BACKUP_DIR" ]; then
    echo "✅ Backup directory exists"
    echo "   Backups:"
    ls -la "$BACKUP_DIR" | grep "\.db$" | while read line; do
        echo "   $line"
    done
else
    echo "❌ Backup directory not found"
fi
echo ""

echo "3. Database integrity check:"
if [ -f "/Users/tranthihuyentrang/Study1/server/database/app.db" ]; then
    echo "✅ Database integrity:"
    sqlite3 "/Users/tranthihuyentrang/Study1/server/database/app.db" "PRAGMA integrity_check;"
    echo ""
    echo "✅ Foreign key constraints:"
    sqlite3 "/Users/tranthihuyentrang/Study1/server/database/app.db" "PRAGMA foreign_keys;"
    echo ""
    echo "✅ Database version:"
    sqlite3 "/Users/tranthihuyentrang/Study1/server/database/app.db" "SELECT sqlite_version();"
else
    echo "❌ Cannot check integrity - database not found"
fi
echo ""

echo "4. VS Code settings:"
if [ -f "/Users/tranthihuyentrang/Study1/.vscode/settings.json" ]; then
    echo "✅ VS Code settings exist"
    echo "   SQLite association: $(grep -o '"\*\*\/server\/src\/database\/\*\.sql": "sqlite"' /Users/tranthihuyentrang/Study1/.vscode/settings.json)"
    echo "   MSSQL disabled: $(grep -o '"mssql.validate.enable": false' /Users/tranthihuyentrang/Study1/.vscode/settings.json)"
else
    echo "❌ VS Code settings not found"
fi
echo ""

echo "✅ Database files check completed!"


