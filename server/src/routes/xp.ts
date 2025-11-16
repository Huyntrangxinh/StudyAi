import express from 'express';
import { Database } from 'sqlite3';
import path from 'path';

const router = express.Router();
const dbPath = path.join(__dirname, '../../database/app.db');

// Initialize XP tables
const initDb = () => {
    const db = new Database(dbPath);
    db.serialize(() => {
        // User XP table
        db.run(`
            CREATE TABLE IF NOT EXISTS user_xp (
                user_id TEXT PRIMARY KEY,
                current_xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                bones INTEGER DEFAULT 0,
                updated_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)
        `);

        // XP Transactions table
        db.run(`
            CREATE TABLE IF NOT EXISTS xp_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                activity_type TEXT NOT NULL,
                xp_amount INTEGER NOT NULL,
                transaction_date TEXT DEFAULT (date('now')),
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)
        `);

        // Indexes
        db.run(`
            CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_date 
            ON xp_transactions(user_id, transaction_date)
        `);

        db.run(`
            CREATE INDEX IF NOT EXISTS idx_xp_transactions_activity 
            ON xp_transactions(user_id, activity_type, transaction_date)
        `);
    });
    db.close();
};
initDb();

// GET /api/xp - Get user XP, level, and bones
router.get('/', (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    const db = new Database(dbPath);
    db.get(
        'SELECT current_xp, level, bones FROM user_xp WHERE user_id = ?',
        [userId],
        (err, row: any) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (!row) {
                // Initialize user XP if not exists
                db.run(
                    'INSERT INTO user_xp (user_id, current_xp, level, bones) VALUES (?, 0, 1, 0)',
                    [userId],
                    function (insertErr) {
                        if (insertErr) {
                            db.close();
                            return res.status(500).json({ error: 'Failed to initialize user XP' });
                        }
                        db.close();
                        return res.json({ current_xp: 0, level: 1, bones: 0 });
                    }
                );
            } else {
                db.close();
                res.json({
                    current_xp: row.current_xp || 0,
                    level: row.level || 1,
                    bones: row.bones || 0
                });
            }
        }
    );
});

// POST /api/xp/award - Award XP to user
router.post('/award', (req, res) => {
    const { userId, activityType, xpAmount } = req.body;

    if (!userId || !activityType || !xpAmount) {
        return res.status(400).json({ error: 'userId, activityType, and xpAmount are required' });
    }

    const db = new Database(dbPath);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check daily limit for this activity type
    db.get(
        `SELECT SUM(xp_amount) as total_xp 
         FROM xp_transactions 
         WHERE user_id = ? AND activity_type = ? AND transaction_date = ?`,
        [userId, activityType, today],
        (err, row: any) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }

            const dailyXP = row?.total_xp || 0;
            // Daily XP limits for each activity type
            const maxDailyXP: Record<string, number> = {
                'chat': 250,
                'flashcard': 100,
                'test': 75,
                'test_perfect': 150,
                'match_game': 50,
                'match_game_perfect': 125,
                'video': 100,
                'upload': 25,
                'read_document': 60
            };
            const maxXP = maxDailyXP[activityType] || 0;

            if (maxXP > 0 && dailyXP >= maxXP) {
                db.close();
                return res.status(400).json({
                    error: 'Daily XP limit reached for this activity',
                    dailyXP,
                    maxDailyXP: maxXP
                });
            }

            // Calculate actual XP to award (don't exceed daily limit)
            const remainingXP = maxXP > 0 ? maxXP - dailyXP : xpAmount;
            const actualXP = Math.min(xpAmount, remainingXP);

            if (actualXP <= 0) {
                db.close();
                return res.status(400).json({ error: 'No XP remaining for today' });
            }

            // Insert transaction
            db.run(
                'INSERT INTO xp_transactions (user_id, activity_type, xp_amount, transaction_date) VALUES (?, ?, ?, ?)',
                [userId, activityType, actualXP, today],
                function (insertErr) {
                    if (insertErr) {
                        db.close();
                        return res.status(500).json({ error: 'Failed to record XP transaction' });
                    }

                    // Update user XP
                    db.get(
                        'SELECT current_xp, level FROM user_xp WHERE user_id = ?',
                        [userId],
                        (getErr, userRow: any) => {
                            if (getErr) {
                                db.close();
                                return res.status(500).json({ error: 'Failed to get user XP' });
                            }

                            const currentXP = userRow?.current_xp || 0;
                            const currentLevel = userRow?.level || 1;
                            const newXP = currentXP + actualXP;

                            // Calculate new level (1000 XP per level: Level 2 = 1000 XP, Level 3 = 2000 XP, etc.)
                            let newLevel = currentLevel;
                            let newBones = userRow?.bones || 0;

                            // Level 1: 0-999 XP, Level 2: 1000-1999 XP, Level 3: 2000-2999 XP, etc.
                            const calculatedLevel = Math.floor(newXP / 1000) + 1;

                            if (calculatedLevel > currentLevel) {
                                newLevel = calculatedLevel;
                                // Award bones when leveling up (e.g., 10 bones per level)
                                newBones = (newBones || 0) + 10;
                            } else {
                                newLevel = currentLevel;
                            }

                            // Update or insert user XP
                            if (userRow) {
                                db.run(
                                    'UPDATE user_xp SET current_xp = ?, level = ?, bones = ?, updated_at = ? WHERE user_id = ?',
                                    [newXP, newLevel, newBones, new Date().toISOString(), userId],
                                    (updateErr) => {
                                        if (updateErr) {
                                            db.close();
                                            return res.status(500).json({ error: 'Failed to update user XP' });
                                        }
                                        db.close();
                                        res.json({
                                            success: true,
                                            xpAwarded: actualXP,
                                            currentXP: newXP,
                                            level: newLevel,
                                            bones: newBones,
                                            leveledUp: newLevel > currentLevel
                                        });
                                    }
                                );
                            } else {
                                db.run(
                                    'INSERT INTO user_xp (user_id, current_xp, level, bones) VALUES (?, ?, ?, ?)',
                                    [userId, newXP, newLevel, newBones],
                                    (insertErr2) => {
                                        if (insertErr2) {
                                            db.close();
                                            return res.status(500).json({ error: 'Failed to create user XP' });
                                        }
                                        db.close();
                                        res.json({
                                            success: true,
                                            xpAwarded: actualXP,
                                            currentXP: newXP,
                                            level: newLevel,
                                            bones: newBones,
                                            leveledUp: newLevel > currentLevel
                                        });
                                    }
                                );
                            }
                        }
                    );
                }
            );
        }
    );
});

// GET /api/xp/daily - Get daily XP summary for user
router.get('/daily', (req, res) => {
    const userId = req.query.userId as string;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    const db = new Database(dbPath);
    db.all(
        `SELECT activity_type, SUM(xp_amount) as total_xp 
         FROM xp_transactions 
         WHERE user_id = ? AND transaction_date = ? 
         GROUP BY activity_type`,
        [userId, date],
        (err, rows: any[]) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }

            const summary: Record<string, number> = {};
            rows.forEach((row: any) => {
                summary[row.activity_type] = row.total_xp;
            });

            db.close();
            res.json({ date, summary });
        }
    );
});

export default router;

