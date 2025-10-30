import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';

const router = express.Router();

// Get all chat sessions for a study set
router.get('/sessions/:studySetId', async (req, res) => {
    try {
        const { studySetId } = req.params;
        const dbPath = path.join(__dirname, '../../database/app.db');

        const db = new sqlite3.Database(dbPath);

        db.all(
            `SELECT 
        cs.id,
        cs.title,
        cs.created_at,
        cs.updated_at,
        COUNT(cm.id) as message_count
      FROM chat_sessions cs
      LEFT JOIN chat_messages cm ON cs.id = cm.session_id
      WHERE cs.study_set_id = ?
      GROUP BY cs.id
      ORDER BY cs.updated_at DESC`,
            [studySetId],
            (err, rows) => {
                db.close();
                if (err) {
                    console.error('Error fetching chat sessions:', err);
                    return res.status(500).json({ error: 'Failed to fetch chat sessions' });
                }
                res.json(rows || []);
            }
        );
    } catch (error) {
        console.error('Chat sessions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get messages for a specific chat session
router.get('/messages/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const dbPath = path.join(__dirname, '../../database/app.db');

        const db = new sqlite3.Database(dbPath);

        db.all(
            `SELECT id, role, content, created_at
       FROM chat_messages
       WHERE session_id = ?
       ORDER BY created_at ASC`,
            [sessionId],
            (err, rows) => {
                db.close();
                if (err) {
                    console.error('Error fetching chat messages:', err);
                    return res.status(500).json({ error: 'Failed to fetch chat messages' });
                }
                res.json(rows || []);
            }
        );
    } catch (error) {
        console.error('Chat messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new chat session
router.post('/sessions', async (req, res) => {
    try {
        const { studySetId, title } = req.body;

        if (!studySetId || !title) {
            return res.status(400).json({ error: 'studySetId and title are required' });
        }

        const dbPath = path.join(__dirname, '../../database/app.db');
        const db = new sqlite3.Database(dbPath);

        db.run(
            `INSERT INTO chat_sessions (study_set_id, title, created_at, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [studySetId, title],
            function (err) {
                if (err) {
                    console.error('Error creating chat session:', err);
                    db.close();
                    return res.status(500).json({ error: 'Failed to create chat session' });
                }

                const sessionId = this.lastID;
                db.close();
                res.json({
                    id: sessionId,
                    studySetId,
                    title,
                    messageCount: 0
                });
            }
        );
    } catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add a message to a chat session
router.post('/messages', async (req, res) => {
    try {
        const { sessionId, role, content } = req.body;

        if (!sessionId || !role || !content) {
            return res.status(400).json({ error: 'sessionId, role, and content are required' });
        }

        if (!['user', 'assistant'].includes(role)) {
            return res.status(400).json({ error: 'role must be either "user" or "assistant"' });
        }

        const dbPath = path.join(__dirname, '../../database/app.db');
        const db = new sqlite3.Database(dbPath);

        // Add the message
        db.run(
            `INSERT INTO chat_messages (session_id, role, content, created_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
            [sessionId, role, content],
            function (err) {
                if (err) {
                    console.error('Error adding message:', err);
                    db.close();
                    return res.status(500).json({ error: 'Failed to add message' });
                }

                // Update the session's updated_at timestamp
                db.run(
                    `UPDATE chat_sessions 
           SET updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
                    [sessionId],
                    (updateErr) => {
                        db.close();
                        if (updateErr) {
                            console.error('Error updating session timestamp:', updateErr);
                        }
                        res.json({
                            id: this.lastID,
                            sessionId,
                            role,
                            content
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error('Add message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update chat session title
router.put('/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { title } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'title is required' });
        }

        const dbPath = path.join(__dirname, '../../database/app.db');
        const db = new sqlite3.Database(dbPath);

        db.run(
            `UPDATE chat_sessions 
       SET title = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
            [title, sessionId],
            function (err) {
                db.close();
                if (err) {
                    console.error('Error updating session title:', err);
                    return res.status(500).json({ error: 'Failed to update session title' });
                }

                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Session not found' });
                }

                res.json({ success: true });
            }
        );
    } catch (error) {
        console.error('Update session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a chat session
router.delete('/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const dbPath = path.join(__dirname, '../../database/app.db');
        const db = new sqlite3.Database(dbPath);

        // Delete all messages first (due to foreign key constraint)
        db.run(
            `DELETE FROM chat_messages WHERE session_id = ?`,
            [sessionId],
            function (err) {
                if (err) {
                    console.error('Error deleting messages:', err);
                    db.close();
                    return res.status(500).json({ error: 'Failed to delete messages' });
                }

                // Delete the session
                db.run(
                    `DELETE FROM chat_sessions WHERE id = ?`,
                    [sessionId],
                    function (deleteErr) {
                        db.close();
                        if (deleteErr) {
                            console.error('Error deleting session:', deleteErr);
                            return res.status(500).json({ error: 'Failed to delete session' });
                        }

                        if (this.changes === 0) {
                            return res.status(404).json({ error: 'Session not found' });
                        }

                        res.json({ success: true });
                    }
                );
            }
        );
    } catch (error) {
        console.error('Delete session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
