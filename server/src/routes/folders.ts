import express from 'express';
import { Database } from 'sqlite3';
import path from 'path';

const router = express.Router();
const dbPath = path.join(__dirname, '../../database/app.db');

// Ensure tables
const initDb = () => {
    const db = new Database(dbPath);
    db.serialize(() => {
        db.run(`
      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        study_set_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#a78bfa',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        db.run(`
      CREATE TABLE IF NOT EXISTS folder_flashcard_sets (
        folder_id INTEGER NOT NULL,
        flashcard_set_id INTEGER NOT NULL,
        UNIQUE(folder_id, flashcard_set_id)
      )
    `);
    });
    db.close();
};
initDb();

// GET /api/folders?studySetId=
router.get('/', (req, res) => {
    const studySetId = req.query.studySetId;
    if (!studySetId) return res.status(400).json({ error: 'studySetId is required' });
    const db = new Database(dbPath);
    db.all(
        'SELECT id, study_set_id, name, color, created_at FROM folders WHERE study_set_id = ? ORDER BY created_at DESC',
        [studySetId],
        (err, folders) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }
            // load mapping per folder
            const ids = (folders || []).map((f: any) => f.id);
            if (ids.length === 0) {
                db.close();
                return res.json([]);
            }
            const placeholders = ids.map(() => '?').join(',');
            db.all(
                `SELECT folder_id, flashcard_set_id FROM folder_flashcard_sets WHERE folder_id IN (${placeholders})`,
                ids,
                (err2, rows) => {
                    if (err2) {
                        db.close();
                        return res.status(500).json({ error: 'Internal server error' });
                    }
                    const map: Record<number, number[]> = {};
                    (rows || []).forEach((r: any) => {
                        map[r.folder_id] = map[r.folder_id] || [];
                        map[r.folder_id].push(r.flashcard_set_id);
                    });
                    const result = (folders || []).map((f: any) => ({ ...f, setIds: map[f.id] || [] }));
                    db.close();
                    res.json(result);
                }
            );
        }
    );
});

// POST /api/folders { name, color, studySetId }
router.post('/', (req, res) => {
    const { name, color, studySetId } = req.body;
    if (!name || !studySetId) return res.status(400).json({ error: 'name and studySetId are required' });
    const db = new Database(dbPath);
    const now = new Date().toISOString();
    db.run(
        'INSERT INTO folders (study_set_id, name, color, created_at) VALUES (?, ?, ?, ?)',
        [studySetId, name, color || '#a78bfa', now],
        function (err) {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json({ id: this.lastID, study_set_id: studySetId, name, color: color || '#a78bfa', created_at: now, setIds: [] });
            db.close();
        }
    );
});

// POST /api/folders/:id/sets { flashcardSetId }
router.post('/:id/sets', (req, res) => {
    const { id } = req.params;
    const { flashcardSetId } = req.body;
    if (!flashcardSetId) return res.status(400).json({ error: 'flashcardSetId is required' });
    const db = new Database(dbPath);
    db.run(
        'INSERT OR IGNORE INTO folder_flashcard_sets (folder_id, flashcard_set_id) VALUES (?, ?)',
        [id, flashcardSetId],
        function (err) {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json({ success: true });
            db.close();
        }
    );
});

// DELETE /api/folders/:id/sets/:flashcardSetId
router.delete('/:id/sets/:flashcardSetId', (req, res) => {
    const { id, flashcardSetId } = req.params as any;
    const db = new Database(dbPath);
    db.run(
        'DELETE FROM folder_flashcard_sets WHERE folder_id = ? AND flashcard_set_id = ?',
        [id, flashcardSetId],
        function (err) {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json({ success: true });
            db.close();
        }
    );
});

export default router;


