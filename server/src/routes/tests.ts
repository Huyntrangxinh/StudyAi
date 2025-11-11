import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';

const router = express.Router();
const dbPath = path.join(__dirname, '../../database/app.db');

// Helper to get database connection
const getDb = (): Promise<sqlite3.Database> => {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) reject(err);
            else resolve(db);
        });
    });
};

// Create a new test with questions
router.post('/', async (req, res) => {
    const { studySetId, userId, name, description, questions, materialIds, timeLimit } = req.body;

    if (!studySetId || !userId || !name || !questions || !Array.isArray(questions)) {
        return res.status(400).json({ error: 'Missing required fields: studySetId, userId, name, questions' });
    }

    const db = await getDb();

    return new Promise<void>((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            // Insert test
            const testStmt = db.prepare(`
                INSERT INTO tests (study_set_id, user_id, name, description, material_ids, time_limit, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `);

            testStmt.run(
                studySetId,
                userId,
                name,
                description || null,
                materialIds ? JSON.stringify(materialIds) : null,
                timeLimit || null,
                function (this: sqlite3.RunResult, err: Error | null) {
                    if (err) {
                        db.run('ROLLBACK');
                        testStmt.finalize();
                        db.close();
                        return reject(err);
                    }

                    const testId = this.lastID;

                    // Insert questions
                    const questionStmt = db.prepare(`
                        INSERT INTO test_questions (test_id, question_type, question, options, correct_answer, order_index)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `);

                    let questionIndex = 0;
                    let hasError = false;

                    questions.forEach((q: any) => {
                        if (hasError) return;

                        const optionsJson = q.options && Array.isArray(q.options) ? JSON.stringify(q.options) : null;
                        let correctAnswerJson: string;

                        // Handle correct answer based on type
                        if (q.type === 'multipleChoice') {
                            // For multiple choice, store the index as number
                            correctAnswerJson = String(q.correctAnswer !== undefined ? q.correctAnswer : 0);
                        } else {
                            // For other types, store as string
                            correctAnswerJson = String(q.correctAnswer || q.answer || '');
                        }

                        questionStmt.run(
                            testId,
                            q.type || 'multipleChoice',
                            q.question || '',
                            optionsJson,
                            correctAnswerJson,
                            questionIndex++,
                            function (this: sqlite3.RunResult, err: Error | null) {
                                if (err && !hasError) {
                                    hasError = true;
                                    db.run('ROLLBACK');
                                    questionStmt.finalize();
                                    testStmt.finalize();
                                    db.close();
                                    return reject(err);
                                }
                            }
                        );
                    });

                    questionStmt.finalize((err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            testStmt.finalize();
                            db.close();
                            return reject(err);
                        }

                        db.run('COMMIT', (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                testStmt.finalize();
                                db.close();
                                return reject(err);
                            }

                            // Return the created test with questions
                            db.get('SELECT * FROM tests WHERE id = ?', [testId], (err, test: any) => {
                                if (err) {
                                    testStmt.finalize();
                                    db.close();
                                    return reject(err);
                                }

                                db.all('SELECT * FROM test_questions WHERE test_id = ? ORDER BY order_index', [testId], (err, testQuestions: any[]) => {
                                    testStmt.finalize();
                                    db.close();
                                    if (err) return reject(err);

                                    const result = {
                                        ...test,
                                        questions: testQuestions.map(q => ({
                                            ...q,
                                            options: q.options ? JSON.parse(q.options) : null,
                                            correctAnswer: q.correct_answer
                                        }))
                                    };

                                    res.status(201).json(result);
                                    resolve();
                                });
                            });
                        });
                    });
                }
            );
        });
    });
});

// Get all tests for a study set
router.get('/study-set/:studySetId', async (req, res) => {
    const { studySetId } = req.params;

    const db = await getDb();

    return new Promise<void>((resolve, reject) => {
        db.all(
            'SELECT id, study_set_id, user_id, COALESCE(name, title) as name, description, status, time_limit, material_ids, created_at, updated_at FROM tests WHERE study_set_id = ? ORDER BY created_at DESC',
            [studySetId],
            (err: Error | null, tests: any[]) => {
                db.close();
                if (err) {
                    return reject(err);
                }

                res.json(tests.map(test => ({
                    ...test,
                    materialIds: test.material_ids ? JSON.parse(test.material_ids) : []
                })));
                resolve();
            }
        );
    });
});

// Get a single test with all questions
router.get('/:testId', async (req, res) => {
    const { testId } = req.params;

    const db = await getDb();

    return new Promise<void>((resolve, reject) => {
        db.get('SELECT * FROM tests WHERE id = ?', [testId], (err: Error | null, test: any) => {
            if (err) {
                db.close();
                return reject(err);
            }

            if (!test) {
                db.close();
                return res.status(404).json({ error: 'Test not found' });
            }

            db.all('SELECT * FROM test_questions WHERE test_id = ? ORDER BY order_index', [testId], (err: Error | null, questions: any[]) => {
                db.close();
                if (err) return reject(err);

                const result = {
                    ...test,
                    materialIds: test.material_ids ? JSON.parse(test.material_ids) : [],
                    questions: questions.map(q => ({
                        ...q,
                        options: q.options ? JSON.parse(q.options) : null,
                        correctAnswer: q.correct_answer
                    }))
                };

                res.json(result);
                resolve();
            });
        });
    });
});

// Save test result
router.post('/:testId/results', async (req, res) => {
    const { testId } = req.params;
    const { userId, score, totalQuestions, correctAnswers, timeTaken, answers } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    // LOG: Trước khi query update DB
    console.log('🟢 [SERVER] Trước khi query update DB - Save test result:', {
        testId: testId,
        userId: userId,
        score: score,
        totalQuestions: totalQuestions,
        correctAnswers: correctAnswers,
        timeTaken: timeTaken,
        answers: answers,
        answersStringified: answers ? JSON.stringify(answers) : null,
        timestamp: new Date().toISOString()
    });

    const db = await getDb();

    return new Promise<void>((resolve, reject) => {
        const sql = `
            INSERT INTO test_results (test_id, user_id, score, total_questions, correct_answers, time_taken, answers, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `;

        // LOG: Trước khi prepare statement
        console.log('🟡 [SERVER] Trước khi prepare statement:', {
            sql: sql,
            params: [
                testId,
                userId,
                score || null,
                totalQuestions || 0,
                correctAnswers || 0,
                timeTaken || null,
                answers ? JSON.stringify(answers) : null
            ]
        });

        const stmt = db.prepare(sql);

        // LOG: Trước khi run query
        console.log('🟠 [SERVER] Trước khi run query INSERT:', {
            testId: testId,
            userId: userId,
            score: score || null,
            totalQuestions: totalQuestions || 0,
            correctAnswers: correctAnswers || 0,
            timeTaken: timeTaken || null,
            answersJson: answers ? JSON.stringify(answers) : null
        });

        stmt.run(
            testId,
            userId,
            score || null,
            totalQuestions || 0,
            correctAnswers || 0,
            timeTaken || null,
            answers ? JSON.stringify(answers) : null,
            function (this: sqlite3.RunResult, err: Error | null) {
                stmt.finalize();
                db.close();

                if (err) {
                    console.error('❌ [SERVER] Error khi run query:', err);
                    return reject(err);
                }

                console.log('✅ [SERVER] Query thành công - lastID:', this.lastID);
                res.status(201).json({ id: this.lastID });
                resolve();
            }
        );
    });
});

// Get latest result for a user on a test
router.get('/:testId/results/latest', async (req, res) => {
    const { testId } = req.params;
    const { userId } = req.query as { userId?: string };

    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    const db = await getDb();
    return new Promise<void>((resolve, reject) => {
        const sql = userId === 'all'
            ? 'SELECT * FROM test_results WHERE test_id = ? ORDER BY completed_at DESC LIMIT 1'
            : 'SELECT * FROM test_results WHERE test_id = ? AND user_id = ? ORDER BY completed_at DESC LIMIT 1';
        const params: any[] = userId === 'all' ? [testId] : [testId, userId];
        db.get(
            sql,
            params,
            (err: Error | null, row: any) => {
                db.close();
                if (err) return reject(err);
                if (!row) {
                    res.status(204).send();
                    return resolve();
                }
                // Parse answers JSON if exists
                let answersParsed: any;
                try { answersParsed = row.answers ? JSON.parse(row.answers) : null; } catch { answersParsed = null; }
                res.json({ ...row, answers: answersParsed });
                resolve();
            }
        );
    });
});

// Update a test (e.g., rename)
router.patch('/:testId', async (req, res) => {
    const { testId } = req.params;
    const { name, description } = req.body || {};

    const db = await getDb();
    const finalize = () => db.close();

    // Try updating name column; if it fails (column missing), fallback to title
    const runUpdate = (sql: string, params: any[]) => new Promise<void>((resolve, reject) => {
        db.run(sql, params, function (err: Error | null) {
            if (err) return reject(err);
            resolve();
        });
    });

    try {
        if (name !== undefined || description !== undefined) {
            try {
                await runUpdate(
                    'UPDATE tests SET name = COALESCE(?, name), description = COALESCE(?, description), updated_at = datetime(\'now\') WHERE id = ?',
                    [name ?? null, description ?? null, testId]
                );
            } catch (e) {
                // Fallback for older schema using title
                await runUpdate(
                    'UPDATE tests SET title = COALESCE(?, title), description = COALESCE(?, description), updated_at = datetime(\'now\') WHERE id = ?',
                    [name ?? null, description ?? null, testId]
                );
            }
        }

        db.get('SELECT * FROM tests WHERE id = ?', [testId], (err: Error | null, row: any) => {
            finalize();
            if (err) return res.status(500).json({ error: String(err) });
            if (!row) return res.status(404).json({ error: 'Not found' });
            res.json(row);
        });
    } catch (err) {
        finalize();
        res.status(500).json({ error: String(err) });
    }
});

// Delete a test
router.delete('/:testId', async (req, res) => {
    const { testId } = req.params;
    const db = await getDb();
    db.run('DELETE FROM tests WHERE id = ?', [testId], function (err: Error | null) {
        db.close();
        if (err) return res.status(500).json({ error: String(err) });
        if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
        return res.status(204).send();
    });
});

export default router;

