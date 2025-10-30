# Database Management

## Database File
- **Location**: `/Users/tranthihuyentrang/Study1/server/database/app.db`
- **Type**: SQLite database
- **Size**: 48KB (current)

## Tables Structure

### 1. Users Table
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    student_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Files Table
```sql
CREATE TABLE files (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    pages INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 3. Summaries Table
```sql
CREATE TABLE summaries (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    bullets TEXT NOT NULL, -- JSON string
    structured TEXT NOT NULL, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);
```

## Management Scripts

### Database Manager
```bash
# Show database info
./scripts/db-manager.sh info

# Show all users
./scripts/db-manager.sh users

# Show all files
./scripts/db-manager.sh files

# Show all summaries
./scripts/db-manager.sh summaries

# Create backup
./scripts/db-manager.sh backup

# Restore from backup
./scripts/db-manager.sh restore <backup_file>

# Reset database (WARNING: deletes all data)
./scripts/db-manager.sh reset
```

### Backup Script
```bash
# Create timestamped backup
./scripts/backup-db.sh
```

## Default Data

### Admin User
- **Email**: `admin@ictu.edu.vn`
- **Password**: `admin123`
- **Role**: `admin`
- **Created**: Auto-created on first run

## Database Operations

### Direct SQLite Access
```bash
# Open database
sqlite3 database/app.db

# Show tables
.tables

# Show schema
.schema

# Query users
SELECT * FROM users;

# Query files
SELECT * FROM files;

# Query summaries
SELECT * FROM summaries;

# Exit
.quit
```

## Backup & Restore

### Automatic Backup
The system automatically creates backups in `/Users/tranthihuyentrang/Study1/server/database/backups/`

### Manual Backup
```bash
cp database/app.db database/backups/app_backup_$(date +%Y%m%d_%H%M%S).db
```

### Restore
```bash
cp database/backups/app_backup_YYYYMMDD_HHMMSS.db database/app.db
```

## File Locations

- **Database**: `/Users/tranthihuyentrang/Study1/server/database/app.db`
- **Uploads**: `/Users/tranthihuyentrang/Study1/server/uploads/`
- **Backups**: `/Users/tranthihuyentrang/Study1/server/database/backups/`
- **Scripts**: `/Users/tranthihuyentrang/Study1/server/scripts/`


