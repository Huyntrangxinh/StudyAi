import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import pdf from 'pdf-parse';
import OpenAI from 'openai';

// Import config
const config = require('../../config.js');

const router = express.Router();
const dbPath = path.join(__dirname, '../../database/app.db');
const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

// Initialize study_paths tables if they don't exist
const initDb = () => {
    const db = new sqlite3.Database(dbPath);
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS study_paths (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                study_set_id INTEGER NOT NULL,
                exam_date TEXT,
                status TEXT DEFAULT 'draft',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (study_set_id) REFERENCES study_sets(id) ON DELETE CASCADE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS study_path_modules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                study_path_id INTEGER NOT NULL,
                parent_module_id INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'ready',
                progress REAL DEFAULT 0,
                topics_count INTEGER DEFAULT 0,
                materials_count INTEGER DEFAULT 0,
                order_index INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (study_path_id) REFERENCES study_paths(id) ON DELETE CASCADE,
                FOREIGN KEY (parent_module_id) REFERENCES study_path_modules(id) ON DELETE CASCADE
            )
        `);

        // Add parent_module_id column if it doesn't exist
        db.run(`ALTER TABLE study_path_modules ADD COLUMN parent_module_id INTEGER`, (err) => {
            if (err && !String(err.message).includes('duplicate column name')) {
                console.error('Error adding parent_module_id column:', err);
            }
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS study_path_module_materials (
                module_id INTEGER NOT NULL,
                material_id INTEGER NOT NULL,
                PRIMARY KEY (module_id, material_id),
                FOREIGN KEY (module_id) REFERENCES study_path_modules(id) ON DELETE CASCADE,
                FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
            )
        `);

        // Create indexes
        db.run(`CREATE INDEX IF NOT EXISTS idx_study_paths_study_set ON study_paths(study_set_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_study_path_modules_path ON study_path_modules(study_path_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_study_path_module_materials_module ON study_path_module_materials(module_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_study_path_module_materials_material ON study_path_module_materials(material_id)`);
    });
    db.close();
};
initDb();

// POST /api/study-paths/generate - Generate study path from materials
router.post('/generate', async (req, res) => {
    console.log('🚀 [STUDY-PATHS] Generate request received');
    const { studySetId } = req.body;

    if (!studySetId) {
        console.error('❌ [STUDY-PATHS] Missing studySetId');
        return res.status(400).json({ error: 'studySetId is required' });
    }

    // Log environment variables status
    const config = require('../../config');
    console.log('🔐 [STUDY-PATHS] Environment Variables Status:');
    console.log('  OPENAI_API_KEY:', config.OPENAI_API_KEY ? `✅ Set (${config.OPENAI_API_KEY.substring(0, 10)}...)` : '❌ Not set');
    console.log('  OPENAI_MODEL:', config.OPENAI_MODEL || 'gpt-4o-mini (default)');

    if (!config.OPENAI_API_KEY) {
        console.error('❌ [STUDY-PATHS] OPENAI_API_KEY is not set!');
        return res.status(500).json({ error: 'OpenAI API key is not configured' });
    }

    const db = new sqlite3.Database(dbPath);

    try {
        // Get all materials for this study set
        const materials = await new Promise<any[]>((resolve, reject) => {
            db.all(
                'SELECT * FROM materials WHERE study_set_id = ?',
                [studySetId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        if (materials.length === 0) {
            console.error('❌ [STUDY-PATHS] No materials found for studySetId:', studySetId);
            db.close();
            return res.status(400).json({ error: 'No materials found for this study set' });
        }

        console.log('📚 [STUDY-PATHS] Found', materials.length, 'materials for studySetId:', studySetId);

        // Extract text from all materials
        let combinedText = '';
        for (const material of materials) {
            if (material.file_path && material.file_path.endsWith('.pdf')) {
                const filePath = path.join(__dirname, '../../uploads', material.file_path);
                if (fs.existsSync(filePath)) {
                    try {
                        const dataBuffer = fs.readFileSync(filePath);
                        const pdfData = await pdf(dataBuffer);
                        combinedText += `\n\n=== ${material.name} ===\n\n${pdfData.text}`;
                    } catch (error) {
                        console.error(`Error reading PDF ${material.name}:`, error);
                    }
                }
            }
        }

        if (!combinedText.trim()) {
            console.error('❌ [STUDY-PATHS] Could not extract text from materials');
            db.close();
            return res.status(400).json({ error: 'Could not extract text from materials' });
        }

        console.log('📝 [STUDY-PATHS] Extracted text length:', combinedText.length, 'characters');

        // Call OpenAI to generate study path
        console.log('🤖 [STUDY-PATHS] Calling OpenAI API to generate study path...');
        const prompt = `Phân tích tài liệu sau và tạo lộ trình học tập chi tiết. 
Tài liệu:
${combinedText.substring(0, 15000)}...

Hãy tạo lộ trình học tập với các module/topic chính. Mỗi module cần có:
- Tiêu đề (bằng tiếng Việt và tiếng Anh)
- Mô tả ngắn
- Số lượng topics (ước tính)
- Materials liên quan (dựa trên nội dung)

Trả về JSON format:
{
  "modules": [
    {
      "title": "Tiêu đề tiếng Việt (English Title)",
      "description": "Mô tả ngắn về module này",
      "topicsCount": 5,
      "materialIds": [1, 2]
    }
  ]
}

Chỉ trả về JSON, không có text thêm.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are an expert educational planner. Generate structured study paths from educational materials. Always respond in valid JSON format only.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7
        });

        const responseContent = completion.choices[0].message.content || '{}';
        console.log('✅ [STUDY-PATHS] OpenAI Response received, length:', responseContent.length);
        console.log('📄 [STUDY-PATHS] OpenAI Response (Raw):', responseContent.substring(0, 500) + '...');
        const studyPathData = JSON.parse(responseContent);
        console.log('📊 [STUDY-PATHS] Parsed Study Path Data:', {
            modulesCount: studyPathData.modules?.length || 0,
            modules: studyPathData.modules?.map((m: any) => ({ title: m.title, topicsCount: m.topicsCount })) || []
        });

        if (!studyPathData.modules || !Array.isArray(studyPathData.modules)) {
            db.close();
            return res.status(500).json({ error: 'Invalid response from AI' });
        }

        // Check if study path already exists for this study set
        const existingPath = await new Promise<any>((resolve, reject) => {
            db.get(
                'SELECT * FROM study_paths WHERE study_set_id = ? ORDER BY created_at DESC LIMIT 1',
                [studySetId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        let studyPathId: number;
        if (existingPath) {
            // Update existing path
            studyPathId = existingPath.id;
            await new Promise<void>((resolve, reject) => {
                db.run(
                    'UPDATE study_paths SET status = ?, updated_at = datetime("now") WHERE id = ?',
                    ['ready', studyPathId],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });

            // Delete old modules
            await new Promise<void>((resolve, reject) => {
                db.run(
                    'DELETE FROM study_path_modules WHERE study_path_id = ?',
                    [studyPathId],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        } else {
            // Create new study path
            studyPathId = await new Promise<number>((resolve, reject) => {
                db.run(
                    'INSERT INTO study_paths (study_set_id, status, created_at, updated_at) VALUES (?, ?, datetime("now"), datetime("now"))',
                    [studySetId, 'ready'],
                    function (err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
        }

        // Insert modules
        const insertedModules = [];
        for (let i = 0; i < studyPathData.modules.length; i++) {
            const module = studyPathData.modules[i];
            const moduleId = await new Promise<number>((resolve, reject) => {
                db.run(
                    'INSERT INTO study_path_modules (study_path_id, title, description, status, progress, topics_count, materials_count, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))',
                    [
                        studyPathId,
                        module.title || `Module ${i + 1}`,
                        module.description || '',
                        'ready',
                        0,
                        module.topicsCount || 0,
                        module.materialIds?.length || 0,
                        i
                    ],
                    function (err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });

            // Link materials to module
            if (module.materialIds && Array.isArray(module.materialIds)) {
                for (const materialId of module.materialIds) {
                    // Verify material exists and belongs to study set
                    const materialExists = await new Promise<boolean>((resolve, reject) => {
                        db.get(
                            'SELECT id FROM materials WHERE id = ? AND study_set_id = ?',
                            [materialId, studySetId],
                            (err, row) => {
                                if (err) reject(err);
                                else resolve(!!row);
                            }
                        );
                    });

                    if (materialExists) {
                        db.run(
                            'INSERT OR IGNORE INTO study_path_module_materials (module_id, material_id) VALUES (?, ?)',
                            [moduleId, materialId]
                        );
                    }
                }
            }

            insertedModules.push({
                id: moduleId,
                title: module.title,
                description: module.description,
                topicsCount: module.topicsCount || 0,
                materialsCount: module.materialIds?.length || 0
            });
        }

        db.close();
        res.json({
            success: true,
            studyPathId,
            modules: insertedModules
        });
    } catch (error) {
        console.error('Error generating study path:', error);
        db.close();
        res.status(500).json({
            error: 'Failed to generate study path',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

// POST /api/study-paths/generate-sub-roadmap - Generate sub-roadmap for a module
router.post('/generate-sub-roadmap', async (req, res) => {
    const { moduleId, studySetId } = req.body;

    if (!moduleId || !studySetId) {
        return res.status(400).json({ error: 'moduleId and studySetId are required' });
    }

    // Convert to integer
    const moduleIdInt = parseInt(String(moduleId), 10);
    const studySetIdInt = parseInt(String(studySetId), 10);

    if (isNaN(moduleIdInt) || isNaN(studySetIdInt)) {
        return res.status(400).json({ error: 'Invalid moduleId or studySetId' });
    }

    console.log('Generating sub-roadmap for module:', moduleIdInt, 'studySet:', studySetIdInt);

    const db = new sqlite3.Database(dbPath);

    try {
        // Get module details
        const module = await new Promise<any>((resolve, reject) => {
            db.get(
                'SELECT * FROM study_path_modules WHERE id = ?',
                [moduleIdInt],
                (err, row) => {
                    if (err) {
                        console.error('Error querying module:', err);
                        reject(err);
                    } else {
                        console.log('Module found:', row ? 'Yes' : 'No');
                        resolve(row);
                    }
                }
            );
        });

        if (!module) {
            db.close();
            console.error('Module not found with id:', moduleIdInt);
            return res.status(404).json({ error: 'Module not found' });
        }

        // Get materials for this module
        let moduleMaterials = await new Promise<any[]>((resolve, reject) => {
            db.all(
                `SELECT m.* FROM materials m
                 INNER JOIN study_path_module_materials spmm ON m.id = spmm.material_id
                 WHERE spmm.module_id = ?`,
                [moduleIdInt],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });

        // If module has no specific materials, use all materials from the study set
        if (moduleMaterials.length === 0) {
            moduleMaterials = await new Promise<any[]>((resolve, reject) => {
                db.all(
                    'SELECT * FROM materials WHERE study_set_id = ?',
                    [studySetIdInt],
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows || []);
                    }
                );
            });
        }

        if (moduleMaterials.length === 0) {
            db.close();
            return res.status(400).json({ error: 'No materials found for this study set' });
        }

        // Extract text from materials related to this module
        let combinedText = '';
        for (const material of moduleMaterials) {
            if (material.file_path && material.file_path.endsWith('.pdf')) {
                const filePath = path.join(__dirname, '../../uploads', material.file_path);
                if (fs.existsSync(filePath)) {
                    try {
                        const dataBuffer = fs.readFileSync(filePath);
                        const pdfData = await pdf(dataBuffer);
                        combinedText += `\n\n=== ${material.name} ===\n\n${pdfData.text}`;
                    } catch (error) {
                        console.error(`Error reading PDF ${material.name}:`, error);
                    }
                }
            }
        }

        if (!combinedText.trim()) {
            db.close();
            return res.status(400).json({ error: 'Could not extract text from materials' });
        }

        // Call OpenAI to generate sub-roadmap focused on this module
        const prompt = `Bạn là một chuyên gia lập kế hoạch học tập. Hãy phân tích kỹ lưỡng nội dung sau đây về module "${module.title}" và tạo một lộ trình học tập chi tiết (sub-roadmap) bên trong module này.

Module gốc: ${module.title}
Mô tả: ${module.description || 'Không có mô tả'}

Nội dung tài liệu liên quan:
${combinedText.substring(0, 20000)}...

Hãy tạo sub-roadmap với các topic/sub-module chi tiết bên trong module này. Mỗi topic cần có:
- Tiêu đề (bằng tiếng Việt và tiếng Anh)
- Mô tả ngắn gọn về nội dung sẽ học
- Số lượng subtopics ước tính (nếu có)
- Materials liên quan (dựa trên nội dung)

Trả về JSON format:
{
  "subModules": [
    {
      "title": "Tiêu đề tiếng Việt (English Title)",
      "description": "Mô tả chi tiết về topic này, những gì học viên sẽ học được",
      "topicsCount": 3,
      "materialIds": [1, 2]
    }
  ]
}

Chỉ trả về JSON, không có text thêm. Tạo ít nhất 3-5 sub-modules chi tiết.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are an expert educational planner. Generate detailed sub-roadmaps for learning modules. Always respond in valid JSON format only.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7
        });

        const responseContent = completion.choices[0].message.content || '{}';
        console.log('🤖 OpenAI Sub-Roadmap Response (Raw):', responseContent);
        const subRoadmapData = JSON.parse(responseContent);
        console.log('📊 Parsed Sub-Roadmap Data:', JSON.stringify(subRoadmapData, null, 2));

        if (!subRoadmapData.subModules || !Array.isArray(subRoadmapData.subModules)) {
            db.close();
            return res.status(500).json({ error: 'Invalid response from AI' });
        }

        // Get or create a study path for sub-modules (use same study_set_id)
        const studyPath = await new Promise<any>((resolve, reject) => {
            db.get(
                'SELECT * FROM study_paths WHERE study_set_id = ? ORDER BY created_at DESC LIMIT 1',
                [studySetIdInt],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (!studyPath) {
            db.close();
            return res.status(404).json({ error: 'Study path not found' });
        }

        // Delete existing sub-modules for this parent module
        await new Promise<void>((resolve, reject) => {
            db.run(
                'DELETE FROM study_path_modules WHERE parent_module_id = ?',
                [moduleIdInt],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Insert sub-modules
        const insertedSubModules = [];
        for (let i = 0; i < subRoadmapData.subModules.length; i++) {
            const subModule = subRoadmapData.subModules[i];
            const subModuleId = await new Promise<number>((resolve, reject) => {
                db.run(
                    'INSERT INTO study_path_modules (study_path_id, parent_module_id, title, description, status, progress, topics_count, materials_count, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))',
                    [
                        studyPath.id,
                        moduleIdInt,
                        subModule.title || `Sub-module ${i + 1}`,
                        subModule.description || '',
                        'ready',
                        0,
                        subModule.topicsCount || 0,
                        subModule.materialIds?.length || 0,
                        i
                    ],
                    function (err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });

            // Link materials to sub-module
            if (subModule.materialIds && Array.isArray(subModule.materialIds)) {
                for (const materialId of subModule.materialIds) {
                    // Verify material exists and belongs to study set
                    const materialExists = await new Promise<boolean>((resolve, reject) => {
                        db.get(
                            'SELECT id FROM materials WHERE id = ? AND study_set_id = ?',
                            [materialId, studySetIdInt],
                            (err, row) => {
                                if (err) reject(err);
                                else resolve(!!row);
                            }
                        );
                    });

                    if (materialExists) {
                        db.run(
                            'INSERT OR IGNORE INTO study_path_module_materials (module_id, material_id) VALUES (?, ?)',
                            [subModuleId, materialId]
                        );
                    }
                }
            }

            insertedSubModules.push({
                id: subModuleId,
                title: subModule.title,
                description: subModule.description,
                topicsCount: subModule.topicsCount || 0,
                materialsCount: subModule.materialIds?.length || 0
            });
        }

        db.close();
        res.json({
            success: true,
            parentModuleId: moduleIdInt,
            subModules: insertedSubModules
        });
    } catch (error) {
        console.error('Error generating sub-roadmap:', error);
        db.close();
        res.status(500).json({
            error: 'Failed to generate sub-roadmap',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

// GET /api/study-paths/:studySetId - Get study path for a study set
router.get('/:studySetId', (req, res) => {
    const { studySetId } = req.params;
    const db = new sqlite3.Database(dbPath);

    db.get(
        'SELECT * FROM study_paths WHERE study_set_id = ? ORDER BY created_at DESC LIMIT 1',
        [studySetId],
        (err, studyPath: any) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Database error' });
            }

            if (!studyPath) {
                db.close();
                return res.json(null);
            }

            // Get modules (only top-level, not sub-modules)
            db.all(
                `SELECT spm.*, 
                 GROUP_CONCAT(spmm.material_id) as material_ids
                 FROM study_path_modules spm
                 LEFT JOIN study_path_module_materials spmm ON spm.id = spmm.module_id
                 WHERE spm.study_path_id = ? AND spm.parent_module_id IS NULL
                 GROUP BY spm.id
                 ORDER BY spm.order_index ASC`,
                [studyPath.id],
                (err, modules: any[]) => {
                    db.close();
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }

                    const formattedModules = modules.map(m => ({
                        ...m,
                        materialIds: m.material_ids ? m.material_ids.split(',').map(Number) : []
                    }));

                    res.json({
                        ...studyPath,
                        modules: formattedModules
                    });
                }
            );
        }
    );
});

// GET /api/study-paths/module/:moduleId/sub-modules - Get sub-modules for a parent module
router.get('/module/:moduleId/sub-modules', (req, res) => {
    const { moduleId } = req.params;
    const db = new sqlite3.Database(dbPath);

    db.all(
        `SELECT spm.*, 
         GROUP_CONCAT(spmm.material_id) as material_ids
         FROM study_path_modules spm
         LEFT JOIN study_path_module_materials spmm ON spm.id = spmm.module_id
         WHERE spm.parent_module_id = ?
         GROUP BY spm.id
         ORDER BY spm.order_index ASC`,
        [moduleId],
        (err, modules: any[]) => {
            db.close();
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            const formattedModules = modules.map(m => ({
                ...m,
                materialIds: m.material_ids ? m.material_ids.split(',').map(Number) : []
            }));

            res.json(formattedModules);
        }
    );
});

// PATCH /api/study-paths/sub-module/:subModuleId/progress - Update sub-module progress
router.patch('/sub-module/:subModuleId/progress', (req, res) => {
    const { subModuleId } = req.params;
    const { progress } = req.body; // progress: 0, 50, or 100
    const db = new sqlite3.Database(dbPath);

    if (progress === undefined || (progress !== 0 && progress !== 50 && progress !== 100)) {
        db.close();
        return res.status(400).json({ error: 'Progress must be 0, 50, or 100' });
    }

    // Update progress and status
    const status = progress === 100 ? 'completed' : progress === 50 ? 'in_progress' : 'ready';

    db.run(
        'UPDATE study_path_modules SET progress = ?, status = ? WHERE id = ?',
        [progress, status, subModuleId],
        function (err) {
            db.close();
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Sub-module not found' });
            }
            res.json({
                id: Number(subModuleId),
                progress,
                status,
                message: 'Progress updated successfully'
            });
        }
    );
});

export default router;

