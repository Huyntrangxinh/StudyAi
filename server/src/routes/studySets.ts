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
        (err, rows: any[]) => {
            if (err) {
                console.error('Error fetching study sets:', err);
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }
            // Format response to ensure consistent field names
            const formattedRows = rows.map(row => ({
                id: String(row.id),
                name: row.name,
                description: row.description || '',
                userId: row.user_id,
                user_id: row.user_id,
                status: row.status || 'active',
                color: row.color || '#3b82f6',
                icon: row.icon || 'book',
                createdAt: row.created_at || row.createdAt,
                created_at: row.created_at,
                updatedAt: row.updated_at || row.updatedAt,
                updated_at: row.updated_at
            }));
            res.json(formattedRows);
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
                console.error('Error details:', err.message);
                console.error('SQL Query:', 'INSERT INTO study_sets (name, description, user_id, color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
                console.error('Parameters:', [name, description || '', userIdStr, color || '#3b82f6', icon || 'book', now, now]);
                db.close();
                return res.status(500).json({ error: err.message || 'Internal server error' });
            }

            const studySetId = this.lastID;
            console.log('✅ Study set created with ID:', studySetId);

            // Fetch the created study set to return complete data
            db.get(
                'SELECT * FROM study_sets WHERE id = ?',
                [studySetId],
                (err, row: any) => {
                    if (err) {
                        console.error('Error fetching created study set:', err);
                        db.close();
                        // Still return success with what we have
                        return res.json({
                            id: studySetId,
                            name,
                            description: description || '',
                            userId: userIdStr,
                            user_id: userIdStr,
                            status: 'active',
                            color: color || '#3b82f6',
                            icon: icon || 'book',
                            createdAt: now,
                            created_at: now,
                            updatedAt: now,
                            updated_at: now
                        });
                    }

                    db.close();
                    res.json({
                        id: row.id,
                        name: row.name,
                        description: row.description || '',
                        userId: row.user_id,
                        user_id: row.user_id,
                        status: row.status || 'active',
                        color: row.color || '#3b82f6',
                        icon: row.icon || 'book',
                        createdAt: row.created_at || row.created_at,
                        created_at: row.created_at,
                        updatedAt: row.updated_at || row.updated_at,
                        updated_at: row.updated_at
                    });
                }
            );
        }
    );
});

// PUT /api/study-sets/:id - Update study set (rename, etc.)
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { name, description, color, icon, userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    const fields: string[] = [];
    const values: Array<string> = [];

    if (typeof name === 'string') {
        fields.push('name = ?');
        values.push(name);
    }
    if (typeof description === 'string') {
        fields.push('description = ?');
        values.push(description);
    }
    if (typeof color === 'string') {
        fields.push('color = ?');
        values.push(color);
    }
    if (typeof icon === 'string') {
        fields.push('icon = ?');
        values.push(icon);
    }

    if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    values.push(String(userId));

    const sql = `UPDATE study_sets SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
    const db = new Database(dbPath);

    db.run(sql, values, function (err) {
        if (err) {
            console.error('Error updating study set:', err);
            db.close();
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (this.changes === 0) {
            db.close();
            return res.status(404).json({ error: 'Study set not found' });
        }

        db.get(
            'SELECT * FROM study_sets WHERE id = ?',
            [id],
            (getErr, row: any) => {
                db.close();
                if (getErr || !row) {
                    if (getErr) {
                        console.error('Error fetching updated study set:', getErr);
                    }
                    return res.json({ id, name, description, color, icon });
                }

                res.json({
                    id: row.id,
                    name: row.name,
                    description: row.description || '',
                    color: row.color,
                    icon: row.icon,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                });
            }
        );
    });
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
