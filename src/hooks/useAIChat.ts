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

                // Build prompt based on flashcard type
                let basePrompt = '';
                if (flashcardType === 'english_vocab') {
                    // English vocabulary learning prompt
                    basePrompt = `Bạn là AI tutor chuyên giúp học từ mới tiếng Anh. 
            
${flashcardInfoSection}

Câu hỏi của bạn: ${userMessage}

Hãy trả lời theo format sau:
1. Bắt đầu với "Chào bạn! 🎉 Rất vui khi được giúp bạn hiểu rõ hơn về từ này! 😊"
2. Hiển thị thông tin flashcard: "Flashcard của chúng ta hôm nay là: **Từ:** [term]"
3. **QUAN TRỌNG**: Nếu người dùng yêu cầu dịch/giải thích đáp án (ví dụ: "dịch cho tôi từng đáp án", "giải thích các đáp án", "translate the options"), hãy dịch và giải thích từng đáp án một cách chi tiết, rõ ràng.
4. Nếu có lỗi chính tả, nhắc nhở nhẹ nhàng như "Có lẽ có một chút nhầm lẫn ở đây về từ [từ đúng] đó bạn ơi! 😉"
5. **Giải thích chi tiết** với:
   - Định nghĩa rõ ràng và dễ hiểu
   - **Ví dụ câu tiếng Anh** sử dụng từ đó
   - **Ví dụ câu tiếng Việt** tương ứng
   - Các từ liên quan hoặc từ đồng nghĩa
   - Lưu ý về cách sử dụng trong ngữ cảnh
6. Kết thúc bằng "Bạn có muốn mình giải thích kỹ hơn phần nào không? Mình luôn sẵn sàng giúp bạn học tập vui vẻ! 🎉😊"
7. Sử dụng nhiều emoji, tone giáo dục thân thiện, và gọi "bạn" trong câu trả lời.
8. **QUAN TRỌNG**: Không tự động hiển thị đáp án đúng hoặc định nghĩa cho câu hỏi trắc nghiệm/điền chỗ trống trừ khi người dùng yêu cầu cụ thể.`;
                } else if (flashcardType === 'specialized_term') {
                    // Specialized term learning prompt
                    basePrompt = `Bạn là AI tutor chuyên giúp học thuật ngữ chuyên ngành. 
            
${flashcardInfoSection}

Câu hỏi của bạn: ${userMessage}

Hãy trả lời theo format sau:
1. Bắt đầu với "Chào bạn! 🎉 Rất vui khi được giúp bạn hiểu rõ hơn về thuật ngữ này! 😊"
2. Hiển thị thông tin flashcard: "Flashcard của chúng ta hôm nay là: **Thuật ngữ:** [term]"
3. **QUAN TRỌNG**: Nếu người dùng yêu cầu dịch/giải thích đáp án (ví dụ: "dịch cho tôi từng đáp án", "giải thích các đáp án", "translate the options"), hãy dịch và giải thích từng đáp án một cách chi tiết, rõ ràng.
4. Nếu có lỗi chính tả, nhắc nhở nhẹ nhàng như "Có lẽ có một chút nhầm lẫn ở đây về thuật ngữ [thuật ngữ đúng] đó bạn ơi! 😉"
5. **Giải thích chi tiết** với:
   - Định nghĩa rõ ràng và dễ hiểu về thuật ngữ chuyên ngành
   - **Ví dụ thực tế** về cách sử dụng trong ngữ cảnh chuyên ngành
   - **Ứng dụng thực tế** của thuật ngữ này
   - Các khái niệm liên quan hoặc thuật ngữ đồng nghĩa
   - Lưu ý về cách sử dụng và tầm quan trọng trong lĩnh vực chuyên ngành
6. Kết thúc bằng "Bạn có muốn mình giải thích kỹ hơn phần nào không? Mình luôn sẵn sàng giúp bạn học tập vui vẻ! 🎉😊"
7. Sử dụng nhiều emoji, tone giáo dục thân thiện, và gọi "bạn" trong câu trả lời.
8. **QUAN TRỌNG**: Không tự động hiển thị đáp án đúng hoặc định nghĩa cho câu hỏi trắc nghiệm/điền chỗ trống trừ khi người dùng yêu cầu cụ thể.`;
                } else {
                    // Generic prompt for unknown type
                    basePrompt = `Bạn là AI tutor chuyên giúp học flashcard. 
            
${flashcardInfoSection}

Câu hỏi của bạn: ${userMessage}

Hãy trả lời theo format sau:
1. Bắt đầu với "Chào bạn! 🎉 Rất vui khi được giúp bạn hiểu rõ hơn! 😊"
2. Hiển thị thông tin flashcard: "Flashcard của chúng ta hôm nay là: **Thuật ngữ:** [term]"
3. **QUAN TRỌNG**: Nếu người dùng yêu cầu dịch/giải thích đáp án (ví dụ: "dịch cho tôi từng đáp án", "giải thích các đáp án", "translate the options"), hãy dịch và giải thích từng đáp án một cách chi tiết, rõ ràng.
4. Nếu có lỗi chính tả, nhắc nhở nhẹ nhàng như "Có lẽ có một chút nhầm lẫn ở đây đó bạn ơi! 😉"
5. **Giải thích chi tiết** với:
   - Định nghĩa rõ ràng và dễ hiểu
   - Ví dụ thực tế sử dụng
   - Các khái niệm liên quan
   - Lưu ý về cách sử dụng
6. Kết thúc bằng "Bạn có muốn mình giải thích kỹ hơn phần nào không? Mình luôn sẵn sàng giúp bạn học tập vui vẻ! 🎉😊"
7. Sử dụng nhiều emoji, tone giáo dục thân thiện, và gọi "bạn" trong câu trả lời.
8. **QUAN TRỌNG**: Không tự động hiển thị đáp án đúng hoặc định nghĩa cho câu hỏi trắc nghiệm/điền chỗ trống trừ khi người dùng yêu cầu cụ thể.`;
                }

                const flashcardPrompt = basePrompt;

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

        // Build prompt based on flashcard type
        let basePrompt = '';
        if (flashcardType === 'english_vocab') {
            basePrompt = `Bạn là AI tutor chuyên giúp học từ mới tiếng Anh. 
            
${flashcardInfoSection}

Yêu cầu của bạn: ${prompt}

Hãy trả lời theo format sau:
1. Bắt đầu với "Chào bạn! 🎉 Rất vui khi được giúp bạn hiểu rõ hơn về từ này! 😊"
2. Hiển thị thông tin flashcard: "Flashcard của chúng ta hôm nay là: **Từ:** [term]"
3. **QUAN TRỌNG**: Nếu người dùng yêu cầu dịch/giải thích đáp án (ví dụ: "dịch cho tôi từng đáp án", "giải thích các đáp án", "translate the options"), hãy dịch và giải thích từng đáp án một cách chi tiết, rõ ràng.
4. Nếu có lỗi chính tả, nhắc nhở nhẹ nhàng như "Có lẽ có một chút nhầm lẫn ở đây về từ [từ đúng] đó bạn ơi! 😉"
5. **Giải thích chi tiết** với:
   - Định nghĩa rõ ràng và dễ hiểu
   - **Ví dụ câu tiếng Anh** sử dụng từ đó
   - **Ví dụ câu tiếng Việt** tương ứng
   - Các từ liên quan hoặc từ đồng nghĩa
   - Lưu ý về cách sử dụng trong ngữ cảnh
6. Kết thúc bằng "Bạn có muốn mình giải thích kỹ hơn phần nào không? Mình luôn sẵn sàng giúp bạn học tập vui vẻ! 🎉😊"
7. Sử dụng nhiều emoji, tone giáo dục thân thiện, và gọi "bạn" trong câu trả lời.
8. **QUAN TRỌNG**: Không tự động hiển thị đáp án đúng hoặc định nghĩa cho câu hỏi trắc nghiệm/điền chỗ trống trừ khi người dùng yêu cầu cụ thể.`;
        } else if (flashcardType === 'specialized_term') {
            basePrompt = `Bạn là AI tutor chuyên giúp học thuật ngữ chuyên ngành. 
            
${flashcardInfoSection}

Yêu cầu của bạn: ${prompt}

Hãy trả lời theo format sau:
1. Bắt đầu với "Chào bạn! 🎉 Rất vui khi được giúp bạn hiểu rõ hơn về thuật ngữ này! 😊"
2. Hiển thị thông tin flashcard: "Flashcard của chúng ta hôm nay là: **Thuật ngữ:** [term]"
3. **QUAN TRỌNG**: Nếu người dùng yêu cầu dịch/giải thích đáp án (ví dụ: "dịch cho tôi từng đáp án", "giải thích các đáp án", "translate the options"), hãy dịch và giải thích từng đáp án một cách chi tiết, rõ ràng.
4. Nếu có lỗi chính tả, nhắc nhở nhẹ nhàng như "Có lẽ có một chút nhầm lẫn ở đây về thuật ngữ [thuật ngữ đúng] đó bạn ơi! 😉"
5. **Giải thích chi tiết** với:
   - Định nghĩa rõ ràng và dễ hiểu về thuật ngữ chuyên ngành
   - **Ví dụ thực tế** về cách sử dụng trong ngữ cảnh chuyên ngành
   - **Ứng dụng thực tế** của thuật ngữ này
   - Các khái niệm liên quan hoặc thuật ngữ đồng nghĩa
   - Lưu ý về cách sử dụng và tầm quan trọng trong lĩnh vực chuyên ngành
6. Kết thúc bằng "Bạn có muốn mình giải thích kỹ hơn phần nào không? Mình luôn sẵn sàng giúp bạn học tập vui vẻ! 🎉😊"
7. Sử dụng nhiều emoji, tone giáo dục thân thiện, và gọi "bạn" trong câu trả lời.
8. **QUAN TRỌNG**: Không tự động hiển thị đáp án đúng hoặc định nghĩa cho câu hỏi trắc nghiệm/điền chỗ trống trừ khi người dùng yêu cầu cụ thể.`;
        } else {
            basePrompt = `Bạn là AI tutor chuyên giúp học flashcard. 
            
${flashcardInfoSection}

Yêu cầu của bạn: ${prompt}

Hãy trả lời theo format sau:
1. Bắt đầu với "Chào bạn! 🎉 Rất vui khi được giúp bạn hiểu rõ hơn! 😊"
2. Hiển thị thông tin flashcard: "Flashcard của chúng ta hôm nay là: **Thuật ngữ:** [term]"
3. **QUAN TRỌNG**: Nếu người dùng yêu cầu dịch/giải thích đáp án (ví dụ: "dịch cho tôi từng đáp án", "giải thích các đáp án", "translate the options"), hãy dịch và giải thích từng đáp án một cách chi tiết, rõ ràng.
4. Nếu có lỗi chính tả, nhắc nhở nhẹ nhàng như "Có lẽ có một chút nhầm lẫn ở đây đó bạn ơi! 😉"
5. **Giải thích chi tiết** với:
   - Định nghĩa rõ ràng và dễ hiểu
   - Ví dụ thực tế sử dụng
   - Các khái niệm liên quan
   - Lưu ý về cách sử dụng
6. Kết thúc bằng "Bạn có muốn mình giải thích kỹ hơn phần nào không? Mình luôn sẵn sàng giúp bạn học tập vui vẻ! 🎉😊"
7. Sử dụng nhiều emoji, tone giáo dục thân thiện, và gọi "bạn" trong câu trả lời.
8. **QUAN TRỌNG**: Không tự động hiển thị đáp án đúng hoặc định nghĩa cho câu hỏi trắc nghiệm/điền chỗ trống trừ khi người dùng yêu cầu cụ thể.`;
        }

        const flashcardPrompt = basePrompt;

        try {
            const response = await fetch('http://localhost:3001/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: flashcardPrompt,
                    studySetId: studySetId || ''
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

