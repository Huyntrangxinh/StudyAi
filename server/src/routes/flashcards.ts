import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';

const router = express.Router();
const dbPath = path.join(__dirname, '../../database/app.db');
const db = new sqlite3.Database(dbPath);

// Create flashcards table if it doesn't exist
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS flashcards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            front TEXT NOT NULL,
            back TEXT NOT NULL,
            study_set_id INTEGER NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (study_set_id) REFERENCES study_sets (id) ON DELETE CASCADE
        )
    `);
});

// GET /api/flashcards/:studySetId - Get flashcards for a study set
router.get('/:studySetId', (req, res) => {
    const studySetId = req.params.studySetId;

    db.all(
        'SELECT * FROM flashcards WHERE study_set_id = ? ORDER BY created_at DESC',
        [studySetId],
        (err, rows) => {
            if (err) {
                console.error('Error fetching flashcards:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json(rows || []);
        }
    );
});

// POST /api/flashcards - Create new flashcard
router.post('/', (req, res) => {
    const { front, back, studySetId, materialId } = req.body;

    if (!front || !back || !studySetId) {
        return res.status(400).json({ error: 'front, back, and studySetId are required' });
    }

    const now = new Date().toISOString();

    db.run(
        'INSERT INTO flashcards (front, back, study_set_id, material_id, created_at) VALUES (?, ?, ?, ?, ?)',
        [front, back, studySetId, materialId || null, now],
        function (err) {
            if (err) {
                console.error('Error creating flashcard:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            res.status(201).json({
                id: this.lastID,
                front,
                back,
                studySetId,
                materialId: materialId || null,
                createdAt: now
            });
        }
    );
});

// PUT /api/flashcards/:id - Update flashcard
router.put('/:id', (req, res) => {
    const id = req.params.id;
    const { front, back } = req.body;

    if (!front || !back) {
        return res.status(400).json({ error: 'front and back are required' });
    }

    db.run(
        'UPDATE flashcards SET front = ?, back = ? WHERE id = ?',
        [front, back, id],
        function (err) {
            if (err) {
                console.error('Error updating flashcard:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Flashcard not found' });
            }

            res.json({ message: 'Flashcard updated successfully' });
        }
    );
});

// DELETE /api/flashcards/:id - Delete flashcard
router.delete('/:id', (req, res) => {
    const id = req.params.id;

    db.run(
        'DELETE FROM flashcards WHERE id = ?',
        [id],
        function (err) {
            if (err) {
                console.error('Error deleting flashcard:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Flashcard not found' });
            }

            res.json({ message: 'Flashcard deleted successfully' });
        }
    );
});

export default router;
