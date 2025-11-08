import express from 'express';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
const config = require('../../config.js');

const router = express.Router();

// Cache access token để tránh gọi lại nhiều lần
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getGoogleAccessToken(): Promise<string> {
    // Kiểm tra cache token
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
        return cachedToken.token;
    }

    const gsaPath = config.GOOGLE_TTS_CREDENTIALS_PATH;
    if (!gsaPath || !fs.existsSync(gsaPath)) {
        throw new Error('Google TTS credentials not found');
    }

    const raw = fs.readFileSync(gsaPath, 'utf8');
    const sa = JSON.parse(raw);
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claim = {
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
    };

    const base64url = (obj: any) =>
        Buffer.from(JSON.stringify(obj))
            .toString('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');

    const unsigned = base64url(header) + '.' + base64url(claim);
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(unsigned);
    const signature = sign
        .sign(sa.private_key, 'base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const assertion = unsigned + '.' + signature;

    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion
        }).toString()
    });

    const tokenJson: any = await tokenResp.json();
    if (!tokenResp.ok) {
        throw new Error(tokenJson?.error || 'OAuth failed');
    }

    // Cache token
    cachedToken = {
        token: tokenJson.access_token,
        expiresAt: Date.now() + (tokenJson.expires_in * 1000) - 60000 // Refresh 1 phút trước khi hết hạn
    };

    return tokenJson.access_token;
}

// Gemini-TTS endpoint
router.post('/synthesize', async (req, res) => {
    try {
        const { text, language = 'en-US', voiceName, model = 'gemini-2.5-flash-tts' } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Text is required' });
        }

        console.log('🔊 [TTS API] Synthesizing text:', text.substring(0, 50));

        const token = await getGoogleAccessToken();

        // Chọn voice dựa trên language
        let voice: { languageCode: string; name: string; modelName: string };

        if (language.startsWith('vi')) {
            // Vietnamese voices
            voice = {
                languageCode: 'vi-VN',
                name: voiceName || 'vi-VN-Wavenet-A',
                modelName: model
            };
        } else {
            // English voices - sử dụng Gemini-TTS voices
            voice = {
                languageCode: 'en-US',
                name: voiceName || 'Kore', // Gemini-TTS voice
                modelName: model
            };
        }

        // Tạo request body cho Gemini-TTS
        // Theo tài liệu: https://docs.cloud.google.com/text-to-speech/docs/gemini-tts
        // Format: { input: { prompt: "...", text: "..." }, voice: { languageCode, name, modelName }, audioConfig: {...} }
        const requestBody: any = {
            voice: voice,
            audioConfig: {
                audioEncoding: 'MP3',
                sampleRateHertz: 24000
            }
        };

        // Gemini-TTS yêu cầu cả prompt và text trong input
        if (model.includes('gemini')) {
            requestBody.input = {
                prompt: 'Say the following naturally and clearly',
                text: text
            };
        } else {
            // Standard TTS chỉ cần text
            requestBody.input = {
                text: text
            };
        }

        const resp = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const json: any = await resp.json();

        if (!resp.ok) {
            console.error('❌ [TTS API] Google TTS error:', json);
            return res.status(resp.status).json({
                error: json.error?.message || 'TTS synthesis failed',
                details: json
            });
        }

        if (!json.audioContent) {
            return res.status(500).json({ error: 'No audio content returned' });
        }

        console.log('✅ [TTS API] TTS synthesis successful');

        // Trả về audio dưới dạng base64
        res.json({
            audioContent: json.audioContent,
            audioEncoding: 'MP3'
        });

    } catch (error: any) {
        console.error('❌ [TTS API] Error:', error);
        res.status(500).json({
            error: 'TTS synthesis failed',
            message: error.message
        });
    }
});

export default router;

