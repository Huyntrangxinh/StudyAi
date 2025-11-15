// ========= WEB SPEECH API SERVICE =========
// Service for converting speech to text using browser's native Web Speech API
// Supports multiple languages including Vietnamese (vi-VN)

interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    serviceURI: string;
    grammars: SpeechGrammarList;
    start(): void;
    stop(): void;
    abort(): void;
    onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

interface SpeechGrammarList {
    length: number;
    item(index: number): SpeechGrammar;
    [index: number]: SpeechGrammar;
    addFromURI(src: string, weight?: number): void;
    addFromString(string: string, weight?: number): void;
}

interface SpeechGrammar {
    src: string;
    weight: number;
}

declare global {
    interface Window {
        SpeechRecognition: {
            new(): SpeechRecognition;
        };
        webkitSpeechRecognition: {
            new(): SpeechRecognition;
        };
    }
}

export interface SpeechToTextOptions {
    language?: string; // Language code (e.g., 'vi-VN', 'en-US')
    continuous?: boolean; // Keep listening after result
    interimResults?: boolean; // Return interim results
    maxAlternatives?: number; // Maximum number of alternative transcripts
}

export interface SpeechToTextResult {
    transcript: string;
    confidence: number;
    isFinal: boolean;
}

export class SpeechToTextService {
    private recognition: SpeechRecognition | null = null;
    private isListening: boolean = false;
    private currentTranscript: string = '';
    private onResultCallback: ((result: SpeechToTextResult) => void) | null = null;
    private onErrorCallback: ((error: string) => void) | null = null;
    private onStartCallback: (() => void) | null = null;
    private onEndCallback: (() => void) | null = null;

    /**
     * Check if Web Speech API is supported in the browser
     */
    static isSupported(): boolean {
        return (
            typeof window !== 'undefined' &&
            (window.SpeechRecognition !== undefined || window.webkitSpeechRecognition !== undefined)
        );
    }

    /**
     * Get available languages (returns common language codes)
     */
    static getSupportedLanguages(): string[] {
        return [
            'vi-VN', // Vietnamese
            'en-US', // English (US)
            'en-GB', // English (UK)
            'zh-CN', // Chinese (Simplified)
            'ja-JP', // Japanese
            'ko-KR', // Korean
            'fr-FR', // French
            'de-DE', // German
            'es-ES', // Spanish
            'it-IT', // Italian
            'pt-BR', // Portuguese (Brazil)
            'ru-RU', // Russian
        ];
    }

    /**
     * Initialize Speech Recognition
     */
    initialize(options: SpeechToTextOptions = {}): boolean {
        if (!SpeechToTextService.isSupported()) {
            console.error('Web Speech API is not supported in this browser');
            return false;
        }

        try {
            // Try standard API first, fallback to webkit
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();

            // Set options
            this.recognition.lang = options.language || 'vi-VN';
            this.recognition.continuous = options.continuous ?? true;
            this.recognition.interimResults = options.interimResults ?? true;
            this.recognition.maxAlternatives = options.maxAlternatives || 1;

            // Set up event handlers
            this.setupEventHandlers();

            return true;
        } catch (error: any) {
            console.error('Error initializing Speech Recognition:', error);
            return false;
        }
    }

    /**
     * Set up event handlers for speech recognition
     */
    private setupEventHandlers(): void {
        if (!this.recognition) return;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.currentTranscript = '';
            if (this.onStartCallback) {
                this.onStartCallback();
            }
        };

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                const confidence = event.results[i][0].confidence || 0;

                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }

                // Call callback with result
                if (this.onResultCallback) {
                    this.onResultCallback({
                        transcript: event.results[i].isFinal ? finalTranscript.trim() : interimTranscript,
                        confidence: confidence,
                        isFinal: event.results[i].isFinal,
                    });
                }
            }

            // Update current transcript
            this.currentTranscript = finalTranscript || interimTranscript;
        };

        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            this.isListening = false;
            const errorMessage = this.getErrorMessage(event.error);
            console.error('Speech Recognition Error:', errorMessage);
            if (this.onErrorCallback) {
                this.onErrorCallback(errorMessage);
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            if (this.onEndCallback) {
                this.onEndCallback();
            }
        };
    }

    /**
     * Get user-friendly error message
     */
    private getErrorMessage(error: string): string {
        const errorMessages: { [key: string]: string } = {
            'no-speech': 'Không phát hiện giọng nói. Vui lòng thử lại.',
            'aborted': 'Nhận dạng giọng nói đã bị hủy.',
            'audio-capture': 'Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.',
            'network': 'Lỗi kết nối mạng.',
            'not-allowed': 'Quyền truy cập microphone bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.',
            'service-not-allowed': 'Dịch vụ nhận dạng giọng nói không được phép.',
        };

        return errorMessages[error] || `Lỗi nhận dạng giọng nói: ${error}`;
    }

    /**
     * Start listening for speech
     */
    startListening(): boolean {
        if (!this.recognition) {
            console.error('Speech Recognition not initialized. Call initialize() first.');
            return false;
        }

        if (this.isListening) {
            console.warn('Already listening');
            return false;
        }

        try {
            this.recognition.start();
            return true;
        } catch (error: any) {
            console.error('Error starting speech recognition:', error);
            return false;
        }
    }

    /**
     * Stop listening for speech
     */
    stopListening(): void {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }

    /**
     * Abort speech recognition
     */
    abort(): void {
        if (this.recognition && this.isListening) {
            this.recognition.abort();
            this.isListening = false;
        }
    }

    /**
     * Set callback for when speech result is received
     */
    onResult(callback: (result: SpeechToTextResult) => void): void {
        this.onResultCallback = callback;
    }

    /**
     * Set callback for when error occurs
     */
    onError(callback: (error: string) => void): void {
        this.onErrorCallback = callback;
    }

    /**
     * Set callback for when recognition starts
     */
    onStart(callback: () => void): void {
        this.onStartCallback = callback;
    }

    /**
     * Set callback for when recognition ends
     */
    onEnd(callback: () => void): void {
        this.onEndCallback = callback;
    }

    /**
     * Get current listening status
     */
    getIsListening(): boolean {
        return this.isListening;
    }

    /**
     * Get current transcript
     */
    getCurrentTranscript(): string {
        return this.currentTranscript;
    }

    /**
     * Change language
     */
    setLanguage(language: string): void {
        if (this.recognition) {
            this.recognition.lang = language;
        }
    }

    /**
     * Cleanup and destroy recognition instance
     */
    destroy(): void {
        if (this.recognition && this.isListening) {
            this.recognition.abort();
        }
        this.recognition = null;
        this.isListening = false;
        this.currentTranscript = '';
        this.onResultCallback = null;
        this.onErrorCallback = null;
        this.onStartCallback = null;
        this.onEndCallback = null;
    }
}

// Export singleton instance
export const speechToTextService = new SpeechToTextService();

