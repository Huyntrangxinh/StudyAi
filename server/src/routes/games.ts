import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';

const config = require('../../config');

const router = express.Router();
const dbPath = path.join(__dirname, '../../database/app.db');
const db = new Database(dbPath);

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

    // Final fallback: Tạo cặp mẫu dựa trên topic (KHÔNG thêm topic vào key)
    console.error('❌ All AI attempts failed, using basic fallback');
    const fallbackPairs = [
        { key: `Luật cung`, value: `Khi giá của một hàng hóa tăng lên, số lượng hàng hóa được cung cấp sẽ tăng lên, và ngược lại, các yếu tố khác không đổi.` },
        { key: `Luật cầu`, value: `Khi giá của một hàng hóa tăng lên, số lượng hàng hóa được yêu cầu sẽ giảm xuống, và ngược lại, các yếu tố khác không đổi.` },
        { key: `Đường cung`, value: `Đồ thị biểu diễn mối quan hệ trực tiếp giữa giá cả và lượng hàng hóa mà người bán sẵn lòng cung cấp.` },
        { key: `Đường cầu`, value: `Đồ thị biểu diễn mối quan hệ nghịch đảo giữa giá cả và lượng hàng hóa mà người mua sẵn lòng mua.` },
        { key: `Điểm cân bằng`, value: `Giao điểm của đường cung và đường cầu trên đồ thị, xác định giá và lượng cân bằng.` },
        { key: `Lượng cân bằng`, value: `Lượng hàng hóa được giao dịch tại mức giá cân bằng, nơi lượng cung và lượng cầu bằng nhau.` },
        { key: `Cơ chế giá`, value: `Cách thức mà sự tương tác giữa cung và cầu xác định giá cả và phân bổ nguồn lực trong nền kinh tế thị trường.` },
        { key: `Yếu tố ảnh hưởng`, value: `Các yếu tố như thu nhập, thị hiếu, công nghệ, số lượng người mua/bán ảnh hưởng đến cung và cầu của hàng hóa.` }
    ];

    return { pairs: fallbackPairs };
}

// POST /api/games - Tạo game mới
router.post('/', async (req, res) => {
    try {
        const { userId, studySetId, gameType, topic, style, inputMethod, materialId } = req.body;

        if (!userId || !gameType || !topic) {
            return res.status(400).json({ error: 'userId, gameType, và topic là bắt buộc' });
        }

        let gameContent: any = {};

        // Generate content dựa trên game type
        if (gameType === 'match') {
            gameContent = await generateMatchGameContent(topic, 'vi');
        } else {
            // TODO: Implement cho các game type khác
            return res.status(400).json({ error: `Game type "${gameType}" chưa được hỗ trợ` });
        }

        // Lưu vào database
        const result = db.prepare(`
            INSERT INTO games (user_id, study_set_id, game_type, title, topic, style, content, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
        `).run(
            userId,
            studySetId || null,
            gameType,
            topic, // Tạm thời dùng topic làm title
            topic,
            style || null,
            JSON.stringify(gameContent)
        );

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
            let content = {};
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
        let content = {};
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

