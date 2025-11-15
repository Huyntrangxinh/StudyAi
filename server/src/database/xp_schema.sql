-- User XP table - stores current XP, level, and bones
CREATE TABLE IF NOT EXISTS user_xp (
    user_id TEXT PRIMARY KEY,
    current_xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    bones INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- XP Transactions table - tracks all XP earned (for daily limits)
CREATE TABLE IF NOT EXISTS xp_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    activity_type TEXT NOT NULL, -- 'chat', 'test', 'game', etc.
    xp_amount INTEGER NOT NULL,
    transaction_date TEXT DEFAULT (date('now')), -- Store date only for daily tracking
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for efficient daily XP queries
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_date ON xp_transactions(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_activity ON xp_transactions(user_id, activity_type, transaction_date);

