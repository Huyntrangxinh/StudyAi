const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Candidate DB paths (migrate both if they exist)
const candidateDbPaths = [
    path.join(__dirname, '..', 'database', 'app.db'),         // server/database/app.db
    path.join(__dirname, '..', 'src', 'database', 'app.db'),  // server/src/database/app.db (if used)
];

const requiredColumns = [
    { name: 'type', sql: "ALTER TABLE materials ADD COLUMN type TEXT" },
    { name: 'size', sql: "ALTER TABLE materials ADD COLUMN size INTEGER" },
    { name: 'generate_notes', sql: "ALTER TABLE materials ADD COLUMN generate_notes BOOLEAN DEFAULT 0" },
    { name: 'note_type', sql: "ALTER TABLE materials ADD COLUMN note_type TEXT DEFAULT 'summarized'" },
    { name: 'status', sql: "ALTER TABLE materials ADD COLUMN status TEXT DEFAULT 'uploaded'" },
    { name: 'updated_at', sql: "ALTER TABLE materials ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))" },
    { name: 'file_hash', sql: "ALTER TABLE materials ADD COLUMN file_hash TEXT" },
    // file_size may already exist; skip here because schema.sql might already have it
];

function getExistingColumns(db) {
    return new Promise((resolve, reject) => {
        db.all('PRAGMA table_info(materials);', (err, rows) => {
            if (err) return reject(err);
            resolve(rows.map(r => r.name));
        });
    });
}

function run(db, sql) {
    return new Promise((resolve) => {
        db.run(sql, (err) => {
            if (err) {
                if (String(err.message).includes('duplicate column name')) {
                    return resolve({ ok: true, skipped: true });
                }
                console.error('SQL error:', err.message);
                return resolve({ ok: false, error: err.message });
            }
            resolve({ ok: true });
        });
    });
}

async function migrateOne(dbPath) {
    if (!fs.existsSync(dbPath)) {
        console.log(`[skip] DB not found: ${dbPath}`);
        return;
    }
    console.log(`\n== Migrating: ${dbPath} ==`);
    const db = new sqlite3.Database(dbPath);
    try {
        const cols = await getExistingColumns(db);
        for (const c of requiredColumns) {
            if (!cols.includes(c.name)) {
                console.log(`Adding column: ${c.name}`);
                await run(db, c.sql);
            } else {
                console.log(`Column exists: ${c.name}`);
            }
        }
        // Unique index for dedup
        await run(db, 'CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_unique_hash ON materials(study_set_id, file_hash)');

        // Show final columns
        const finalCols = await getExistingColumns(db);
        console.log('Final columns:', finalCols.join(', '));
        console.log('Migration done.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        db.close();
    }
}

async function main() {
    for (const p of candidateDbPaths) {
        // eslint-disable-next-line no-await-in-loop
        await migrateOne(p);
    }
}

main();


