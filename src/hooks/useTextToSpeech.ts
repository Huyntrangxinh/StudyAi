import { useRef, useEffect, useState } from 'react';

export const useTextToSpeech = () => {
    const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const isSpeakingRef = useRef<boolean>(false);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);

    // Unlock TTS sau user gesture (một lần duy nhất)
    const unlockTTS = () => {
        if (typeof window === 'undefined') {
            console.log('unlockTTS: window not available');
            return;
        }
        const synth = (window as any).speechSynthesis as SpeechSynthesis | undefined;
        if (!synth) {
            console.log('unlockTTS: speechSynthesis not available');
            return;
        }

        console.log('🔄 unlockTTS called - attempting to unlock TTS...');
        try {
            synth.resume();
            console.log('✅ synth.resume() called');

            const u = new SpeechSynthesisUtterance(' ');
            u.volume = 0.01;
            u.onend = () => console.log('✅ TTS unlocked (warm-up utterance finished)');
            u.onerror = (e) => {
                console.warn('unlockTTS warm-up error (ignored):', e.error);
            };
            synth.speak(u);
            console.log('✅ unlockTTS warm-up utterance sent');
        } catch (e) {
            console.warn('unlockTTS error', e);
        }
    };

    // Speak helper using Web Speech API
    const speakText = async (text: string) => {
        if (typeof window === 'undefined') {
            console.warn('Window not available for TTS');
            return;
        }

        const synth = (window as any).speechSynthesis as SpeechSynthesis | undefined;
        if (!synth) {
            console.warn('SpeechSynthesis not supported in this browser');
            alert('Trình duyệt của bạn không hỗ trợ đọc văn bản. Vui lòng dùng Chrome, Edge, hoặc Safari.');
            return;
        }

        try {
            await new Promise<void>(resolve => {
                const v = synth.getVoices();
                if (v.length) return resolve();
                const h = () => {
                    if (synth.getVoices().length) {
                        synth.onvoiceschanged = null;
                        resolve();
                    }
                };
                synth.onvoiceschanged = h;
                setTimeout(() => {
                    synth.onvoiceschanged = null;
                    resolve();
                }, 2000);
            });

            if (synth.speaking && !synth.pending && currentUtteranceRef.current) {
                synth.cancel();
                await new Promise(r => setTimeout(r, 120));
            }

            try {
                synth.resume();
            } catch { }

            const utter = new SpeechSynthesisUtterance(text);
            utter.rate = 1.0;
            utter.pitch = 1.0;
            utter.volume = 1.0;
            utter.lang = 'en-US';

            const voices = synth.getVoices();
            const chooseVoice = () => {
                const pref = ['Google US English', 'Google UK English Male', 'Samantha', 'Alex'];
                for (const n of pref) {
                    const v = voices.find(vo => vo.name.includes(n));
                    if (v) return v;
                }
                return voices.find(v => v.lang?.startsWith('en-US'))
                    || voices.find(v => v.default)
                    || voices[0]
                    || null;
            };
            const voice = chooseVoice();
            if (voice) {
                utter.voice = voice;
                console.log('Using voice:', voice.name, voice.lang);
            } else {
                console.warn('No voice picked, may be silent on some browsers');
            }

            currentUtteranceRef.current = utter;

            utter.onstart = () => {
                console.log('🎤 Speech started:', text.substring(0, 50));
                isSpeakingRef.current = true;
            };
            utter.onend = () => {
                console.log('✅ Speech finished successfully');
                isSpeakingRef.current = false;
                currentUtteranceRef.current = null;
            };
            utter.onerror = (e) => {
                const errorType = (e.error as string);
                console.error('TTS error event:', {
                    error: e.error,
                    type: e.type,
                    errorType: errorType,
                    text: text.substring(0, 30)
                });
                if (errorType !== 'canceled') {
                    console.error('TTS error', e);
                }
                isSpeakingRef.current = false;
                currentUtteranceRef.current = null;
            };

            console.log('Synth status before speak:', {
                speaking: synth.speaking,
                pending: synth.pending,
                paused: synth.paused
            });

            synth.speak(utter);
            console.log('✅ synth.speak() called for:', text.substring(0, 50));

            console.log('Synth status after speak:', {
                speaking: synth.speaking,
                pending: synth.pending,
                paused: synth.paused
            });

            setTimeout(() => {
                console.log('Checking speech status after 700ms:', {
                    isSpeakingRef: isSpeakingRef.current,
                    synthSpeaking: synth.speaking,
                    synthPending: synth.pending,
                    synthPaused: synth.paused
                });
                if (!isSpeakingRef.current && !synth.speaking) {
                    console.warn('No speech yet; calling resume()');
                    try {
                        synth.resume();
                        console.log('resume() called, checking again...');
                        setTimeout(() => {
                            console.log('Status after resume():', {
                                speaking: synth.speaking,
                                pending: synth.pending,
                                paused: synth.paused
                            });
                        }, 200);
                    } catch (e) {
                        console.error('resume() failed:', e);
                    }
                }
            }, 700);

        } catch (err: any) {
            console.error('❌ Error in speakText:', err);
            currentUtteranceRef.current = null;
            isSpeakingRef.current = false;
        }
    };

    // Preload voices ngay khi component mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const synth = (window as any).speechSynthesis as SpeechSynthesis | undefined;
        if (!synth) return;

        const loadVoicesNow = () => {
            try {
                const voices = synth.getVoices();
                console.log('Voices loaded on mount:', voices.length);
                if (voices.length > 0) {
                    console.log('Sample voices:', voices.slice(0, 3).map(v => `${v.name} (${v.lang})`));
                }
            } catch (e) {
                console.error('Error loading voices:', e);
            }
        };

        loadVoicesNow();
        synth.onvoiceschanged = loadVoicesNow;
        const timer = setTimeout(loadVoicesNow, 1000);

        return () => {
            synth.onvoiceschanged = null;
            clearTimeout(timer);
        };
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

