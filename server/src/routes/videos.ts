import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
const config = require('../../config');

const router = express.Router();
const dbPath = path.join(__dirname, '../../database/app.db');
const db = new Database(dbPath);

// POST /api/videos/generate - DISABLED (HeyGen removed, use /api/explainers/slideshow instead)
// This endpoint is kept for backward compatibility but returns an error
router.post('/generate', async (req, res) => {
    return res.status(410).json({
        error: 'This endpoint is no longer available',
        message: 'HeyGen integration has been removed. Please use /api/explainers/slideshow instead.'
    });
});

// GET /api/videos/:id/status - Check video generation status
router.get('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('=== Status check requested for video id:', id);

        const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(id) as any;

        if (!video) {
            console.log('Video not found in database');
            return res.status(404).json({ error: 'Video not found' });
        }

        console.log('Video from database:', {
            id: video.id,
            status: video.status,
            job_id: video.job_id,
            prompt: video.prompt
        });

        // HeyGen status checking removed - videos are now generated via /api/explainers/slideshow
        // Old HeyGen videos will remain in their current status

        // Get updated video data
        const updatedVideo = db.prepare('SELECT * FROM videos WHERE id = ?').get(id) as any;

        if (!updatedVideo) {
            return res.status(404).json({ error: 'Video not found' });
        }

        console.log('Returning video status:', {
            id: updatedVideo.id,
            status: updatedVideo.status,
            video_url: updatedVideo.video_url
        });

        res.json({
            id: updatedVideo.id,
            status: updatedVideo.status,
            videoUrl: updatedVideo.video_url,
            thumbnailUrl: updatedVideo.thumbnail_url,
            duration: updatedVideo.duration,
            prompt: updatedVideo.prompt,
            script: updatedVideo.script,
            createdAt: updatedVideo.created_at
        });

    } catch (error: any) {
        console.error('Error checking video status:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// GET /api/videos - Get user's videos
router.get('/', async (req, res) => {
    try {
        const { userId, studySetId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        let query = 'SELECT * FROM videos WHERE user_id = ?';
        const params: any[] = [userId];

        if (studySetId) {
            query += ' AND study_set_id = ?';
            params.push(studySetId);
        }

        query += ' ORDER BY created_at DESC';

        const videos = db.prepare(query).all(...params);

        res.json(videos);

    } catch (error: any) {
        console.error('Error fetching videos:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// POST /api/videos/:id/refresh - DISABLED (HeyGen removed)
router.post('/:id/refresh', async (req, res) => {
    return res.status(410).json({
        error: 'This endpoint is no longer available',
        message: 'HeyGen integration has been removed. Video status is now managed automatically.'
    });
});

// DELETE /api/videos/:id - Delete a video
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // Check if video exists and belongs to user
        const video = db.prepare('SELECT * FROM videos WHERE id = ? AND user_id = ?').get(id, userId) as any;

        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        db.prepare('DELETE FROM videos WHERE id = ?').run(id);

        res.status(204).send();

    } catch (error: any) {
        console.error('Error deleting video:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// PUT /api/videos/:id/title - Update video title
router.put('/:id/title', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, title } = req.body || {};

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const video = db.prepare('SELECT * FROM videos WHERE id = ? AND user_id = ?').get(id, userId) as any;
        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        db.prepare('UPDATE videos SET video_title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run((title || '').trim(), id);
        const updated = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
        res.json({ success: true, video: updated });
    } catch (error: any) {
        console.error('Error updating video title:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// PUT /api/videos/:id - Update video details (including transcript)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { transcript } = req.body || {};

        const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(id) as any;
        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        if (transcript !== undefined) {
            db.prepare('UPDATE videos SET transcript = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(transcript, id);
        }

        const updated = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
        res.json({ success: true, video: updated });
    } catch (error: any) {
        console.error('Error updating video:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// GET /api/videos/:id - Get video details (including transcript and highlights)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(id) as any;

        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        // Parse highlights JSON if exists (format: { transcript: [...], outline: [...] })
        let highlights: any = {};
        if (video.highlights) {
            try {
                const parsed = JSON.parse(video.highlights);
                // Nếu là object với transcript/outline keys thì dùng luôn
                if (typeof parsed === 'object' && !Array.isArray(parsed)) {
                    highlights = parsed;
                    console.log(`Loaded highlights for video ${id}:`, {
                        transcript: highlights.transcript?.length || 0,
                        outline: highlights.outline?.length || 0
                    });
                } else {
                    // Fallback: nếu là array cũ, convert sang format mới
                    highlights = { transcript: Array.isArray(parsed) ? parsed : [], outline: [] };
                    console.log(`Converted old highlights format for video ${id}:`, highlights.transcript.length, 'items');
                }
            } catch (e) {
                console.error(`Failed to parse highlights for video ${id}:`, e);
                highlights = {};
            }
        } else {
            console.log(`No highlights found for video ${id}`);
        }

        res.json({
            id: video.id,
            user_id: video.user_id,
            prompt: video.prompt,
            script: video.script,
            transcript: video.transcript || null,
            highlights: highlights,
            status: video.status,
            video_url: video.video_url,
            thumbnail_url: video.thumbnail_url,
            duration: video.duration,
            video_title: video.video_title,
            language: video.language,
            created_at: video.created_at
        });
    } catch (error: any) {
        console.error('Error fetching video details:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// PUT /api/videos/:id/highlights - Save highlights for a video
router.put('/:id/highlights', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, highlights, type } = req.body || {}; // type: 'transcript' or 'outline'

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const video = db.prepare('SELECT * FROM videos WHERE id = ? AND user_id = ?').get(id, userId) as any;
        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        // Lưu highlights theo type (transcript hoặc outline)
        // Nếu highlights đã có, merge với highlights mới
        let existingHighlights: any = {};
        if (video.highlights) {
            try {
                existingHighlights = JSON.parse(video.highlights);
            } catch {
                existingHighlights = {};
            }
        }

        // Update highlights cho type cụ thể
        if (type === 'transcript' || type === 'outline') {
            existingHighlights[type] = highlights || [];
            console.log(`Saving ${type} highlights for video ${id}:`, (highlights || []).length, 'items');
        } else {
            // Default to transcript if type not specified
            existingHighlights['transcript'] = highlights || [];
            console.log(`Saving transcript highlights (default) for video ${id}:`, (highlights || []).length, 'items');
        }

        const highlightsJson = JSON.stringify(existingHighlights);
        db.prepare('UPDATE videos SET highlights = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(highlightsJson, id);

        console.log('Highlights saved successfully for video', id, ':', JSON.stringify(existingHighlights).substring(0, 100));

        res.json({ success: true, highlights: existingHighlights });
    } catch (error: any) {
        console.error('Error saving highlights:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

export default router;

