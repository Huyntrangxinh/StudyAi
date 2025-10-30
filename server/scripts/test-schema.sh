#!/bin/bash

# Test schema script
DB_PATH="/Users/tranthihuyentrang/Study1/server/database/app.db"

echo "=== TESTING SCHEMA ==="
echo ""

echo "1. Testing users table structure:"
sqlite3 "$DB_PATH" ".schema users"
echo ""

echo "2. Testing files table structure:"
sqlite3 "$DB_PATH" ".schema files"
echo ""

echo "3. Testing summaries table structure:"
sqlite3 "$DB_PATH" ".schema summaries"
echo ""

echo "4. Testing indexes:"
sqlite3 "$DB_PATH" ".indices"
echo ""

echo "5. Testing foreign key constraints:"
sqlite3 "$DB_PATH" "PRAGMA foreign_key_list(files);"
echo ""

echo "6. Testing foreign key constraints for summaries:"
sqlite3 "$DB_PATH" "PRAGMA foreign_key_list(summaries);"
echo ""

echo "7. Testing data integrity:"
echo "Users count: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users;")"
echo "Files count: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM files;")"
echo "Summaries count: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM summaries;")"
echo ""

echo "8. Testing admin user:"
sqlite3 "$DB_PATH" "SELECT id, email, name, role FROM users WHERE role = 'admin';"
echo ""

echo "✅ Schema test completed!"


