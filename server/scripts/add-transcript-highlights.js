// Migration script: Add transcript and highlights columns to videos table
// This script safely checks if columns exist before adding them

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/app.db');
const db = new Database(dbPath);

try {
    // Get current table schema
    const columns = db.prepare("PRAGMA table_info(videos)").all();
    const columnNames = columns.map(col => col.name);

    console.log('Current videos table columns:', columnNames);

    // Check and add transcript column
    if (!columnNames.includes('transcript')) {
        console.log('Adding transcript column...');
        db.exec('ALTER TABLE videos ADD COLUMN transcript TEXT');
        console.log('✅ transcript column added successfully');
    } else {
        console.log('ℹ️  transcript column already exists, skipping...');
    }

    // Check and add highlights column
    if (!columnNames.includes('highlights')) {
        console.log('Adding highlights column...');
        db.exec('ALTER TABLE videos ADD COLUMN highlights TEXT');
        console.log('✅ highlights column added successfully');
    } else {
        console.log('ℹ️  highlights column already exists, skipping...');
    }

    console.log('\n✅ Migration completed successfully!');

} catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
} finally {
    db.close();
}

