import express from 'express';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import sqlite3 from 'sqlite3';

const router = express.Router();

// Import config
const config = require('../../config.js');

const MODEL = config.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_SOURCE_CHARS = 12000;          // ✅ Giảm từ 32000 để tránh timeout
const CHUNK_SIZE = 1000;                 // ✅ Giảm từ 1500 để nhanh hơn
const CHUNK_OVERLAP = 150;                // ✅ Giảm từ 200
const TOP_K = 8;                          // ✅ Giảm từ 15 để giảm prompt size
const USE_EMBEDDINGS = true;              // ✅ bật semantic search
const AI_TIMEOUT = 45000;                 // ✅ Tăng từ 15000 lên 45000 (45s)

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

// ✅ Cache embeddings để tiết kiệm API calls
const embeddingCache = new Map<string, number[]>();

// ✅ Cache PDF text để tránh đọc lại mỗi request
const pdfTextCache = new Map<string, { text: string; timestamp: number }>();
const PDF_CACHE_TTL = 3600000; // 1 giờ

// ✅ Cache chunks để tránh tính lại
const chunksCache = new Map<string, { text: string; page: number }[]>();

/* -------------------- PDF utils -------------------- */

// ✅ Quick extractive summary function for fallback
function quickExtractiveSummary(text: string, maxSentences = 5): string {
    // Tách câu đơn giản (đủ dùng tiếng Việt)
    const sentences = text
        .replace(/\s+/g, ' ')
        .split(/(?<=[\.\?\!…])\s+/)
        .filter(s => s && s.length > 40);

    // Ưu tiên câu có từ khóa "định nghĩa", "gồm", "bao gồm", "phân loại", "cách", "bước"
    const keywords = ['định nghĩa', 'gồm', 'bao gồm', 'phân loại', 'cách', 'bước', 'ví dụ', 'tác hại', 'hoạt động', 'nguyên nhân', 'hậu quả', 'đặc điểm', 'chức năng'];

    const scored = sentences.map(s => ({
        s,
        score: keywords.reduce((acc, k) => acc + (s.toLowerCase().includes(k) ? 1 : 0), 0) + Math.min(3, Math.floor(s.length / 80))
    }));

    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, maxSentences)
        .map(x => `- ${x.s}`)
        .join('\n');
}

// ✅ Safe JSON parsing with fallback
function safeParseJsonBlock(s: string): any {
    try {
        return JSON.parse(s);
    } catch {
        // Try to extract JSON object from string
        const m = s.match(/\{[\s\S]*\}/);
        if (m) {
            try {
                return JSON.parse(m[0]);
            } catch {
                // Return null if still fails
            }
        }
        return null;
    }
}

function splitPages(text: string): string[] {
    const pages = text.split(/\f/g);
    if (pages.length > 1) return pages.map(s => s.trim()).filter(Boolean);
    return text.split(/\n{2,}/g).map(s => s.trim()).filter(Boolean);
}

function chunkWithPages(pages: string[], size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
    const chunks: { text: string; page: number }[] = [];
    pages.forEach((pageText, pIdx) => {
        let i = 0;
        while (i < pageText.length) {
            const slice = pageText.slice(i, i + size);
            chunks.push({ text: slice, page: pIdx + 1 });
            i += size - overlap;
            if (i < 0) break;
        }
    });
    return chunks;
}

/* -------------------- Retrieval nâng cấp -------------------- */

// ✅ Cải thiện keyword scoring với TF-IDF đơn giản
function scoreChunk(q: string, t: string): number {
    const norm = (s: string) =>
        s.toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')  // hỗ trợ Unicode/tiếng Việt
            .split(/\s+/)
            .filter(w => w.length > 2);

    const qWords = norm(q);
    const tWords = norm(t);
    const qSet = new Set(qWords);

    // Đếm tần suất từ trong chunk
    const wordFreq = new Map<string, number>();
    tWords.forEach(w => wordFreq.set(w, (wordFreq.get(w) || 0) + 1));

    let score = 0;

    // TF-IDF đơn giản
    for (const w of qSet) {
        if (wordFreq.has(w)) {
            const tf = wordFreq.get(w)!;
            score += Math.log(1 + tf) / Math.log(tWords.length + 1);
        }
    }

    // ✅ Bonus cho cụm từ (bigram matching)
    const qBigrams: string[] = [];
    for (let i = 0; i < qWords.length - 1; i++) {
        qBigrams.push(qWords[i] + ' ' + qWords[i + 1]);
    }
    const tText = tWords.join(' ');
    qBigrams.forEach(bg => {
        if (tText.includes(bg)) score += 2.5; // bonus lớn
    });

    // ✅ Bonus nếu chunk chứa câu hỏi (nguyên văn hoặc gần giống)
    if (tText.includes(norm(q).join(' '))) {
        score += 5;
    }

    return score;
}

// ✅ Semantic search với OpenAI Embeddings
async function getEmbedding(text: string): Promise<number[]> {
    const key = text.slice(0, 150); // cache key
    if (embeddingCache.has(key)) return embeddingCache.get(key)!;

    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small", // model rẻ nhất
            input: text.slice(0, 8000), // giới hạn token
        });

        const embedding = response.data[0].embedding;
        embeddingCache.set(key, embedding);
        return embedding;
    } catch (err) {
        console.error('Embedding error:', err);
        return []; // fallback về keyword search
    }
}

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

// ✅ Hybrid retrieval: keyword + semantic
async function pickTopK(
    question: string,
    chunks: { text: string; page: number }[],
    k = TOP_K
) {
    // Lọc chunk quá ngắn (< 150 ký tự)
    const validChunks = chunks.filter(c => c.text.length > 150);

    if (!USE_EMBEDDINGS || !config.OPENAI_API_KEY) {
        // Fallback: chỉ dùng keyword
        return validChunks
            .map(c => ({ ...c, score: scoreChunk(question, c.text) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, k);
    }

    try {
        // ✅ Semantic + Keyword hybrid
        const qEmbed = await getEmbedding(question);

        const scored = await Promise.all(
            validChunks.map(async c => {
                const cEmbed = await getEmbedding(c.text);
                const semScore = cosineSimilarity(qEmbed, cEmbed);
                const keyScore = scoreChunk(question, c.text);

                // Weighted combination: 60% semantic + 40% keyword
                const finalScore = semScore * 0.6 + keyScore * 0.4;

                return { ...c, score: finalScore, semScore, keyScore };
            })
        );

        return scored.sort((a, b) => b.score - a.score).slice(0, k);
    } catch (err) {
        console.error('Semantic search error, fallback to keyword:', err);
        return validChunks
            .map(c => ({ ...c, score: scoreChunk(question, c.text) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, k);
    }
}

/* -------------------- DB & PDF -------------------- */

async function getMaterialsForStudySet(studySetId: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const dbPath = path.join(__dirname, '../../database/app.db');
        const db = new sqlite3.Database(dbPath);
        db.all(
            'SELECT * FROM materials WHERE study_set_id = ? ORDER BY created_at DESC',
            [studySetId],
            (err, rows) => {
                db.close();
                if (err) reject(err);
                else resolve(rows || []);
            }
        );
    });
}

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

/* -------------------- Scholar Analysis (Pass-1) -------------------- */

function buildScholarPrompt(topChunks: { text: string; page: number }[]) {
    let budget = MAX_SOURCE_CHARS;
    const sources = [];
    for (const c of topChunks) {
        const maxLen = Math.min(budget, CHUNK_SIZE + 300);
        if (maxLen <= 0) break;
        const t = c.text.slice(0, maxLen);
        budget -= t.length;
        sources.push(`--- [PAGE ${c.page}]\n${t}`);
    }

    return {
        system: `Bạn là một chuyên gia phân tích tài liệu học thuật. Nhiệm vụ: phân tích và trích xuất cấu trúc thông tin từ tài liệu.

TRẢ VỀ JSON với cấu trúc:
{
  "overview": "Tóm tắt ngắn gọn toàn bộ tài liệu (2-3 câu)",
  "key_points": ["Điểm chính 1", "Điểm chính 2", "Điểm chính 3", ...],
  "definitions": {"Thuật ngữ 1": "Định nghĩa", "Thuật ngữ 2": "Định nghĩa"},
  "methods_or_arguments": ["Phương pháp/Luận điểm 1", "Phương pháp/Luận điểm 2"],
  "examples": ["Ví dụ 1", "Ví dụ 2"],
  "citations": [{"page": 1, "excerpt": "Đoạn trích quan trọng"}]
}

QUAN TRỌNG:
- Phân tích KỸ LƯỠNG và ĐẦY ĐỦ tất cả nguồn trích bên dưới
- Trích xuất TỐI ĐA thông tin quan trọng, không bỏ sót
- Chỉ dựa trên nguồn trích, không bịa thông tin
- Trích dẫn chính xác page number
- JSON hợp lệ, không có markdown`,
        user: `Phân tích tài liệu sau và trả về JSON cấu trúc ĐẦY ĐỦ:

Nguồn trích:
${sources.join('\n\n')}`
    };
}

/* -------------------- Tutor Rewriter (Pass-2) -------------------- */

const tutorSystem = `
Bạn là Spark.E — trợ giảng thân thiện. Nhiệm vụ: biến JSON tóm tắt học thuật thành 
văn bản Markdown tiếng Việt ấm áp, mạch lạc, dễ đọc, có emoji vừa phải.

QUAN TRỌNG:
- Chỉ dùng thông tin trong JSON đầu vào; không thêm kiến thức ngoài.
- Giữ tính chính xác học thuật; tách mục rõ ràng (Tổng quan • Các phần chính • Kết luận).
- KHÔNG thêm citations [pX] vào câu trả lời.
- Xưng hô theo tên người dùng nếu có (ví dụ: "Huyền Trang").
- Dùng tiêu đề ### / #### và bullet *, giữ ngắn gọn mỗi bullet (1–2 câu).
- TRÌNH BÀY ĐẦY ĐỦ tất cả thông tin từ JSON, không lược bỏ.
`;

function tutorUserPrompt(userName: string, fileName: string, scholarJson: any) {
    return `
Người đọc: ${userName || "bạn"}
Tên tài liệu: "${fileName}"

DỮ LIỆU TÓM TẮT (JSON):
${JSON.stringify(scholarJson, null, 2)}

YÊU CẦU ĐẦU RA (Markdown, tiếng Việt):
- Mở đầu 1–2 câu chào thân thiện, nêu tên tài liệu và emoji 🎉/📚 (tối đa 2 emoji đoạn mở đầu).
- Mục ### Tổng quan (1 đoạn ngắn).
- Mục ### Các phần chính: chuyển hóa key_points + definitions + methods_or_arguments + examples thành các nhóm:
  #### 1. Các Khái niệm Cơ bản
  #### 2. Quy trình/Phương pháp (nếu có)
  #### 3. Công cụ/Tech (nếu có)
  #### 4. Ví dụ minh họa (nếu có)
  (chỉ tạo mục khi có dữ liệu)
- Mục ### Kết luận (1–2 câu).
- KHÔNG thêm citations [pX] vào câu trả lời.
- QUAN TRỌNG: Trình bày ĐẦY ĐỦ, không lược bỏ thông tin.
`;
}

async function rewriteAsTutor(userName: string, fileName: string, structuredJson: any) {
    const completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.5,
        max_tokens: 2000, // ✅ tăng từ 1200
        messages: [
            { role: "system", content: tutorSystem },
            { role: "user", content: tutorUserPrompt(userName, fileName, structuredJson) },
        ],
    });
    return completion.choices[0]?.message?.content?.trim() || "";
}

// ✅ Natural Tutor cho câu hỏi follow-up (không dùng template cố định)
const naturalTutorSystem = `Bạn là Spark.E — trợ giảng thân thiện. Nhiệm vụ: trả lời câu hỏi cụ thể một cách tự nhiên, không dùng template cố định.

QUAN TRỌNG:
- Trả lời trực tiếp câu hỏi được hỏi
- KHÔNG dùng cấu trúc "Tổng quan", "Các phần chính", "Kết luận"
- KHÔNG bắt đầu bằng "Chào bạn! Hôm nay chúng ta sẽ cùng nhau khám phá..."
- KHÔNG giới thiệu lại tài liệu hoặc tên file
- Bắt đầu trực tiếp với câu trả lời
- Trả lời tự nhiên như đang trò chuyện tiếp tục
- Dựa hoàn toàn vào thông tin từ JSON
- Xưng hô theo tên người dùng
- Dùng emoji vừa phải (1-2 emoji)
- Trích dẫn [pX] khi có thể
- Kết thúc bằng câu hỏi thân thiện
- Giả sử đây là câu hỏi follow-up trong cuộc trò chuyện đang diễn ra`;

function naturalTutorUserPrompt(userName: string, fileName: string, structuredJson: any, originalQuestion: string) {
    return `Người đọc: ${userName || "bạn"}
Tên tài liệu: "${fileName}"
Câu hỏi gốc: "${originalQuestion}"

THÔNG TIN TỪ TÀI LIỆU:
${JSON.stringify(structuredJson, null, 2)}

YÊU CẦU: 
- Trả lời câu hỏi một cách tự nhiên, không dùng template cố định
- Chỉ tập trung vào câu hỏi được hỏi
- KHÔNG bắt đầu bằng "Chào bạn! Hôm nay chúng ta sẽ cùng nhau khám phá..."
- KHÔNG giới thiệu lại tài liệu
- Bắt đầu trực tiếp với câu trả lời
- Giả sử đây là câu hỏi follow-up trong cuộc trò chuyện đang diễn ra`;
}

async function rewriteAsNaturalTutor(userName: string, fileName: string, structuredJson: any, originalQuestion: string) {
    const completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.6,
        max_tokens: 1500,
        messages: [
            { role: "system", content: naturalTutorSystem },
            { role: "user", content: naturalTutorUserPrompt(userName, fileName, structuredJson, originalQuestion) },
        ],
    });

    let response = completion.choices[0]?.message?.content?.trim() || "";

    // ✅ Post-processing: Loại bỏ câu chào dài
    const greetingPatterns = [
        /^Chào bạn!.*?📚.*?Hôm nay.*?khám phá.*?\.\s*/,
        /^Chào bạn!.*?🎉.*?Hôm nay.*?tìm hiểu.*?\.\s*/,
        /^Chào bạn!.*?Hôm nay.*?cùng nhau.*?\.\s*/,
        /^Chào bạn!.*?Hôm nay.*?sẽ cùng.*?\.\s*/,
        /^Chào bạn!.*?Hôm nay.*?muốn chia sẻ.*?\.\s*/,
        /^Chào bạn!.*?Hôm nay.*?rất vui.*?\.\s*/,
        /^Chào bạn!.*?Hôm nay.*?thú vị.*?\.\s*/
    ];

    for (const pattern of greetingPatterns) {
        response = response.replace(pattern, '');
    }

    // Nếu response bắt đầu bằng "###" hoặc có nội dung, giữ nguyên
    // Nếu response rỗng sau khi loại bỏ greeting, thêm câu chào ngắn
    if (!response.trim()) {
        response = `Chào bạn! ${originalQuestion}...`;
    }

    return response;
}

/* -------------------- Humanizer (Pass-3) -------------------- */

const humanizeSystem = `
Bạn là Spark.E — một trợ giảng AI thân thiện, thông minh và vui vẻ.
Bạn nhận đầu vào là đoạn Markdown khô (học thuật) và phải viết lại nó thành
giọng tự nhiên, gần gũi, thân thiện, nhưng vẫn chính xác học thuật.

YÊU CẦU:
- Viết bằng tiếng Việt.
- Xưng hô theo tên người dùng nếu có (ví dụ: "Huyền Trang").
- Giữ nguyên các tiêu đề ###, #### và format Markdown cơ bản.
- Mở đầu: 1–2 câu chào và giới thiệu ấm áp, có emoji 🎉📚🙂 (tối đa 3 emoji).
- Kết thúc: hỏi nhẹ "Bạn có muốn mình giải thích kỹ hơn phần nào không?".
- Không thêm kiến thức mới, chỉ "diễn đạt lại cho dễ hiểu".
- LOẠI BỎ tất cả citations [pX] khỏi câu trả lời.
- GIỮ NGUYÊN ĐỘ DÀI và ĐẦY ĐỦ nội dung, không rút gọn.
`;

function humanizeUserPrompt(userName: string, markdownSummary: string) {
    return `
Tên người dùng: ${userName || "bạn"}

Dưới đây là bản tóm tắt học thuật gốc:
---
${markdownSummary}
---

Hãy viết lại bản này sao cho ấm áp, tự nhiên và thân thiện như đang trò chuyện với học sinh.
QUAN TRỌNG: Giữ nguyên ĐỘ DÀI và ĐẦY ĐỦ nội dung.
`;
}

async function humanizeMarkdown(userName: string, mdText: string) {
    const completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.7,
        max_tokens: 2000, // ✅ tăng từ 1200
        messages: [
            { role: "system", content: humanizeSystem },
            { role: "user", content: humanizeUserPrompt(userName, mdText) },
        ],
    });
    return completion.choices[0]?.message?.content?.trim() || mdText;
}

/* -------------------- Web Search -------------------- */

// Google Custom Search API configuration
const GOOGLE_API_KEY = 'AIzaSyAZUBz_XwWGTEcU2gznml2Fx3ac4AssY8w';
// Search Engine ID from config (loaded from .env)
const SEARCH_ENGINE_ID = config.SEARCH_ENGINE_ID || '820473ad04dab4ac3';

interface WebSearchResult {
    title: string;
    link: string;
    snippet: string;
    displayLink: string;
}

// Detect when web search is needed
function needsWebSearch(message: string, topChunks: any[]): boolean {
    const searchKeywords = [
        'lịch sử', 'history', 'hình thành', 'phát triển',
        'ra đời', 'xuất hiện', 'năm nào', 'khi nào',
        'thông tin mới', 'cập nhật', 'hiện tại', 'mới nhất',
        'tìm trên web', 'search web', 'tìm kiếm web'
    ];

    const hasSearchKeyword = searchKeywords.some(keyword =>
        message.toLowerCase().includes(keyword)
    );

    // If has keyword OR if we don't have enough relevant chunks
    return hasSearchKeyword || topChunks.length < 3;
}

// Perform web search using Google Custom Search API
async function performWebSearch(query: string): Promise<WebSearchResult[]> {
    if (!GOOGLE_API_KEY || !SEARCH_ENGINE_ID) {
        console.warn('⚠️ Web search not configured: Missing API key or Search Engine ID');
        return [];
    }

    try {
        // Force AI-related context to the query to avoid off-topic results
        const AI_KEYWORDS = [
            'AI', 'trí tuệ nhân tạo', 'artificial intelligence',
            'machine learning', 'deep learning', 'gen ai', 'generative ai'
        ];
        const hasAiInQuery = AI_KEYWORDS.some(k => query.toLowerCase().includes(k.toLowerCase()));
        const amplifiedQuery = hasAiInQuery
            ? query
            : `${query} (AI OR "trí tuệ nhân tạo" OR "artificial intelligence" OR "machine learning" OR "generative AI")`;

        // Locale + relevance tweaks
        const params = new URLSearchParams({
            key: GOOGLE_API_KEY,
            cx: SEARCH_ENGINE_ID,
            q: amplifiedQuery,
            num: '10',              // fetch more, we'll re-rank and cut to top 3 later
            lr: 'lang_vi',          // prioritize Vietnamese
            gl: 'vn',               // country bias
            safe: 'active'
        });
        const searchUrl = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;

        const response = await fetch(searchUrl);

        if (!response.ok) {
            console.error('❌ Web search API error:', response.status, response.statusText);
            return [];
        }

        const data = await response.json() as { items?: Array<{ title?: string; link?: string; snippet?: string; displayLink?: string }> };

        if (!data.items || data.items.length === 0) {
            console.log('📭 No web search results found');
            return [];
        }

        // Convert items
        let results: WebSearchResult[] = data.items.map((item: any) => ({
            title: item.title || '',
            link: item.link || '',
            snippet: item.snippet || '',
            displayLink: item.displayLink || (item.link ? new URL(item.link).hostname : '')
        }));

        // Simple re-ranking + filtering
        const blacklist = ['facebook.com', 'm.facebook.com', 'twitter.com', 'x.com', 'tiktok.com', 'instagram.com'];
        const whitelistBoost = ['aws.amazon.com', 'microsoft.com', 'news.microsoft.com', 'viettelidc.com.vn', 'viblo.asia', 'vnptai.io', 'medium.com', 'towardsdatascience.com', 'google.com', 'developers.google.com'];

        const lowerQuery = query.toLowerCase();
        const yearMatch = lowerQuery.match(/\b(20\d{2})\b/);
        const year = yearMatch ? yearMatch[1] : '';
        const keywords = lowerQuery
            .replace(/[\p{P}\p{S}]/gu, ' ')
            .split(/\s+/)
            .filter(Boolean);

        const aiMatch = (text: string): boolean => {
            const t = (text || '').toLowerCase();
            return AI_KEYWORDS.some(k => t.includes(k.toLowerCase()));
        };

        const score = (r: WebSearchResult): number => {
            const host = (r.displayLink || r.link || '').toLowerCase();
            if (blacklist.some(b => host.includes(b))) return -100;

            const title = (r.title || '').toLowerCase();
            const snippet = (r.snippet || '').toLowerCase();

            let s = 0;
            // keyword hits
            for (const k of keywords) {
                if (k.length <= 2) continue;
                if (title.includes(k)) s += 5;
                if (snippet.includes(k)) s += 2;
            }
            // year boost
            if (year) {
                if (title.includes(year)) s += 4;
                if (snippet.includes(year)) s += 2;
            }
            // AI topic boost/penalty
            if (aiMatch(title) || aiMatch(snippet)) {
                s += 10;
            } else {
                s -= 10; // demote non-AI pages
            }
            // whitelist boost
            if (whitelistBoost.some(w => host.includes(w))) s += 3;
            // shorter, cleaner titles preferred
            s += Math.max(0, 60 - (r.title?.length || 0)) / 20;
            return s;
        };

        results = results
            .map(r => ({ r, s: score(r) }))
            .sort((a, b) => b.s - a.s)
            .map(x => x.r)
            // filter out clearly off-topic after scoring
            .filter(r => aiMatch(r.title) || aiMatch(r.snippet))
            .slice(0, 5); // keep top 5; FE shows top 3

        // Fallback: if still too few AI-relevant results, try a second focused query
        if (results.length < 3) {
            const fallback = `xu hướng AI 2025 site:(.vn OR .com)`;
            const p2 = new URLSearchParams({
                key: GOOGLE_API_KEY,
                cx: SEARCH_ENGINE_ID,
                q: fallback,
                num: '10', lr: 'lang_vi', gl: 'vn', safe: 'active'
            });
            const url2 = `https://www.googleapis.com/customsearch/v1?${p2.toString()}`;
            try {
                const r2 = await fetch(url2);
                if (r2.ok) {
                    const d2 = await r2.json() as { items?: Array<{ title?: string; link?: string; snippet?: string; displayLink?: string }> };
                    if (d2.items?.length) {
                        const more: WebSearchResult[] = d2.items.map((item: any) => ({
                            title: item.title || '',
                            link: item.link || '',
                            snippet: item.snippet || '',
                            displayLink: item.displayLink || (item.link ? new URL(item.link).hostname : '')
                        })).filter((it: WebSearchResult) => aiMatch(it.title) || aiMatch(it.snippet));
                        results = [...results, ...more].slice(0, 5);
                    }
                }
            } catch { }
        }

        console.log(`🔍 Ranked web search results (top=${results.length})`);
        return results;
    } catch (error: any) {
        console.error('❌ Web search error:', error.message);
        return [];
    }
}

/* -------------------- Route chính -------------------- */

router.post('/chat', async (req, res) => {
    try {
        const { message, studySetId, materialId, forceWebSearch } = req.body;
        if (!message || !studySetId) {
            return res.status(400).json({ error: 'Message and studySetId are required' });
        }

        // 1) load materials + gom text
        const materials = await getMaterialsForStudySet(studySetId);
        if (!materials.length) {
            return res.json({ response: 'Chưa có tài liệu trong set này. Hãy upload PDF trước nhé.' });
        }

        let allText = '';
        console.log('Processing materials:', materials.length);
        // If materialId is provided, use that; else default to latest
        const chosen = materialId ? materials.find((m: any) => String(m.id) === String(materialId)) : materials[0];
        if (!chosen) {
            return res.json({ response: 'Không tìm thấy tài liệu đã chọn.' });
        }
        console.log('Using material:', chosen.id, chosen.name, 'file_path:', chosen.file_path);
        if (!chosen.file_path) {
            return res.json({ response: 'File path không tồn tại cho tài liệu này.' });
        }
        // ✅ Kiểm tra cache PDF text trước
        const cacheKey = chosen.file_path;
        let cached = pdfTextCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < PDF_CACHE_TTL) {
            allText = cached.text;
            console.log('📦 Using cached PDF text');
        } else {
            const candidates = [
                path.join(process.cwd(), 'server/uploads', chosen.file_path),
                path.join(__dirname, '../uploads', chosen.file_path),
                path.join(__dirname, '../../uploads', chosen.file_path),
                path.join(process.cwd(), 'uploads', chosen.file_path),
            ];
            let fileFound = false;
            for (const p of candidates) {
                if (fs.existsSync(p)) {
                    const txt = await extractTextFromPDF(p);
                    allText = `\n\f${txt}`;
                    // ✅ Lưu vào cache
                    pdfTextCache.set(cacheKey, { text: allText, timestamp: Date.now() });
                    fileFound = true;
                    break;
                }
            }
            if (!fileFound) {
                return res.json({ response: 'Không tìm thấy file PDF. Vui lòng upload lại.' });
            }
        }

        console.log('Total extracted text length:', allText.length);
        console.log('First 200 chars of extracted text:', allText.substring(0, 200));

        if (!allText.trim()) {
            return res.json({ response: 'Mình không đọc được nội dung PDF. Kiểm tra lại file nhé.' });
        }

        // 2) chia trang → chunk → chọn top-k theo câu hỏi (✅ hybrid search)
        // ✅ Cache chunks để tránh tính lại
        let chunks = chunksCache.get(cacheKey);
        if (!chunks) {
            const pages = splitPages(allText);
            chunks = chunkWithPages(pages, CHUNK_SIZE, CHUNK_OVERLAP);
            chunksCache.set(cacheKey, chunks);
            console.log(`📊 Total chunks: ${chunks.length} (cached)`);
        } else {
            console.log(`📊 Using cached chunks: ${chunks.length}`);
        }

        const top = await pickTopK(message, chunks, TOP_K);

        console.log(`🎯 Selected top ${top.length} chunks`);

        // ✅ Web Search - Check if we need to search the web
        // ✅ Tắt web search tự động cho yêu cầu "tóm tắt" (đỡ dài prompt, nhanh hơn)
        const isSummaryRequest = /tóm tắt|tổng quan|nói về gì|giới thiệu|nội dung chính/i.test(message);

        // If forceWebSearch is true, always search. Otherwise, use needsWebSearch logic
        // ✅ Không search web cho yêu cầu tóm tắt (trừ khi user force)
        let webSearchResults: WebSearchResult[] = [];
        if (!isSummaryRequest && (forceWebSearch || needsWebSearch(message, top))) {
            console.log(`🔍 Performing web search for: "${message}" ${forceWebSearch ? '(forced by user)' : '(auto-detected)'}`);
            webSearchResults = await performWebSearch(message);
            console.log(`📊 Found ${webSearchResults.length} web search results`);
        } else if (isSummaryRequest) {
            console.log('📝 Summary request detected, skipping web search for faster response');
        }

        // 3) Pass-1: Scholar Analysis - Phân tích cấu trúc JSON hoặc trả lời câu hỏi cụ thể
        // ✅ isSummaryRequest đã được khai báo ở trên (dòng 707)

        // Phân biệt câu hỏi follow-up (không cần template cố định)
        const isFollowUpQuestion = message.toLowerCase().includes('là gì') ||
            message.toLowerCase().includes('như thế nào') ||
            message.toLowerCase().includes('giải thích') ||
            message.toLowerCase().includes('kỹ hơn') ||
            message.toLowerCase().includes('chi tiết') ||
            message.toLowerCase().includes('cụ thể') ||
            message.toLowerCase().includes('bao gồm') ||
            message.toLowerCase().includes('gồm những gì') ||
            message.toLowerCase().includes('các loại') ||
            message.toLowerCase().includes('các bước') ||
            message.toLowerCase().includes('quy trình') ||
            message.toLowerCase().includes('phương pháp') ||
            message.toLowerCase().includes('expert reviews') ||
            message.toLowerCase().includes('usability testing') ||
            message.toLowerCase().includes('survey instruments') ||
            message.toLowerCase().includes('field tests') ||
            message.toLowerCase().includes('heuristic evaluation') ||
            message.toLowerCase().includes('acceptance tests') ||
            message.toLowerCase().includes('controlled psychological') ||
            message.toLowerCase().includes('remote usability') ||
            message.toLowerCase().includes('paper mockups') ||
            message.toLowerCase().includes('discount usability');

        let structuredJson;
        if (isSummaryRequest) {
            // Tóm tắt toàn bộ tài liệu
            const { system: scholarSystem, user: scholarUser } = buildScholarPrompt(top);
            const scholarCompletion = await openai.chat.completions.create({
                model: MODEL,
                temperature: 0.1,
                max_tokens: 1500,
                messages: [
                    { role: 'system', content: scholarSystem },
                    { role: 'user', content: scholarUser },
                ],
            });

            try {
                const scholarResponse = scholarCompletion.choices?.[0]?.message?.content?.trim() || '{}';
                console.log('Scholar response:', scholarResponse.substring(0, 500));

                let cleanResponse = scholarResponse;
                cleanResponse = cleanResponse.replace(/[\x00-\x1F\x7F]/g, '');
                cleanResponse = cleanResponse.replace(/```json?\s*/g, '').replace(/```/g, '');

                // ✅ Use safe JSON parsing
                structuredJson = safeParseJsonBlock(cleanResponse);

                if (!structuredJson) {
                    throw new Error('Failed to parse JSON');
                }

                console.log('Parsed JSON successfully:', Object.keys(structuredJson));
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                structuredJson = {
                    overview: "Tài liệu học thuật",
                    key_points: ["Nội dung chính của tài liệu"],
                    definitions: {},
                    methods_or_arguments: [],
                    examples: [],
                    citations: []
                };
            }
        } else {
            // Trả lời câu hỏi cụ thể
            const qaSystem = `Bạn là một chuyên gia phân tích tài liệu. Nhiệm vụ: trả lời câu hỏi cụ thể dựa trên nguồn trích từ tài liệu.

QUAN TRỌNG:
- Chỉ trả lời câu hỏi được hỏi, không tóm tắt toàn bộ tài liệu
- Dựa hoàn toàn vào nguồn trích bên dưới
- Trả lời chi tiết và cụ thể
- Nếu có thông tin liên quan, hãy liệt kê đầy đủ
- Trích dẫn page number [pX] khi có thể`;

            const qaUser = `Câu hỏi: "${message}"

Nguồn trích từ tài liệu:
${top.map(c => `--- [PAGE ${c.page}]\n${c.text}`).join('\n\n')}

Hãy trả lời câu hỏi một cách chi tiết và cụ thể dựa trên nguồn trích trên.`;

            const qaCompletion = await openai.chat.completions.create({
                model: MODEL,
                temperature: 0.3,
                max_tokens: 1500,
                messages: [
                    { role: 'system', content: qaSystem },
                    { role: 'user', content: qaUser },
                ],
            });

            const qaResponse = qaCompletion.choices?.[0]?.message?.content?.trim() || '';

            // Tạo structured JSON cho câu trả lời cụ thể
            structuredJson = {
                overview: qaResponse,
                key_points: [qaResponse],
                definitions: {},
                methods_or_arguments: [],
                examples: [],
                citations: top.map(c => ({
                    page: c.page,
                    excerpt: c.text.substring(0, 200),
                    materialId: chosen?.id ? String(chosen.id) : undefined,
                    materialName: chosen?.name || undefined
                }))
            };
        }

        // ✅ Tối ưu: Gộp tất cả vào 1 pass duy nhất thay vì 3 pass
        const userName = req.body.userName || "Huyền Trang";
        const fileName = chosen?.name || "tài liệu";

        // Tạo prompt thông minh gộp tất cả yêu cầu
        const unifiedSystemPrompt = `Bạn là Spark.E — một trợ giảng AI thân thiện, thông minh và vui vẻ.

YÊU CẦU:
- Viết bằng tiếng Việt
- Xưng hô theo tên người dùng: "${userName}"
- Giọng tự nhiên, gần gũi, thân thiện nhưng chính xác học thuật
- Giữ nguyên format Markdown cơ bản (###, **bold**, *italic*)
- Mở đầu: 1-2 câu chào ấm áp với emoji (tối đa 3 emoji) như 🎉📚🙂
${webSearchResults.length > 0 ? '- Nếu có thông tin từ web search, hãy đề cập: "Để cung cấp thông tin chính xác nhất, mình đã tìm kiếm thêm trên web!"' : ''}
- Kết thúc: hỏi nhẹ "Bạn có muốn mình giải thích kỹ hơn phần nào không?"
- LOẠI BỎ tất cả citations [pX] khỏi câu trả lời
- Kết hợp thông tin từ tài liệu và web search (nếu có) để trả lời đầy đủ`;

        // Xây dựng nội dung từ structuredJson hoặc top chunks
        let sourceContent = '';
        if (structuredJson && structuredJson.overview) {
            sourceContent = `Thông tin từ tài liệu "${fileName}":
${structuredJson.overview}

${structuredJson.key_points ? `Điểm chính:\n${structuredJson.key_points.map((k: string) => `- ${k}`).join('\n')}` : ''}`;
        } else {
            sourceContent = `Nguồn trích từ tài liệu "${fileName}":
${top.map(c => `--- [PAGE ${c.page}]\n${c.text}`).join('\n\n')}`;
        }

        // Thêm web search results vào prompt nếu có
        let webSearchContent = '';
        if (webSearchResults.length > 0) {
            webSearchContent = `\n\nThông tin bổ sung từ web search:\n${webSearchResults.map((r, i) =>
                `${i + 1}. ${r.title}\n   ${r.snippet}\n   Nguồn: ${r.link}`
            ).join('\n\n')}`;
        }

        const unifiedUserPrompt = `Câu hỏi: "${message}"

${sourceContent}${webSearchContent}

Hãy trả lời câu hỏi một cách chi tiết, thân thiện và tự nhiên theo yêu cầu ở trên. Kết hợp thông tin từ tài liệu và web search (nếu có) để đưa ra câu trả lời đầy đủ nhất.`;

        // ✅ CHỈ 1 LẦN GỌI AI thay vì 3 lần
        // ✅ Thêm timeout để đảm bảo phản hồi nhanh
        let finalResponse = '';
        const startTime = Date.now();

        try {
            const unifiedCompletionPromise = openai.chat.completions.create({
                model: MODEL,
                temperature: 0.7, // Cân bằng giữa sáng tạo và chính xác
                max_tokens: 2000,
                messages: [
                    { role: 'system', content: unifiedSystemPrompt },
                    { role: 'user', content: unifiedUserPrompt },
                ],
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('AI timeout')), AI_TIMEOUT)
            );

            const unifiedCompletion = await Promise.race([
                unifiedCompletionPromise,
                timeoutPromise
            ]) as any;

            const duration = Date.now() - startTime;
            console.log(`✅ AI call completed in ${duration}ms`);
            finalResponse = unifiedCompletion.choices[0]?.message?.content?.trim() || '';
        } catch (error: any) {
            const duration = Date.now() - startTime;
            console.error(`❌ AI call failed after ${duration}ms:`, error.message);

            // ✅ Fallback bằng extractive summary thay vì raw text
            let fallbackText = 'Mình chưa kịp sinh tóm tắt đầy đủ, dưới đây là tóm tắt nhanh dựa trên nội dung gần nhất:\n\n';
            if (top.length > 0) {
                const raw = top.map(c => c.text).join('\n').slice(0, 4000);
                fallbackText += quickExtractiveSummary(raw, 6);
            } else {
                fallbackText += '- Chưa có nội dung phù hợp để tóm tắt.';
            }
            finalResponse = `### Tóm tắt nhanh 📚\n${fallbackText}`;
        }

        // Post-processing: Loại bỏ citations [pX] nếu còn sót
        finalResponse = finalResponse.replace(/\[p\d+\]/g, '').trim();

        // Đảm bảo có câu trả lời
        if (!finalResponse) {
            finalResponse = `Xin chào ${userName}! Mình đã nhận được câu hỏi của bạn nhưng chưa tìm thấy thông tin phù hợp trong tài liệu. Bạn có thể diễn đạt lại câu hỏi không? 😊`;
        }

        return res.json({
            response: finalResponse,
            structured: structuredJson,
            citations: structuredJson.citations || [],
            webSearchResults: webSearchResults, // ✅ Thêm web search results
            webSearchPerformed: webSearchResults.length > 0, // ✅ Flag để frontend biết
            sessionId: null, // Frontend sẽ tự tạo session
            debug: {
                totalChunks: chunks.length,
                selectedChunks: top.length,
                useEmbeddings: USE_EMBEDDINGS,
                webSearchPerformed: webSearchResults.length > 0
            }
        });
    } catch (err: any) {
        console.error('AI chat error:', err?.message || err);
        return res.status(200).json({
            response:
                'Xin lỗi, máy chủ AI đang bận. Bạn thử lại sau một chút nhé (hoặc rút gọn câu hỏi/ tài liệu).',
        });
    }
});

export default router;