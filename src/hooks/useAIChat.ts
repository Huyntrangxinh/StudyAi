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

    const buildFlashcardInfoSection = (): string => {
        const currentTerm = currentCard?.term || '';
        let flashcardInfoSection = `Thông tin flashcard hiện tại:
- Term (Thuật ngữ): ${currentTerm}`;

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

