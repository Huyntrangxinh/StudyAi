import express from 'express';
import { Database } from 'sqlite3';
import path from 'path';

const router = express.Router();
const dbPath = path.join(__dirname, '../../database/app.db');

const initDb = () => {
    const db = new Database(dbPath);
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS user_streaks (
                user_id TEXT PRIMARY KEY,
                current_streak INTEGER DEFAULT 0,
                best_streak INTEGER DEFAULT 0,
                last_activity_date TEXT,
                updated_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
    });
    db.close();
};
initDb();

const toDateOnly = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
};

router.get('/', (req, res) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    const db = new Database(dbPath);
    db.get(
        'SELECT current_streak AS currentStreak, best_streak AS bestStreak, last_activity_date AS lastActivityDate FROM user_streaks WHERE user_id = ?',
        [userId],
        (err, row) => {
            db.close();
            if (err) {
                console.error('Error fetching user streak:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (!row) {
                return res.json({ currentStreak: 0, bestStreak: 0, lastActivityDate: null });
            }

            return res.json(row);
        }
    );
});

router.post('/track', (req, res) => {
    const { userId, activityDate } = req.body as { userId?: string; activityDate?: string };
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    const today = activityDate || new Date().toISOString().slice(0, 10);
    const db = new Database(dbPath);

    db.get(
        'SELECT current_streak, best_streak, last_activity_date FROM user_streaks WHERE user_id = ?',
        [userId],
        (err, row: { current_streak: number; best_streak: number; last_activity_date: string } | undefined) => {
            if (err) {
                console.error('Error reading streak:', err);
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }

            const todayDate = toDateOnly(today);
            let currentStreak = 1;
            let bestStreak = 1;

            if (row) {
                currentStreak = row.current_streak || 0;
                bestStreak = row.best_streak || 0;

                if (row.last_activity_date === today) {
                    // Already tracked today; no changes
                    db.close();
                    return res.json({ currentStreak, bestStreak, lastActivityDate: today });
                }

                if (row.last_activity_date) {
                    const lastDate = toDateOnly(row.last_activity_date);
                    const diffMs = todayDate.getTime() - lastDate.getTime();
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) {
                        currentStreak += 1;
                    } else if (diffDays > 1) {
                        currentStreak = 1;
                    } else if (diffDays < 0) {
                        // If server clock is behind, keep previous streak
                        currentStreak = row.current_streak || 1;
                    }
                } else {
                    currentStreak = 1;
                }

                bestStreak = Math.max(bestStreak, currentStreak);

                db.run(
                    'UPDATE user_streaks SET current_streak = ?, best_streak = ?, last_activity_date = ?, updated_at = datetime("now") WHERE user_id = ?',
                    [currentStreak, bestStreak, today, userId],
                    (updateErr) => {
                        db.close();
                        if (updateErr) {
                            console.error('Error updating streak:', updateErr);
                            return res.status(500).json({ error: 'Internal server error' });
                        }
                        return res.json({ currentStreak, bestStreak, lastActivityDate: today });
                    }
                );
            } else {
                // First time tracking streak for this user
                db.run(
                    'INSERT INTO user_streaks (user_id, current_streak, best_streak, last_activity_date, updated_at) VALUES (?, ?, ?, ?, datetime("now"))',
                    [userId, currentStreak, bestStreak, today],
                    (insertErr) => {
                        db.close();
                        if (insertErr) {
                            console.error('Error inserting streak:', insertErr);
                            return res.status(500).json({ error: 'Internal server error' });
                        }
                        return res.json({ currentStreak, bestStreak, lastActivityDate: today });
                    }
                );
            }
        }
    );
});

export default router;
