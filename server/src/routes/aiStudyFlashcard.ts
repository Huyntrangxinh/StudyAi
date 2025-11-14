import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

const config = require('../../config.js');

const MODEL = config.OPENAI_MODEL || 'gpt-4o-mini';

const openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY
});

const DEFAULT_ERROR_MESSAGE = 'Xin lỗi, hiện mình chưa thể phản hồi. Bạn thử lại trong giây lát nhé! 😊';

const SYSTEM_PROMPT = `Bạn là Spark.E — trợ giảng AI thân thiện chuyên hỗ trợ học flashcard.

NGUYÊN TẮC:
- Trả lời bằng tiếng Việt, với giọng điệu tích cực, giàu năng lượng và truyền cảm hứng học tập.
- Luôn giữ thái độ thân thiện, hỗ trợ như một giáo viên tận tâm đang hướng dẫn học sinh.
- Tôn trọng đầy đủ mọi yêu cầu định dạng mà người học đã cung cấp.
- Không tiết lộ đáp án đúng của câu hỏi trắc nghiệm hoặc điền vào chỗ trống nếu người học chưa yêu cầu trực tiếp.
- Thay vì đưa đáp án, hãy gợi ý cách tư duy, chiến lược giải bài và định hướng học sinh tự tìm ra đáp án.
- Luôn động viên, khen ngợi nỗ lực và khuyến khích người học tiếp tục cải thiện.
- Kết thúc mỗi câu trả lời bằng lời mời hỗ trợ thêm để học sinh cảm thấy luôn được đồng hành.`;

type FlashcardType = 'english_vocab' | 'specialized_term' | 'unknown';
type RequestMode = 'chat' | 'submit';

function buildBasePrompt(
    flashcardType: FlashcardType,
    flashcardInfoSection: string,
    userMessage: string,
    mode: RequestMode
): string {
    const requestLabel = mode === 'submit' ? 'Yêu cầu của bạn' : 'Câu hỏi của bạn';

    if (flashcardType === 'english_vocab') {
        return `Bạn là AI tutor chuyên giúp học từ mới tiếng Anh. 
            
${flashcardInfoSection}

${requestLabel}: ${userMessage}

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
    }

    if (flashcardType === 'specialized_term') {
        return `Bạn là AI tutor chuyên giúp học thuật ngữ chuyên ngành. 
            
${flashcardInfoSection}

${requestLabel}: ${userMessage}

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
    }

    return `Bạn là AI tutor chuyên giúp học flashcard. 
            
${flashcardInfoSection}

${requestLabel}: ${userMessage}

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

router.post('/study-flashcard', async (req, res) => {
    console.log('=====================📥 Study flashcard request:', req.body);
    const {
        message,
        studySetId,
        flashcardInfoSection,
        flashcardType,
        mode
    } = req.body || {};

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
    }

    if (!flashcardInfoSection || typeof flashcardInfoSection !== 'string') {
        return res.status(400).json({ error: 'flashcardInfoSection is required' });
    }

    const normalizedType: FlashcardType = ['english_vocab', 'specialized_term'].includes(flashcardType)
        ? flashcardType
        : 'unknown';

    const normalizedMode: RequestMode = mode === 'submit' ? 'submit' : 'chat';

    if (!config.OPENAI_API_KEY) {
        console.error('Missing OPENAI_API_KEY configuration');
        return res.status(500).json({ error: DEFAULT_ERROR_MESSAGE });
    }

    try {
        const completion = await openai.chat.completions.create({
            model: MODEL,
            temperature: 0.6,
            max_tokens: 1200,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                    role: 'system',
                    content: `Study set ID (tham khảo): ${studySetId || 'N/A'}`
                },
                {
                    role: 'user',
                    content: buildBasePrompt(
                        normalizedType,
                        flashcardInfoSection,
                        message,
                        normalizedMode
                    )
                }
            ]
        });

        const aiResponse = completion.choices?.[0]?.message?.content?.trim();

        if (!aiResponse) {
            console.warn('OpenAI returned empty response for study flashcard prompt');
            return res.status(200).json({ response: DEFAULT_ERROR_MESSAGE });
        }

        return res.json({ response: aiResponse });
    } catch (error: any) {
        console.error('Study flashcard AI error:', error?.message || error);
        return res.status(200).json({ response: DEFAULT_ERROR_MESSAGE });
    }
});

export default router;

