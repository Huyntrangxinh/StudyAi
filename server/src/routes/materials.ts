import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import crypto from 'crypto';

const router = express.Router();
const dbPath = path.join(__dirname, '../../database/app.db');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// POST /api/materials/upload - Upload file and create material
router.post('/upload', upload.single('file'), (req, res) => {
    const { name, type, size, studySetId, generateNotes, noteType } = req.body;

    if (!name || !type || !size || !studySetId) {
        return res.status(400).json({ error: 'Name, type, size, and studySetId are required' });
    }

    // Check if file is empty
    if (req.file && req.file.size === 0) {
        return res.status(400).json({ error: 'Uploaded file is empty' });
    }

    const filePath = req.file ? req.file.filename : null;
    const now = new Date().toISOString();
    const db = new sqlite3.Database(dbPath);

    console.log('Upload details:', {
        name,
        type,
        size,
        filePath,
        studySetId,
        fileSize: req.file ? req.file.size : 'no file'
    });

    const sizeInt = parseInt(size);

    // Compute file hash for content-based dedup per study set
    let fileHash: string | null = null;
    if (filePath) {
        try {
            const full = path.join(__dirname, '../../uploads', filePath);
            const buf = fs.readFileSync(full);
            fileHash = crypto.createHash('sha256').update(buf).digest('hex');
        } catch (e) {
            console.error('Hash compute error:', e);
        }
    }

    // Insert; allow same names, but avoid identical content in same study set
    db.run(
        'INSERT INTO materials (name, type, size, file_path, study_set_id, generate_notes, note_type, created_at, updated_at, file_hash, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, type, sizeInt, filePath, studySetId, generateNotes === 'true', noteType || 'summarized', now, now, fileHash, sizeInt],
        function (this: any, err) {
            if (err) {
                const e = err as NodeJS.ErrnoException;
                console.error('Error creating material:', e);
                console.error('Error message:', e.message);
                console.error('Error code:', e.code);
                db.close();
                if (String(e.message).includes('idx_materials_unique_hash')) {
                    return res.status(409).json({ error: 'File already exists in this study set (same content)' });
                }
                return res.status(500).json({ error: 'Internal server error' });
            }

            const insertedId = (this as any)?.lastID;
            res.json({
                id: insertedId,
                name,
                type,
                size,
                file_path: filePath,
                studySetId,
                generateNotes: generateNotes === 'true',
                noteType: noteType || 'summarized',
                status: 'uploaded',
                createdAt: now,
                updatedAt: now
            });
            db.close();
        }
    );
});

// Create materials table if it doesn't exist
const initDb = () => {
    const db = new sqlite3.Database(dbPath);
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS materials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                size INTEGER NOT NULL,
                file_path TEXT,
                study_set_id INTEGER NOT NULL,
                generate_notes BOOLEAN DEFAULT 0,
                note_type TEXT DEFAULT 'summarized',
                status TEXT DEFAULT 'uploaded',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                file_hash TEXT,
                file_size INTEGER,
                FOREIGN KEY (study_set_id) REFERENCES study_sets (id)
            )
        `);
        // Add columns if they don't exist (no-op if already present)
        db.run(`ALTER TABLE materials ADD COLUMN file_hash TEXT`, (err) => {
            if (err && !String(err.message).includes('duplicate column name')) {
                console.error('Error adding file_hash column:', err);
            }
        });
        db.run(`ALTER TABLE materials ADD COLUMN file_size INTEGER`, (err) => {
            if (err && !String(err.message).includes('duplicate column name')) {
                console.error('Error adding file_size column:', err);
            }
        });
        // Prevent duplicate content within same study set
        db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_unique_hash ON materials(study_set_id, file_hash)`);
    });
    db.close();
};
initDb();

// POST /api/materials/upload-multiple - upload up to 20 files
router.post('/upload-multiple', upload.array('files', 20), (req, res) => {
    const { studySetId } = req.body;
    const files = (req.files as Express.Multer.File[]) || [];
    if (!studySetId || !files.length) {
        return res.status(400).json({ error: 'studySetId and files are required' });
    }

    const now = new Date().toISOString();
    const db = new sqlite3.Database(dbPath);
    const results: any[] = [];
    let completed = 0;

    const maybeFinish = () => {
        if (completed === files.length) {
            db.close();
            return res.json({ uploaded: results });
        }
    };

    if (files.length === 0) {
        db.close();
        return res.json({ uploaded: results });
    }

    files.forEach(f => {
        try {
            const full = path.join(__dirname, '../../uploads', f.filename);
            const hash = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
            db.run(
                'INSERT INTO materials (name, type, size, file_path, study_set_id, generate_notes, note_type, created_at, updated_at, file_hash, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [f.originalname, f.mimetype || 'application/pdf', f.size, f.filename, studySetId, false, 'summarized', now, now, hash, f.size],
                function (this: any, err) {
                    if (err) {
                        if (String(err.message).includes('idx_materials_unique_hash')) {
                            results.push({ duplicate: true, name: f.originalname });
                            try {
                                if (fs.existsSync(full)) fs.unlinkSync(full);
                            } catch { }
                        } else {
                            console.error('Insert error:', err);
                            results.push({ error: true, name: f.originalname });
                        }
                    } else {
                        results.push({ id: this?.lastID, name: f.originalname, file_path: f.filename, size: f.size });
                    }
                    completed += 1;
                    maybeFinish();
                }
            );
        } catch (e: any) {
            console.error('Pre-insert error:', e);
            results.push({ error: true, name: f.originalname });
            completed += 1;
            maybeFinish();
        }
    });
});

// POST /api/materials - Create new material
router.post('/', (req, res) => {
    const { name, type, size, studySetId, generateNotes, noteType, file_path } = req.body;

    if (!name || !type || !size || !studySetId) {
        return res.status(400).json({ error: 'Name, type, size, and studySetId are required' });
    }

    const now = new Date().toISOString();
    const db = new sqlite3.Database(dbPath);

    db.run(
        'INSERT INTO materials (name, type, size, file_path, study_set_id, generate_notes, note_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, type, size, file_path || null, studySetId, generateNotes || false, noteType || 'summarized', now, now],
        function (this: any, err) {
            if (err) {
                console.error('Error creating material:', err);
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }

            const insertedId = (this as any)?.lastID;
            res.json({
                id: insertedId,
                name,
                type,
                size,
                file_path: file_path || null,
                studySetId,
                generateNotes: generateNotes || false,
                noteType: noteType || 'summarized',
                status: 'uploaded',
                createdAt: now,
                updatedAt: now
            });
            db.close();
        }
    );
});

// PUT /api/materials/:id - Rename or update material fields
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || String(name).trim() === '') {
        return res.status(400).json({ error: 'Name is required' });
    }

    const db = new sqlite3.Database(dbPath);
    const now = new Date().toISOString();

    db.run(
        'UPDATE materials SET name = ?, updated_at = ? WHERE id = ?',
        [name, now, id],
        function (this: any, err) {
            if (err) {
                console.error('Error updating material:', err);
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (this.changes === 0) {
                db.close();
                return res.status(404).json({ error: 'Material not found' });
            }
            db.get('SELECT * FROM materials WHERE id = ?', [id], (getErr, row) => {
                db.close();
                if (getErr) {
                    console.error('Error fetching updated material:', getErr);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                return res.json(row);
            });
        }
    );
});

// DELETE /api/materials/:id - Delete a material and its file
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const db = new sqlite3.Database(dbPath);

    db.get('SELECT file_path FROM materials WHERE id = ?', [id], (selErr, row: any) => {
        if (selErr) {
            console.error('Error reading material before delete:', selErr);
            db.close();
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!row) {
            db.close();
            return res.status(404).json({ error: 'Material not found' });
        }

        // Try to remove physical file
        try {
            if (row.file_path) {
                const full = path.join(__dirname, '../../uploads', row.file_path);
                if (fs.existsSync(full)) fs.unlinkSync(full);
            }
        } catch (e) {
            console.warn('Could not remove file on delete:', e);
        }

        db.run('DELETE FROM materials WHERE id = ?', [id], function (this: any, delErr) {
            db.close();
            if (delErr) {
                console.error('Error deleting material:', delErr);
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Material not found' });
            }
            return res.json({ success: true });
        });
    });
});

// GET /api/materials/:studySetId - Get materials for a study set
router.get('/:studySetId', (req, res) => {
    const studySetId = req.params.studySetId;
    const db = new sqlite3.Database(dbPath);

    db.all(
        'SELECT * FROM materials WHERE study_set_id = ? ORDER BY created_at DESC',
        [studySetId],
        (err, rows) => {
            if (err) {
                console.error('Error fetching materials:', err);
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json(rows);
            db.close();
        }
    );
});

// GET /api/materials/file/:filename - Serve uploaded files
router.get('/file/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    // Set appropriate headers for PDF with CORS
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
});

export default router;
