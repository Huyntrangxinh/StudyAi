require('dotenv').config();

// Log environment variables status (without exposing full values)
console.log('🔐 Environment Variables Status:');
console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `✅ Set (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : '❌ Not set');
console.log('  OPENAI_MODEL:', process.env.OPENAI_MODEL || 'gpt-4o-mini (default)');
console.log('  HEYGEN_API_KEY:', process.env.HEYGEN_API_KEY ? `✅ Set (${process.env.HEYGEN_API_KEY.substring(0, 10)}...)` : '❌ Not set');
console.log('  GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? `✅ Set (${process.env.GEMINI_API_KEY.substring(0, 10)}...)` : '❌ Not set');
console.log('  PEXELS_API_KEY:', process.env.PEXELS_API_KEY ? `✅ Set (${process.env.PEXELS_API_KEY.substring(0, 10)}...)` : '❌ Not set');
console.log('  GOOGLE_TTS_CREDENTIALS_PATH:', process.env.GOOGLE_TTS_CREDENTIALS_PATH || '❌ Not set');
console.log('  SEARCH_ENGINE_ID:', process.env.SEARCH_ENGINE_ID || '820473ad04dab4ac3 (default)');
console.log('  GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? `✅ Set (${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...)` : '❌ Not set');
console.log('  SMTP_HOST:', process.env.SMTP_HOST || '❌ Not set');
console.log('  SMTP_USER:', process.env.SMTP_USER || '❌ Not set');
console.log('  SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set (hidden)' : '❌ Not set');

module.exports = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    HEYGEN_API_KEY: process.env.HEYGEN_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    PEXELS_API_KEY: process.env.PEXELS_API_KEY,
    GOOGLE_TTS_CREDENTIALS_PATH: 'google-tts-credentials.json',
    SEARCH_ENGINE_ID: process.env.SEARCH_ENGINE_ID || '820473ad04dab4ac3'
};