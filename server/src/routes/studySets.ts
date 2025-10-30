import express from 'express';
import { Database } from 'sqlite3';
import path from 'path';

const router = express.Router();
const dbPath = path.join(__dirname, '../../database/app.db');

// Initialize study_sets table if it doesn't exist
const initDb = () => {
    const db = new Database(dbPath);
    db.serialize(() => {
        db.run(`
        CREATE TABLE IF NOT EXISTS study_sets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            user_id INTEGER NOT NULL,
            status TEXT DEFAULT 'active',
            color TEXT DEFAULT '#3b82f6',
            icon TEXT DEFAULT 'book',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `);

        // Add missing columns if they don't exist
        db.run(`ALTER TABLE study_sets ADD COLUMN description TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding description column:', err);
            }
        });

        db.run(`ALTER TABLE study_sets ADD COLUMN status TEXT DEFAULT 'active'`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding status column:', err);
            }
        });

        db.run(`ALTER TABLE study_sets ADD COLUMN color TEXT DEFAULT '#3b82f6'`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding color column:', err);
            }
        });

        db.run(`ALTER TABLE study_sets ADD COLUMN icon TEXT DEFAULT 'book'`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding icon column:', err);
            }
        });

        // SQLite doesn't allow non-constant defaults in ALTER TABLE; add column without default
        db.run(`ALTER TABLE study_sets ADD COLUMN updated_at DATETIME`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding updated_at column:', err);
            }
        });
    });
};
initDb();

// GET /api/study-sets - Get all study sets for a user
router.get('/', (req, res) => {
    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    // Convert userId to string if it's a number
    const userIdStr = String(userId);
    const db = new Database(dbPath);

    db.all(
        'SELECT * FROM study_sets WHERE user_id = ? ORDER BY created_at DESC',
        [userIdStr],
        (err, rows) => {
            if (err) {
                console.error('Error fetching study sets:', err);
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json(rows);
            db.close();
        }
    );
});

// POST /api/study-sets - Create a new study set
router.post('/', (req, res) => {
    const { name, description, userId, color, icon } = req.body;

    if (!name || !userId) {
        return res.status(400).json({ error: 'Name and userId are required' });
    }

    // Convert userId to string if it's a number
    const userIdStr = String(userId);
    const db = new Database(dbPath);
    console.log('🔍 Creating study set with dbPath:', dbPath);

    const now = new Date().toISOString();

    db.run(
        'INSERT INTO study_sets (name, description, user_id, color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
            name,
            description || '',
            userIdStr,
            color || '#3b82f6',
            icon || 'book',
            now,
            now
        ],
        function (err) {
            if (err) {
                console.error('❌ Error creating study set:', err);
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }

            console.log('✅ Study set created with ID:', this.lastID);
            res.json({
                id: this.lastID,
                name,
                description: description || '',
                userId,
                status: 'active',
                color: color || '#3b82f6',
                icon: icon || 'book',
                createdAt: now,
                updatedAt: now
            });
            db.close();
        }
    );
});

// DELETE /api/study-sets/:id - Delete a study set
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    const db = new Database(dbPath);

    db.run(
        'DELETE FROM study_sets WHERE id = ? AND user_id = ?',
        [id, userId],
        function (err) {
            if (err) {
                console.error('Error deleting study set:', err);
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (this.changes === 0) {
                db.close();
                return res.status(404).json({ error: 'Study set not found' });
            }

            res.json({ success: true });
            db.close();
        }
    );
});

export default router;
