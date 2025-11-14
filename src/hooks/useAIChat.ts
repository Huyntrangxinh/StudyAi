import { useState } from 'react';
import { isFillBlankCard, isMultipleChoiceCard } from '../utils/flashcardStudyHelpers';

interface UseAIChatProps {
    currentCard: any;
    studySetId?: string;
}

export const useAIChat = ({ currentCard, studySetId }: UseAIChatProps) => {
    const [chatMessage, setChatMessage] = useState<string>('');
    const [chatHistory, setChatHistory] = useState<Array<{ type: 'user' | 'ai', message: string }>>([]);
    const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);

    // Detect flashcard type: English vocabulary vs specialized term
    const detectFlashcardType = (): 'english_vocab' | 'specialized_term' | 'unknown' => {
        const term = currentCard?.term || '';
        const definition = currentCard?.definition || '';

        if (!definition || definition.trim().length === 0) {
            return 'unknown';
        }

        const definitionLower = definition.toLowerCase();
        const termLower = term.toLowerCase();

        // Check if term contains English words (not just Vietnamese)
        const hasEnglishWords = /[a-zA-Z]{3,}/.test(term);

        // Keywords indicating specialized/technical terms
        const specializedKeywords = [
            'sử dụng', 'để', 'kiểm soát', 'ngăn chặn', 'bảo vệ', 'hệ thống',
            'công nghệ', 'phần mềm', 'thiết bị', 'mạng', 'lưu lượng', 'kết nối',
            'quản lý', 'xử lý', 'phân tích', 'giám sát', 'cấu hình', 'triển khai',
            'ứng dụng', 'chức năng', 'nhiệm vụ', 'mục đích', 'phương pháp', 'kỹ thuật',
            'chiến lược', 'giải pháp', 'cơ chế', 'quy trình', 'hoạt động', 'vận hành'
        ];

        // Keywords indicating English vocabulary learning
        const englishVocabKeywords = [
            'từ tiếng anh', 'tiếng anh', 'english word', 'vocabulary', 'từ vựng',
            'nghĩa là', 'có nghĩa là', 'được dịch là', 'dịch sang'
        ];

        // Count specialized keywords in definition
        const specializedCount = specializedKeywords.filter(keyword =>
            definitionLower.includes(keyword)
        ).length;

        // Count English vocab keywords
        const vocabCount = englishVocabKeywords.filter(keyword =>
            definitionLower.includes(keyword) || termLower.includes(keyword)
        ).length;

        // Check definition length and structure
        const isLongDefinition = definition.length > 80;
        const hasActionVerbs = /(sử dụng|để|kiểm soát|ngăn chặn|bảo vệ|quản lý)/.test(definitionLower);
        const hasTechnicalContext = /(hệ thống|công nghệ|phần mềm|thiết bị|mạng)/.test(definitionLower);

        // Decision logic
        // If has explicit English vocab keywords, prioritize that
        if (vocabCount > 0 && specializedCount === 0) {
            return 'english_vocab';
        }

        // If has specialized keywords or technical context, it's specialized
        if (specializedCount > 0 || hasActionVerbs || hasTechnicalContext || isLongDefinition) {
            return 'specialized_term';
        }

        // If has English words but short definition without specialized context, might be vocab
        if (hasEnglishWords && !isLongDefinition && specializedCount === 0) {
            return 'english_vocab';
        }

        // Default to specialized if has English words (likely technical term with English name)
        if (hasEnglishWords) {
            return 'specialized_term';
        }

        return 'unknown';
    };

    const buildFlashcardInfoSection = (): string => {
        const currentTerm = currentCard?.term || '';
        const flashcardType = detectFlashcardType();

        let flashcardInfoSection = `Thông tin flashcard hiện tại:
- Term (Thuật ngữ): ${currentTerm}
- Loại: ${flashcardType === 'english_vocab' ? 'Từ mới tiếng Anh' : flashcardType === 'specialized_term' ? 'Thuật ngữ chuyên ngành' : 'Không xác định'}`;

        if (isMultipleChoiceCard(currentCard)) {
            let options = currentCard.multipleChoiceOptions;
            let correctIndex = currentCard.correctAnswerIndex;

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
        } else if (isFillBlankCard(currentCard)) {
            let answers = currentCard.fillBlankAnswers;

            if (!answers && currentCard.definition) {
                try {
                    const parsed = typeof currentCard.definition === 'string' ? JSON.parse(currentCard.definition) : currentCard.definition;
                    if (Array.isArray(parsed)) {
                        answers = parsed;
                    }
                } catch (e) {
                    const matches = currentCard.term?.match(/\{\{([^}]+)\}\}/g);
                    if (matches) {
                        answers = matches.map((m: string) => m.replace(/\{\{|\}\}/g, ''));
                    }
                }
            }

            if (answers && Array.isArray(answers) && answers.length > 0) {
                flashcardInfoSection += `\n- Loại câu hỏi: Điền vào chỗ trống (Fill in the Blank)`;
                flashcardInfoSection += `\n- Các đáp án đúng (Correct Answers): ${answers.join(', ')}`;
                flashcardInfoSection += `\n- Lưu ý: Thông tin này chỉ dùng để trợ giúp học tập khi người dùng yêu cầu. Không hiển thị đáp án trừ khi được yêu cầu cụ thể.`;
            }
        } else {
            const currentDefinition = currentCard?.definition || '';
            if (currentDefinition) {
                flashcardInfoSection += `\n- Definition (Định nghĩa): ${currentDefinition}`;
            }
        }

        return flashcardInfoSection;
    };

    const sendChatMessage = async () => {
        if (!chatMessage.trim() || isLoadingChat) return;

        const userMessage = chatMessage.trim();
        setChatMessage('');
        setChatHistory(prev => [...prev, { type: 'user', message: userMessage }]);
        setIsLoadingChat(true);

        const maxRetries = 3;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const flashcardInfoSection = buildFlashcardInfoSection();
                const flashcardType = detectFlashcardType();

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                const response = await fetch('http://localhost:3001/api/ai/study-flashcard', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: userMessage,
                        studySetId: studySetId || '',
                        flashcardInfoSection,
                        flashcardType,
                        mode: 'chat'
                    }),
                    signal: controller.signal
                });

                console.log('📥 Response:', response);

                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    setChatHistory(prev => [...prev, { type: 'ai', message: data.response }]);
                    setIsLoadingChat(false);
                    return;
                } else {
                    if (response.status >= 500 && attempt < maxRetries - 1) {
                        lastError = new Error(`Server error: ${response.status}`);
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                        continue;
                    } else {
                        setChatHistory(prev => [...prev, { type: 'ai', message: 'Xin lỗi, có lỗi xảy ra khi gửi tin nhắn.' }]);
                        setIsLoadingChat(false);
                        return;
                    }
                }
            } catch (error: any) {
                console.error(`Error sending chat message (attempt ${attempt + 1}/${maxRetries}):`, error);

                if ((error.name === 'AbortError' || error.message?.includes('fetch')) && attempt < maxRetries - 1) {
                    lastError = error;
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                    continue;
                } else {
                    setChatHistory(prev => [...prev, { type: 'ai', message: 'Xin lỗi, có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại sau.' }]);
                    setIsLoadingChat(false);
                    return;
                }
            }
        }

        setChatHistory(prev => [...prev, { type: 'ai', message: 'Xin lỗi, không thể kết nối với AI tutor. Vui lòng thử lại sau vài giây.' }]);
        setIsLoadingChat(false);
    };

    const handleAISubmit = async (prompt: string) => {
        const flashcardInfoSection = buildFlashcardInfoSection();
        const flashcardType = detectFlashcardType();

        try {
            const response = await fetch('http://localhost:3001/api/ai/study-flashcard', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: prompt,
                    studySetId: studySetId || '',
                    flashcardInfoSection,
                    flashcardType,
                    mode: 'submit'
                })
            });

            if (response.ok) {
                const data = await response.json();
                setChatHistory(prev => [...prev, { type: 'ai', message: data.response }]);
            } else {
                setChatHistory(prev => [...prev, { type: 'ai', message: 'Xin lỗi, có lỗi xảy ra khi gửi tin nhắn.' }]);
            }
        } catch (error) {
            console.error('Error calling AI:', error);
            setChatHistory(prev => [...prev, { type: 'ai', message: 'Xin lỗi, có lỗi xảy ra khi gửi tin nhắn.' }]);
        }
    };

    return {
        chatMessage,
        setChatMessage,
        chatHistory,
        setChatHistory,
        isLoadingChat,
        sendChatMessage,
        handleAISubmit
    };
};

