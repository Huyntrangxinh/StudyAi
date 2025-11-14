import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import pdf from 'pdf-parse';

const config = require('../../config');

const router = express.Router();
const dbPath = path.join(__dirname, '../../database/app.db');
const db = new Database(dbPath);

// Helper function: Extract text from PDF
async function extractTextFromPDF(filePath: string): Promise<string> {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        return data.text || '';
    } catch (e) {
        console.error('PDF extraction error:', e);
        return '';
    }
}

function buildPairsFromFlashcards(cards: any[]): Array<{ key: string; value: string }> {
    const pairs: Array<{ key: string; value: string }> = [];

    cards.forEach((card: any, index: number) => {
        const termCandidates = [
            card.term,
            card.front,
            card.question,
            card.prompt,
            card.topic
        ].filter((t) => typeof t === 'string' && t.trim().length > 2);

        let definitionCandidates = [
            card.definition,
            card.back,
            card.answer,
            card.explanation,
            card.description,
            card.detail
        ].filter((t) => typeof t === 'string' && t.trim().length > 5);

        if ((!definitionCandidates || definitionCandidates.length === 0) && card.type === 'multiple_choice') {
            let optionsText = '';
            try {
                const options = typeof card.multiple_choice_options === 'string'
                    ? JSON.parse(card.multiple_choice_options)
                    : card.multiple_choice_options;
                if (Array.isArray(options)) {
                    optionsText = options.map((opt: string, idx: number) => {
                        const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
                        const label = labels[idx] || String(idx + 1);
                        return `${label}. ${opt}`;
                    }).join('\n');
                }
            } catch (error) {
                console.warn('Failed to parse multiple_choice_options:', error);
            }
            const correctIndex = typeof card.correct_answer_index === 'number' ? card.correct_answer_index : null;
            const correctLabel = typeof correctIndex === 'number'
                ? (['A', 'B', 'C', 'D', 'E', 'F'][correctIndex] || `Đáp án ${correctIndex + 1}`)
                : null;
            const correctText = typeof card.correct_answer === 'string' ? card.correct_answer : null;

            const multipleChoiceDetail = [
                optionsText,
                correctLabel ? `Đáp án đúng: ${correctLabel}` : null,
                correctText ? `Chi tiết: ${correctText}` : null
            ].filter(Boolean).join('\n');

            definitionCandidates = [multipleChoiceDetail].filter((t) => t && t.trim().length > 5);
        }

        const key = termCandidates[0] || `Thuật ngữ ${index + 1}`;
        const value = definitionCandidates[0] || (card.notes && typeof card.notes === 'string' && card.notes.trim().length > 5
            ? card.notes
            : `Định nghĩa cho ${key}`);

        pairs.push({
            key: key.trim(),
            value: value.trim()
        });
    });

    return pairs.filter((pair) => pair.key.length > 1 && pair.value.length > 3);
}

// Helper function: Generate game content from text (materials or flashcards)
async function generateGameContentFromText(text: string, gameType: string, language: string = 'vi'): Promise<any> {
    const geminiKey = config.GEMINI_API_KEY;
    if (!geminiKey) {
        throw new Error('GEMINI_API_KEY không được cấu hình');
    }

    let prompt = '';
    if (gameType === 'match') {
        prompt = language === 'vi'
            ? `Bạn là giáo viên chuyên môn. Dựa trên nội dung tài liệu sau, tạo nội dung cho trò chơi MATCH GAME với các cặp từ khóa - định nghĩa CHI TIẾT, CỤ THỂ.

🚨 YÊU CẦU:
- Tạo ít nhất 8-12 cặp từ khóa - định nghĩa CỤ THỂ, CHI TIẾT từ nội dung tài liệu
- Mỗi từ khóa phải là một KHÁI NIỆM, ĐỊNH LUẬT, THUẬT NGỮ, SỰ KIỆN thực sự có trong tài liệu
- Từ khóa phải NGẮN GỌN, CHỈ là tên khái niệm (KHÔNG thêm dấu ngoặc đơn)
- Định nghĩa phải CHI TIẾT, CỤ THỂ, giải thích rõ ràng (2-3 câu) dựa trên nội dung tài liệu
- KHÔNG được dùng placeholder như "Khái niệm 1", "Khái niệm 2"
- PHẢI dùng các thuật ngữ, khái niệm THỰC TẾ từ tài liệu

Nội dung tài liệu:
${text.substring(0, 10000)}${text.length > 10000 ? '\n... (nội dung bị cắt ngắn)' : ''}

Trả về JSON format:
{
  "pairs": [
    {"key": "Từ khóa cụ thể 1", "value": "Định nghĩa chi tiết, cụ thể (2-3 câu)"},
    {"key": "Từ khóa cụ thể 2", "value": "Định nghĩa chi tiết, cụ thể (2-3 câu)"},
    ...
  ]
}

Chỉ trả về JSON, không có text khác.`
            : `You are a professional teacher. Based on the following document content, create content for a MATCH GAME with detailed, specific key-value pairs.

🚨 REQUIREMENTS:
- Create at least 8-12 SPECIFIC, DETAILED key-value pairs from the document content
- Each key must be a REAL CONCEPT, LAW, TERM, EVENT from the document
- Keys must be SHORT, ONLY the concept name (NO parentheses)
- Definitions must be DETAILED, SPECIFIC, clearly explained (2-3 sentences) based on document content
- DO NOT use placeholders like "Concept 1", "Concept 2"
- MUST use REAL terminology and concepts from the document

Document content:
${text.substring(0, 10000)}${text.length > 10000 ? '\n... (content truncated)' : ''}

Return JSON format:
{
  "pairs": [
    {"key": "Specific Term 1", "value": "Detailed, specific definition (2-3 sentences)"},
    {"key": "Specific Term 2", "value": "Detailed, specific definition (2-3 sentences)"},
    ...
  ]
}

Return ONLY JSON, no other text.`;
    } else {
        // TODO: Implement for other game types
        throw new Error(`Game type "${gameType}" chưa được hỗ trợ cho materials/flashcards`);
    }

    try {
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-002:generateContent?key=${geminiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 4000,
                        topP: 0.95,
                        topK: 40
                    }
                })
            }
        );

        if (resp.ok) {
            const g: any = await resp.json();
            const text = (g.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
            let jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const content = JSON.parse(jsonMatch[0]);
                    if (content.pairs && Array.isArray(content.pairs) && content.pairs.length >= 4) {
                        // Clean up keys
                        content.pairs = content.pairs.map((p: any) => {
                            if (p.key && typeof p.key === 'string') {
                                p.key = p.key.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*-\s*[^-]*$/, '').trim();
                            }
                            return p;
                        });
                        console.log(`✅ Generated ${content.pairs.length} pairs from text`);
                        return content;
                    }
                } catch (parseError) {
                    console.error('JSON parse error:', parseError);
                }
            }
        }
    } catch (error) {
        console.error('Gemini API error:', error);
    }

    // Fallback: Tạo một số cặp từ text đã có
    console.warn('⚠️ AI generation failed, using fallback extraction');
    try {
        // Extract key terms và definitions từ text một cách đơn giản
        const lines = text.split('\n').filter(line => line.trim().length > 20);
        const pairs: any[] = [];

        // Tìm các câu có dấu hai chấm hoặc định nghĩa
        for (let i = 0; i < Math.min(lines.length, 12); i++) {
            const line = lines[i].trim();
            if (line.length > 30 && line.length < 200) {
                // Tách key và value nếu có dấu hai chấm
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0 && colonIndex < line.length - 10) {
                    const key = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim();
                    if (key.length > 3 && key.length < 50 && value.length > 10) {
                        pairs.push({ key, value });
                    }
                } else {
                    // Nếu không có dấu hai chấm, dùng câu đầu làm key, câu sau làm value
                    if (i < lines.length - 1) {
                        const key = line.substring(0, Math.min(50, line.length));
                        const value = lines[i + 1].trim();
                        if (key.length > 3 && value.length > 10) {
                            pairs.push({ key, value });
                            i++; // Skip next line
                        }
                    }
                }
            }
        }

        if (pairs.length >= 4) {
            console.log(`✅ Generated ${pairs.length} pairs using fallback method`);
            return { pairs };
        }
    } catch (fallbackError) {
        console.error('Fallback extraction error:', fallbackError);
    }

    // Final fallback: Tạo cặp mẫu
    console.error('❌ All methods failed, using basic fallback');
    return {
        pairs: [
            { key: 'Khái niệm 1', value: 'Định nghĩa chi tiết về khái niệm này từ tài liệu.' },
            { key: 'Khái niệm 2', value: 'Định nghĩa chi tiết về khái niệm này từ tài liệu.' },
            { key: 'Khái niệm 3', value: 'Định nghĩa chi tiết về khái niệm này từ tài liệu.' },
            { key: 'Khái niệm 4', value: 'Định nghĩa chi tiết về khái niệm này từ tài liệu.' }
        ]
    };
}

// Helper function: Generate Match Game content từ topic
async function generateMatchGameContent(topic: string, language: string = 'vi'): Promise<any> {
    const geminiKey = config.GEMINI_API_KEY;

    const prompt = language === 'vi'
        ? `Bạn là giáo viên chuyên môn với kiến thức sâu rộng về MỌI lĩnh vực. Tạo nội dung CHI TIẾT, CỤ THỂ cho trò chơi MATCH GAME về chủ đề: "${topic}".

🚨 YÊU CẦU TUYỆT ĐỐI:
- Bạn PHẢI tự tìm hiểu, nghiên cứu và hiểu rõ về chủ đề "${topic}" (có thể là bất kỳ lĩnh vực nào: khoa học, lịch sử, văn học, toán học, kinh tế, công nghệ, v.v.)
- Tạo ít nhất 8-12 cặp từ khóa - định nghĩa CỤ THỂ, CHI TIẾT
- Mỗi từ khóa phải là một KHÁI NIỆM, ĐỊNH LUẬT, THUẬT NGỮ, SỰ KIỆN, HOẶC ĐỐI TƯỢNG thực sự liên quan đến "${topic}"
- Từ khóa phải NGẮN GỌN, CHỈ là tên khái niệm (KHÔNG thêm topic vào sau, KHÔNG có dấu ngoặc đơn)
- Định nghĩa phải CHI TIẾT, CỤ THỂ, giải thích rõ ràng (2-3 câu, không được chung chung)
- KHÔNG được dùng placeholder như "Khái niệm 1", "Khái niệm 2"
- PHẢI dùng các thuật ngữ, khái niệm THỰC TẾ về "${topic}"
- Nếu "${topic}" là một chủ đề bạn chưa biết rõ, bạn PHẢI sử dụng kiến thức của mình để tìm hiểu và tạo nội dung chính xác

Ví dụ cho chủ đề "Cung cầu" (Supply and Demand):
LƯU Ý: Từ khóa phải NGẮN GỌN, CHỈ là tên khái niệm, KHÔNG thêm "(cung cầu)" hay topic vào sau.

{
  "pairs": [
    {"key": "Luật cung", "value": "Khi giá của một hàng hóa tăng lên, số lượng hàng hóa được cung cấp sẽ tăng lên, và ngược lại, các yếu tố khác không đổi."},
    {"key": "Luật cầu", "value": "Khi giá của một hàng hóa tăng lên, số lượng hàng hóa được yêu cầu sẽ giảm xuống, và ngược lại, các yếu tố khác không đổi."},
    {"key": "Đường cung", "value": "Đồ thị biểu diễn mối quan hệ trực tiếp giữa giá cả và lượng hàng hóa mà người bán sẵn lòng cung cấp."},
    {"key": "Đường cầu", "value": "Đồ thị biểu diễn mối quan hệ nghịch đảo giữa giá cả và lượng hàng hóa mà người mua sẵn lòng mua."},
    {"key": "Điểm cân bằng thị trường", "value": "Giao điểm của đường cung và đường cầu trên đồ thị, xác định giá và lượng cân bằng."},
    {"key": "Lượng cân bằng", "value": "Lượng hàng hóa được giao dịch tại mức giá cân bằng, nơi lượng cung và lượng cầu bằng nhau."},
    {"key": "Sự dịch chuyển đường cung", "value": "Sự thay đổi toàn bộ mối quan hệ giữa giá và lượng cung, do các yếu tố ngoài giá ảnh hưởng đến khả năng sản xuất."},
    {"key": "Sự dịch chuyển đường cầu", "value": "Sự thay đổi toàn bộ mối quan hệ giữa giá và lượng cầu, do các yếu tố ngoài giá ảnh hưởng đến khả năng tiêu dùng."},
    {"key": "Các yếu tố ảnh hưởng đến cung", "value": "Chi phí sản xuất, công nghệ, số lượng người bán, kỳ vọng về giá tương lai, chính sách thuế và trợ cấp."},
    {"key": "Các yếu tố ảnh hưởng đến cầu", "value": "Thu nhập người tiêu dùng, thị hiếu, giá cả hàng hóa liên quan (thay thế, bổ sung), số lượng người mua, kỳ vọng về giá tương lai."},
    {"key": "Cơ chế giá", "value": "Cách thức mà sự tương tác giữa cung và cầu xác định giá cả và phân bổ nguồn lực trong nền kinh tế thị trường."},
    {"key": "Độ co giãn của cung theo giá", "value": "Mức độ phản ứng của lượng cung trước sự thay đổi của giá cả hàng hóa đó, đo bằng phần trăm thay đổi lượng cung chia cho phần trăm thay đổi giá."}
  ]
}

Ví dụ cho chủ đề "Quang hợp":
{
  "pairs": [
    {"key": "Chlorophyll", "value": "Sắc tố xanh lá cây hấp thụ ánh sáng mặt trời, chuyển đổi năng lượng ánh sáng thành năng lượng hóa học trong quá trình quang hợp."},
    {"key": "CO2", "value": "Khí carbon dioxide được cây hấp thụ qua khí khổng, là nguyên liệu chính để tạo ra glucose trong phản ứng tối."},
    {"key": "O2", "value": "Khí oxy được tạo ra như sản phẩm phụ trong phản ứng sáng của quang hợp, được giải phóng vào khí quyển."},
    {"key": "ATP", "value": "Phân tử năng lượng được tạo ra từ quang hợp, cung cấp năng lượng cho các phản ứng sinh hóa trong tế bào."},
    {"key": "Lục lạp", "value": "Bào quan chứa chlorophyll trong tế bào thực vật, là nơi diễn ra quá trình quang hợp."},
    {"key": "Phản ứng sáng", "value": "Giai đoạn quang hợp cần ánh sáng mặt trời, diễn ra trong thylakoid, tạo ra ATP và NADPH."},
    {"key": "Phản ứng tối", "value": "Giai đoạn quang hợp không cần ánh sáng, diễn ra trong stroma, sử dụng ATP và NADPH để tạo ra glucose từ CO2."},
    {"key": "Glucose", "value": "Đường được tạo ra từ quá trình quang hợp, là nguồn năng lượng chính cho thực vật và các sinh vật khác."}
  ]
}

BẠN PHẢI:
1. Tự tìm hiểu, nghiên cứu và hiểu rõ về "${topic}" (dù là chủ đề gì: khoa học, lịch sử, văn học, toán học, kinh tế, công nghệ, địa lý, nghệ thuật, v.v.)
2. Tạo các cặp từ khóa - định nghĩa CỤ THỂ, CHI TIẾT như ví dụ trên
3. KHÔNG được dùng placeholder hoặc nội dung chung chung
4. Mỗi từ khóa phải là thuật ngữ/k khái niệm THỰC TẾ, có thể là:
   - Khái niệm, định luật, lý thuyết (cho khoa học, toán học)
   - Sự kiện, nhân vật, thời kỳ (cho lịch sử)
   - Tác phẩm, tác giả, thể loại (cho văn học)
   - Thuật ngữ, công nghệ, framework (cho công nghệ)
   - Và các loại khác tùy theo chủ đề
5. Từ khóa phải NGẮN GỌN, CHỈ là tên khái niệm (KHÔNG thêm topic, KHÔNG có dấu ngoặc đơn)
6. Định nghĩa phải CHI TIẾT, giải thích rõ ràng (2-3 câu), có thông tin cụ thể, không chung chung

Trả về JSON format:
{
  "pairs": [
    {"key": "Từ khóa cụ thể 1", "value": "Định nghĩa chi tiết, cụ thể (2-3 câu)"},
    {"key": "Từ khóa cụ thể 2", "value": "Định nghĩa chi tiết, cụ thể (2-3 câu)"},
    ...
  ]
}

Chỉ trả về JSON, không có text khác.`
        : `You are a professional teacher with extensive knowledge across ALL fields. Create DETAILED, SPECIFIC content for a MATCH GAME about topic: "${topic}".

🚨 ABSOLUTE REQUIREMENTS:
- You MUST research, study and understand the topic "${topic}" thoroughly (it can be ANY field: science, history, literature, mathematics, economics, technology, geography, arts, etc.)
- Create at least 8-12 SPECIFIC, DETAILED key-value pairs
- Each key must be a REAL CONCEPT, LAW, TERM, EVENT, or OBJECT related to "${topic}"
- Keys must be SHORT, ONLY the concept name (DO NOT add topic, NO parentheses)
- Definitions must be DETAILED, SPECIFIC, clearly explained (2-3 sentences, not generic)
- DO NOT use placeholders like "Concept 1", "Concept 2"
- MUST use REAL terminology and concepts about "${topic}"
- If "${topic}" is a topic you're not familiar with, you MUST use your knowledge to research and create accurate content

Return JSON format:
{
  "pairs": [
    {"key": "Specific Term 1", "value": "Detailed, specific definition (2-3 sentences)"},
    {"key": "Specific Term 2", "value": "Detailed, specific definition (2-3 sentences)"},
    ...
  ]
}

Return ONLY JSON, no other text.`;

    if (geminiKey) {
        try {
            const resp = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-002:generateContent?key=${geminiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.8,
                            maxOutputTokens: 4000,
                            topP: 0.95,
                            topK: 40
                        }
                    })
                }
            );

            if (resp.ok) {
                const g: any = await resp.json();
                const text = (g.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();

                // Parse JSON từ response (có thể có markdown code blocks)
                let jsonText = text;

                // Remove markdown code blocks nếu có
                jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

                // Tìm JSON object
                const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        const content = JSON.parse(jsonMatch[0]);
                        if (content.pairs && Array.isArray(content.pairs) && content.pairs.length >= 4) {
                            // Kiểm tra xem có placeholder không và có topic trong key không
                            const hasPlaceholder = content.pairs.some((p: any) =>
                                p.key?.includes('Khái niệm') ||
                                p.key?.includes('Concept') ||
                                p.value?.includes('Định nghĩa hoặc giải thích về khái niệm') ||
                                p.value?.includes('Definition or explanation')
                            );

                            // Loại bỏ topic khỏi key nếu có (ví dụ: "Luật cung (cung cầu)" -> "Luật cung")
                            content.pairs = content.pairs.map((p: any) => {
                                if (p.key && typeof p.key === 'string') {
                                    // Loại bỏ pattern như "(topic)" hoặc " - topic"
                                    p.key = p.key.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*-\s*[^-]*$/, '').trim();
                                }
                                return p;
                            });

                            if (!hasPlaceholder) {
                                console.log(`✅ Generated ${content.pairs.length} pairs for topic: ${topic}`);
                                return content;
                            } else {
                                console.warn('⚠️ Response contains placeholders, will retry...');
                            }
                        }
                    } catch (parseError) {
                        console.error('JSON parse error:', parseError);
                        console.error('Response text:', jsonText.substring(0, 500));
                    }
                } else {
                    console.warn('No JSON found in response:', text.substring(0, 200));
                }
            }
        } catch (error) {
            console.error('Gemini API error:', error);
        }
    }

    // Fallback: Thử lại với prompt đơn giản hơn
    if (geminiKey) {
        console.warn('⚠️ First attempt failed, trying simpler prompt...');
        const simplePrompt = language === 'vi'
            ? `Tạo 8-12 cặp từ khóa - định nghĩa CHI TIẾT về "${topic}". Mỗi từ khóa phải là thuật ngữ/k khái niệm THỰC TẾ. Định nghĩa phải chi tiết (2-3 câu). Trả về JSON: {"pairs": [{"key": "...", "value": "..."}]}`
            : `Create 8-12 detailed key-value pairs about "${topic}". Each key must be a REAL term/concept. Definitions must be detailed (2-3 sentences). Return JSON: {"pairs": [{"key": "...", "value": "..."}]}`;

        try {
            const resp2 = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-002:generateContent?key=${geminiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: simplePrompt }] }],
                        generationConfig: {
                            temperature: 0.8,
                            maxOutputTokens: 4000
                        }
                    })
                }
            );

            if (resp2.ok) {
                const g2: any = await resp2.json();
                const text2 = (g2.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
                const jsonText2 = text2.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const jsonMatch2 = jsonText2.match(/\{[\s\S]*\}/);
                if (jsonMatch2) {
                    try {
                        const content2 = JSON.parse(jsonMatch2[0]);
                        if (content2.pairs && Array.isArray(content2.pairs) && content2.pairs.length >= 4) {
                            console.log(`✅ Generated ${content2.pairs.length} pairs (retry) for topic: ${topic}`);
                            return content2;
                        }
                    } catch (parseError) {
                        console.error('Retry JSON parse error:', parseError);
                    }
                }
            }
        } catch (error) {
            console.error('Retry Gemini API error:', error);
        }
    }

    // Final fallback: tạo nội dung dựa trên topic
    console.error('❌ All AI attempts failed, using topic-based fallback');
    const safeTopic = (topic || 'Chủ đề').trim();
    const shortTopic = safeTopic.length > 40 ? `${safeTopic.slice(0, 37)}...` : safeTopic;

    const fallbackPairs = [
        {
            key: `Khái quát ${shortTopic}`,
            value: `Tóm tắt những ý chính, bối cảnh hình thành và tầm quan trọng của "${safeTopic}" trong lịch sử tư tưởng Việt Nam.`
        },
        {
            key: `Bối cảnh ra đời`,
            value: `Giải thích hoàn cảnh chính trị, xã hội và yêu cầu phong trào cách mạng dẫn tới việc xây dựng "${safeTopic}".`
        },
        {
            key: `Mục tiêu cốt lõi`,
            value: `Liệt kê những mục tiêu chiến lược mà "${safeTopic}" đặt ra cho phong trào cách mạng và công cuộc xây dựng đất nước.`
        },
        {
            key: `Nguyên tắc chủ đạo`,
            value: `Trình bày những nguyên tắc, tư tưởng chỉ đạo của "${safeTopic}" (ví dụ đường lối độc lập dân tộc gắn với chủ nghĩa xã hội).`
        },
        {
            key: `Lực lượng nòng cốt`,
            value: `Nêu các lực lượng được xác định trong "${safeTopic}" như Đảng, quần chúng nhân dân, khối đại đoàn kết toàn dân tộc.`
        },
        {
            key: `Chiến lược hành động`,
            value: `Mô tả những bước đi, phương pháp đấu tranh và nhiệm vụ cụ thể mà "${safeTopic}" đề xuất để đạt mục tiêu.`
        },
        {
            key: `Giá trị lịch sử`,
            value: `Phân tích tác động của "${safeTopic}" đối với phong trào cách mạng, sự nghiệp giải phóng dân tộc và công cuộc đổi mới.`
        },
        {
            key: `Ý nghĩa hiện nay`,
            value: `Trình bày lý do "${safeTopic}" vẫn còn giá trị định hướng cho đường lối, chính sách phát triển trong giai đoạn hiện nay.`
        }
    ];

    return { pairs: fallbackPairs };
}

// POST /api/games - Tạo game mới
router.post('/', async (req, res) => {
    try {
        const { userId, studySetId, gameType, topic, style, inputMethod, materialIds, flashcardSetIds } = req.body;

        console.log('🎮 Create game request:', { userId, studySetId, gameType, inputMethod, materialIds, flashcardSetIds });

        if (!userId || !gameType) {
            return res.status(400).json({ error: 'userId và gameType là bắt buộc' });
        }

        // Convert studySetId to number if needed
        const studySetIdNum = studySetId ? (typeof studySetId === 'string' ? parseInt(studySetId, 10) : studySetId) : null;

        let gameContent: any = {};
        let gameTitle = topic || 'Game';
        let gameTopic = topic || 'Game từ tài liệu'; // Đảm bảo topic không null
        let extractedText = '';

        // Xử lý theo inputMethod
        if (inputMethod === 'materials' && materialIds && Array.isArray(materialIds) && materialIds.length > 0) {
            // Đọc và extract text từ các tài liệu đã chọn
            console.log('📄 Processing materials:', materialIds);

            const allTexts: string[] = [];
            for (const materialIdRaw of materialIds) {
                // Convert materialId to number
                const materialId = typeof materialIdRaw === 'string' ? parseInt(materialIdRaw, 10) : materialIdRaw;
                try {
                    if (isNaN(materialId)) {
                        console.warn(`Invalid material ID: ${materialIdRaw}`);
                        continue;
                    }

                    // Lấy thông tin material từ database
                    const material: any = db.prepare('SELECT * FROM materials WHERE id = ? AND study_set_id = ?').get(materialId, studySetIdNum);
                    if (!material) {
                        console.warn(`Material ${materialId} not found in database`);
                        continue;
                    }

                    if (!material.file_path) {
                        console.warn(`Material ${materialId} has no file_path`);
                        continue;
                    }

                    // Tìm file path
                    const candidates = [
                        path.join(process.cwd(), 'server/uploads', material.file_path),
                        path.join(__dirname, '../uploads', material.file_path),
                        path.join(__dirname, '../../uploads', material.file_path),
                        path.join(process.cwd(), 'uploads', material.file_path),
                    ];

                    let fileFound = false;
                    for (const filePath of candidates) {
                        if (fs.existsSync(filePath)) {
                            const text = await extractTextFromPDF(filePath);
                            if (text.trim()) {
                                allTexts.push(`\n\n=== ${material.name} ===\n${text}`);
                                fileFound = true;
                                break;
                            }
                        }
                    }

                    if (!fileFound) {
                        console.warn(`File not found for material ${materialId}`);
                    }
                } catch (error) {
                    console.error(`Error processing material ${materialId}:`, error);
                }
            }

            if (allTexts.length === 0) {
                return res.status(400).json({ error: 'Không thể đọc được nội dung từ các tài liệu đã chọn. Vui lòng kiểm tra lại file tài liệu.' });
            }

            extractedText = allTexts.join('\n\n');
            console.log(`✅ Extracted ${allTexts.length} materials, total text length: ${extractedText.length}`);
            gameTitle = `Game từ ${materialIds.length} tài liệu`;
            gameTopic = `Game từ ${materialIds.length} tài liệu`;

            // Generate game content từ text
            if (gameType === 'match') {
                gameContent = await generateGameContentFromText(extractedText, gameType, 'vi');
                if (!gameContent || !gameContent.pairs || gameContent.pairs.length < 4) {
                    console.warn('⚠️ Generated content has less than 4 pairs, but continuing...');
                }
            } else {
                return res.status(400).json({ error: `Game type "${gameType}" chưa được hỗ trợ cho materials` });
            }

        } else if (inputMethod === 'flashcards' && flashcardSetIds && Array.isArray(flashcardSetIds) && flashcardSetIds.length > 0) {
            // Load flashcards từ các flashcard sets đã chọn
            console.log('🎴 Processing flashcard sets:', flashcardSetIds);

            const allFlashcards: any[] = [];
            for (const flashcardSetIdRaw of flashcardSetIds) {
                try {
                    // Convert flashcardSetId to number
                    const flashcardSetId = typeof flashcardSetIdRaw === 'string' ? parseInt(flashcardSetIdRaw, 10) : flashcardSetIdRaw;
                    if (isNaN(flashcardSetId)) {
                        console.warn(`Invalid flashcard set ID: ${flashcardSetIdRaw}`);
                        continue;
                    }

                    // Query flashcards - có thể dùng id_flashcard_set hoặc JOIN với junction table
                    // Thử cả hai cách để đảm bảo tìm được
                    let flashcards: any[] = [];

                    // Cách 1: Dùng id_flashcard_set (nếu flashcards có cột này)
                    try {
                        flashcards = db.prepare('SELECT * FROM flashcards WHERE id_flashcard_set = ?').all(flashcardSetId);
                    } catch (e) {
                        console.warn('Query with id_flashcard_set failed, trying junction table');
                    }

                    // Cách 2: Nếu không có, dùng junction table
                    if (flashcards.length === 0) {
                        try {
                            flashcards = db.prepare(`
                                SELECT f.* FROM flashcards f
                                INNER JOIN flashcard_set_flashcards fs ON f.id = fs.flashcard_id
                                WHERE fs.flashcard_set_id = ?
                            `).all(flashcardSetId);
                        } catch (e2) {
                            console.warn('Query with junction table failed:', e2);
                        }
                    }

                    console.log(`📚 Found ${flashcards.length} flashcards for set ${flashcardSetId}`);
                    allFlashcards.push(...flashcards);
                } catch (error) {
                    console.error(`Error loading flashcards from set ${flashcardSetIdRaw}:`, error);
                }
            }

            if (allFlashcards.length === 0) {
                return res.status(400).json({ error: 'Không tìm thấy flashcard nào trong các flashcard sets đã chọn' });
            }

            const directPairs = buildPairsFromFlashcards(allFlashcards);
            if (gameType === 'match' && directPairs.length >= 4) {
                console.log(`✅ Using ${directPairs.length} direct pairs from flashcards for match game`);
                gameContent = { pairs: directPairs };
            } else {
                console.warn('⚠️ Direct pairs insufficient or game type unsupported, falling back to AI generation from flashcards');
            }

            // Tạo text từ flashcards
            let flashcardText = `Nội dung flashcard sets:\n\n`;
            allFlashcards.forEach((card: any, index: number) => {
                flashcardText += `\n=== Flashcard ${index + 1} ===\n`;
                if (card.type === 'term_def') {
                    flashcardText += `Thuật ngữ: ${card.term || card.front || ''}\n`;
                    flashcardText += `Định nghĩa: ${card.definition || card.back || ''}\n`;
                } else if (card.type === 'fill_blank') {
                    flashcardText += `Câu hỏi: ${card.question || card.front || ''}\n`;
                    flashcardText += `Đáp án: ${card.answer || card.back || ''}\n`;
                } else if (card.type === 'multiple_choice') {
                    flashcardText += `Câu hỏi: ${card.question || card.front || ''}\n`;
                    if (card.options && typeof card.options === 'string') {
                        try {
                            const options = JSON.parse(card.options);
                            if (Array.isArray(options)) {
                                options.forEach((opt: string, optIdx: number) => {
                                    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
                                    flashcardText += `${labels[optIdx]}. ${opt}\n`;
                                });
                            }
                        } catch (e) {
                            // Ignore parse error
                        }
                    }
                    flashcardText += `Đáp án đúng: ${card.correct_answer || card.back || ''}\n`;
                } else {
                    flashcardText += `Mặt trước: ${card.front || ''}\n`;
                    flashcardText += `Mặt sau: ${card.back || ''}\n`;
                }
                flashcardText += '\n';
            });

            gameTitle = `Game từ ${flashcardSetIds.length} flashcard set${flashcardSetIds.length > 1 ? 's' : ''}`;
            gameTopic = `Game từ ${flashcardSetIds.length} flashcard set${flashcardSetIds.length > 1 ? 's' : ''}`;

            // Generate game content từ flashcards
            if (gameType === 'match') {
                if (!gameContent.pairs || gameContent.pairs.length < 4) {
                    gameContent = await generateGameContentFromText(flashcardText, gameType, 'vi');
                    if (!gameContent || !gameContent.pairs || gameContent.pairs.length < 4) {
                        console.warn('⚠️ Generated content from flashcards has less than 4 pairs, but continuing...');
                    }
                }
            } else {
                return res.status(400).json({ error: `Game type "${gameType}" chưa được hỗ trợ cho flashcards` });
            }

        } else if (inputMethod === 'topic' && topic) {
            // Generate từ topic (logic cũ)
            if (gameType === 'match') {
                gameContent = await generateMatchGameContent(topic, 'vi');
            } else {
                return res.status(400).json({ error: `Game type "${gameType}" chưa được hỗ trợ` });
            }
            gameTitle = topic;
            gameTopic = topic;
        } else {
            return res.status(400).json({ error: 'inputMethod không hợp lệ hoặc thiếu dữ liệu cần thiết' });
        }

        // Lưu vào database - kiểm tra xem có cột material_ids không
        let insertQuery = `
            INSERT INTO games (user_id, study_set_id, game_type, title, topic, style, content, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
        `;
        let insertParams: any[] = [
            userId,
            studySetIdNum,
            gameType,
            gameTitle,
            gameTopic, // Đảm bảo topic không null
            style || null,
            JSON.stringify(gameContent)
        ];

        // Thử thêm material_ids nếu cột tồn tại
        try {
            const tableInfo: any[] = db.prepare("PRAGMA table_info(games)").all();
            const hasMaterialIds = tableInfo.some((col: any) => col.name === 'material_ids');

            if (hasMaterialIds) {
                insertQuery = `
                    INSERT INTO games (user_id, study_set_id, game_type, title, topic, style, content, status, material_ids)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
                `;
                insertParams.push(materialIds ? JSON.stringify(materialIds) : null);
            }
        } catch (e) {
            // Ignore nếu không thể kiểm tra
        }

        const result = db.prepare(insertQuery).run(...insertParams);

        return res.json({
            id: result.lastInsertRowid,
            gameType,
            content: gameContent,
            message: 'Game đã được tạo thành công!'
        });
    } catch (error: any) {
        console.error('Create game error:', error);
        return res.status(500).json({ error: error.message || 'Không thể tạo game' });
    }
});

// GET /api/games - Lấy danh sách games
router.get('/', async (req, res) => {
    try {
        const { userId, studySetId } = req.query;
        let query = 'SELECT * FROM games WHERE 1=1';
        const params: any[] = [];

        if (userId) {
            query += ' AND user_id = ?';
            params.push(userId);
        }
        if (studySetId) {
            query += ' AND study_set_id = ?';
            params.push(studySetId);
        }

        query += ' ORDER BY created_at DESC';

        const games = db.prepare(query).all(...params);

        // Parse JSON content
        const gamesWithContent = games.map((game: any) => {
            let content: any = {};
            try {
                content = JSON.parse(game.content || '{}');

                // Clean up keys: Loại bỏ "(topic)" hoặc " - topic" khỏi keys nếu có
                if (content.pairs && Array.isArray(content.pairs)) {
                    content.pairs = content.pairs.map((p: any) => {
                        if (p.key && typeof p.key === 'string') {
                            // Loại bỏ pattern như "(topic)" hoặc " - topic"
                            p.key = p.key.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*-\s*[^-]*$/, '').trim();
                        }
                        return p;
                    });
                }
            } catch (parseError) {
                console.error('Error parsing game content:', parseError);
                content = { pairs: [] };
            }

            return {
                ...game,
                content
            };
        });

        return res.json(gamesWithContent);
    } catch (error: any) {
        console.error('Get games error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// GET /api/games/:id - Lấy chi tiết game
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const game = db.prepare('SELECT * FROM games WHERE id = ?').get(id) as any;

        if (!game) {
            return res.status(404).json({ error: 'Game không tồn tại' });
        }

        // Parse content JSON
        let content: any = {};
        try {
            content = JSON.parse(game.content || '{}');

            // Clean up keys: Loại bỏ "(topic)" hoặc " - topic" khỏi keys nếu có
            if (content.pairs && Array.isArray(content.pairs)) {
                content.pairs = content.pairs.map((p: any) => {
                    if (p.key && typeof p.key === 'string') {
                        // Loại bỏ pattern như "(topic)" hoặc " - topic"
                        p.key = p.key.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*-\s*[^-]*$/, '').trim();
                    }
                    return p;
                });
            }
        } catch (parseError) {
            console.error('Error parsing game content:', parseError);
            content = { pairs: [] };
        }

        console.log(`Game ${id} content:`, content);

        return res.json({
            id: game.id,
            user_id: game.user_id,
            study_set_id: game.study_set_id,
            game_type: game.game_type,
            title: game.title,
            topic: game.topic,
            style: game.style,
            status: game.status,
            created_at: game.created_at,
            updated_at: game.updated_at,
            content: content
        });
    } catch (error: any) {
        console.error('Get game error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// DELETE /api/games/:id - Xóa game
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = db.prepare('DELETE FROM games WHERE id = ?').run(id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Game không tồn tại' });
        }

        return res.json({ message: 'Game đã được xóa' });
    } catch (error: any) {
        console.error('Delete game error:', error);
        return res.status(500).json({ error: error.message || 'Không thể xóa game' });
    }
});

// POST /api/games/:id/sessions - Lưu game session (score, progress)
router.post('/:id/sessions', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, score, completed, timeSpent } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId là bắt buộc' });
        }

        const result = db.prepare(`
            INSERT INTO game_sessions (game_id, user_id, score, completed, time_spent)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, userId, score || 0, completed ? 1 : 0, timeSpent || null);

        return res.json({
            id: result.lastInsertRowid,
            message: 'Game session đã được lưu'
        });
    } catch (error: any) {
        console.error('Save game session error:', error);
        return res.status(500).json({ error: error.message });
    }
});

export default router;

