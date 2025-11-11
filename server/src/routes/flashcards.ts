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
    db.run(`ALTER TABLE flashcards ADD COLUMN type TEXT`, (err) => {
        if (err && !String(err.message).includes('duplicate column name')) {
            console.error('Error adding type column:', err);
        }
    });
    db.run(`ALTER TABLE flashcards ADD COLUMN term_image TEXT`, (err) => {
        if (err && !String(err.message).includes('duplicate column name')) {
            console.error('Error adding term_image column:', err);
        }
    });
    db.run(`ALTER TABLE flashcards ADD COLUMN definition_image TEXT`, (err) => {
        if (err && !String(err.message).includes('duplicate column name')) {
            console.error('Error adding definition_image column:', err);
        }
    });
    db.run(`ALTER TABLE flashcards ADD COLUMN multiple_choice_options TEXT`, (err) => {
        if (err && !String(err.message).includes('duplicate column name')) {
            console.error('Error adding multiple_choice_options column:', err);
        }
    });
    db.run(`ALTER TABLE flashcards ADD COLUMN correct_answer_index INTEGER`, (err) => {
        if (err && !String(err.message).includes('duplicate column name')) {
            console.error('Error adding correct_answer_index column:', err);
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
    const {
        front,
        back,
        studySetId,
        materialId,
        flashcardSetId,
        type,
        termImage,
        definitionImage,
        multipleChoiceOptions,
        correctAnswerIndex
    } = req.body;

    if (!front || !back || (!studySetId && !flashcardSetId)) {
        return res.status(400).json({ error: 'front, back, and studySetId or flashcardSetId are required' });
    }

    const now = new Date().toISOString();

    // Prepare multiple_choice_options as JSON string if it's an array
    const multipleChoiceOptionsStr = multipleChoiceOptions
        ? (Array.isArray(multipleChoiceOptions) ? JSON.stringify(multipleChoiceOptions) : multipleChoiceOptions)
        : null;

    db.run(
        `INSERT INTO flashcards (
            front, back, study_set_id, id_flashcard_set, material_id, 
            type, term_image, definition_image, 
            multiple_choice_options, correct_answer_index, 
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            front,
            back,
            studySetId || null,
            flashcardSetId || null,
            materialId || null,
            type || null,
            termImage || null,
            definitionImage || null,
            multipleChoiceOptionsStr,
            correctAnswerIndex !== undefined ? correctAnswerIndex : null,
            now
        ],
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
                type: type || null,
                termImage: termImage || null,
                definitionImage: definitionImage || null,
                multipleChoiceOptions: multipleChoiceOptions || null,
                correctAnswerIndex: correctAnswerIndex !== undefined ? correctAnswerIndex : null,
                createdAt: now
            });
        }
    );
});

// PUT /api/flashcards/:id - Update flashcard
router.put('/:id', (req, res) => {
    const id = req.params.id;
    const {
        front,
        back,
        type,
        termImage,
        definitionImage,
        multipleChoiceOptions,
        correctAnswerIndex
    } = req.body;

    if (!front || !back) {
        return res.status(400).json({ error: 'front and back are required' });
    }

    // Prepare multiple_choice_options as JSON string if it's an array
    const multipleChoiceOptionsStr = multipleChoiceOptions
        ? (Array.isArray(multipleChoiceOptions) ? JSON.stringify(multipleChoiceOptions) : multipleChoiceOptions)
        : null;

    db.run(
        `UPDATE flashcards SET 
            front = ?, 
            back = ?, 
            type = ?,
            term_image = ?,
            definition_image = ?,
            multiple_choice_options = ?,
            correct_answer_index = ?
        WHERE id = ?`,
        [
            front,
            back,
            type !== undefined ? type : null,
            termImage !== undefined ? termImage : null,
            definitionImage !== undefined ? definitionImage : null,
            multipleChoiceOptionsStr,
            correctAnswerIndex !== undefined ? correctAnswerIndex : null,
            id
        ],
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

// POST /api/flashcards/:id/bookmark - Toggle bookmark for a flashcard
router.post('/:id/bookmark', (req, res) => {
    const flashcardId = req.params.id;
    const { userId, flashcardSetId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    // Check if bookmark already exists
    db.get(
        'SELECT * FROM bookmarks WHERE user_id = ? AND flashcard_id = ?',
        [userId, flashcardId],
        (err, row) => {
            if (err) {
                console.error('Error checking bookmark:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (row) {
                // Bookmark exists, remove it
                db.run(
                    'DELETE FROM bookmarks WHERE user_id = ? AND flashcard_id = ?',
                    [userId, flashcardId],
                    function (deleteErr) {
                        if (deleteErr) {
                            console.error('Error removing bookmark:', deleteErr);
                            return res.status(500).json({ error: 'Internal server error' });
                        }
                        res.json({ bookmarked: false, message: 'Bookmark removed' });
                    }
                );
            } else {
                // Bookmark doesn't exist, add it
                const now = new Date().toISOString();
                db.run(
                    'INSERT INTO bookmarks (user_id, flashcard_id, flashcard_set_id, created_at) VALUES (?, ?, ?, ?)',
                    [userId, flashcardId, flashcardSetId || null, now],
                    function (insertErr) {
                        if (insertErr) {
                            console.error('Error adding bookmark:', insertErr);
                            return res.status(500).json({ error: 'Internal server error' });
                        }
                        res.json({ bookmarked: true, message: 'Bookmark added' });
                    }
                );
            }
        }
    );
});

// GET /api/flashcards/bookmarks - Get all bookmarked flashcards for a user
router.get('/bookmarks', (req, res) => {
    const { userId, flashcardSetId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    let query = `
        SELECT f.*, b.created_at as bookmarked_at
        FROM flashcards f
        INNER JOIN bookmarks b ON f.id = b.flashcard_id
        WHERE b.user_id = ?
    `;
    const params: any[] = [userId];

    if (flashcardSetId) {
        query += ' AND b.flashcard_set_id = ?';
        params.push(flashcardSetId);
    }

    query += ' ORDER BY b.created_at DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching bookmarked flashcards:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json(rows || []);
    });
});

// GET /api/flashcards/:id/bookmark-status - Check if a flashcard is bookmarked
router.get('/:id/bookmark-status', (req, res) => {
    const flashcardId = req.params.id;
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    db.get(
        'SELECT * FROM bookmarks WHERE user_id = ? AND flashcard_id = ?',
        [userId, flashcardId],
        (err, row) => {
            if (err) {
                console.error('Error checking bookmark status:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json({ bookmarked: !!row });
        }
    );
});

export default router;
