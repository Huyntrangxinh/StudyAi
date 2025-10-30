#!/bin/bash

# Database info script
DB_PATH="/Users/tranthihuyentrang/Study1/server/database/app.db"

echo "=== DATABASE INFORMATION ==="
echo "Database file: $DB_PATH"
echo "File size: $(du -h "$DB_PATH" | cut -f1)"
echo "Last modified: $(stat -f "%Sm" "$DB_PATH")"
echo ""

echo "=== TABLES ==="
sqlite3 "$DB_PATH" ".tables"
echo ""

echo "=== USERS COUNT ==="
sqlite3 "$DB_PATH" "SELECT COUNT(*) as user_count FROM users;"
echo ""

echo "=== FILES COUNT ==="
sqlite3 "$DB_PATH" "SELECT COUNT(*) as file_count FROM files;"
echo ""

echo "=== SUMMARIES COUNT ==="
sqlite3 "$DB_PATH" "SELECT COUNT(*) as summary_count FROM summaries;"
echo ""

echo "=== RECENT USERS ==="
sqlite3 "$DB_PATH" "SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT 5;"
echo ""

echo "=== RECENT FILES ==="
sqlite3 "$DB_PATH" "SELECT id, name, bytes, created_at FROM files ORDER BY created_at DESC LIMIT 5;"


