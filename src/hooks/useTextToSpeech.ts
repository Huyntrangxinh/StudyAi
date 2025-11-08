import { useRef, useEffect, useState } from 'react';
import { ttsService } from '../services/ttsService';

export const useTextToSpeech = () => {
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const isSpeakingRef = useRef<boolean>(false);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);

    // Unlock TTS sau user gesture (một lần duy nhất)
    // Với Google Cloud TTS, không cần unlock như Web Speech API
    const unlockTTS = () => {
        console.log('🔄 unlockTTS called - Google Cloud TTS does not require unlock');
        setHasUserInteracted(true);
    };

    // Speak helper using Google Cloud Gemini-TTS API
    const speakText = async (text: string, language: string = 'en-US') => {
        console.log('🔊 [TTS] ========== speakText START ==========');
        console.log('🔊 [TTS] Input text:', text);
        console.log('🔊 [TTS] Language:', language);

        if (typeof window === 'undefined') {
            console.warn('❌ [TTS] Window not available for TTS');
            return;
        }

        try {
            // Stop current audio if playing
            if (currentAudioRef.current) {
                console.log('🛑 [TTS] Stopping current audio...');
                currentAudioRef.current.pause();
                currentAudioRef.current.currentTime = 0;
                currentAudioRef.current = null;
                isSpeakingRef.current = false;
                await new Promise(r => setTimeout(r, 100));
            }

            // Detect language from text (simple heuristic)
            let detectedLanguage = language;
            if (!language || language === 'auto') {
                // Simple detection: if text contains Vietnamese characters, use vi-VN
                const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
                detectedLanguage = hasVietnamese ? 'vi-VN' : 'en-US';
                console.log('🔊 [TTS] Auto-detected language:', detectedLanguage);
            }

            // Choose voice based on language
            let voiceName: string | undefined;
            if (detectedLanguage.startsWith('vi')) {
                voiceName = 'vi-VN-Wavenet-A'; // Vietnamese voice
            } else {
                voiceName = 'Kore'; // Gemini-TTS English voice
            }

            console.log('🔊 [TTS] Calling TTS service...');
            const audio = await ttsService.speak(text, detectedLanguage, voiceName);

            currentAudioRef.current = audio;
            isSpeakingRef.current = true;

            audio.onplay = () => {
                console.log('🎤 [TTS] ========== Speech STARTED ==========');
                console.log('🎤 [TTS] Text being spoken:', text.substring(0, 50));
            };

            audio.onended = () => {
                console.log('✅ [TTS] ========== Speech FINISHED ==========');
                console.log('✅ [TTS] Text completed:', text.substring(0, 50));
                isSpeakingRef.current = false;
                currentAudioRef.current = null;
            };

            audio.onerror = (e) => {
                console.error('❌ [TTS] ========== Speech ERROR ==========');
                console.error('❌ [TTS] Audio error:', e);
                isSpeakingRef.current = false;
                currentAudioRef.current = null;
            };

            audio.onpause = () => {
                console.log('⏸️ [TTS] Audio paused');
            };

            console.log('✅ [TTS] Audio element created and playing');

        } catch (err: any) {
            console.error('❌ [TTS] ========== speakText ERROR ==========');
            console.error('❌ [TTS] Error:', err);
            console.error('❌ [TTS] Error message:', err?.message);
            isSpeakingRef.current = false;
            currentAudioRef.current = null;
        }
        console.log('🔊 [TTS] ========== speakText END ==========');
    };

    // Google Cloud TTS không cần preload voices như Web Speech API
    useEffect(() => {
        console.log('✅ [TTS] useTextToSpeech hook initialized with Google Cloud TTS');
    }, []);

    // Unlock TTS sau user gesture
    useEffect(() => {
        const onGesture = () => {
            setHasUserInteracted(true);
            unlockTTS();
        };

        window.addEventListener('click', onGesture, { once: true });
        window.addEventListener('keydown', onGesture, { once: true });
        window.addEventListener('touchstart', onGesture, { once: true });

        return () => {
            window.removeEventListener('click', onGesture);
            window.removeEventListener('keydown', onGesture);
            window.removeEventListener('touchstart', onGesture);
        };
    }, []);

    return {
        speakText,
        unlockTTS,
        hasUserInteracted
    };
};

