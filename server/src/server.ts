import express from "express";
import multer from "multer";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import real database
import db, { User, File, Summary } from "./database/database";

// Import routes
import materialsRouter from "./routes/materials";
import studySetsRouter from "./routes/studySets";
import aiRouter from "./routes/ai";
import chatHistoryRouter from "./routes/chatHistory";
import flashcardsRouter from "./routes/flashcards";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            objectSrc: ["'self'", "data:", "blob:"],
            frameSrc: ["'self'"],
            frameAncestors: ["'self'"],
            connectSrc: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    frameguard: false, // Disable X-Frame-Options
}));
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Use routes
app.use('/api/materials', materialsRouter);
app.use('/api/study-sets', studySetsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/chat-history', chatHistoryRouter);
app.use('/api/flashcards', flashcardsRouter);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Handle Vietnamese filenames properly
        const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, `${randomUUID()}-${fileName}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept PDF files
        if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const filesCount = 0; // db.getAllFiles().length;
    const summariesCount = 0; // db.getAllSummaries().length;
    const usersCount = 0; // db.getAllUsers().length;

    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        filesCount,
        summariesCount,
        usersCount
    });
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileRow: Omit<File, 'id' | 'created_at'> = {
            owner_id: req.header('x-user-id') || 'demo-user',
            name: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
            path: req.file.path,
            bytes: req.file.size,
            pages: 0
        };

        const file = db.createFile(fileRow);

        res.json({
            fileId: file.id,
            name: file.name,
            bytes: file.bytes,
            message: 'File uploaded successfully'
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// File serve endpoint
app.get('/api/file/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const file = db.getFileById(fileId);

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        const filePath = file.path;
        const fileName = file.name;

        // Set proper headers for PDF display
        const encodedFilename = encodeURIComponent(fileName);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodedFilename}`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // Stream the file
        const fileBuffer = await fs.readFile(filePath);
        res.send(fileBuffer);
    } catch (error: any) {
        console.error('File serve error:', error);
        res.status(500).json({ error: 'Failed to serve file' });
    }
});

// File delete endpoint
app.delete('/api/file/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const file = db.getFileById(fileId);

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Delete physical file
        try {
            await fs.unlink(file.path);
        } catch (unlinkError) {
            console.warn('Could not delete physical file:', unlinkError);
        }

        // Delete from database
        db.deleteFile(fileId);

        res.json({ message: 'File deleted successfully' });
    } catch (error: any) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// History endpoint
app.get('/api/history', (req, res) => {
    try {
        const userId = req.header('x-user-id') || 'demo-user';
        const files: any[] = []; // db.getFilesByOwner(userId);

        res.json(files);
    } catch (error: any) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
});

// Authentication endpoints
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = db.getUserByEmail(email);

        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// User management endpoints
app.post('/api/users', async (req, res) => {
    try {
        const { name, email, password, role, studentId, dateOfBirth, classId } = req.body;

        const user: Omit<User, 'id' | 'created_at' | 'updated_at'> = {
            name,
            email,
            password,
            role: role || 'student',
            student_id: studentId,
            date_of_birth: dateOfBirth,
            class_id: classId
        };

        const newUser = db.createUser(user);
        res.json(newUser);
    } catch (error: any) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.get('/api/users', (req, res) => {
    try {
        const users: any[] = []; // db.getAllUsers();
        res.json(users);
    } catch (error: any) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// Routes are already imported and registered above

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});