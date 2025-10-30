import express from 'express';
import { Database } from 'sqlite3';
import path from 'path';

const router = express.Router();
const dbPath = path.join(__dirname, '../../database/app.db');

// Initialize flashcard_sets table if it doesn't exist
const initDb = () => {
    const db = new Database(dbPath);
    db.serialize(() => {
        db.run(`
        CREATE TABLE IF NOT EXISTS flashcard_sets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            study_set_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

        // No migrations needed beyond base columns for this simplified table
    });
};
initDb();

// GET /api/flashcard-sets - Get all flashcard sets for a user
router.get('/', (req, res) => {
    console.log('[GET /api/flashcard-sets] incoming', { dbPath });
    const db = new Database(dbPath);

    // Ensure table exists before querying (defensive in case init didn't run)
    db.serialize(() => {
        db.run(
            `CREATE TABLE IF NOT EXISTS flashcard_sets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                study_set_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            (createErr) => {
                if (createErr) {
                    console.error('Error ensuring flashcard_sets exists:', createErr);
                    db.close();
                    return res.status(500).json({ error: 'Internal server error' });
                }
                console.log('[GET /api/flashcard-sets] table ensured OK');
                db.all(
                    'SELECT id, study_set_id, name, created_at FROM flashcard_sets ORDER BY created_at DESC',
                    (err, rows) => {
                        if (err) {
                            console.error('Error fetching flashcard sets:', err);
                            db.close();
                            return res.status(500).json({ error: 'Internal server error' });
                        }
                        console.log('[GET /api/flashcard-sets] rows fetched', { count: Array.isArray(rows) ? rows.length : 0 });
                        res.json(rows || []);
                        db.close();
                    }
                );
            }
        );
    });
});

// POST /api/flashcard-sets - Create a new flashcard set
router.post('/', (req, res) => {
    const { name, studySetId } = req.body;
    console.log('[POST /api/flashcard-sets] incoming body:', req.body);

    if (!name || !studySetId) {
        return res.status(400).json({ error: 'name and studySetId are required' });
    }

    const db = new Database(dbPath);
    console.log('🔍 Creating flashcard set with dbPath:', dbPath, 'values:', { name, studySetId: Number(studySetId) });

    db.run(
        'INSERT INTO flashcard_sets (study_set_id, name) VALUES (?, ?)',
        [Number(studySetId), name],
        function (err) {
            if (err) {
                console.error('❌ Error creating flashcard set:', err);
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }

            console.log('✅ Flashcard set created with ID:', this.lastID);
            // Verify write by reading back the row
            db.get(
                'SELECT id, study_set_id, name, created_at FROM flashcard_sets WHERE id = ?',
                [this.lastID],
                (readErr, row) => {
                    if (readErr) {
                        console.error('❌ Error verifying flashcard set insert:', readErr);
                        res.json({ id: this.lastID, studySetId: Number(studySetId), name });
                        return db.close();
                    }
                    console.log('[POST /api/flashcard-sets] inserted row:', row);
                    res.json(row || { id: this.lastID, studySetId: Number(studySetId), name });
                    db.close();
                }
            );
        }
    );
});

// DELETE /api/flashcard-sets/:id - Delete a flashcard set
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    const db = new Database(dbPath);

    db.run(
        'DELETE FROM flashcard_sets WHERE id = ?',
        [id],
        function (err) {
            if (err) {
                console.error('Error deleting flashcard set:', err);
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (this.changes === 0) {
                db.close();
                return res.status(404).json({ error: 'Flashcard set not found' });
            }

            res.json({ success: true });
            db.close();
        }
    );
});

// PATCH /api/flashcard-sets/:id - Update name
router.patch('/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const db = new Database(dbPath);
    db.run('UPDATE flashcard_sets SET name = ? WHERE id = ?', [name, id], function (err) {
        if (err) {
            console.error('Error updating flashcard set:', err);
            db.close();
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (this.changes === 0) {
            db.close();
            return res.status(404).json({ error: 'Not found' });
        }
        res.json({ id, name });
        db.close();
    });
});

export default router;


