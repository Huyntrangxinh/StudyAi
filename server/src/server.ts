import express from "express";
import multer from "multer";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import { randomUUID, randomInt } from "crypto";
import fs from "fs/promises";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import nodemailer from "nodemailer";

// Load environment variables
dotenv.config();

// Import real database
import db, { User, File, Summary } from "./database/database";

// Import routes
import materialsRouter from "./routes/materials";
import studySetsRouter from "./routes/studySets";
import flashcardSetsRouter from "./routes/flashcardSets";
import foldersRouter from "./routes/folders";
import aiRouter from "./routes/ai";
import aiStudyFlashcardRouter from "./routes/aiStudyFlashcard";
import chatHistoryRouter from "./routes/chatHistory";
import flashcardsRouter from "./routes/flashcards";
import testsRouter from "./routes/tests";
// Import videos router for GET endpoint (slideshow videos)
import videosRouter from "./routes/videos";
import audioRouter from "./routes/audio";
import slideshowRouter from "./routes/slideshow";
import gamesRouter from "./routes/games";
import ttsRouter from "./routes/tts";
import studyPathsRouter from "./routes/studyPaths";
import streakRouter from "./routes/streaks";

const app = express();
const PORT = process.env.PORT || 3001;

// Google OAuth Client
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '32402427703-636ai8dcanhb6ltnf4n2vktcbvrcflsi.apps.googleusercontent.com';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Email transporter configuration
const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Log SMTP configuration (without password)
console.log('SMTP Configuration:', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    hasPassword: !!process.env.SMTP_PASS,
    passwordLength: process.env.SMTP_PASS?.length || 0
});

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
app.use('/api/tests', testsRouter);
app.use('/api/flashcard-sets', flashcardSetsRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/ai', aiRouter);
app.use('/api/ai', aiStudyFlashcardRouter);
app.use('/api/chat-history', chatHistoryRouter);
app.use('/api/flashcards', flashcardsRouter);
// Enable videos router for GET endpoint (to fetch slideshow videos from database)
app.use('/api/videos', videosRouter);
app.use('/api/audio', audioRouter);
app.use('/api/explainers', slideshowRouter);
app.use('/api/games', gamesRouter);
app.use('/api/tts', ttsRouter);
app.use('/api/study-paths', studyPathsRouter);
app.use('/api/streaks', streakRouter);

// Ensure uploads directory exists
// Align with routes that write to server/uploads (from server/src/routes -> ../../uploads resolves to server/uploads)
const uploadsDir = path.join(__dirname, '../uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Serve static uploads (audio/video/images)
app.use('/uploads', express.static(uploadsDir));

// Debug endpoint to list uploaded files (for troubleshooting 404)
app.get('/api/uploads/list', async (req, res) => {
    try {
        const files = await fs.readdir(uploadsDir);
        res.json({ uploadsDir, files });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

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

// Google OAuth login endpoint
app.post('/api/auth/google', async (req, res) => {
    try {
        const { credential } = req.body; // Google ID token từ frontend

        if (!credential) {
            return res.status(400).json({ error: 'Missing credential' });
        }

        // Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const { email, name, sub: googleId, picture } = payload;

        if (!email) {
            return res.status(400).json({ error: 'Email not provided by Google' });
        }

        // Tìm user theo email
        let user = db.getUserByEmail(email);

        if (!user) {
            // Tạo user mới nếu chưa tồn tại
            const newUser: Omit<User, 'id' | 'created_at' | 'updated_at'> = {
                email: email,
                password: '', // Không cần password cho Google login
                name: name || 'Google User',
                role: 'student',
            };
            user = db.createUser(newUser);
        }

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                created_at: user.created_at
            }
        });
    } catch (error: any) {
        console.error('Google login error:', error);
        res.status(500).json({ error: 'Google login failed', details: error.message });
    }
});

// Send verification code endpoint
app.post('/api/auth/send-verification-code', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Check if email already exists
        const existingUser = db.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Generate 6-digit code
        const code = randomInt(100000, 999999).toString();

        // Save code to database (expires in 10 minutes)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        db.saveVerificationCode(email, code, expiresAt);

        // Send email
        try {
            // Verify transporter configuration
            if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
                console.error('SMTP configuration missing:', {
                    hasUser: !!process.env.SMTP_USER,
                    hasPass: !!process.env.SMTP_PASS
                });
                return res.status(500).json({
                    error: 'Cấu hình SMTP chưa đầy đủ. Vui lòng kiểm tra file .env'
                });
            }

            const mailOptions = {
                from: process.env.SMTP_USER,
                to: email,
                subject: 'Mã xác thực đăng ký StudyFetch',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #423070;">Mã xác thực của bạn</h2>
                        <p>Xin chào,</p>
                        <p>Cảm ơn bạn đã đăng ký tài khoản StudyFetch. Mã xác thực của bạn là:</p>
                        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                            <h1 style="color: #423070; font-size: 32px; margin: 0; letter-spacing: 5px;">${code}</h1>
                        </div>
                        <p>Mã này có hiệu lực trong <strong>10 phút</strong>.</p>
                        <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
                        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Trân trọng,<br>Đội ngũ StudyFetch</p>
                    </div>
                `,
            };

            const info = await emailTransporter.sendMail(mailOptions);
            console.log('Email sent successfully:', info.messageId);

            res.json({
                success: true,
                message: 'Mã xác thực đã được gửi đến email của bạn'
            });
        } catch (emailError: any) {
            console.error('Email send error details:', {
                message: emailError.message,
                code: emailError.code,
                command: emailError.command,
                response: emailError.response,
                responseCode: emailError.responseCode
            });

            let errorMessage = 'Không thể gửi email. ';
            if (emailError.code === 'EAUTH') {
                errorMessage += 'Lỗi xác thực: Kiểm tra lại App Password.';
            } else if (emailError.code === 'ECONNECTION') {
                errorMessage += 'Không thể kết nối đến SMTP server.';
            } else if (emailError.response) {
                errorMessage += `Lỗi: ${emailError.response}`;
            } else {
                errorMessage += `Chi tiết: ${emailError.message}`;
            }

            res.status(500).json({ error: errorMessage });
        }
    } catch (error: any) {
        console.error('Send verification code error:', error);
        res.status(500).json({ error: 'Không thể gửi mã xác thực' });
    }
});

// Send reset password code endpoint
app.post('/api/auth/send-reset-code', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email là bắt buộc' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Email không hợp lệ' });
        }

        // Check if email exists
        const existingUser = db.getUserByEmail(email);
        if (!existingUser) {
            return res.status(404).json({ error: 'Email không tồn tại trong hệ thống' });
        }

        // Generate 6-digit code
        const code = randomInt(100000, 999999).toString();

        // Save code to database (expires in 10 minutes)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        db.saveVerificationCode(email, code, expiresAt);

        // Send email
        try {
            // Verify transporter configuration
            if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
                console.error('SMTP configuration missing:', {
                    hasUser: !!process.env.SMTP_USER,
                    hasPass: !!process.env.SMTP_PASS
                });
                return res.status(500).json({
                    error: 'Cấu hình SMTP chưa đầy đủ. Vui lòng kiểm tra file .env'
                });
            }

            const mailOptions = {
                from: process.env.SMTP_USER,
                to: email,
                subject: 'Mã đặt lại mật khẩu StudyFetch',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #423070;">Đặt lại mật khẩu</h2>
                        <p>Xin chào,</p>
                        <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản StudyFetch. Mã đặt lại mật khẩu của bạn là:</p>
                        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                            <h1 style="color: #423070; font-size: 32px; margin: 0; letter-spacing: 5px;">${code}</h1>
                        </div>
                        <p>Mã này có hiệu lực trong <strong>10 phút</strong>.</p>
                        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và đảm bảo tài khoản của bạn được bảo mật.</p>
                        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Trân trọng,<br>Đội ngũ StudyFetch</p>
                    </div>
                `,
            };

            const info = await emailTransporter.sendMail(mailOptions);
            console.log('Reset password email sent successfully:', info.messageId);

            res.json({
                success: true,
                message: 'Mã đặt lại mật khẩu đã được gửi đến email của bạn'
            });
        } catch (emailError: any) {
            console.error('Email send error details:', {
                message: emailError.message,
                code: emailError.code,
                command: emailError.command,
                response: emailError.response,
                responseCode: emailError.responseCode
            });

            let errorMessage = 'Không thể gửi email. ';
            if (emailError.code === 'EAUTH') {
                errorMessage += 'Lỗi xác thực: Kiểm tra lại App Password.';
            } else if (emailError.code === 'ECONNECTION') {
                errorMessage += 'Không thể kết nối đến SMTP server.';
            } else if (emailError.response) {
                errorMessage += `Lỗi: ${emailError.response}`;
            } else {
                errorMessage += `Chi tiết: ${emailError.message}`;
            }

            res.status(500).json({ error: errorMessage });
        }
    } catch (error: any) {
        console.error('Send reset code error:', error);
        res.status(500).json({ error: 'Không thể gửi mã đặt lại mật khẩu' });
    }
});

// Verify reset password code endpoint
app.post('/api/auth/verify-reset-code', async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ error: 'Email và mã code là bắt buộc' });
        }

        // Verify code
        const isValid = db.verifyCode(email, code);

        if (!isValid) {
            return res.status(400).json({ error: 'Mã code không đúng hoặc đã hết hạn' });
        }

        res.json({
            success: true,
            message: 'Mã code hợp lệ'
        });
    } catch (error: any) {
        console.error('Verify reset code error:', error);
        res.status(500).json({ error: 'Xác thực mã code thất bại' });
    }
});

// Reset password endpoint
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
        }

        // Check if user exists
        const user = db.getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ error: 'Email không tồn tại trong hệ thống' });
        }

        // Update password
        db.updateUser(user.id, { password: password });

        res.json({
            success: true,
            message: 'Đặt lại mật khẩu thành công'
        });
    } catch (error: any) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Không thể đặt lại mật khẩu' });
    }
});

// Verify code and create account endpoint
app.post('/api/auth/verify-code', async (req, res) => {
    try {
        const { email, code, name, password } = req.body;

        if (!email || !code) {
            return res.status(400).json({ error: 'Email và mã code là bắt buộc' });
        }

        if (!name || !password) {
            return res.status(400).json({ error: 'Tên và mật khẩu là bắt buộc' });
        }

        // Verify code
        const isValid = db.verifyCode(email, code);

        if (!isValid) {
            return res.status(400).json({ error: 'Mã code không đúng hoặc đã hết hạn' });
        }

        // Check if user already exists
        const existingUser = db.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email đã được đăng ký' });
        }

        // Create new user
        const newUser: Omit<User, 'id' | 'created_at' | 'updated_at'> = {
            email: email,
            password: password,
            name: name,
            role: 'student',
        };

        const user = db.createUser(newUser);

        res.json({
            success: true,
            message: 'Đăng ký thành công',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                created_at: user.created_at
            }
        });
    } catch (error: any) {
        console.error('Verify code error:', error);
        res.status(500).json({ error: 'Xác thực thất bại' });
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