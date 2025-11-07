-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    student_id TEXT,
    date_of_birth TEXT,
    class_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Files table
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    pages INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Summaries table (1-1 relationship with files)
CREATE TABLE IF NOT EXISTS summaries (
    file_id TEXT PRIMARY KEY,
    bullets TEXT NOT NULL,     -- JSON string
    structured TEXT NOT NULL,  -- JSON string
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Study Sets table
CREATE TABLE IF NOT EXISTS study_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    color TEXT DEFAULT '#3b82f6',
    icon TEXT DEFAULT 'book',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Materials table
CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    study_set_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    file_path TEXT,
    file_size INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (study_set_id) REFERENCES study_sets(id) ON DELETE CASCADE
);

-- Chat Sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    study_set_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (study_set_id) REFERENCES study_sets(id) ON DELETE CASCADE
);

-- Chat Messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- Flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    study_set_id INTEGER NOT NULL,
    material_id INTEGER,
    type TEXT DEFAULT 'term_definition',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (study_set_id) REFERENCES study_sets(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);

-- Flashcard Sets table
CREATE TABLE IF NOT EXISTS flashcard_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    study_set_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (study_set_id) REFERENCES study_sets(id) ON DELETE CASCADE
);

-- Flashcard Set Flashcards junction table
CREATE TABLE IF NOT EXISTS flashcard_set_flashcards (
    flashcard_set_id INTEGER NOT NULL,
    flashcard_id INTEGER NOT NULL,
    position INTEGER DEFAULT 0,
    PRIMARY KEY (flashcard_set_id, flashcard_id),
    FOREIGN KEY (flashcard_set_id) REFERENCES flashcard_sets(id) ON DELETE CASCADE,
    FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE
);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    flashcard_id INTEGER NOT NULL,
    flashcard_set_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE,
    FOREIGN KEY (flashcard_set_id) REFERENCES flashcard_sets(id) ON DELETE CASCADE
);

-- Folders table
CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    parent_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);

-- Tests table
CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    study_set_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft', -- 'draft', 'in_progress', 'completed'
    time_limit INTEGER, -- in seconds
    material_ids TEXT, -- JSON array of material IDs used
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (study_set_id) REFERENCES study_sets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Test Questions table
CREATE TABLE IF NOT EXISTS test_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL,
    question_type TEXT NOT NULL, -- 'multipleChoice', 'shortAnswer', 'freeResponse', 'trueFalse', 'fillBlank'
    question TEXT NOT NULL,
    options TEXT, -- JSON array for multiple choice, null for other types
    correct_answer TEXT NOT NULL, -- JSON string for multiple choice (index), text for others
    explanation TEXT,
    position INTEGER DEFAULT 0, -- order in test
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);

-- Test Results table (to store user's test attempts)
CREATE TABLE IF NOT EXISTS test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    score REAL, -- percentage score
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    time_taken INTEGER, -- in seconds
    answers TEXT, -- JSON object: {questionId: answer}
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    study_set_id INTEGER,
    prompt TEXT NOT NULL,
    script TEXT, -- Generated script from AI
    transcript TEXT, -- Audio transcript (from TTS)
    highlights TEXT, -- JSON array of highlights: [{"id": "...", "start": 0, "end": 10}, ...]
    provider TEXT DEFAULT 'heygen', -- 'heygen', 'did', etc.
    job_id TEXT, -- Job ID from AI service
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    video_url TEXT,
    thumbnail_url TEXT,
    duration INTEGER, -- in seconds
    web_search_enabled INTEGER DEFAULT 0, -- BOOLEAN
    image_search_enabled INTEGER DEFAULT 0, -- BOOLEAN
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (study_set_id) REFERENCES study_sets(id) ON DELETE CASCADE
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    study_set_id INTEGER,
    game_type TEXT NOT NULL, -- 'match', 'city_run', 'rocket_defender', etc.
    title TEXT,
    topic TEXT NOT NULL,
    style TEXT, -- 'retro_80s', 'neon_cyberpunk', etc.
    content TEXT NOT NULL, -- JSON string chứa game data
    status TEXT DEFAULT 'active', -- 'active', 'archived'
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (study_set_id) REFERENCES study_sets(id) ON DELETE CASCADE
);

-- Game Sessions table (để track progress/score)
CREATE TABLE IF NOT EXISTS game_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT 0,
    time_spent INTEGER, -- seconds
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_files_owner ON files(owner_id);
CREATE INDEX IF NOT EXISTS idx_summaries_file ON summaries(file_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_study_sets_user ON study_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_study_set ON materials(study_set_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_study_set ON chat_sessions(study_set_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_study_set ON flashcards(study_set_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_type ON flashcards(type);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_flashcard ON bookmarks(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_tests_study_set ON tests(study_set_id);
CREATE INDEX IF NOT EXISTS idx_tests_user ON tests(user_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_test ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test ON test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_test_results_user ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_user ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_study_set ON videos(study_set_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_games_user ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_study_set ON games(study_set_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game ON game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id);
