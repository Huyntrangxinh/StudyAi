import fs from 'fs';
import path from 'path';
const config = require('../../config.js');

export interface OpenAITTSOptions {
    text: string;
    voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
    model?: string;
    uploadDir?: string;
}

export interface OpenAITTSResult {
    audioUrl: string;
    path: string;
    voice: string;
    provider: 'openai';
}

/**
 * Generate audio from text using OpenAI TTS API
 * Model: gpt-4o-mini-tts (cheapest option)
 * Voices: alloy, echo, fable, onyx, nova, shimmer
 */
export async function generateOpenAITTS(options: OpenAITTSOptions): Promise<OpenAITTSResult> {
    const { text, voice = 'alloy', model = 'gpt-4o-mini-tts', uploadDir } = options;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('Text is required and cannot be empty');
    }

    const apiKey = config.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('🔊 [OpenAI TTS] Generating speech...');
    console.log('   Model:', model);
    console.log('   Voice:', voice);
    console.log('   Text length:', text.length, 'characters');

    try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                input: text,
                voice: voice
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('❌ [OpenAI TTS] API Error:', errorData);
            throw new Error(`OpenAI TTS failed: ${errorData.error?.message || response.statusText}`);
        }

        // OpenAI TTS returns audio directly as binary data
        const audioBuffer = await response.arrayBuffer();
        if (!audioBuffer || audioBuffer.byteLength === 0) {
            throw new Error('OpenAI TTS returned empty audio');
        }

        // Resolve upload directory path
        const finalUploadDir = uploadDir || path.resolve(__dirname, '../../uploads');
        if (!fs.existsSync(finalUploadDir)) {
            fs.mkdirSync(finalUploadDir, { recursive: true });
        }

        // Save audio file
        const filename = `audio-openai-${Date.now()}.mp3`;
        const absPath = path.join(finalUploadDir, filename);
        fs.writeFileSync(absPath, Buffer.from(audioBuffer));

        const publicUrl = `http://localhost:3001/uploads/${filename}`;

        console.log('✅ [OpenAI TTS] SUCCESS');
        console.log('   - File:', absPath);
        console.log('   - Size:', audioBuffer.byteLength, 'bytes');
        console.log('   - URL:', publicUrl);

        return {
            audioUrl: publicUrl,
            path: absPath,
            voice: voice,
            provider: 'openai'
        };

    } catch (error: any) {
        console.error('❌ [OpenAI TTS] Error:', error.message);
        throw error;
    }
}

/**
 * Generate audio with automatic language detection and voice selection
 */
export async function generateOpenAITTSAuto(
    text: string,
    language?: 'en' | 'vi',
    uploadDir?: string
): Promise<OpenAITTSResult> {
    // Auto-detect language if not provided
    let detectedLanguage: 'en' | 'vi' = language || 'en';
    if (!language) {
        const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
        detectedLanguage = hasVietnamese ? 'vi' : 'en';
    }

    // Select voice based on language preference
    // Note: OpenAI TTS voices work for both languages, but we can choose based on preference
    const voice = detectedLanguage === 'vi' ? 'nova' : 'alloy'; // nova sounds more natural for Vietnamese

    return generateOpenAITTS({
        text: text,
        voice: voice,
        uploadDir: uploadDir
    });
}

