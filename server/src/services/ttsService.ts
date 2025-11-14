import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
const config = require('../../config.js');

export interface TTSOptions {
    language: 'en' | 'vi';
    script: string;
    uploadDir?: string;
}

export interface TTSResult {
    audioUrl: string;
    path: string;
    voice: string;
    provider: 'google';
}

// Cache access token để tránh gọi lại nhiều lần
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Lấy Google OAuth access token
 * Sử dụng JWT Bearer token flow với service account
 */
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

    // Đảm bảo private_key có format đúng
    let privateKey = sa.private_key;
    if (privateKey && typeof privateKey === 'string') {
        // Thay thế \\n thành \n (nếu có double escape)
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

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
        .sign(privateKey, 'base64')
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
        console.error('❌ Google OAuth Error Details:');
        console.error('   Status:', tokenResp.status);
        console.error('   Error:', tokenJson.error);
        console.error('   Error Description:', tokenJson.error_description);
        throw new Error(`Google OAuth failed: ${tokenJson.error}${tokenJson.error_description ? ` - ${tokenJson.error_description}` : ''}`);
    }

    // Cache token
    cachedToken = {
        token: tokenJson.access_token,
        expiresAt: Date.now() + (tokenJson.expires_in * 1000) - 60000 // Refresh 1 phút trước khi hết hạn
    };

    return tokenJson.access_token;
}

/**
 * Tạo audio từ text sử dụng Google TTS với Standard voices (rẻ nhất)
 * Standard voices: $4 per 1M characters (rẻ hơn Wavenet/Neural2)
 */
export async function generateTTS(options: TTSOptions): Promise<TTSResult> {
    const { language, script, uploadDir } = options;

    console.log('🔐 Attempting Google TTS with Standard voices (cheapest)...');
    console.log('   Language:', language);
    console.log('   Script length:', script.length, 'characters');

    const token = await getGoogleAccessToken();
    console.log('✅ Google OAuth successful');

    // Determine language and voices - Sử dụng Standard voices (rẻ nhất)
    let preferredVoices: string[];
    let languageCode: string;
    let xmlLang: string;
    let ssmlGender: string;
    let speakingRate: number;
    let prosodyPitchSt: number;

    if (language === 'en') {
        // English Standard voices (rẻ nhất)
        preferredVoices = [
            'en-US-Standard-A', // Female
            'en-US-Standard-C', // Female
            'en-US-Standard-B', // Male (fallback)
            'en-US-Standard-D'  // Male (fallback)
        ];
        languageCode = 'en-US';
        xmlLang = 'en-US';
        ssmlGender = 'FEMALE';
        speakingRate = 1.0;
        prosodyPitchSt = 0.0;
    } else {
        // Vietnamese Standard voices (rẻ nhất)
        preferredVoices = [
            'vi-VN-Standard-A', // Female
            'vi-VN-Standard-B', // Male (fallback)
            'vi-VN-Standard-C', // Female (fallback)
            'vi-VN-Standard-D'  // Female (fallback)
        ];
        languageCode = 'vi-VN';
        xmlLang = 'vi-VN';
        ssmlGender = 'FEMALE';
        speakingRate = 1.02;
        prosodyPitchSt = 0.3; // semitones
    }

    // Build SSML to preserve tones and add mild prosody
    const ssml = `<speak xml:lang="${xmlLang}"><prosody rate="${speakingRate}" pitch="${prosodyPitchSt}st">${script}</prosody></speak>`;

    // Resolve upload directory path
    const finalUploadDir = uploadDir || path.resolve(__dirname, '../../uploads');
    if (!fs.existsSync(finalUploadDir)) {
        fs.mkdirSync(finalUploadDir, { recursive: true });
    }

    let savedPath: string | null = null;
    let publicUrl: string | null = null;
    let voiceUsed: string | null = null;
    let lastError: string | null = null;

    // Thử các Standard voices
    for (const voiceName of preferredVoices) {
        try {
            console.log('🔈 Trying Google Standard voice:', voiceName);
            const resp = await fetch(
                'https://texttospeech.googleapis.com/v1/text:synthesize',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        input: { ssml },
                        voice: {
                            languageCode: languageCode,
                            name: voiceName,
                            ssmlGender: ssmlGender
                        },
                        audioConfig: {
                            audioEncoding: 'MP3',
                            speakingRate: speakingRate,
                            pitch: prosodyPitchSt,
                            // Không dùng effectsProfileId để tiết kiệm chi phí
                        }
                    })
                }
            );
            const json: any = await resp.json();
            if (!resp.ok || !json.audioContent) {
                const msg = json?.error?.message || 'No audio content';
                throw new Error(msg);
            }
            const filename = `audio-google-standard-${Date.now()}.mp3`;
            const absPath = path.join(finalUploadDir, filename);
            const buf = Buffer.from(json.audioContent, 'base64');
            fs.writeFileSync(absPath, buf);
            console.log('✅ Google TTS SUCCESS with Standard voice:', voiceName);
            console.log('   - File:', absPath);
            console.log('   - Size:', buf.length, 'bytes');
            savedPath = absPath;
            publicUrl = `http://localhost:3001/uploads/${filename}`;
            voiceUsed = voiceName;
            break;
        } catch (err: any) {
            lastError = err?.message || String(err);
            console.warn('   ↪︎ Voice try failed:', voiceName, '-', lastError);
            continue;
        }
    }

    // Fallback: Thử không chỉ định voice name, chỉ dùng languageCode
    if (!savedPath) {
        try {
            console.log(`🔈 Trying Google voice: languageCode only (${ssmlGender})`);
            const resp = await fetch(
                'https://texttospeech.googleapis.com/v1/text:synthesize',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        input: { ssml },
                        voice: {
                            languageCode: languageCode,
                            ssmlGender: ssmlGender
                        },
                        audioConfig: {
                            audioEncoding: 'MP3',
                            speakingRate: speakingRate,
                            pitch: prosodyPitchSt
                        }
                    })
                }
            );
            const json: any = await resp.json();
            if (resp.ok && json.audioContent) {
                const filename = `audio-google-standard-${Date.now()}.mp3`;
                const absPath = path.join(finalUploadDir, filename);
                const buf = Buffer.from(json.audioContent, 'base64');
                fs.writeFileSync(absPath, buf);
                console.log(`✅ Google TTS SUCCESS with languageCode-only ${ssmlGender}`);
                savedPath = absPath;
                publicUrl = `http://localhost:3001/uploads/${filename}`;
                voiceUsed = `${languageCode} (default ${ssmlGender})`;
            }
        } catch (err) {
            // ignore
        }
    }

    if (!savedPath || !publicUrl) {
        throw new Error(`Google TTS failed for all Standard voices. Last error: ${lastError}`);
    }

    return {
        audioUrl: publicUrl,
        path: savedPath,
        voice: voiceUsed || 'unknown',
        provider: 'google'
    };
}

