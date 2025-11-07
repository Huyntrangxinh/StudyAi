import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, Star, Shuffle, RotateCcw, GraduationCap, Share, Upload, User, Lightbulb, Brain, Book, Send, Plus, Link, History } from 'lucide-react';

interface StudyFlashcardsProps {
    flashcards: Array<{
        id: string;
        term: string;
        definition: string;
        termImage?: string;
        definitionImage?: string;
        type?: string; // 'pair', 'fillblank', 'multiplechoice'
        fillBlankAnswers?: string[]; // Correct answers for fill in the blank
        multipleChoiceOptions?: string[]; // Options for multiple choice
        correctAnswerIndex?: number; // Correct answer index for multiple choice
    }>;
    onBack: () => void;
    isCollapsed: boolean;
    flashcardName?: string;
    studySetId?: string;
}

const StudyFlashcards: React.FC<StudyFlashcardsProps> = ({ flashcards, onBack, isCollapsed, flashcardName, studySetId }) => {
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isShuffled, setIsShuffled] = useState(false);
    const [bookmarkedCards, setBookmarkedCards] = useState<Set<string>>(new Set());
    const [aiMessage, setAiMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [chatMessage, setChatMessage] = useState<string>('');
    const [chatHistory, setChatHistory] = useState<Array<{ type: 'user' | 'ai', message: string }>>([]);
    const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
    // Text-to-Speech toggle
    const [audioEnabled, setAudioEnabled] = useState<boolean>(() => {
        try { return localStorage.getItem('ttsEnabled') === '1'; } catch { return false; }
    });
    const [isSliding, setIsSliding] = useState(false);
    // Fill in the blank states
    const [fillBlankInput, setFillBlankInput] = useState<string>('');
    const [fillBlankChecked, setFillBlankChecked] = useState<boolean>(false);
    const [fillBlankIsCorrect, setFillBlankIsCorrect] = useState<boolean | null>(null);
    const [fillBlankHint, setFillBlankHint] = useState<string>(''); // Hint character
    const [showCorrectAnswer, setShowCorrectAnswer] = useState<boolean>(false); // Show correct answer
    const [correctAnswer, setCorrectAnswer] = useState<string>(''); // Correct answer text
    // Multiple Choice states
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null); // Selected option index
    const [multipleChoiceChecked, setMultipleChoiceChecked] = useState<boolean>(false); // Is answer checked
    const [multipleChoiceIsCorrect, setMultipleChoiceIsCorrect] = useState<boolean | null>(null); // Is answer correct

    // Debug log
    console.log('StudyFlashcards received flashcards:', flashcards);
    console.log('Current card index:', currentCardIndex);
    console.log('Total flashcards:', flashcards.length);

    // Debug each flashcard
    flashcards.forEach((card, index) => {
        console.log(`Flashcard ${index}:`, {
            id: card.id,
            term: card.term,
            definition: card.definition,
            fullObject: card
        });
    });

    // Reset currentCardIndex when flashcards change
    useEffect(() => {
        if (flashcards.length > 0 && currentCardIndex >= flashcards.length) {
            setCurrentCardIndex(0);
        }
    }, [flashcards, currentCardIndex]);

    // Reset fillBlank state when card changes
    useEffect(() => {
        setFillBlankInput('');
        setFillBlankChecked(false);
        setFillBlankIsCorrect(null);
        setFillBlankHint('');
        setShowCorrectAnswer(false);
        setCorrectAnswer('');
        // Reset Multiple Choice state
        setSelectedOptionIndex(null);
        setMultipleChoiceChecked(false);
        setMultipleChoiceIsCorrect(null);
    }, [currentCardIndex]);

    // Helper function to parse fill-in-the-blank text and render with input
    const parseFillBlankText = (text: string) => {
        const parts: Array<{ type: 'text' | 'blank', content: string }> = [];
        let currentIndex = 0;
        const regex = /\{\{([^}]*)\}\}/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            // Add text before the blank
            if (match.index > currentIndex) {
                parts.push({
                    type: 'text',
                    content: text.substring(currentIndex, match.index)
                });
            }
            // Add the blank
            parts.push({
                type: 'blank',
                content: match[1] // The content inside {{ }}
            });
            currentIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (currentIndex < text.length) {
            parts.push({
                type: 'text',
                content: text.substring(currentIndex)
            });
        }

        // If no blanks found, return the whole text
        if (parts.length === 0) {
            parts.push({ type: 'text', content: text });
        }

        return parts;
    };

    // Helper function to detect if card is fill-in-the-blank
    const isFillBlankCard = (card: any) => {
        if (!card) return false;
        // Check explicit type
        if (card.type === 'fillblank') return true;
        // Auto-detect if term contains {{ }}
        if (card.term && /\{\{[^}]+\}\}/.test(card.term)) return true;
        // Auto-detect if has fillBlankAnswers
        if (card.fillBlankAnswers && Array.isArray(card.fillBlankAnswers) && card.fillBlankAnswers.length > 0) return true;
        // Auto-detect if definition is an array (JSON string)
        if (card.definition) {
            try {
                const parsed = typeof card.definition === 'string' ? JSON.parse(card.definition) : card.definition;
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Check if it's not a multiple choice (which also has array structure)
                    return !card.type || card.type !== 'multiplechoice';
                }
            } catch (e) {
                // Not JSON, ignore
            }
        }
        return false;
    };

    // Helper function to detect if card is multiple choice
    const isMultipleChoiceCard = (card: any) => {
        if (!card) return false;
        if (card.type === 'multiplechoice') return true;
        // Auto-detect if has multipleChoiceOptions
        if (card.multipleChoiceOptions && Array.isArray(card.multipleChoiceOptions) && card.multipleChoiceOptions.length > 0) return true;
        // Auto-detect if definition has options structure
        if (card.definition) {
            try {
                const parsed = typeof card.definition === 'string' ? JSON.parse(card.definition) : card.definition;
                if (parsed && parsed.options && Array.isArray(parsed.options)) return true;
            } catch (e) {
                // Not JSON, ignore
            }
        }
        return false;
    };

    // Function to check multiple choice answer
    const checkMultipleChoiceAnswer = () => {
        const currentCard = flashcards[currentCardIndex];
        if (selectedOptionIndex === null) return;

        let correctIndex = currentCard.correctAnswerIndex;
        let options = currentCard.multipleChoiceOptions;

        // Parse from definition if needed
        if (!options && currentCard.definition) {
            try {
                const parsed = typeof currentCard.definition === 'string' ? JSON.parse(currentCard.definition) : currentCard.definition;
                if (parsed && parsed.options) {
                    options = parsed.options;
                    correctIndex = parsed.correctIndex ?? parsed.correctAnswerIndex ?? 0;
                }
            } catch (e) {
                console.error('Error parsing multiple choice data:', e);
            }
        }

        if (!options || correctIndex === undefined) return;

        const isCorrect = selectedOptionIndex === correctIndex;
        setMultipleChoiceIsCorrect(isCorrect);
        setMultipleChoiceChecked(true);
    };

    // Function to show hint (one character from the answer)
    const showFillBlankHint = () => {
        const currentCard = flashcards[currentCardIndex];
        let answers = currentCard.fillBlankAnswers;

        // If no fillBlankAnswers, try to extract from term
        if (!answers || answers.length === 0) {
            const matches = currentCard.term?.match(/\{\{([^}]+)\}\}/g);
            if (matches) {
                answers = matches.map((m: string) => m.replace(/\{\{|\}\}/g, '').trim()).filter((a: string) => a);
            }
        }

        if (!answers || answers.length === 0) {
            return;
        }

        // Get the first answer and show first character as hint
        const firstAnswer = answers[0].trim();
        if (firstAnswer.length > 0) {
            setFillBlankHint(firstAnswer[0]);
        }
    };

    // Function to check fill-in-the-blank answer
    const checkFillBlankAnswer = () => {
        const currentCard = flashcards[currentCardIndex];
        let answers = currentCard.fillBlankAnswers;

        // If no fillBlankAnswers, try to extract from term
        if (!answers || answers.length === 0) {
            const matches = currentCard.term?.match(/\{\{([^}]+)\}\}/g);
            if (matches) {
                answers = matches.map((m: string) => m.replace(/\{\{|\}\}/g, '').trim()).filter((a: string) => a);
            }
        }

        if (!answers || answers.length === 0) {
            return;
        }

        const userAnswer = fillBlankInput.trim().toLowerCase();
        const isCorrect = answers.some((answer: string) =>
            answer.trim().toLowerCase() === userAnswer
        );

        setFillBlankIsCorrect(isCorrect);
        setFillBlankChecked(true);

        // Save first correct answer for display
        if (answers.length > 0) {
            setCorrectAnswer(answers[0]);
        }
    };

    // Function to show correct answer
    const handleShowCorrectAnswer = () => {
        setShowCorrectAnswer(true);
    };

    // Track utterance đang chạy để tránh cancel nhầm
    const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const isSpeakingRef = useRef<boolean>(false);

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
            // Một số bản Chrome cần resume() sau gesture
            synth.resume();
            console.log('✅ synth.resume() called');

            // Warm-up utterance rất ngắn để "mở khóa" audio/tts
            const u = new SpeechSynthesisUtterance(' ');
            u.volume = 0.01; // gần như im lặng
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

    // Speak helper using Web Speech API với error handling tốt hơn
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
            // 1) Đảm bảo voices có sẵn
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

            // 2) Đừng hủy nếu chỉ pending
            if (synth.speaking && !synth.pending && currentUtteranceRef.current) {
                synth.cancel();
                await new Promise(r => setTimeout(r, 120));
            }

            // 3) Resume phòng khi paused
            try {
                synth.resume();
            } catch { }

            const utter = new SpeechSynthesisUtterance(text);
            utter.rate = 1.0;
            utter.pitch = 1.0;
            utter.volume = 1.0;
            utter.lang = 'en-US';

            // 4) LUÔN set voice cụ thể (fix silent-bug trên macOS/Chrome/Safari)
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

            // Log trạng thái trước khi speak
            console.log('Synth status before speak:', {
                speaking: synth.speaking,
                pending: synth.pending,
                paused: synth.paused
            });

            synth.speak(utter);
            console.log('✅ synth.speak() called for:', text.substring(0, 50));

            // Log trạng thái sau khi speak
            console.log('Synth status after speak:', {
                speaking: synth.speaking,
                pending: synth.pending,
                paused: synth.paused
            });

            // 5) Nếu sau 700ms chưa nói, thử resume()
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

    // Track user interaction để đảm bảo TTS có thể chạy
    const [hasUserInteracted, setHasUserInteracted] = useState(false);

    // Preload voices ngay khi component mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const synth = (window as any).speechSynthesis as SpeechSynthesis | undefined;
        if (!synth) return;

        // Trigger voices load ngay
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

        // Thử load ngay
        loadVoicesNow();

        // Listen cho event voiceschanged
        synth.onvoiceschanged = loadVoicesNow;

        // Fallback: thử lại sau 1 giây
        const timer = setTimeout(loadVoicesNow, 1000);

        return () => {
            synth.onvoiceschanged = null;
            clearTimeout(timer);
        };
    }, []);

    // Unlock TTS sau user gesture (gọi unlockTTS ngay trong callback)
    useEffect(() => {
        const onGesture = () => {
            setHasUserInteracted(true);
            unlockTTS(); // Quan trọng: gọi ngay trong gesture
        };

        // Listen for any user interaction
        window.addEventListener('click', onGesture, { once: true });
        window.addEventListener('keydown', onGesture, { once: true });
        window.addEventListener('touchstart', onGesture, { once: true });

        return () => {
            window.removeEventListener('click', onGesture);
            window.removeEventListener('keydown', onGesture);
            window.removeEventListener('touchstart', onGesture);
        };
    }, []);

    // Auto speak when moving to a new card (front side)
    useEffect(() => {
        if (!audioEnabled) return;
        if (!currentCard) return;
        if (isFlipped) return; // chỉ đọc mặt trước
        if (!hasUserInteracted) {
            console.log('Waiting for user interaction before TTS');
            return;
        }

        const term = currentCard.term?.toString().trim();
        if (term) {
            // Đợi một chút sau khi card đã render xong
            const timer = setTimeout(() => {
                speakText(term);
            }, 400); // Đợi animation slide hoàn tất

            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentCardIndex, audioEnabled, isFlipped, hasUserInteracted]);
    // Resizable divider state
    const [sidebarWidth, setSidebarWidth] = useState<number>(300); // compact default
    const [showAiSidebar, setShowAiSidebar] = useState<boolean>(true);
    const [isResizing, setIsResizing] = useState<boolean>(false);
    const [showHint, setShowHint] = useState<boolean>(false);
    // Dynamic card max width to fit between left nav and AI sidebar
    const [cardMaxWidth, setCardMaxWidth] = useState<number>(1200);

    const currentCard = flashcards[currentCardIndex];

    // Debug current card
    console.log('Current card:', currentCard);
    console.log('Is currentCard undefined?', currentCard === undefined);
    console.log('Current card term:', currentCard?.term);
    console.log('Current card definition:', currentCard?.definition);

    const nextCard = () => {
        console.log('Next button clicked');
        console.log('Current index:', currentCardIndex);
        console.log('Total cards:', flashcards.length);
        console.log('Can go next?', currentCardIndex < flashcards.length - 1);
        console.log('Is sliding?', isSliding);

        if (currentCardIndex < flashcards.length - 1 && !isSliding) {
            console.log('Moving to next card');
            setIsSliding(true);
            setSlideDirection('left');
            setIsFlipped(false);

            setTimeout(() => {
                setCurrentCardIndex(prev => {
                    console.log('Updating index from', prev, 'to', prev + 1);
                    return prev + 1;
                });
                setSlideDirection(null);
                setTimeout(() => {
                    setIsSliding(false);
                }, 100);
            }, 300);
        } else {
            console.log('Cannot go next - either at end or sliding');
        }
    };

    const prevCard = () => {
        if (currentCardIndex > 0 && !isSliding) {
            setIsSliding(true);
            setSlideDirection('right');
            setIsFlipped(false);

            setTimeout(() => {
                setCurrentCardIndex(prev => prev - 1);
                setSlideDirection(null);
                setTimeout(() => {
                    setIsSliding(false);
                }, 100);
            }, 300);
        }
    };

    const flipCard = () => {
        // Don't flip if it's a fill-in-the-blank or multiple choice card
        const currentCard = flashcards[currentCardIndex];
        if (isFillBlankCard(currentCard) || isMultipleChoiceCard(currentCard)) {
            return;
        }
        setIsFlipped(!isFlipped);
    };

    const shuffleCards = () => {
        setIsShuffled(!isShuffled);
    };

    const sendChatMessage = async () => {
        if (!chatMessage.trim() || isLoadingChat) return;

        const userMessage = chatMessage.trim();
        setChatMessage('');
        setChatHistory(prev => [...prev, { type: 'user', message: userMessage }]);
        setIsLoadingChat(true);

        // Retry mechanism với exponential backoff
        const maxRetries = 3;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Tạo prompt riêng cho flashcard với thông tin thẻ hiện tại
            const currentTerm = currentCard?.term || '';
                // Ẩn Definition trong UI nhưng vẫn gửi cho AI để có thể trả lời khi được hỏi
                const shouldHideDefinitionInUI = currentCard && (isMultipleChoiceCard(currentCard) || isFillBlankCard(currentCard));

                let flashcardInfoSection = `Thông tin flashcard hiện tại:
- Term (Thuật ngữ): ${currentTerm}`;

                // Xử lý Multiple Choice
                if (isMultipleChoiceCard(currentCard)) {
                    let options = currentCard.multipleChoiceOptions;
                    let correctIndex = currentCard.correctAnswerIndex;

                    // Parse từ definition nếu cần
                    if (!options && currentCard.definition) {
                        try {
                            const parsed = typeof currentCard.definition === 'string' ? JSON.parse(currentCard.definition) : currentCard.definition;
                            if (parsed && parsed.options) {
                                options = parsed.options;
                                correctIndex = parsed.correctIndex ?? parsed.correctAnswerIndex ?? 0;
                            }
                        } catch (e) {
                            console.error('Error parsing multiple choice:', e);
                        }
                    }

                    if (options && Array.isArray(options) && options.length > 0) {
                        flashcardInfoSection += `\n- Loại câu hỏi: Trắc nghiệm (Multiple Choice)`;
                        flashcardInfoSection += `\n- Các đáp án (Options):`;
                        options.forEach((opt: string, idx: number) => {
                            const isCorrect = idx === correctIndex;
                            flashcardInfoSection += `\n  ${idx + 1}. ${opt}${isCorrect ? ' (ĐÁP ÁN ĐÚNG)' : ''}`;
                        });
                        flashcardInfoSection += `\n- Lưu ý: Thông tin này chỉ dùng để trợ giúp học tập khi người dùng yêu cầu. Không hiển thị đáp án đúng trừ khi được yêu cầu cụ thể.`;
                    }
                }
                // Xử lý Fill in the Blank
                else if (isFillBlankCard(currentCard)) {
                    let answers = currentCard.fillBlankAnswers;

                    // Parse từ definition nếu cần
                    if (!answers && currentCard.definition) {
                        try {
                            const parsed = typeof currentCard.definition === 'string' ? JSON.parse(currentCard.definition) : currentCard.definition;
                            if (Array.isArray(parsed)) {
                                answers = parsed;
                            }
                        } catch (e) {
                            // Nếu không parse được, thử extract từ term với {{ }} syntax
                            const matches = currentCard.term?.match(/\{\{([^}]+)\}\}/g);
                            if (matches) {
                                answers = matches.map(m => m.replace(/\{\{|\}\}/g, ''));
                            }
                        }
                    }

                    if (answers && Array.isArray(answers) && answers.length > 0) {
                        flashcardInfoSection += `\n- Loại câu hỏi: Điền vào chỗ trống (Fill in the Blank)`;
                        flashcardInfoSection += `\n- Các đáp án đúng (Correct Answers): ${answers.join(', ')}`;
                        flashcardInfoSection += `\n- Lưu ý: Thông tin này chỉ dùng để trợ giúp học tập khi người dùng yêu cầu. Không hiển thị đáp án trừ khi được yêu cầu cụ thể.`;
                    }
                }
                // Flashcard thường (Term and Definition)
                else {
            const currentDefinition = currentCard?.definition || '';
                    if (currentDefinition) {
                        flashcardInfoSection += `\n- Definition (Định nghĩa): ${currentDefinition}`;
                    }
                }

            const flashcardPrompt = `Bạn là AI tutor chuyên giúp học flashcard tên Huyền Trang. 
            
${flashcardInfoSection}

Câu hỏi của Huyền Trang: ${userMessage}

Hãy trả lời theo format sau:
1. Bắt đầu với "Chào Huyền Trang! 🎉 Rất vui khi được giúp bạn hiểu rõ hơn về từ này! 😊"
2. Hiển thị thông tin flashcard: "Flashcard của chúng ta hôm nay là: **Thuật ngữ:** [term]"
3. **QUAN TRỌNG**: Nếu người dùng yêu cầu dịch/giải thích đáp án (ví dụ: "dịch cho tôi từng đáp án", "giải thích các đáp án", "translate the options"), hãy dịch và giải thích từng đáp án một cách chi tiết, rõ ràng.
4. Nếu có lỗi chính tả, nhắc nhở nhẹ nhàng như "Có lẽ có một chút nhầm lẫn ở đây về từ [từ đúng] đó Huyền Trang ơi! 😉"
5. **Giải thích chi tiết** với:
   - Định nghĩa rõ ràng và dễ hiểu
   - **Ví dụ câu tiếng Anh** sử dụng từ đó
   - **Ví dụ câu tiếng Việt** tương ứng
   - Các từ liên quan hoặc từ đồng nghĩa
   - Lưu ý về cách sử dụng trong ngữ cảnh
6. Kết thúc bằng "Huyền Trang có muốn mình giải thích kỹ hơn phần nào không? Mình luôn sẵn sàng giúp bạn học tập vui vẻ! 🎉😊"
7. Sử dụng nhiều emoji, tone giáo dục thân thiện, và gọi tên "Huyền Trang" trong câu trả lời.
8. **QUAN TRỌNG**: Không tự động hiển thị đáp án đúng hoặc định nghĩa cho câu hỏi trắc nghiệm/điền chỗ trống trừ khi người dùng yêu cầu cụ thể.`;

                // Thêm timeout 30 giây cho mỗi request
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await fetch('http://localhost:3001/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: flashcardPrompt,
                    studySetId: studySetId || ''
                    }),
                    signal: controller.signal
            });

                clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                setChatHistory(prev => [...prev, { type: 'ai', message: data.response }]);
                    setIsLoadingChat(false);
                    return; // Thành công, thoát khỏi retry loop
            } else {
                    // Nếu là lỗi server (5xx), thử lại; nếu là lỗi client (4xx), không retry
                    if (response.status >= 500 && attempt < maxRetries - 1) {
                        lastError = new Error(`Server error: ${response.status}`);
                        // Đợi trước khi retry: exponential backoff (1s, 2s, 4s)
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                        continue;
                    } else {
                        // Lỗi client hoặc đã hết retry
                setChatHistory(prev => [...prev, { type: 'ai', message: 'Xin lỗi, có lỗi xảy ra khi gửi tin nhắn.' }]);
                        setIsLoadingChat(false);
                        return;
                    }
                }
            } catch (error: any) {
                console.error(`Error sending chat message (attempt ${attempt + 1}/${maxRetries}):`, error);

                // Nếu là AbortError (timeout) hoặc network error, thử lại
                if ((error.name === 'AbortError' || error.message?.includes('fetch')) && attempt < maxRetries - 1) {
                    lastError = error;
                    // Đợi trước khi retry
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                    continue;
                } else {
                    // Đã hết retry hoặc lỗi không thể retry
                    setChatHistory(prev => [...prev, { type: 'ai', message: 'Xin lỗi, có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại sau.' }]);
            setIsLoadingChat(false);
                    return;
                }
            }
        }

        // Nếu tất cả retry đều thất bại
        setChatHistory(prev => [...prev, { type: 'ai', message: 'Xin lỗi, không thể kết nối với AI tutor. Vui lòng thử lại sau vài giây.' }]);
        setIsLoadingChat(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    };

    // Function to render markdown-like formatting
    const renderMessage = (message: string) => {
        let html = message;

        // 1. Replace bold and italic
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em class="italic text-gray-700">$1</em>');

        // 2. Replace headings
        html = html.replace(/### (.*?)(?=\n|$)/g, '<h3 class="text-lg font-semibold text-gray-800 mt-4 mb-2">$1</h3>');
        html = html.replace(/## (.*?)(?=\n|$)/g, '<h2 class="text-xl font-bold text-gray-900 mt-4 mb-3">$1</h2>');

        // 3. Handle list items: convert lines starting with `• `, `- ` or `* ` into `<li>`
        // We remove the leading bullet/hyphen/asterisk and let CSS handle the bullet point.
        html = html.replace(/^(\s*)([•\-*])\s(.*?)(?=\n|$)/gm, '$1<li class="ml-4">$3</li>');

        // 4. Wrap consecutive list items in <ul> tags
        // Added list-disc and pl-5 to the ul for CSS bullets and indentation
        html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/g, '<ul class="list-disc pl-5">$&</ul>');
        html = html.replace(/<ul>\s*<\/ul>/g, ''); // Remove empty ul tags

        // 5. Handle paragraphs and line breaks
        // Replace double newlines with paragraph breaks (removed mb-3 from p, will rely on space-y-2)
        html = html.replace(/\n\n/g, '</p><p>');
        // Replace single newlines with <br> for soft breaks within paragraphs, 
        // but not inside <li> or other block elements
        html = html.replace(/(?<!<\/p>)\n(?!<p>|<li>|<h)/g, '<br>');

        // The outer div with space-y-2 will handle spacing between block elements.
        // Removed the conditional wrapping in <p> as it can interfere with lists/headings.
        return `<div class="space-y-2">${html}</div>`;
    };

    const toggleBookmark = () => {
        const newBookmarked = new Set(bookmarkedCards);
        if (newBookmarked.has(currentCard.id)) {
            newBookmarked.delete(currentCard.id);
        } else {
            newBookmarked.add(currentCard.id);
        }
        setBookmarkedCards(newBookmarked);
    };

    const handleAISubmit = async (prompt: string) => {
        setIsLoading(true);
        try {
            // Tạo prompt riêng cho flashcard với thông tin thẻ hiện tại
            const currentTerm = currentCard?.term || '';
            // Ẩn Definition trong UI nhưng vẫn gửi cho AI để có thể trả lời khi được hỏi
            const shouldHideDefinitionInUI = currentCard && (isMultipleChoiceCard(currentCard) || isFillBlankCard(currentCard));

            let flashcardInfoSection = `Thông tin flashcard hiện tại:
- Term (Thuật ngữ): ${currentTerm}`;

            // Xử lý Multiple Choice
            if (isMultipleChoiceCard(currentCard)) {
                let options = currentCard.multipleChoiceOptions;
                let correctIndex = currentCard.correctAnswerIndex;

                // Parse từ definition nếu cần
                if (!options && currentCard.definition) {
                    try {
                        const parsed = typeof currentCard.definition === 'string' ? JSON.parse(currentCard.definition) : currentCard.definition;
                        if (parsed && parsed.options) {
                            options = parsed.options;
                            correctIndex = parsed.correctIndex ?? parsed.correctAnswerIndex ?? 0;
                        }
                    } catch (e) {
                        console.error('Error parsing multiple choice:', e);
                    }
                }

                if (options && Array.isArray(options) && options.length > 0) {
                    flashcardInfoSection += `\n- Loại câu hỏi: Trắc nghiệm (Multiple Choice)`;
                    flashcardInfoSection += `\n- Các đáp án (Options):`;
                    options.forEach((opt: string, idx: number) => {
                        const isCorrect = idx === correctIndex;
                        flashcardInfoSection += `\n  ${idx + 1}. ${opt}${isCorrect ? ' (ĐÁP ÁN ĐÚNG)' : ''}`;
                    });
                    flashcardInfoSection += `\n- Lưu ý: Thông tin này chỉ dùng để trợ giúp học tập khi người dùng yêu cầu. Không hiển thị đáp án đúng trừ khi được yêu cầu cụ thể.`;
                }
            }
            // Xử lý Fill in the Blank
            else if (isFillBlankCard(currentCard)) {
                let answers = currentCard.fillBlankAnswers;

                // Parse từ definition nếu cần
                if (!answers && currentCard.definition) {
                    try {
                        const parsed = typeof currentCard.definition === 'string' ? JSON.parse(currentCard.definition) : currentCard.definition;
                        if (Array.isArray(parsed)) {
                            answers = parsed;
                        }
                    } catch (e) {
                        // Nếu không parse được, thử extract từ term với {{ }} syntax
                        const matches = currentCard.term?.match(/\{\{([^}]+)\}\}/g);
                        if (matches) {
                            answers = matches.map(m => m.replace(/\{\{|\}\}/g, ''));
                        }
                    }
                }

                if (answers && Array.isArray(answers) && answers.length > 0) {
                    flashcardInfoSection += `\n- Loại câu hỏi: Điền vào chỗ trống (Fill in the Blank)`;
                    flashcardInfoSection += `\n- Các đáp án đúng (Correct Answers): ${answers.join(', ')}`;
                    flashcardInfoSection += `\n- Lưu ý: Thông tin này chỉ dùng để trợ giúp học tập khi người dùng yêu cầu. Không hiển thị đáp án trừ khi được yêu cầu cụ thể.`;
                }
            }
            // Flashcard thường (Term and Definition)
            else {
            const currentDefinition = currentCard?.definition || '';
                if (currentDefinition) {
                    flashcardInfoSection += `\n- Definition (Định nghĩa): ${currentDefinition}`;
                }
            }

            const flashcardPrompt = `Bạn là AI tutor chuyên giúp học flashcard tên Huyền Trang. 
            
${flashcardInfoSection}

Yêu cầu của Huyền Trang: ${prompt}

Hãy trả lời theo format sau:
1. Bắt đầu với "Chào Huyền Trang! 🎉 Rất vui khi được giúp bạn hiểu rõ hơn về từ này! 😊"
2. Hiển thị thông tin flashcard: "Flashcard của chúng ta hôm nay là: **Thuật ngữ:** [term]"
3. **QUAN TRỌNG**: Nếu người dùng yêu cầu dịch/giải thích đáp án (ví dụ: "dịch cho tôi từng đáp án", "giải thích các đáp án", "translate the options"), hãy dịch và giải thích từng đáp án một cách chi tiết, rõ ràng.
4. Nếu có lỗi chính tả, nhắc nhở nhẹ nhàng như "Có lẽ có một chút nhầm lẫn ở đây về từ [từ đúng] đó Huyền Trang ơi! 😉"
5. **Giải thích chi tiết** với:
   - Định nghĩa rõ ràng và dễ hiểu
   - **Ví dụ câu tiếng Anh** sử dụng từ đó
   - **Ví dụ câu tiếng Việt** tương ứng
   - Các từ liên quan hoặc từ đồng nghĩa
   - Lưu ý về cách sử dụng trong ngữ cảnh
6. Kết thúc bằng "Huyền Trang có muốn mình giải thích kỹ hơn phần nào không? Mình luôn sẵn sàng giúp bạn học tập vui vẻ! 🎉😊"
7. Sử dụng nhiều emoji, tone giáo dục thân thiện, và gọi tên "Huyền Trang" trong câu trả lời.
8. **QUAN TRỌNG**: Không tự động hiển thị đáp án đúng hoặc định nghĩa cho câu hỏi trắc nghiệm/điền chỗ trống trừ khi người dùng yêu cầu cụ thể.`;

            const response = await fetch('http://localhost:3001/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: flashcardPrompt,
                    studySetId: '13'
                })
            });

            if (response.ok) {
                const data = await response.json();
                setAiMessage(data.response);
            } else {
                setAiMessage('Xin lỗi, có lỗi xảy ra khi gửi tin nhắn.');
            }
        } catch (error) {
            console.error('Error calling AI:', error);
            setAiMessage('Xin lỗi, có lỗi xảy ra khi gửi tin nhắn.');
        } finally {
            setIsLoading(false);
        }
    };

    // Divider drag handlers
    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            // Calculate new width from the right edge of left pane
            const viewportWidth = window.innerWidth;
            // Sidebar is the right pane; width = viewport - cursorX - left sidebar (if any margin). Our content has no fixed left sidebar here, so compute relative to right edge.
            const newWidth = Math.max(250, Math.min(600, viewportWidth - e.clientX));
            setSidebarWidth(newWidth);
        };
        const onMouseUp = () => setIsResizing(false);
        if (isResizing) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isResizing]);

    // Recalculate available width for the card when window/sidebar changes
    useEffect(() => {
        const compute = () => {
            const viewportWidth = window.innerWidth;
            // Left navigation in app is 64px when collapsed and 192px when expanded
            const leftNavWidth = isCollapsed ? 64 : 192;
            // Small gutter to keep a tiny breathing space
            const gutter = 0;
            const effectiveSidebar = showAiSidebar ? sidebarWidth : 0;
            const available = Math.max(600, viewportWidth - leftNavWidth - effectiveSidebar - gutter);
            // Cap to a reasonable maximum to keep card readable and leave margins on both sides
            setCardMaxWidth(Math.min(1000, available));
        };
        compute();
        window.addEventListener('resize', compute);
        return () => window.removeEventListener('resize', compute);
    }, [sidebarWidth, isCollapsed, showAiSidebar]);

    // Show hint bubble after 3s when chatbot is hidden
    useEffect(() => {
        if (!showAiSidebar) {
            const t = setTimeout(() => setShowHint(true), 3000);
            const autoHide = setTimeout(() => setShowHint(false), 9000);
            return () => {
                clearTimeout(t);
                clearTimeout(autoHide);
            };
        }
        setShowHint(false);
    }, [showAiSidebar]);

    if (!currentCard || flashcards.length === 0) {
        return (
            <div className={`min-h-screen bg-gray-50 transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-48'}`}>
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Không có thẻ ghi nhớ nào</h2>
                        <p className="text-gray-600 mb-6">Hãy tạo thẻ ghi nhớ trước khi bắt đầu học</p>
                        <p className="text-sm text-gray-500 mb-4">Debug: {flashcards.length} flashcards loaded</p>
                        <button
                            onClick={onBack}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Quay lại
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{`
                .scrollbar-thin::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .scrollbar-thin::-webkit-scrollbar-track {
                    background: transparent;
                }
                .scrollbar-thin::-webkit-scrollbar-thumb {
                    background: rgba(156, 163, 175, 0.3);
                    border-radius: 3px;
                }
                .scrollbar-thin::-webkit-scrollbar-thumb:hover {
                    background: rgba(156, 163, 175, 0.5);
                }
                /* Firefox */
                .scrollbar-thin {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
                }
            `}</style>
        <div className={`min-h-screen bg-gray-50 transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-48'}`}>
            {/* Top Header (copied from CreateFlashcardSet) */}
            <div className={`bg-white fixed top-0 right-0 z-10 transition-all duration-300 ${isCollapsed ? 'left-16' : 'left-40'}`}>
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={onBack}
                                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span>Quay lại</span>
                            </button>
                            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-yellow-400 rounded-lg flex items-center justify-center">
                                <img src="/18.gif" alt="Flashcard" className="w-6 h-6 object-contain" />
                            </div>
                            <div className="flex items-center space-x-2">
                                <h1 className="text-xl font-bold text-gray-900">{flashcardName || 'Flashcard'}</h1>
                                <button className="p-1 text-gray-400 hover:text-gray-600" aria-label="More">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                            <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 rounded-lg flex items-center space-x-1">
                                <Plus className="w-4 h-4" />
                                <span>New</span>
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600" aria-label="Upload">
                                <Upload className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600" aria-label="Apps">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                                <span className="text-sm">Share</span>
                            </button>
                            <button className="px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg flex items-center space-x-2">
                                <span className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">i</span>
                                <span className="text-sm">Feedback</span>
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600" aria-label="Link">
                                <Link className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600" aria-label="Upload 2">
                                <Upload className="w-4 h-4" />
                            </button>
                            <div className="relative">
                                <button className="p-2 text-gray-400 hover:text-gray-600" aria-label="Profile">
                                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">H</div>
                                </button>
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">1</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`relative flex h-[calc(100vh-64px)] pt-16 ${isResizing ? 'select-none' : ''}`}
            >
                {/* Main Flashcard Area */}
                <div
                    className={`flex-1 flex flex-col ${isCollapsed ? 'pl-0 pr-1 md:pl-0 md:pr-2 -ml-3 md:-ml-4' : 'pl-0 pr-1 md:pl-0 md:pr-2 -ml-16 md:-ml-20'}`}
                    style={{ minWidth: 0 }}
                >
                    {/* Flashcard Display */}
                    <div className="flex-1 flex items-start md:items-center justify-center pl-0 pr-2 md:pl-0 md:pr-4 py-4 md:py-8">
                        <div className="w-full mx-auto" style={{ maxWidth: cardMaxWidth }}>
                            {/* Header row above card */}
                            <div className="flex items-center justify-between mb-4 pr-0">
                                <span className="text-sm font-medium text-gray-600">Thuật ngữ</span>
                                <span className="text-sm text-gray-500">
                                    {currentCardIndex + 1}/{flashcards.length}
                                    <span className="ml-2 text-xs text-red-500">
                                    </span>
                                </span>
                            </div>

                            {/* Flashcard (3D flip) */}
                            <div
                                className="w-full h-96 md:h-[28rem] overflow-hidden"
                                style={{ perspective: '1000px' }}
                            >
                                <div
                                    className={`relative w-full h-full cursor-pointer transition-all duration-300 ease-in-out`}
                                    style={{
                                        transformStyle: 'preserve-3d',
                                        transform: `
                                            ${isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)'}
                                            ${slideDirection === 'left' ? 'translateX(-100%)' : ''}
                                            ${slideDirection === 'right' ? 'translateX(100%)' : ''}
                                        `,
                                        opacity: isSliding ? 0.7 : 1
                                    }}
                                    onClick={flipCard}
                                >
                                    {/* Front */}
                                    <div
                                            className="absolute inset-0 bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center text-center cursor-pointer overflow-y-auto scrollbar-hover"
                                            style={{ backfaceVisibility: 'hidden', justifyContent: isMultipleChoiceCard(currentCard) ? 'flex-start' : 'center' }}
                                        >
                                            {/* Hint icon for fill-in-the-blank (top left) */}
                                            {isFillBlankCard(currentCard) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        showFillBlankHint();
                                                    }}
                                                    className="absolute top-3 left-3 p-2 rounded-full transition-colors text-gray-400 hover:text-yellow-500 hover:bg-yellow-50"
                                                    aria-label="hint"
                                                    title="Gợi ý"
                                                >
                                                    <Lightbulb className="w-5 h-5" />
                                                </button>
                                            )}

                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleBookmark(); }}
                                            className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${bookmarkedCards.has(currentCard.id) ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-yellow-500'}`}
                                            aria-label="bookmark"
                                        >
                                            <Star className="w-5 h-5" />
                                        </button>

                                            {isFillBlankCard(currentCard) ? (
                                                // Fill in the blank UI
                                                <div className="w-full flex flex-col items-center space-y-4">
                                                    <div className="text-2xl text-gray-800 mb-4 flex items-center flex-wrap justify-center gap-2">
                                                        {parseFillBlankText(currentCard.term).map((part, index) => (
                                                            part.type === 'text' ? (
                                                                <span key={index}>{part.content}</span>
                                                            ) : (
                                                                <div key={index} className="relative inline-block">
                                                                    <input
                                                                        type="text"
                                                                        value={fillBlankInput}
                                                                        onChange={(e) => {
                                                                            e.stopPropagation();
                                                                            setFillBlankInput(e.target.value);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' && !fillBlankChecked) {
                                                                                e.stopPropagation();
                                                                                checkFillBlankAnswer();
                                                                            }
                                                                        }}
                                                                        onFocus={(e) => {
                                                                            // Đảm bảo hint không chặn focus
                                                                            if (fillBlankHint && fillBlankInput.length === 0) {
                                                                                e.target.style.color = 'transparent';
                                                                            }
                                                                        }}
                                                                        onBlur={(e) => {
                                                                            if (fillBlankInput.length === 0) {
                                                                                e.target.style.color = '';
                                                                            }
                                                                        }}
                                                                        disabled={fillBlankChecked}
                                                                        className={`min-w-[120px] px-3 py-2 text-2xl text-center border-b-2 border-gray-400 focus:outline-none focus:border-blue-500 ${fillBlankChecked
                                                                            ? fillBlankIsCorrect
                                                                                ? 'border-green-500 bg-green-50'
                                                                                : 'border-red-500 bg-red-50'
                                                                            : ''
                                                                            } ${fillBlankHint && fillBlankInput.length === 0 ? 'relative' : ''}`}
                                                                        style={fillBlankHint && fillBlankInput.length === 0 ? { color: 'transparent' } : {}}
                                                                        autoFocus
                                                                    />
                                                                    {fillBlankHint && fillBlankInput.length === 0 && (
                                                                        <span
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setFillBlankInput(fillBlankHint);
                                                                                // Focus vào input sau khi điền hint
                                                                                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                                                if (input) {
                                                                                    setTimeout(() => {
                                                                                        input.focus();
                                                                                        // Đặt cursor ở cuối
                                                                                        const length = fillBlankHint.length;
                                                                                        input.setSelectionRange(length, length);
                                                                                        input.style.color = '';
                                                                                    }, 0);
                                                                                }
                                                                            }}
                                                                            className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-orange-500 cursor-pointer hover:text-orange-600 pointer-events-auto"
                                                                            title="Click để điền chữ đầu tiên"
                                                                        >
                                                                            {fillBlankHint}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )
                                                        ))}
                                                    </div>
                                                    {fillBlankChecked && fillBlankIsCorrect === false && (
                                                        <div className="text-sm text-gray-600 mb-2">
                                                            You got 1 incorrect.
                                                        </div>
                                                    )}
                                                    {showCorrectAnswer && (
                                                        <div className="text-2xl text-gray-800 mb-4">
                                                            {correctAnswer}
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (fillBlankChecked && fillBlankIsCorrect === false) {
                                                                handleShowCorrectAnswer();
                                                            } else {
                                                                checkFillBlankAnswer();
                                                            }
                                                        }}
                                                        disabled={!fillBlankInput.trim() || (fillBlankChecked && fillBlankIsCorrect === true)}
                                                        className={`px-6 py-3 text-white font-semibold rounded-lg transition-colors ${fillBlankChecked && fillBlankIsCorrect === false
                                                            ? 'bg-purple-900 hover:bg-purple-800' // Dark purple for "Show Correct Answers"
                                                            : 'bg-purple-700 hover:bg-purple-800' // Regular purple for "Check Answers"
                                                            } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                                                    >
                                                        {fillBlankChecked && fillBlankIsCorrect === false ? 'Show Correct Answers' : 'Check Answers'}
                                                    </button>
                                                    {currentCard.termImage && (
                                                        <img
                                                            src={currentCard.termImage}
                                                            alt="Term"
                                                            className="w-full max-w-md mx-auto rounded-lg object-contain mt-4"
                                                        />
                                                    )}
                                                </div>
                                            ) : isMultipleChoiceCard(currentCard) ? (
                                                // Multiple Choice UI
                                                <div className="w-full flex flex-col items-center space-y-4 py-4">
                                                    {/* Term/Question */}
                                                    <div className="text-2xl text-gray-800 mb-4 max-w-4xl w-full px-4 break-words overflow-y-auto max-h-40 scrollbar-hover">
                                                        {currentCard.term}
                                                    </div>
                                                    {currentCard.termImage && (
                                                        <img
                                                            src={currentCard.termImage}
                                                            alt="Term"
                                                            className="w-full max-w-md mx-auto rounded-lg object-contain mb-4"
                                                        />
                                                    )}

                                                    {/* Options Grid */}
                                                    {(() => {
                                                        let options = currentCard.multipleChoiceOptions;
                                                        let correctIndex = currentCard.correctAnswerIndex;

                                                        // Parse from definition if needed
                                                        if (!options && currentCard.definition) {
                                                            try {
                                                                const parsed = typeof currentCard.definition === 'string' ? JSON.parse(currentCard.definition) : currentCard.definition;
                                                                if (parsed && parsed.options) {
                                                                    options = parsed.options;
                                                                    correctIndex = parsed.correctIndex ?? parsed.correctAnswerIndex ?? 0;
                                                                }
                                                            } catch (e) {
                                                                console.error('Error parsing multiple choice:', e);
                                                            }
                                                        }

                                                        if (!options || options.length === 0) {
                                                            return <div className="text-gray-500">No options available</div>;
                                                        }

                                                        return (
                                                            <div className="w-full max-w-2xl">
                                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                                    {options.map((option: string, index: number) => {
                                                                        const isSelected = selectedOptionIndex === index;
                                                                        const isCorrect = correctIndex === index;
                                                                        const showResult = multipleChoiceChecked;

                                                                        let bgColor = 'bg-white';
                                                                        let borderColor = 'border-gray-300';
                                                                        let textColor = 'text-gray-800';
                                                                        let icon = null;

                                                                        if (showResult) {
                                                                            if (isCorrect) {
                                                                                bgColor = 'bg-green-50';
                                                                                borderColor = 'border-green-500';
                                                                                textColor = 'text-green-800';
                                                                                icon = (
                                                                                    <div className="absolute top-2 right-2">
                                                                                        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                                        </svg>
                                                                                    </div>
                                                                                );
                                                                            } else {
                                                                                // All incorrect options show red X
                                                                                bgColor = 'bg-red-50';
                                                                                borderColor = 'border-red-500';
                                                                                textColor = 'text-red-800';
                                                                                icon = (
                                                                                    <div className="absolute top-2 right-2">
                                                                                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                                        </svg>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                        } else if (isSelected) {
                                                                            borderColor = 'border-blue-500';
                                                                        }

                                                                        return (
                                                                            <div
                                                                                key={index}
                                                                                data-option
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (!multipleChoiceChecked) {
                                                                                        setSelectedOptionIndex(index);
                                                                                    }
                                                                                }}
                                                                                className={`relative p-6 rounded-lg border-2 ${borderColor} ${bgColor} ${textColor} cursor-pointer transition-all overflow-y-auto min-h-[80px] max-h-56 scrollbar-hover ${!multipleChoiceChecked ? 'hover:border-blue-400 hover:shadow-md' : ''
                                                                                    }`}
                                                                            >
                                                                                {icon}
                                                                                <div className="text-lg font-medium break-words pr-8">
                                                                                    {option || `Option ${index + 1}`}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {multipleChoiceChecked && multipleChoiceIsCorrect === false && (
                                                                    <div className="text-center text-xl font-semibold text-gray-900 mb-4">
                                                                        You are incorrect!
                                                                    </div>
                                                                )}

                                                                <button
                                                                    data-check-button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (selectedOptionIndex !== null && !multipleChoiceChecked) {
                                                                            checkMultipleChoiceAnswer();
                                                                        }
                                                                    }}
                                                                    disabled={selectedOptionIndex === null || multipleChoiceChecked}
                                                                    className="px-6 py-3 bg-purple-700 hover:bg-purple-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                                                                >
                                                                    Check Answers
                                                                </button>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                // Default UI (Term and Definition)
                                                <>
                                                    <p className="text-2xl text-gray-800 mb-4 cursor-pointer">
                                            {currentCard.term}
                                            <span className="ml-2 text-xs text-red-500">
                                            </span>
                                        </p>
                                        {currentCard.termImage && (
                                            <img
                                                src={currentCard.termImage}
                                                alt="Term"
                                                            className="w-full max-w-md mx-auto rounded-lg object-contain cursor-pointer"
                                            />
                                                    )}
                                                </>
                                        )}
                                    </div>

                                    {/* Back */}
                                    <div
                                            className="absolute inset-0 bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer overflow-y-auto scrollbar-hover"
                                        style={{
                                            backfaceVisibility: 'hidden',
                                            transform: 'rotateX(180deg)'
                                        }}
                                    >
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleBookmark(); }}
                                            className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${bookmarkedCards.has(currentCard.id) ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-yellow-500'}`}
                                            aria-label="bookmark"
                                        >
                                            <Star className="w-5 h-5" />
                                        </button>
                                            {isMultipleChoiceCard(currentCard) ? (
                                                // Multiple Choice Back: Show explanation or correct answer info
                                                <div className="w-full">
                                                    {(() => {
                                                        // Try to parse definition as JSON to get explanation
                                                        let explanation = null;
                                                        let correctAnswer = null;

                                                        if (currentCard.definition) {
                                                            try {
                                                                const parsed = typeof currentCard.definition === 'string'
                                                                    ? JSON.parse(currentCard.definition)
                                                                    : currentCard.definition;
                                                                if (parsed && parsed.options && parsed.correctIndex !== undefined) {
                                                                    correctAnswer = parsed.options[parsed.correctIndex];
                                                                    explanation = parsed.explanation || `Đáp án đúng: ${correctAnswer}`;
                                                                } else {
                                                                    explanation = currentCard.definition;
                                                                }
                                                            } catch (e) {
                                                                // Not JSON, use as is
                                                                explanation = currentCard.definition;
                                                            }
                                                        }

                                                        // If we have options from multipleChoiceOptions, use that for correct answer
                                                        if (!explanation && currentCard.multipleChoiceOptions && currentCard.correctAnswerIndex !== undefined) {
                                                            const correctOpt = currentCard.multipleChoiceOptions[currentCard.correctAnswerIndex];
                                                            explanation = `Đáp án đúng: ${correctOpt}`;
                                                        }

                                                        return (
                                                            <div className="space-y-4">
                                                                {explanation && (
                                                                    <p className="text-2xl text-gray-800 mb-4">{explanation}</p>
                                                                )}
                                                                {correctAnswer && (
                                                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                                        <p className="text-lg font-semibold text-green-800">Đáp án đúng:</p>
                                                                        <p className="text-xl text-green-900 mt-2">{correctAnswer}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                // Default: Show definition as text
                                                <>
                                        <p className="text-2xl text-gray-800 mb-4">{currentCard.definition}</p>
                                        {currentCard.definitionImage && (
                                            <img
                                                src={currentCard.definitionImage}
                                                alt="Definition"
                                                className="w-full max-w-md mx-auto rounded-lg object-contain"
                                            />
                                                    )}
                                                </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Navigation Controls */}
                            <div className="flex items-center justify-center space-x-4 mt-8">
                                <button
                                    onClick={prevCard}
                                    disabled={currentCardIndex === 0 || isSliding}
                                    className="p-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors"
                                >
                                    <ArrowLeft className="w-6 h-6 text-gray-600" />
                                </button>
                                <button
                                    onClick={() => {
                                        console.log('Next button clicked');
                                        console.log('Current index:', currentCardIndex);
                                        console.log('Total cards:', flashcards.length);
                                        console.log('Can go next?', currentCardIndex < flashcards.length - 1);
                                        nextCard();
                                    }}
                                    disabled={currentCardIndex === flashcards.length - 1 || isSliding}
                                    className="p-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors"
                                >
                                    <ArrowRight className="w-6 h-6 text-gray-600" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action Bar - centered fixed like reference */}
                    <div
                        className="fixed bottom-4 left-0 z-10 pointer-events-none"
                        style={{ right: showAiSidebar ? sidebarWidth + 24 : 0 }}
                    >
                        <div className="flex items-center gap-3 justify-center pointer-events-auto">
                            <button
                                onClick={shuffleCards}
                                className={`pointer-events-auto px-4 py-2 rounded-full border ${isShuffled ? 'border-emerald-400 text-emerald-600' : 'border-emerald-300 text-emerald-600'} bg-white shadow-sm hover:bg-emerald-50 transition-colors flex items-center gap-2`}
                            >
                                <Shuffle className="w-4 h-4" />
                                <span className="text-sm">Shuffle Flashcards</span>
                            </button>
                                <button
                                    onClick={() => {
                                        const v = !audioEnabled;
                                        setAudioEnabled(v);
                                        setHasUserInteracted(true);

                                        // QUAN TRỌNG: Phải unlock TTS ngay trong gesture
                                        if (v) {
                                            unlockTTS();
                                        }

                                        try { localStorage.setItem('ttsEnabled', v ? '1' : '0'); } catch { }

                                        // Nếu bật, đọc ngay thẻ hiện tại
                                        if (v && currentCard && !isFlipped) {
                                            setTimeout(() => {
                                                const term = currentCard.term?.toString().trim();
                                                if (term) speakText(term);
                                            }, 300);
                                        }
                                    }}
                                    className={`pointer-events-auto px-4 py-2 rounded-full ${audioEnabled ? 'text-blue-600 border-blue-300 bg-blue-50' : 'text-gray-700 border-gray-300'} bg-white border shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2`}
                                    title="Bật/Tắt đọc thuật ngữ"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5l-6 6h-3v2h3l6 6V5z"></path><path d="M19 5a7 7 0 010 14"></path><path d="M19 9a3 3 0 010 6"></path></svg>
                                    <span className="text-sm">{audioEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}</span>
                                </button>
                                {audioEnabled && currentCard && !isFlipped && (
                                    <button
                                        onClick={() => {
                                            setHasUserInteracted(true);
                                            const term = currentCard.term?.toString().trim();
                                            if (term) speakText(term);
                                        }}
                                        className="pointer-events-auto px-4 py-2 rounded-full text-green-600 border-green-300 bg-white shadow-sm hover:bg-green-50 transition-colors flex items-center gap-2"
                                        title="Đọc lại thuật ngữ hiện tại"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                                        <span className="text-sm">Đọc lại</span>
                                    </button>
                                )}
                            <button
                                onClick={() => toggleBookmark()}
                                className="pointer-events-auto px-4 py-2 rounded-full text-gray-700 bg-white shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <Star className="w-4 h-4" />
                                <span className="text-sm">Bookmarked</span>
                            </button>
                            <button
                                onClick={flipCard}
                                className="pointer-events-auto px-4 py-2 rounded-full text-gray-700 bg-white shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span className="text-sm">Click to Flip</span>
                            </button>
                            <button
                                className="pointer-events-auto px-4 py-2 rounded-full border border-blue-400 text-blue-600 bg-white shadow-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
                            >
                                <GraduationCap className="w-4 h-4" />
                                <span className="text-sm">Track Stats with Spaced Repetition</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Vertical Divider (draggable) */}
                {showAiSidebar && (
                    <div
                        className="w-1 cursor-col-resize bg-gray-100 hover:bg-blue-200 active:bg-blue-300 transition-colors relative group"
                        onMouseDown={() => setIsResizing(true)}
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Resize sidebar"
                        title="Kéo để thay đổi kích thước chat"
                    >
                        {/* Visual indicator */}
                        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-0.5 bg-gray-200 group-hover:bg-blue-400 transition-colors"></div>
                        {/* Dots indicator */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col space-y-1 opacity-0 group-hover:opacity-60 transition-opacity">
                            <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
                            <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
                            <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
                        </div>
                    </div>
                )}

                {/* AI Tutor Sidebar - compact modern */}
                {showAiSidebar && (
                    <div className="flex flex-col min-w-0 overflow-hidden h-[calc(100vh-64px)] rounded-l-xl shadow-xl bg-white/80 backdrop-blur"
                        style={{ width: `${sidebarWidth}px`, minWidth: 250, maxWidth: 600 }}>
                        {/* Chat Header */}
                        <div className="bg-white/70 px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <button onClick={() => setShowAiSidebar(false)} className="p-2 hover:bg-gray-100 rounded-lg active:scale-95 transition"><span className="text-2xl leading-none">×</span></button>
                                <span className="text-sm text-gray-600">AI Tutor</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <button
                                    onClick={() => setSidebarWidth(250)}
                                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                    title="Kích thước nhỏ"
                                >
                                    S
                                </button>
                                <button
                                    onClick={() => setSidebarWidth(350)}
                                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                    title="Kích thước vừa"
                                >
                                    M
                                </button>
                                <button
                                    onClick={() => setSidebarWidth(500)}
                                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                    title="Kích thước lớn"
                                >
                                    L
                                </button>
                            </div>
                        </div>

                        {/* Chat Content */}
                        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto bg-white/50">
                            {/* Chat Messages */}
                            {chatHistory.length > 0 ? (
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {chatHistory.map((msg, index) => (
                                        <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.type === 'user'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-white text-gray-800'
                                                }`}>
                                                <div
                                                    className={`text-sm prose prose-sm max-w-none ${msg.type === 'user' ? 'prose-invert [&_*]:!text-white' : ''}`}
                                                    dangerouslySetInnerHTML={{ __html: renderMessage(msg.message) }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {/* AI đang trả lời */}
                                    {isLoadingChat && (
                                        <div className="flex justify-start">
                                            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-white text-gray-800">
                                                <div className="flex items-center space-x-2">
                                                    <div className="flex space-x-1">
                                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                    </div>
                                                    <span className="text-sm text-gray-600">AI đang suy nghĩ...</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col px-4 pt-6 items-center justify-start">
                                    <div className="mb-4">
                                        <div className="w-28 h-28 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mx-auto mb-3 flex items-center justify-center shadow">
                                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                                                <img
                                                    src={(process.env.PUBLIC_URL || '') + '/quizzes_icon.webp'}
                                                    alt="Spark.E"
                                                    className="w-20 h-20 object-contain"
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLImageElement).src = (process.env.PUBLIC_URL || '') + '/quizzes-icon.webp';
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <h2 className="text-lg font-semibold text-gray-800 mb-3">Hello, I'm Spark.E</h2>

                                    {/* Current Flashcard Info */}
                                    {currentCard && (
                                        <div className="w-full max-w-md mb-5 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                            <h3 className="text-sm font-semibold text-blue-800 mb-2">📚 Flashcard hiện tại:</h3>
                                            <div className="text-sm text-blue-700">
                                                    {/* Loại bỏ {{...}} khỏi Term cho Fill in the Blank */}
                                                    <p><strong>Term:</strong> {
                                                        isFillBlankCard(currentCard)
                                                            ? (currentCard.term || '').replace(/\{\{[^}]+\}\}/g, '____')
                                                            : currentCard.term
                                                    }</p>
                                                    {/* Ẩn Definition cho Multiple Choice và Fill in the Blank */}
                                                    {!isMultipleChoiceCard(currentCard) && !isFillBlankCard(currentCard) && (
                                                <p><strong>Definition:</strong> {currentCard.definition}</p>
                                                    )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Suggested prompt tiles */}
                                    <div className="w-full max-w-md space-y-3">
                                        <button
                                            onClick={() => handleAISubmit('Giải thích chi tiết hơn về từ này')}
                                            className="w-full flex items-stretch rounded-2xl overflow-hidden bg-white text-left hover:shadow transition-shadow"
                                        >
                                            <div className="flex-1 px-5 py-4">
                                                <div className="text-gray-800 font-medium leading-snug">Giải thích chi tiết<br />hơn về từ này</div>
                                            </div>
                                            <div className="w-24 bg-indigo-50 flex items-center justify-center">
                                                <Lightbulb className="w-6 h-6 text-indigo-400" />
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handleAISubmit('Từ này liên quan đến chủ đề gì khác?')}
                                            className="w-full flex items-stretch rounded-2xl overflow-hidden bg-white text-left hover:shadow transition-shadow"
                                        >
                                            <div className="flex-1 px-5 py-4">
                                                <div className="text-gray-800 font-medium leading-snug">Từ này liên quan đến<br />chủ đề gì khác?</div>
                                            </div>
                                            <div className="w-24 bg-blue-50 flex items-center justify-center">
                                                <Brain className="w-6 h-6 text-blue-400" />
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handleAISubmit('Cho tôi ví dụ thực tế về từ này')}
                                            className="w-full flex items-stretch rounded-2xl overflow-hidden bg-white text-left hover:shadow transition-shadow"
                                        >
                                            <div className="flex-1 px-5 py-4">
                                                <div className="text-gray-800 font-medium leading-snug">Cho tôi ví dụ thực tế<br />về từ này</div>
                                            </div>
                                            <div className="w-24 bg-emerald-50 flex items-center justify-center">
                                                <Book className="w-6 h-6 text-emerald-500" />
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Input Area */}
                        <div className="p-3 md:p-4 bg-white/80 backdrop-blur w-full overflow-hidden sticky bottom-0">
                            {/* Removed top icons and divider for cleaner look */}
                            <div className="flex items-center w-full">
                                <div className="flex items-center w-full bg-white rounded-full px-4 py-3 shadow">
                                    <button className="w-8 h-8 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3"><span className="text-gray-600 text-sm">🖼️</span></button>
                                    <input
                                        type="text"
                                        placeholder="Ask your AI tutor anything..."
                                        className="flex-1 min-w-0 bg-transparent outline-none text-sm md:text-base placeholder-gray-400"
                                        value={chatMessage}
                                        onChange={(e) => setChatMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        disabled={isLoadingChat}
                                    />
                                </div>
                                <button
                                    className="ml-2 w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors flex-shrink-0 shadow disabled:opacity-50"
                                    onClick={sendChatMessage}
                                    disabled={isLoadingChat || !chatMessage.trim()}
                                >
                                    {isLoadingChat ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <span className="text-sm">↑</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Floating chat toggle + hint when sidebar hidden */}
            {!showAiSidebar && (
                <div className="fixed right-2 md:right-4 bottom-8 md:bottom-10 z-20 flex items-center space-x-3">
                    {showHint && (
                        <div className="px-3 py-2 bg-black/70 text-white text-sm rounded-lg shadow-md whitespace-nowrap select-none">
                            Cần trợ giúp? Nhấn vào tôi nhé!
                        </div>
                    )}
                    <button
                        onClick={() => { setShowAiSidebar(true); setShowHint(false); }}
                        onMouseEnter={() => setShowHint(false)}
                        className="w-[160px] h-[180px] rounded-3xl bg-transparent flex items-center justify-center"
                        title="Open chat"
                    >
                        <img
                            src={(process.env.PUBLIC_URL || '') + '/chatbot.gif?v=2'}
                            alt="Chatbot"
                            className="w-[140px] h-[140px] object-contain"
                        />
                    </button>
                </div>
            )}
        </div>
        </>
    );
};

export default StudyFlashcards;
