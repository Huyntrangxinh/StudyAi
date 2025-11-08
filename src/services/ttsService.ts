const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export interface TTSSynthesizeRequest {
    text: string;
    language?: string; // 'en-US', 'vi-VN', etc.
    voiceName?: string; // 'Kore', 'Callirrhoe', etc. for Gemini-TTS
    model?: string; // 'gemini-2.5-flash-tts' or 'gemini-2.5-pro-tts'
}

export interface TTSSynthesizeResponse {
    audioContent: string; // base64 encoded audio
    audioEncoding: string;
}

class TTSService {
    /**
     * Synthesize speech using Google Cloud Gemini-TTS API
     * @param request TTS synthesis request
     * @returns Promise with audio content (base64)
     */
    async synthesize(request: TTSSynthesizeRequest): Promise<TTSSynthesizeResponse> {
        try {
            const response = await fetch(`${API_BASE}/api/tts/synthesize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: request.text,
                    language: request.language || 'en-US',
                    voiceName: request.voiceName,
                    model: request.model || 'gemini-2.5-flash-tts'
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(error.error || `TTS synthesis failed: ${response.status}`);
            }

            const data: TTSSynthesizeResponse = await response.json();
            return data;
        } catch (error: any) {
            console.error('TTS Service error:', error);
            throw error;
        }
    }

    /**
     * Convert base64 audio to Audio element and play it
     * @param base64Audio Base64 encoded audio content
     * @returns Promise that resolves when audio starts playing
     */
    async playAudio(base64Audio: string): Promise<HTMLAudioElement> {
        return new Promise((resolve, reject) => {
            try {
                // Convert base64 to blob URL
                const audioBytes = atob(base64Audio);
                const audioArray = new Uint8Array(audioBytes.length);
                for (let i = 0; i < audioBytes.length; i++) {
                    audioArray[i] = audioBytes.charCodeAt(i);
                }
                const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
                const audioUrl = URL.createObjectURL(audioBlob);

                // Create and play audio
                const audio = new Audio(audioUrl);

                audio.onloadeddata = () => {
                    console.log('✅ Audio loaded, starting playback');
                    audio.play().then(() => {
                        resolve(audio);
                    }).catch(reject);
                };

                audio.onerror = (e) => {
                    console.error('❌ Audio playback error:', e);
                    URL.revokeObjectURL(audioUrl);
                    reject(new Error('Audio playback failed'));
                };

                audio.onended = () => {
                    console.log('✅ Audio playback finished');
                    URL.revokeObjectURL(audioUrl);
                };

                audio.load();
            } catch (error: any) {
                console.error('❌ Error creating audio:', error);
                reject(error);
            }
        });
    }

    /**
     * Synthesize and play text in one call
     * @param text Text to speak
     * @param language Language code (default: 'en-US')
     * @param voiceName Voice name (default: 'Kore' for Gemini-TTS)
     * @returns Promise that resolves when audio starts playing
     */
    async speak(text: string, language: string = 'en-US', voiceName?: string): Promise<HTMLAudioElement> {
        console.log('🔊 [TTS Service] Synthesizing text:', text.substring(0, 50));

        const response = await this.synthesize({
            text,
            language,
            voiceName
        });

        console.log('✅ [TTS Service] Audio synthesized, playing...');
        return this.playAudio(response.audioContent);
    }
}

export const ttsService = new TTSService();

