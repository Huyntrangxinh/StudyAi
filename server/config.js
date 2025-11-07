require('dotenv').config();

module.exports = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    HEYGEN_API_KEY: process.env.HEYGEN_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    PEXELS_API_KEY: process.env.PEXELS_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID,
    GOOGLE_TTS_CREDENTIALS_PATH: process.env.GOOGLE_TTS_CREDENTIALS_PATH
};