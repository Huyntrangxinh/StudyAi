import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database interface
export interface User {
    id: string;
    email: string;
    password: string;
    name: string;
    role: 'admin' | 'teacher' | 'student';
    student_id?: string;
    date_of_birth?: string;
    class_id?: string;
    created_at: string;
    updated_at: string;
}

export interface File {
    id: string;
    owner_id: string;
    name: string;
    path: string;
    bytes: number;
    pages: number;
    created_at: string;
}

export interface Summary {
    file_id: string;
    bullets: string; // JSON string
    structured: string; // JSON string
    created_at: string;
}

class DatabaseService {
    private db: Database.Database;

    constructor() {
        // Ensure database directory exists
        const dbDir = path.join(process.cwd(), 'database');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // Initialize database
        const dbPath = path.join(dbDir, 'app.db');
        this.db = new Database(dbPath);

        // Enable foreign keys
        this.db.pragma('foreign_keys = ON');

        // Initialize schema
        this.initializeSchema();

        // Create default admin user if not exists
        this.createDefaultAdmin();
    }

    private initializeSchema() {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split by semicolon and execute each statement
        const statements = schema.split(';').filter(stmt => stmt.trim());
        for (const statement of statements) {
            if (statement.trim()) {
                this.db.exec(statement);
            }
        }
    }

    private createDefaultAdmin() {
        const adminExists = this.db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
        if (!adminExists) {
            const adminId = 'admin-' + Date.now();
            this.db.prepare(`
                INSERT INTO users (id, email, password, name, role)
                VALUES (?, ?, ?, ?, ?)
            `).run(adminId, 'admin@ictu.edu.vn', 'admin123', 'Administrator', 'admin');

            console.log('✅ Default admin user created: admin@ictu.edu.vn / admin123');
        }
    }

    // User methods
    createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): User {
        const id = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const now = new Date().toISOString();

        this.db.prepare(`
            INSERT INTO users (id, email, password, name, role, student_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, user.email, user.password, user.name, user.role, user.student_id || null, now, now);

        return this.getUserById(id)!;
    }

    getUserByEmail(email: string): User | null {
        return this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | null;
    }

    getUserById(id: string): User | null {
        return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | null;
    }

    getAllUsers(): User[] {
        return this.db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as User[];
    }

    updateUser(id: string, updates: Partial<Omit<User, 'id' | 'created_at'>>): User | null {
        const fields = [];
        const values = [];

        if (updates.email) { fields.push('email = ?'); values.push(updates.email); }
        if (updates.password) { fields.push('password = ?'); values.push(updates.password); }
        if (updates.name) { fields.push('name = ?'); values.push(updates.name); }
        if (updates.role) { fields.push('role = ?'); values.push(updates.role); }
        if (updates.student_id !== undefined) { fields.push('student_id = ?'); values.push(updates.student_id); }

        if (fields.length === 0) return this.getUserById(id);

        fields.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);

        this.db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        return this.getUserById(id);
    }

    deleteUser(id: string): boolean {
        const result = this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
        return result.changes > 0;
    }

    // File methods
    createFile(file: Omit<File, 'id' | 'created_at'>): File {
        const id = 'file-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const now = new Date().toISOString();

        this.db.prepare(`
            INSERT INTO files (id, owner_id, name, path, bytes, pages, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, file.owner_id, file.name, file.path, file.bytes, file.pages, now);

        return this.getFileById(id)!;
    }

    getFileById(id: string): File | null {
        return this.db.prepare('SELECT * FROM files WHERE id = ?').get(id) as File | null;
    }

    getFilesByOwner(ownerId: string): File[] {
        return this.db.prepare('SELECT * FROM files WHERE owner_id = ? ORDER BY created_at DESC').all(ownerId) as File[];
    }

    updateFile(id: string, updates: Partial<Omit<File, 'id' | 'created_at'>>): File | null {
        const fields = [];
        const values = [];

        if (updates.name) { fields.push('name = ?'); values.push(updates.name); }
        if (updates.path) { fields.push('path = ?'); values.push(updates.path); }
        if (updates.bytes !== undefined) { fields.push('bytes = ?'); values.push(updates.bytes); }
        if (updates.pages !== undefined) { fields.push('pages = ?'); values.push(updates.pages); }

        if (fields.length === 0) return this.getFileById(id);

        values.push(id);

        this.db.prepare(`UPDATE files SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        return this.getFileById(id);
    }

    deleteFile(id: string): boolean {
        const result = this.db.prepare('DELETE FROM files WHERE id = ?').run(id);
        return result.changes > 0;
    }

    // Summary methods
    createSummary(summary: Omit<Summary, 'created_at'>): Summary {
        const now = new Date().toISOString();

        this.db.prepare(`
            INSERT INTO summaries (file_id, bullets, structured, created_at)
            VALUES (?, ?, ?, ?)
        `).run(summary.file_id, summary.bullets, summary.structured, now);

        return this.getSummaryByFileId(summary.file_id)!;
    }

    getSummaryByFileId(fileId: string): Summary | null {
        return this.db.prepare('SELECT * FROM summaries WHERE file_id = ?').get(fileId) as Summary | null;
    }

    updateSummary(fileId: string, summary: Omit<Summary, 'id' | 'file_id' | 'created_at'>): Summary {
        const now = new Date().toISOString();

        this.db.prepare(`
            UPDATE summaries 
            SET bullets = ?, structured = ?, created_at = ?
            WHERE file_id = ?
        `).run(summary.bullets, summary.structured, now, fileId);

        return this.getSummaryByFileId(fileId)!;
    }

    createOrUpdateSummary(summary: Omit<Summary, 'id' | 'created_at'>): Summary {
        const existing = this.getSummaryByFileId(summary.file_id);
        if (existing) {
            return this.updateSummary(summary.file_id, summary);
        } else {
            return this.createSummary(summary);
        }
    }

    deleteSummary(fileId: string): boolean {
        const result = this.db.prepare('DELETE FROM summaries WHERE file_id = ?').run(fileId);
        return result.changes > 0;
    }

    // Utility methods
    getStats() {
        const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
        const fileCount = this.db.prepare('SELECT COUNT(*) as count FROM files').get() as { count: number };
        const summaryCount = this.db.prepare('SELECT COUNT(*) as count FROM summaries').get() as { count: number };

        return {
            users: userCount.count,
            files: fileCount.count,
            summaries: summaryCount.count
        };
    }

    close() {
        this.db.close();
    }
}

// Export singleton instance
export const db = new DatabaseService();
export default db;
