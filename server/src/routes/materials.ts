import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import crypto from 'crypto';
import pdf from 'pdf-parse';

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

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    }
});

// POST /api/materials/upload - Upload file and create material
router.post('/upload', (req, res, next) => {
    console.log('📤 [MATERIALS] Upload request received');
    upload.single('file')(req, res, (err: any) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                console.error('❌ [MATERIALS] File too large:', err.code);
                return res.status(400).json({
                    error: 'File quá lớn. Kích thước tối đa là 100MB.'
                });
            }
            console.error('❌ [MATERIALS] Multer upload error:', err);
            return res.status(500).json({
                error: 'Lỗi khi upload file',
                details: err.message
            });
        }
        next();
    });
}, (req, res) => {
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

    console.log('📤 [MATERIALS] Upload details:', {
        name,
        type,
        size,
        filePath,
        studySetId,
        fileSize: req.file ? req.file.size : 'no file',
        generateNotes: generateNotes === 'true',
        noteType: noteType || 'summarized',
        timestamp: now
    });

    const sizeInt = parseInt(size);

    // Compute file hash for content-based dedup per study set
    // Use streaming for large files to avoid memory issues
    const computeFileHash = (filePath: string): Promise<string | null> => {
        return new Promise((resolve) => {
            try {
                const full = path.join(__dirname, '../../uploads', filePath);
                const hash = crypto.createHash('sha256');
                const stream = fs.createReadStream(full);

                stream.on('data', (chunk) => {
                    hash.update(chunk);
                });

                stream.on('end', () => {
                    resolve(hash.digest('hex'));
                });

                stream.on('error', (err) => {
                    console.error('Error reading file for hash:', err);
                    resolve(null);
                });
            } catch (e) {
                console.error('Hash compute error:', e);
                resolve(null);
            }
        });
    };

    // Process upload: compute hash then insert
    (async () => {
        try {
            let fileHash: string | null = null;
            if (filePath) {
                fileHash = await computeFileHash(filePath);
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
                        return res.status(500).json({
                            error: 'Internal server error',
                            details: e.message
                        });
                    }

                    const insertedId = (this as any)?.lastID;
                    console.log('✅ [MATERIALS] Material uploaded successfully:', {
                        id: insertedId,
                        name,
                        filePath,
                        studySetId,
                        fileHash: fileHash ? `${fileHash.substring(0, 10)}...` : 'null'
                    });
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
        } catch (error: any) {
            console.error('Upload processing error:', error);
            db.close();
            return res.status(500).json({
                error: 'Failed to process upload',
                details: error?.message || 'Unknown error'
            });
        }
    })();
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
        db.run(`ALTER TABLE materials ADD COLUMN type TEXT`, (err) => {
            if (err && !String(err.message).includes('duplicate column name')) {
                console.error('Error adding type column:', err);
            }
        });
        db.run(`ALTER TABLE materials ADD COLUMN size INTEGER`, (err) => {
            if (err && !String(err.message).includes('duplicate column name')) {
                console.error('Error adding size column:', err);
            }
        });
        db.run(`ALTER TABLE materials ADD COLUMN generate_notes BOOLEAN DEFAULT 0`, (err) => {
            if (err && !String(err.message).includes('duplicate column name')) {
                console.error('Error adding generate_notes column:', err);
            }
        });
        db.run(`ALTER TABLE materials ADD COLUMN note_type TEXT DEFAULT 'summarized'`, (err) => {
            if (err && !String(err.message).includes('duplicate column name')) {
                console.error('Error adding note_type column:', err);
            }
        });
        db.run(`ALTER TABLE materials ADD COLUMN status TEXT DEFAULT 'uploaded'`, (err) => {
            if (err && !String(err.message).includes('duplicate column name')) {
                console.error('Error adding status column:', err);
            }
        });
        db.run(`ALTER TABLE materials ADD COLUMN updated_at DATETIME`, (err) => {
            if (err) {
                if (!String(err.message).includes('duplicate column name')) {
                    console.error('Error adding updated_at column:', err);
                }
                return;
            }

            db.run(
                `UPDATE materials 
                 SET updated_at = COALESCE(updated_at, created_at, datetime('now')) 
                 WHERE updated_at IS NULL`,
                (updateErr) => {
                    if (updateErr) {
                        console.error('Error backfilling updated_at column:', updateErr);
                    }
                }
            );
        });
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
    console.log('📤 [MATERIALS] Upload multiple request received');
    const { studySetId } = req.body;
    const files = (req.files as Express.Multer.File[]) || [];
    if (!studySetId || !files.length) {
        console.error('❌ [MATERIALS] Missing studySetId or files');
        return res.status(400).json({ error: 'studySetId and files are required' });
    }
    console.log('📤 [MATERIALS] Uploading', files.length, 'files to studySetId:', studySetId);

    const now = new Date().toISOString();
    const db = new sqlite3.Database(dbPath);
    const results: any[] = [];
    let completed = 0;

    const maybeFinish = () => {
        if (completed === files.length) {
            console.log('✅ [MATERIALS] All files processed:', {
                total: files.length,
                successful: results.filter(r => r.id).length,
                duplicates: results.filter(r => r.duplicate).length,
                errors: results.filter(r => r.error).length
            });
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

// GET /api/materials/:studySetId/:materialId/content - Extract full content from material
// NOTE: This route must come BEFORE /:studySetId to avoid route conflicts
router.get('/:studySetId/:materialId/content', async (req, res) => {
    const { studySetId, materialId } = req.params;
    const db = new sqlite3.Database(dbPath);

    db.get(
        'SELECT * FROM materials WHERE id = ? AND study_set_id = ?',
        [materialId, studySetId],
        async (err, material: any) => {
            if (err) {
                console.error('Error fetching material:', err);
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (!material) {
                db.close();
                return res.status(404).json({ error: 'Material not found' });
            }

            if (!material.file_path) {
                db.close();
                return res.status(400).json({ error: 'Material has no file path' });
            }

            db.close();

            // Try multiple possible paths
            const candidates = [
                path.join(process.cwd(), 'server/uploads', material.file_path),
                path.join(process.cwd(), 'uploads', material.file_path),
                path.join(__dirname, '../uploads', material.file_path),
                path.join(__dirname, '../../uploads', material.file_path),
                material.file_path // Absolute path
            ];

            let fileFound = false;
            let allText = '';

            for (const filePath of candidates) {
                if (fs.existsSync(filePath)) {
                    try {
                        const dataBuffer = fs.readFileSync(filePath);

                        // Check if it's a PDF
                        if (material.type === 'pdf' || filePath.toLowerCase().endsWith('.pdf')) {
                            const data = await pdf(dataBuffer);
                            allText = data.text || '';
                        } else {
                            // For other file types, try to read as text
                            allText = dataBuffer.toString('utf-8');
                        }

                        fileFound = true;
                        console.log(`✅ Extracted content from ${material.name}: ${allText.length} characters`);
                        break;
                    } catch (extractErr) {
                        console.error(`Error extracting from ${filePath}:`, extractErr);
                        continue;
                    }
                }
            }

            if (!fileFound) {
                return res.status(404).json({ error: 'File not found' });
            }

            if (!allText.trim()) {
                return res.status(400).json({ error: 'File is empty or could not be extracted' });
            }

            res.json({
                content: allText,
                materialId: material.id,
                materialName: material.name,
                materialType: material.type
            });
        }
    );
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

// Helper function to split pages (same as in ai.ts)
function splitPages(text: string): string[] {
    const pages = text.split(/\f/g);
    if (pages.length > 1) {
        return pages.map(s => s.trim()).filter(Boolean);
    }
    // If no form feed, try splitting by multiple newlines
    return text.split(/\n{3,}/g).map(s => s.trim()).filter(Boolean);
}

// GET /api/materials/text/:filename - Extract text from PDF (specific page)
router.get('/text/:filename', async (req, res) => {
    const { filename } = req.params;
    const pageNumber = parseInt(req.query.page as string) || 1;

    // Try multiple file paths (same as ai.ts)
    const candidates = [
        path.join(process.cwd(), 'server/uploads', filename),
        path.join(__dirname, '../uploads', filename),
        path.join(__dirname, '../../uploads', filename),
        path.join(process.cwd(), 'uploads', filename),
    ];

    let filePath: string | null = null;
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            filePath = p;
            break;
        }
    }

    if (!filePath) {
        return res.status(404).json({ error: 'File not found' });
    }

    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);

        // Add form feed prefix like in ai.ts to ensure at least one separator
        const textWithPrefix = `\n\f${data.text}`;

        // Use same split logic as ai.ts
        let pages = splitPages(textWithPrefix);

        // If first page is empty (due to prefix), remove it and adjust indices
        if (pages.length > 0 && !pages[0].trim()) {
            pages = pages.slice(1);
        }

        // If still empty or single page, try direct split on original text
        if (pages.length <= 1) {
            pages = splitPages(data.text);
        }

        // If splitting didn't work well, pages might be empty or only have one page
        // In that case, we need to estimate page boundaries
        if (pages.length <= 1) {
            // Estimate: assume roughly equal length pages
            const totalChars = data.text.length;
            const estimatedPagesPerChar = totalChars / 3000; // Rough estimate: ~3000 chars per page
            const estimatedPages = Math.max(1, Math.ceil(estimatedPagesPerChar));

            // Split text into estimated pages
            const charsPerPage = Math.ceil(totalChars / estimatedPages);
            const estimatedPagesArray: string[] = [];
            for (let i = 0; i < estimatedPages; i++) {
                const start = i * charsPerPage;
                const end = Math.min(start + charsPerPage, totalChars);
                estimatedPagesArray.push(data.text.substring(start, end));
            }

            // Get the requested page
            const pageIndex = pageNumber - 1;
            const pageText = estimatedPagesArray[pageIndex] || estimatedPagesArray[0] || data.text;

            res.json({
                text: pageText.trim(),
                page: pageNumber,
                totalPages: estimatedPages
            });
            return;
        }

        // Validate page number
        if (pageNumber < 1 || pageNumber > pages.length) {
            return res.status(400).json({
                error: `Page number must be between 1 and ${pages.length}`,
                totalPages: pages.length
            });
        }

        // Get the specific page (pageNumber is 1-indexed)
        const pageIndex = pageNumber - 1;
        const pageText = pages[pageIndex] || '';

        // Preserve original formatting - just trim
        const formattedText = pageText.trim();

        console.log(`📄 Extracted text for page ${pageNumber}:`, {
            totalPages: pages.length,
            pageIndex,
            textLength: formattedText.length,
            preview: formattedText.substring(0, 200).replace(/\n/g, ' ')
        });

        res.json({
            text: formattedText,
            page: pageNumber,
            totalPages: pages.length
        });
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        res.status(500).json({ error: 'Failed to extract text from PDF: ' + (error instanceof Error ? error.message : String(error)) });
    }
});

export default router;
