import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';

const router = express.Router();
const dbPath = path.join(__dirname, '../../database/app.db');
const db = new sqlite3.Database(dbPath);

// Create flashcards table if it doesn't exist and ensure new columns
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
    // Ensure missing columns exist
    db.run(`ALTER TABLE flashcards ADD COLUMN material_id INTEGER`, (err) => {
        if (err && !String(err.message).includes('duplicate column name')) {
            console.error('Error adding material_id column:', err);
        }
    });
    db.run(`ALTER TABLE flashcards ADD COLUMN id_flashcard_set INTEGER`, (err) => {
        if (err && !String(err.message).includes('duplicate column name')) {
            console.error('Error adding id_flashcard_set column:', err);
        }
    });
});

// GET /api/flashcards - by flashcard set id (id_flashcard_set) or legacy by path param studySetId
router.get('/', (req, res) => {
    const flashcardSetId = req.query.flashcardSetId as string | undefined;
    if (!flashcardSetId) {
        return res.status(400).json({ error: 'flashcardSetId is required' });
    }
    db.all(
        'SELECT * FROM flashcards WHERE id_flashcard_set = ? ORDER BY created_at DESC',
        [flashcardSetId],
        (err, rows) => {
            if (err) {
                console.error('Error fetching flashcards by flashcard set id:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json(rows || []);
        }
    );
});

// POST /api/flashcards - Create new flashcard
router.post('/', (req, res) => {
    const { front, back, studySetId, materialId, flashcardSetId } = req.body;

    if (!front || !back || (!studySetId && !flashcardSetId)) {
        return res.status(400).json({ error: 'front, back, and studySetId or flashcardSetId are required' });
    }

    const now = new Date().toISOString();

    db.run(
        'INSERT INTO flashcards (front, back, study_set_id, id_flashcard_set, material_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [front, back, studySetId || null, flashcardSetId || null, materialId || null, now],
        function (err) {
            if (err) {
                console.error('Error creating flashcard:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            res.status(201).json({
                id: this.lastID,
                front,
                back,
                studySetId: studySetId || null,
                flashcardSetId: flashcardSetId || null,
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
