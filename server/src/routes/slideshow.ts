import express from 'express';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import crypto from 'crypto';
import Database from 'better-sqlite3';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require('../../config');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodeHtmlToImage = require('node-html-to-image');

const dbPath = path.join(__dirname, '../../database/app.db');
const db = new Database(dbPath);

const router = express.Router();

type ScenePlan = {
    slideText: string; // text content to render on slide
    narration: string;
};

// ========= NotebookLM-style slide types =========
type SlideType = 'title' | 'content' | 'numbered' | 'highlight' | 'summary';
interface SlideContent {
    type: SlideType;
    title?: string;
    content?: string[];
    number?: number;
    highlight?: string;
}

function buildSlideshowPrompt(topic: string, language: string = 'vi'): string {
    if (language === 'en') {
        return `You are a teacher. Create an English VIDEO SLIDESHOW script for the topic: "${topic}" with exactly 5 scenes.

Requirements:
- Return plain text format, one scene per line.
- Each line follows this format:
  SCENE x | SLIDE_TEXT: <Brief text, 1-3 lines, to display on slide> | NARRATION: <Detailed narration for that scene>
- SLIDE_TEXT: Brief, concise, professional. If it's a list, use bullet points (-).
- NARRATION: Complete, natural narration.

Example (example only, do not reuse):
SCENE 1 | SLIDE_TEXT: What is Linear Regression? | NARRATION: Welcome. Linear regression is a statistical model used to predict...
SCENE 2 | SLIDE_TEXT: - Area\n- Number of bedrooms\n- Distance to city center | NARRATION: Many factors affect house prices, such as area, number of bedrooms, and distance...`;
    }

    return `Bạn là giáo viên. Hãy tạo kịch bản VIDEO SLIDESHOW tiếng Việt cho chủ đề: "${topic}" với đúng 5 cảnh.

Yêu cầu:
- Trả về dạng thuần văn bản, mỗi cảnh trên một dòng.
- Mỗi dòng theo định dạng:
  CẢNH x | SLIDE_TEXT: <Văn bản ngắn gọn, 1-3 dòng, hiển thị trên slide> | NARRATION: <Lời thuyết minh chi tiết cho cảnh đó>
- SLIDE_TEXT: Ngắn gọn, súc tích, chuyên nghiệp. Nếu là danh sách, dùng gạch đầu dòng (-).
- NARRATION: Lời thuyết minh đầy đủ, tự nhiên.

Ví dụ (chỉ là ví dụ, không dùng lại):
CẢNH 1 | SLIDE_TEXT: Hồi Quy Tuyến Tính là gì? | NARRATION: Chào mừng các bạn. Hồi quy tuyến tính là một mô hình thống kê dùng để dự đoán...
CẢNH 2 | SLIDE_TEXT: - Diện tích\n- Số phòng ngủ\n- Khoảng cách tới trung tâm | NARRATION: Có nhiều yếu tố ảnh hưởng đến giá nhà, ví dụ như diện tích, số phòng ngủ, và khoảng cách...`;
}

function parseScenes(script: string, language: string = 'vi'): ScenePlan[] {
    const lines = script.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const scenes: ScenePlan[] = [];
    for (const line of lines) {
        // Support both Vietnamese (CẢNH) and English (SCENE)
        const m = line.match(/(?:CẢNH|SCENE)\s*\d+\s*\|\s*SLIDE_TEXT:\s*(.*?)\s*\|\s*NARRATION:\s*(.*)/i);
        if (m) {
            scenes.push({ slideText: m[1].trim(), narration: m[2].trim() });
            continue;
        }
        // Legacy compatibility: "ẢNH: ... | LỜI THUYẾT MINH: ..."
        const legacy = line.match(/CẢNH\s*\d+\s*\|\s*ẢNH:\s*(.*?)\s*\|\s*LỜI THUYẾT MINH:\s*(.*)/i);
        if (legacy) {
            const legacyText = legacy[1].trim();
            const legacyNarr = legacy[2].trim();
            const fallbackText = language === 'en' ? 'Key points summary' : 'Tóm tắt ý chính';
            scenes.push({ slideText: legacyText || fallbackText, narration: legacyNarr });
        }
    }
    return scenes.slice(0, 5);
}

async function generateSlideImage(slideText: string, index: number, dir: string): Promise<string[]> {
    // Parse title + bullets
    const rawLines = slideText.split('\n').map((l) => l.trim()).filter(Boolean);
    let title = rawLines[0] || '';
    let bullets = rawLines.slice(1).map((l) => (l.startsWith('-') ? l.slice(1).trim() : l)).filter(Boolean);

    const TITLE_MAX = 50;
    let splitTitleA = '';
    let splitTitleB = '';
    if (title.length > TITLE_MAX) {
        const words = title.split(' ');
        let t = '';
        const rest: string[] = [];
        for (const w of words) {
            if ((t + ' ' + w).trim().length <= TITLE_MAX) t = (t ? t + ' ' : '') + w; else rest.push(w);
        }
        splitTitleA = t.trim();
        splitTitleB = rest.join(' ').trim();
    }
    if (!splitTitleA && (title.match(/\s+/g)?.length || 0) > 10) {
        splitTitleA = title.split(' ').slice(0, 7).join(' ') + '…';
        splitTitleB = title;
    }
    bullets = bullets.filter((b) => b && b.length >= 5).slice(0, 6);

    const render = async (titleText: string, bulletList: string[], suffix: string): Promise<string> => {
        const outputPath = path.join(dir, `slide-${index}-${suffix}-${Date.now()}.jpg`);
        const bulletHTML = bulletList.length ? `<ul>${bulletList.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : '';
        const html = `
  <html><head><meta charset=\"UTF-8\" />
  <style>*{box-sizing:border-box} body{width:1280px;height:720px;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0f172a;display:flex;justify-content:center;align-items:center;padding:56px;background:#fff}
  .grid{position:absolute;inset:0;background-image:linear-gradient(to right,rgba(2,6,23,.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(2,6,23,.05) 1px,transparent 1px);background-size:28px 28px}
  .card{position:relative;width:100%;max-width:1100px;background:#fff;border-radius:24px;padding:48px 56px;border:1px solid rgba(2,6,23,.08);box-shadow:0 20px 40px rgba(2,6,23,.12)}
  .accent{position:absolute;right:-12px;top:-12px;width:240px;height:140px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);filter:blur(26px);opacity:.25;border-radius:24px}
  h1{margin:0 0 16px;font-weight:800;letter-spacing:-.01em;line-height:1.2;font-size:clamp(28px,3.8vw,42px);word-break:break-word;overflow-wrap:anywhere;hyphens:auto;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  ul{list-style:none;padding:0;margin:0;font-size:clamp(18px,2.6vw,30px);line-height:1.55;color:#334155;word-break:break-word;overflow-wrap:anywhere;hyphens:auto}
  li{margin:12px 0;padding-left:28px;position:relative}
  li::before{content:'•';position:absolute;left:0;top:.05em;color:#3b82f6;font-weight:900;font-size:clamp(22px,3vw,36px)}
  .container{position:relative;width:100%;height:100%;display:flex;justify-content:center;align-items:center}
  </style></head>
  <body><div class=\"grid\"></div><div class=\"container\"><div class=\"card\"><div class=\"accent\"></div>
  <h1>${escapeHtml(titleText || (rawLines[0] || ''))}</h1>${bulletHTML}
  </div></div></body></html>`;
        await nodeHtmlToImage({ output: outputPath, quality: 85, html });
        return outputPath;
    };

    const paths: string[] = [];
    if (splitTitleA && splitTitleB) {
        const p1 = await render(splitTitleA, [], 'a');
        const p2 = await render(splitTitleB, bullets, 'b');
        paths.push(p1, p2);
    } else {
        const p = await render(title, bullets, 'a');
        paths.push(p);
    }
    return paths;

    function escapeHtml(s: string): string {
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

// ======= NotebookLM-style parsing/generation =======
function parseContentToSlides(longText: string, maxSlides = 5, language: string = 'vi'): SlideContent[] {
    const slides: SlideContent[] = [];

    // Normalize and clean text
    const cleanText = longText.trim().normalize('NFC');
    if (!cleanText || cleanText.length < 10) {
        // If text is too short, create minimal slides
        const fallbackTitle = language === 'en' ? 'Topic Overview' : 'Tổng quan chủ đề';
        slides.push({
            type: 'title',
            title: cleanText.substring(0, 50) || fallbackTitle,
            content: [cleanText.substring(0, 100) || '']
        });
        slides.push({
            type: 'summary',
            title: language === 'en' ? 'Summary & Key Takeaways' : 'Tóm tắt & Ghi nhớ',
            content: [cleanText]
        });
        return slides;
    }

    // First, try splitting by blank lines
    let paragraphs = cleanText
        .split(/\n\s*\n|\r?\n\r?\n/)
        .map((p) => p.trim())
        .filter(Boolean);

    // If we have only 1 paragraph or no paragraphs, try splitting by sentences
    if (paragraphs.length <= 1) {
        const sentences = cleanText
            .split(/[.。!?]\s+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 15); // Filter very short sentences

        if (sentences.length > 0) {
            // Group sentences into chunks (roughly 2-3 sentences per chunk)
            const targetChunks = Math.max(3, maxSlides - 1);
            const chunkSize = Math.max(1, Math.ceil(sentences.length / targetChunks));
            paragraphs = [];
            for (let i = 0; i < sentences.length; i += chunkSize) {
                const chunk = sentences.slice(i, i + chunkSize).join('. ').trim();
                if (chunk) paragraphs.push(chunk + '.');
            }
        }
    }

    // If still no paragraphs, split by length (every ~400 chars)
    if (paragraphs.length <= 1 && cleanText.length > 150) {
        const targetChunks = Math.max(3, maxSlides - 1);
        const chunkSize = Math.max(200, Math.floor(cleanText.length / targetChunks));
        paragraphs = [];
        let lastIndex = 0;
        for (let i = 0; i < cleanText.length && paragraphs.length < targetChunks; i += chunkSize) {
            const endIndex = Math.min(i + chunkSize, cleanText.length);
            let chunk = cleanText.slice(lastIndex, endIndex).trim();

            // Try to split at sentence boundary
            if (endIndex < cleanText.length) {
                const lastPeriod = chunk.lastIndexOf('.');
                const lastExclamation = chunk.lastIndexOf('!');
                const lastQuestion = chunk.lastIndexOf('?');
                const lastBoundary = Math.max(lastPeriod, lastExclamation, lastQuestion);
                if (lastBoundary > chunk.length * 0.3 && lastBoundary > 50) {
                    chunk = chunk.slice(0, lastBoundary + 1).trim();
                    lastIndex = lastIndex + lastBoundary + 1;
                } else {
                    lastIndex = endIndex;
                }
            } else {
                lastIndex = endIndex;
            }

            if (chunk && chunk.length > 20) {
                paragraphs.push(chunk);
            }
        }
        // Add remaining text as last paragraph
        if (lastIndex < cleanText.length) {
            const remaining = cleanText.slice(lastIndex).trim();
            if (remaining && remaining.length > 20) {
                paragraphs.push(remaining);
            }
        }
    }

    // Ensure we have at least 1 paragraph
    if (paragraphs.length === 0) {
        paragraphs = [cleanText];
    }

    // Create title slide
    const firstPara = paragraphs[0];
    const firstSentences = firstPara.split(/[.。]/).filter(Boolean);
    slides.push({
        type: 'title',
        title: extractMainTopic(firstSentences[0] || firstPara),
        content: [((firstSentences.slice(0, 2).join('. ')) || firstPara.substring(0, 150)).trim()].filter(Boolean)
    });

    // Create middle slides
    const middleParas = paragraphs.slice(1, -1);
    const numMiddleSlides = Math.min(maxSlides - 2, Math.max(1, middleParas.length));

    // If no middle paragraphs but we need more slides, split the first paragraph or create from all paragraphs
    if (middleParas.length === 0 && slides.length < maxSlides - 1) {
        // Try to split first paragraph into multiple slides
        const firstParaSentences = firstPara.split(/[.。]/).filter((s) => s.trim().length > 10);
        if (firstParaSentences.length > 3) {
            const sentencesPerSlide = Math.max(2, Math.ceil(firstParaSentences.length / (maxSlides - 2)));
            for (let i = 0; i < maxSlides - 2 && i * sentencesPerSlide < firstParaSentences.length; i++) {
                const startIdx = i * sentencesPerSlide;
                const endIdx = Math.min(startIdx + sentencesPerSlide, firstParaSentences.length);
                const chunk = firstParaSentences.slice(startIdx, endIdx).join('. ').trim();
                if (chunk) {
                    slides.push({
                        type: 'content',
                        title: extractKeyPhrase(chunk, language),
                        content: extractBulletPoints(chunk, language).length > 0
                            ? extractBulletPoints(chunk, language)
                            : [chunk.substring(0, 200)]
                    });
                }
            }
        } else {
            // If we have other paragraphs, use them
            for (let i = 1; i < paragraphs.length && slides.length < maxSlides - 1; i++) {
                const para = paragraphs[i];
                slides.push({
                    type: 'content',
                    title: extractKeyPhrase(para, language),
                    content: extractBulletPoints(para, language).length > 0
                        ? extractBulletPoints(para, language)
                        : [para.substring(0, 200)]
                });
            }
        }
    } else {
        for (let i = 0; i < numMiddleSlides && i < middleParas.length; i++) {
            const para = middleParas[i];
            let isNumbered = false;
            if (language === 'en') {
                isNumbered = /(Phase|Step|Stage)\s+(one|two|three|1|2|3|\d+)/i.test(para) || /^\d+[.)]/.test(para) || ((i === 0) && (para.includes('first') || para.includes('one')));
            } else {
                isNumbered = /(Pha|Bước|Giai đoạn)\s+(sáng|tối|\d+)/i.test(para) || /^\d+[.)]/.test(para) || ((i === 0) && (para.includes('một') || para.includes('thứ nhất')));
            }
            if (isNumbered) {
                slides.push({ type: 'numbered', number: i + 1, title: extractKeyPhrase(para, language), content: extractBulletPoints(para, language) });
            } else {
                slides.push({ type: 'content', title: extractKeyPhrase(para, language), content: extractBulletPoints(para, language) });
            }
        }
    }

    // Always add summary slide - ensure we have at least 2 slides total
    const lastPara = paragraphs.length > 1 ? paragraphs[paragraphs.length - 1] : paragraphs[0];
    const summaryTitle = language === 'en' ? 'Summary & Key Takeaways' : 'Tóm tắt & Ghi nhớ';
    let summaryContent = extractBulletPoints(lastPara, language).slice(0, 3);

    // If no bullets, use last few sentences or part of the paragraph
    if (summaryContent.length === 0) {
        const lastSentences = lastPara.split(/[.。]/).filter(Boolean).slice(-2);
        if (lastSentences.length > 0) {
            summaryContent = lastSentences.map(s => s.trim()).filter(Boolean);
        } else {
            summaryContent = [lastPara.substring(0, 200)];
        }
    }

    // Ensure summary content is not empty
    if (summaryContent.length === 0) {
        summaryContent = [language === 'en' ? 'Key points to remember' : 'Những điểm quan trọng cần nhớ'];
    }

    slides.push({ type: 'summary', title: summaryTitle, content: summaryContent });

    // Ensure we return at least 2 slides
    if (slides.length < 2) {
        // Emergency fallback: create a second slide from the content
        slides.push({
            type: 'content',
            title: language === 'en' ? 'Details' : 'Chi tiết',
            content: [cleanText.substring(0, 300)]
        });
    }

    return slides.slice(0, maxSlides);
}

function extractMainTopic(text: string): string {
    let topic = text.trim();
    if (topic.includes(' là ')) topic = topic.split(' là ')[0];
    if (topic.length > 50) topic = topic.split(' ').slice(0, 6).join(' ');
    return topic.trim();
}

function extractKeyPhrase(paragraph: string, language: string = 'vi'): string {
    const sentences = paragraph.split(/[.。]/).map((s) => s.trim()).filter(Boolean);
    if (sentences.length === 0) return language === 'en' ? 'Content' : 'Nội dung';
    let phrase = sentences[0];
    if (language === 'en') {
        phrase = phrase.replace(/^(When|Meanwhile|Then|In|For example|This is|Thus|So)\s+/i, '');
    } else {
        phrase = phrase.replace(/^(Khi|Đồng thời|Sau đó|Trong|Ví dụ|Đây là|Như vậy)\s+/i, '');
    }
    return phrase.trim();
}

function extractBulletPoints(paragraph: string, language: string = 'vi'): string[] {
    const sentences = paragraph.split(/[.。]/).map((s) => s.trim()).filter(Boolean);
    const points: string[] = [];
    for (const sent of sentences) {
        if (sent.length < 8) continue;
        const point = sent.replace(/^\s*-\s*/, '').trim();
        points.push(point);
        if (points.length >= 6) break; // max 6 bullets
    }
    const fallbackText = language === 'en' ? 'Main content of this section' : 'Nội dung chính của đoạn này';
    return points.length > 0 ? points : [fallbackText];
}

function generateSlideHTML(slide: SlideContent, index: number, language: string = 'vi'): string {
    switch (slide.type) {
        case 'title': return generateTitleSlide(slide, language);
        case 'numbered': return generateNumberedSlide(slide, index, language);
        case 'highlight': return generateHighlightSlide(slide, language);
        case 'summary': return generateSummarySlide(slide, language);
        case 'content':
        default: return generateContentSlide(slide, language);
    }
}

function generateTitleSlide(slide: SlideContent, language: string = 'vi'): string {
    return `<html><head><meta charset="UTF-8"><style>
        body { width: 1280px; height: 720px; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; justify-content: center; align-items: center; }
        .container { text-align: center; color: white; padding: 64px; max-width: 1000px; }
        .logo { width: 80px; height: 80px; background: white; border-radius: 20px; margin: 0 auto 32px; 
            display: flex; align-items: center; justify-content: center; font-size: 48px; }
        h1 { font-size: clamp(44px, 6vw, 84px); font-weight: 800; margin: 0 0 24px; line-height: 1.1; letter-spacing: -0.02em;
            word-break: break-word; overflow-wrap:anywhere; hyphens:auto; }
        .subtitle { font-size: clamp(22px, 3vw, 36px); opacity: 0.9; font-weight: 400; line-height: 1.4;
            word-break: break-word; overflow-wrap:anywhere; hyphens:auto; }
    </style></head><body>
        <div class="container">
            <div class="logo">🚀</div>
            <h1>${slide.title || (language === 'en' ? 'Topic' : 'Chủ đề')}</h1>
            <div class="subtitle">${(slide.content || [''])[0] || ''}</div>
        </div>
    </body></html>`;
}

function generateNumberedSlide(slide: SlideContent, index: number, language: string = 'vi'): string {
    const bulletHTML = (slide.content || []).map((item) => `<li>${item}</li>`).join('');
    return `<html><head><meta charset="UTF-8"><style>
        body { width:1280px; height:720px; margin:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(to bottom,#f0fdf4 0%,#dcfce7 100%); display:flex; align-items:center; }
        .layout { display:flex; width:100%; height:100%; }
        .number-side { width: 300px; background: linear-gradient(135deg,#10b981,#059669);
            display:flex; align-items:center; justify-content:center; box-shadow:4px 0 20px rgba(0,0,0,.1); }
        .number { font-size: 170px; font-weight:900; color:#fff; text-shadow:0 4px 20px rgba(0,0,0,.2); }
        .content-side { flex:1; padding:56px 72px; }
        h2 { font-size: clamp(36px, 4.2vw, 56px); font-weight:750; color:#065f46; margin:0 0 24px; line-height:1.25; letter-spacing:-.01em;
            word-break: break-word; overflow-wrap:anywhere; hyphens:auto; }
        ul { list-style:none; padding:0; margin:0; font-size: clamp(22px, 2.6vw, 36px); line-height:1.55; color:#064e3b;
            word-break: break-word; overflow-wrap:anywhere; hyphens:auto; }
        li { padding:10px 0 10px 44px; position:relative; }
        li::before { content:'✓'; position:absolute; left:0; top:.1em; color:#10b981; font-weight:900; font-size: clamp(24px, 3vw, 36px); }
    </style></head><body>
        <div class="layout">
            <div class="number-side"><div class="number">${slide.number || index + 1}</div></div>
            <div class="content-side">
                <h2>${slide.title || (language === 'en' ? 'Title' : 'Tiêu đề')}</h2>
                <ul>${bulletHTML}</ul>
            </div>
        </div>
    </body></html>`;
}

function generateContentSlide(slide: SlideContent, language: string = 'vi'): string {
    const bulletHTML = (slide.content || []).map((item) => `<li>${item}</li>`).join('');
    return `<html><head><meta charset=\"UTF-8\"><style>
        body { width:1280px; height:720px; margin:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: white; display:flex; justify-content:center; align-items:center; padding:64px; box-sizing:border-box; }
        .grid { position: absolute; inset: 0; background-image: 
            linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px); background-size: 32px 32px; }
        .card { position: relative; max-width: 1100px; width: 100%; background: white; border-radius: 24px;
            padding: 56px 64px; box-sizing: border-box; box-shadow: 0 20px 60px rgba(0,0,0,0.12); border: 1px solid rgba(0,0,0,0.08); }
        .accent { position: absolute; top: -12px; right: -12px; width: 240px; height: 140px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 24px; filter: blur(26px); opacity: 0.25; z-index: 0; }
        .content { position: relative; z-index: 1; }
        h1 { font-size: clamp(34px, 4vw, 50px); font-weight: 800; color: #0f172a; margin: 0 0 28px; line-height: 1.25; letter-spacing: -0.01em;
            word-break: break-word; overflow-wrap:anywhere; hyphens: auto; }
        ul { list-style: none; padding: 0; margin: 0; font-size: clamp(20px, 2.8vw, 34px); line-height: 1.55; color: #334155;
            word-break: break-word; overflow-wrap:anywhere; hyphens: auto; }
        li { margin: 14px 0; padding-left: 28px; position: relative; }
        li::before { content: '•'; position: absolute; left: 0; color: #3b82f6; font-weight: 900; font-size: clamp(28px, 3.2vw, 42px); }
    </style></head><body>
        <div class=\"grid\"></div>
        <div class=\"card\">
            <div class=\"accent\"></div>
            <div class=\"content\">
                <h1>${slide.title || (language === 'en' ? 'Title' : 'Tiêu đề')}</h1>
                <ul>${bulletHTML}</ul>
            </div>
        </div>
    </body></html>`;
}

function generateHighlightSlide(slide: SlideContent, language: string = 'vi'): string {
    return `<html><head><meta charset=\"UTF-8\"><style>
        body { width: 1280px; height: 720px; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); display: flex; justify-content: center; align-items: center; padding: 100px; box-sizing: border-box; }
        .highlight-box { background: white; border-radius: 32px; padding: 80px; text-align: center; 
            box-shadow: 0 30px 80px rgba(0,0,0,0.2); position: relative; overflow: hidden; }
        .highlight-box::before { content: '💡'; position: absolute; top: 32px; right: 32px; font-size: 64px; opacity: 0.3; }
        h2 { font-size: 72px; font-weight: 900; color: #78350f; margin: 0 0 32px; line-height: 1.1; }
        .text { font-size: 42px; color: #92400e; line-height: 1.6; font-weight: 500; }
    </style></head><body>
        <div class=\"highlight-box\">
            <h2>${slide.title || (language === 'en' ? 'Highlight' : 'Điểm nhấn')}</h2>
            <div class=\"text\">${slide.highlight || (slide.content || [''])[0] || ''}</div>
        </div>
    </body></html>`;
}

function generateSummarySlide(slide: SlideContent, language: string = 'vi'): string {
    const bulletHTML = (slide.content || [])
        .map((item, i) => `<li><span class=\"num\">${i + 1}</span><div class=\"text\">${item}</div></li>`)
        .join('');

    return `<html><head><meta charset=\"UTF-8\"><style>
        body {
          width: 1280px; height: 720px; margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          display: flex; justify-content: center; align-items: center;
          padding: 60px; box-sizing: border-box;
        }
        .summary-card {
          background: rgba(255,255,255,0.97);
          border-radius: 32px;
          padding: 60px 80px;
          width: 100%; max-width: 1000px; height: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          display: flex; flex-direction: column;
          justify-content: center;
        }
        h1 {
          font-size: clamp(48px, 6vw, 68px);
          font-weight: 800; color: #0f172a;
          margin: 0 0 32px; text-align: center;
          line-height: 1.2; word-break: break-word;
        }
        ul {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 24px;
        }
        li {
          display: flex; align-items: flex-start; gap: 20px;
          font-size: clamp(30px, 2vw, 38px);
          line-height: 1.5; color: #1e293b;
          word-break: break-word; overflow-wrap: break-word;
        }
        .num {
          flex-shrink: 0;
          width: 56px; height: 56px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: 32px;
        }
        .text {
          flex: 1;
          max-height: 160px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
        }
    </style></head><body>
        <div class=\"summary-card\"> 
          <h1>${slide.title || (language === 'en' ? 'Summary' : 'Tổng kết')}</h1>
          <ul>${bulletHTML}</ul>
        </div>
    </body></html>`;
}

async function generateSlideImageFromTemplate(slide: SlideContent, index: number, dir: string, language: string = 'vi'): Promise<string> {
    const outputPath = path.join(dir, `slide-${index}-${Date.now()}.jpg`);
    const html = generateSlideHTML(slide, index, language);
    await nodeHtmlToImage({ output: outputPath, quality: 85, html });
    return outputPath;
}

async function ensureUploadsDir(): Promise<string> {
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    return uploadsDir;
}

async function fetchWithTimeout(url: string, options: any, timeoutMs = 20000): Promise<any> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        return await fetch(url, { ...(options || {}), signal: ctrl.signal });
    } finally {
        clearTimeout(t);
    }
}

async function generateScript(topic: string, language: string = 'vi'): Promise<string> {
    const geminiKey = config.GEMINI_API_KEY;
    const prompt = buildSlideshowPrompt(topic, language);
    if (geminiKey) {
        try {
            const resp = await fetchWithTimeout(
                `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-002:generateContent?key=${geminiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
                },
                20000
            );
            if (resp.ok) {
                const g: any = await resp.json();
                const text = (g.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
                if (text) return text;
            }
        } catch { /* ignore */ }
    }
    // Emergency fallback script (5 lines) in new SLIDE_TEXT/NARRATION format
    if (language === 'en') {
        return [
            `SCENE 1 | SLIDE_TEXT: What is ${topic}? | NARRATION: Introduction, briefly state the concept and application context to help learners understand the problem.`,
            `SCENE 2 | SLIDE_TEXT: Core Knowledge | NARRATION: Present the main elements, relationships, or formulas. Express clearly, point by point, avoid lengthy explanations.`,
            `SCENE 3 | SLIDE_TEXT: Examples | NARRATION: Provide specific examples, explain why they are suitable; point out input - process - output for learners to follow easily.`,
            `SCENE 4 | SLIDE_TEXT: Practice/Experiment | NARRATION: Suggest a simple verification activity, mention minimal tools, how to observe and draw conclusions.`,
            `SCENE 5 | SLIDE_TEXT: Summary & Learning Tips | NARRATION: Summarize three key points and self-study tips: draw diagrams, do exercises, relate to reality; encourage asking questions to deepen understanding.`
        ].join('\n');
    }
    return [
        `CẢNH 1 | SLIDE_TEXT: ${topic} là gì? | NARRATION: Mở đầu, nêu khái niệm ngắn gọn và bối cảnh ứng dụng để người học định vị vấn đề.`,
        `CẢNH 2 | SLIDE_TEXT: Trọng tâm kiến thức | NARRATION: Trình bày các yếu tố, mối quan hệ hoặc công thức chính. Diễn đạt rõ ràng, từng ý một, tránh dài dòng.`,
        `CẢNH 3 | SLIDE_TEXT: Ví dụ minh họa | NARRATION: Đưa ví dụ cụ thể, giải thích vì sao phù hợp; chỉ ra đầu vào – quá trình – kết quả để người học theo dõi dễ.`,
        `CẢNH 4 | SLIDE_TEXT: Thực hành/Thí nghiệm | NARRATION: Gợi ý một hoạt động kiểm chứng đơn giản, nêu dụng cụ tối giản, cách quan sát và rút ra nhận xét.`,
        `CẢNH 5 | SLIDE_TEXT: Tổng kết & Mẹo học | NARRATION: Tóm tắt ba ý chính và mẹo tự học: vẽ sơ đồ, làm bài tập, liên hệ thực tế; khuyến khích đặt câu hỏi để đào sâu.`
    ].join('\n');
}

async function searchPexelsImages(query: string, perPage = 2): Promise<string[]> {
    const key = config.PEXELS_API_KEY;
    if (!key) return [];
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&size=large`;
    const resp = await fetchWithTimeout(url, { headers: { Authorization: key } }, 15000);
    if (!resp.ok) return [];
    const data: any = await resp.json();
    const photos = data.photos || [];
    const urls: string[] = [];
    for (const p of photos) {
        const u = p?.src?.landscape || p?.src?.large || p?.src?.medium || p?.src?.original;
        if (u) urls.push(u);
    }
    return urls;
}

async function downloadToTemp(url: string, dir: string): Promise<string> {
    const res = await fetchWithTimeout(url, {}, 20000);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    const name = `img-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`;
    const p = path.join(dir, name);
    fs.writeFileSync(p, buf);
    return p;
}

async function getGoogleAccessToken(): Promise<string> {
    const gsaPath = config.GOOGLE_TTS_CREDENTIALS_PATH;
    const raw = fs.readFileSync(gsaPath, 'utf8');
    const sa = JSON.parse(raw);
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claim = {
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
    };
    const base64url = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const unsigned = base64url(header) + '.' + base64url(claim);
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(unsigned);
    const signature = sign.sign(sa.private_key, 'base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const assertion = unsigned + '.' + signature;
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion
        }).toString()
    });
    const tokenJson: any = await tokenResp.json();
    if (!tokenResp.ok) throw new Error(tokenJson?.error || 'oauth failed');
    return tokenJson.access_token;
}

async function synthesizeGoogleTTS(text: string): Promise<{ audioPath: string; durationSec: number; }> {
    const uploads = await ensureUploadsDir();
    const token = await getGoogleAccessToken();
    const speakingRate = 1.02;
    const ssml = `<speak xml:lang="vi-VN"><prosody rate="${speakingRate}" pitch="0.3st">${text}</prosody></speak>`;
    const preferredVoices = ['vi-VN-Wavenet-A', 'vi-VN-Wavenet-D', 'vi-VN-Wavenet-B'];
    for (const name of preferredVoices) {
        const resp = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: { ssml },
                voice: { languageCode: 'vi-VN', name, ssmlGender: 'FEMALE' },
                audioConfig: { audioEncoding: 'MP3', speakingRate, pitch: 0.0 }
            })
        });
        const json: any = await resp.json();
        if (resp.ok && json.audioContent) {
            const filename = `slideshow-audio-${Date.now()}.mp3`;
            const audioPath = path.join(uploads, filename);
            fs.writeFileSync(audioPath, Buffer.from(json.audioContent, 'base64'));
            const dur = await probeDuration(audioPath);
            return { audioPath, durationSec: dur };
        }
    }
    throw new Error('Google TTS voices unavailable');
}

function execF(cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
        const child = execFile(cmd, args, { encoding: 'utf8' }, (err, stdout, stderr) => {
            resolve({ code: err ? 1 : 0, stdout: stdout || '', stderr: stderr || '' });
        });
    });
}

async function probeDuration(filePath: string): Promise<number> {
    const { code, stdout, stderr } = await execF('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        filePath
    ]);
    if (code !== 0) return 60;
    const v = parseFloat((stdout || stderr || '0').trim());
    return Number.isFinite(v) && v > 0 ? v : 60;
}

router.post('/slideshow', async (req, res) => {
    try {
        const { prompt, webImage, audioUrl, content, userId, studySetId } = req.body || {};
        const uploads = await ensureUploadsDir();

        // Branch A: New NotebookLM-style content → slides
        if (typeof content === 'string' && content.trim()) {
            const { language = 'vi' } = req.body;
            const longText = String(content).trim().normalize('NFC');
            console.log(`📝 Parsing content to slides (length: ${longText.length}, language: ${language})`);
            const slides = parseContentToSlides(longText, 5, language);
            console.log(`✅ Generated ${slides.length} slides from content`);

            if (slides.length < 2) {
                console.error(`❌ Failed to generate enough slides. Content preview: ${longText.substring(0, 200)}`);
                const errorMsg = language === 'en' ? 'Cannot generate enough slides from content' : 'Không thể tạo đủ slides từ nội dung';
                return res.status(500).json({ error: errorMsg });
            }

            const tempDir = fs.mkdtempSync(path.join(uploads, 'tmp-'));
            const imagePaths: string[] = [];
            try {
                for (let i = 0; i < slides.length; i++) {
                    try {
                        const imgPath = await generateSlideImageFromTemplate(slides[i], i, tempDir, language);
                        imagePaths.push(imgPath);
                    } catch {
                        const out = path.join(tempDir, `fallback-${i}.jpg`);
                        await execF('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=black:s=1280x720:d=1', '-frames:v', '1', out]);
                        imagePaths.push(out);
                    }
                }

                // Audio source (reuse provided, synthesize from content, or silent 30s)
                let audioPath: string = '';
                let durationSec = 30;
                if (typeof audioUrl === 'string' && audioUrl.startsWith('http')) {
                    // Reuse existing audio
                    const ab = await (await fetchWithTimeout(audioUrl, {}, 30000)).arrayBuffer();
                    audioPath = path.join(uploads, `audio-reuse-${Date.now()}.mp3`);
                    fs.writeFileSync(audioPath, Buffer.from(ab));
                    durationSec = await probeDuration(audioPath);
                } else if (typeof content === 'string' && content.trim()) {
                    // Generate audio from content using AI summary + TTS
                    try {
                        console.log('🎙️ Generating audio from material content...');
                        // Tạo script từ content (tóm tắt/summarize)
                        const geminiKey = config.GEMINI_API_KEY;
                        const { language = 'vi' } = req.body;
                        const langCode = language === 'en' ? 'en-US' : 'vi-VN';
                        const langName = language === 'en' ? 'en-US-Neural2-F' : 'vi-VN-Wavenet-A';

                        // Tạo prompt để AI tóm tắt content thành script phù hợp cho video
                        const summaryPrompt = language === 'en'
                            ? `You are a teacher. Create a comprehensive video script (500-700 words) summarizing this content for an explainer video. Write in continuous prose, NO headings or bullet points. Start immediately with the main concept. Content:\n\n${content.substring(0, 10000)}`
                            : `Bạn là giáo viên. Tạo một kịch bản video tổng hợp (500-700 từ) tóm tắt nội dung này cho video giải thích. Viết thành văn bản liền mạch, KHÔNG có tiêu đề hoặc bullet points. Bắt đầu ngay với khái niệm chính. Nội dung:\n\n${content.substring(0, 10000)}`;

                        let scriptText = '';
                        if (geminiKey) {
                            try {
                                const resp = await fetchWithTimeout(
                                    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-002:generateContent?key=${geminiKey}`,
                                    {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            contents: [{ role: 'user', parts: [{ text: summaryPrompt }] }],
                                            generationConfig: { maxOutputTokens: 2500 }
                                        })
                                    },
                                    30000
                                );
                                if (resp.ok) {
                                    const g: any = await resp.json();
                                    scriptText = (g.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
                                }
                            } catch (e) {
                                console.error('Gemini summary failed:', e);
                            }
                        }

                        // Fallback: lấy phần đầu của content nếu AI không hoạt động
                        if (!scriptText || scriptText.length < 200) {
                            scriptText = content.substring(0, 3000).trim();
                        }

                        console.log(`📝 Generated script from content: ${scriptText.length} characters`);

                        // Tạo audio từ script
                        const token = await getGoogleAccessToken();
                        const speakingRate = 1.02;
                        const ssml = language === 'en'
                            ? `<speak xml:lang="${langCode}"><prosody rate="${speakingRate}">${scriptText}</prosody></speak>`
                            : `<speak xml:lang="${langCode}"><prosody rate="${speakingRate}" pitch="0.3st">${scriptText}</prosody></speak>`;

                        const preferredVoices = language === 'en'
                            ? ['en-US-Neural2-F', 'en-US-Neural2-D', 'en-US-Neural2-J']
                            : ['vi-VN-Wavenet-A', 'vi-VN-Wavenet-D', 'vi-VN-Wavenet-B'];

                        let audioCreated = false;
                        for (const name of preferredVoices) {
                            try {
                                const resp = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
                                    method: 'POST',
                                    headers: {
                                        Authorization: `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        input: { ssml },
                                        voice: {
                                            languageCode: langCode,
                                            name,
                                            ssmlGender: 'FEMALE'
                                        },
                                        audioConfig: {
                                            audioEncoding: 'MP3',
                                            speakingRate,
                                            pitch: language === 'en' ? 0.0 : 0.0
                                        }
                                    })
                                });
                                const json: any = await resp.json();
                                if (resp.ok && json.audioContent) {
                                    const filename = `slideshow-audio-content-${Date.now()}.mp3`;
                                    audioPath = path.join(uploads, filename);
                                    fs.writeFileSync(audioPath, Buffer.from(json.audioContent, 'base64'));
                                    durationSec = await probeDuration(audioPath);
                                    audioCreated = true;
                                    console.log(`✅ Generated audio from content: ${durationSec}s`);
                                    break;
                                }
                            } catch (e) {
                                console.error(`Failed to create audio with voice ${name}:`, e);
                                continue;
                            }
                        }

                        if (!audioCreated) {
                            throw new Error('Failed to generate audio from content');
                        }
                    } catch (audioErr: any) {
                        console.error('Failed to generate audio from content, using silent fallback:', audioErr);
                        // Fallback to silent audio
                        audioPath = path.join(uploads, `silent-${Date.now()}.mp3`);
                        await execF('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', '30', '-acodec', 'libmp3lame', audioPath]);
                        durationSec = 30;
                    }
                } else {
                    // No content and no audioUrl - use silent
                    audioPath = path.join(uploads, `silent-${Date.now()}.mp3`);
                    await execF('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', '30', '-acodec', 'libmp3lame', audioPath]);
                    durationSec = 30;
                }

                // Build video
                const perImage = Math.max(3, Math.floor(durationSec / imagePaths.length));
                const segPaths: string[] = [];
                for (let i = 0; i < imagePaths.length; i++) {
                    const seg = path.join(tempDir, `seg-${i}.mp4`);
                    const args = ['-y', '-loop', '1', '-i', imagePaths[i], '-t', String(perImage), '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p', '-r', '30', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', seg];
                    const r = await execF('ffmpeg', args);
                    if (r.code !== 0) throw new Error('ffmpeg segment failed');
                    segPaths.push(seg);
                }
                const listFile = path.join(tempDir, 'list.txt');
                fs.writeFileSync(listFile, segPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
                const mergedVideo = path.join(tempDir, 'video_merged.mp4');
                let r = await execF('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', mergedVideo]);
                if (r.code !== 0) throw new Error('ffmpeg concat failed');
                const outName = `slideshow-${Date.now()}.mp4`;
                const outPath = path.join(uploads, outName);
                r = await execF('ffmpeg', ['-y', '-i', mergedVideo, '-i', audioPath, '-c:v', 'copy', '-c:a', 'aac', '-shortest', outPath]);
                if (r.code !== 0) throw new Error('ffmpeg mux failed');
                try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { }

                // Lưu vào database (tránh trùng lặp)
                const finalVideoUrl = `http://localhost:3001/uploads/${outName}`;
                let insertedId: number | null = null;
                if (userId) {
                    try {
                        const script = typeof content === 'string' ? content : '';
                        const { videoTitle, style, length, language } = req.body;
                        // Check duplicate by URL or by (title/prompt) recently created
                        const dup = db.prepare('SELECT id FROM videos WHERE user_id = ? AND video_url = ?').get(userId, finalVideoUrl) as any;
                        const recentDup = db.prepare(
                            "SELECT id FROM videos WHERE user_id = ? AND provider = 'slideshow' AND (video_title = ? OR prompt = ?) AND datetime(created_at) > datetime('now','-120 seconds') ORDER BY id DESC LIMIT 1"
                        ).get(userId, videoTitle || null, (prompt || content || '')) as any;

                        if (!dup && !recentDup) {
                            // Transcript = content (longText) trong branch A
                            const transcript = typeof content === 'string' ? content : '';
                            const stmt = db.prepare(`
                                INSERT INTO videos (user_id, study_set_id, prompt, script, transcript, provider, status, video_url, duration, video_title, style, length, language, created_at, updated_at)
                                VALUES (?, ?, ?, ?, ?, 'slideshow', 'completed', ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                            `);
                            const info = stmt.run(
                                userId,
                                studySetId || null,
                                prompt || content || '',
                                script,
                                transcript,
                                finalVideoUrl,
                                Math.round(durationSec),
                                videoTitle || null,
                                style || null,
                                length || null,
                                language || 'vi'
                            );
                            insertedId = Number(info.lastInsertRowid);
                        } else {
                            // Use existing record id
                            insertedId = dup?.id || recentDup?.id || null;
                            console.log('Skip saving duplicate video record for url:', finalVideoUrl, 'use id:', insertedId);
                        }
                    } catch (dbErr) {
                        console.error('Failed to save video to database:', dbErr);
                        // Không throw error, vẫn trả về video cho user
                    }
                }

                return res.json({ videoUrl: finalVideoUrl, id: insertedId, slides: slides.map((s) => ({ type: s.type, title: s.title })), audioPath, durationSec, perImage });
            } catch (err: any) {
                try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { }
                throw err;
            }
        }

        // Branch B: Existing prompt → scenes flow
        if (!prompt || !String(prompt).trim()) {
            return res.status(400).json({ error: 'Missing prompt' });
        }

        const { language = 'vi' } = req.body;

        // 1) Script with 5 scenes
        const rawScript = (await generateScript(String(prompt).trim(), language)).normalize('NFC');
        const scenes = parseScenes(rawScript, language);
        if (scenes.length < 3) {
            return res.status(500).json({ error: 'Failed to parse scenes' });
        }

        // 2) Generate slide images from SLIDE_TEXT (no Pexels)
        const tempDir = fs.mkdtempSync(path.join(uploads, 'tmp-'));
        const imagePaths: string[] = [];
        try {
            let sceneIndex = 0;
            for (const sc of scenes) {
                try {
                    const paths = await generateSlideImage(sc.slideText, sceneIndex, tempDir);
                    for (const p of paths) imagePaths.push(p);
                } catch (imgErr) {
                    const out = path.join(tempDir, `fallback-${crypto.randomBytes(3).toString('hex')}.jpg`);
                    await execF('ffmpeg', ['-y', '-f', 'lavfi', '-i', `color=c=black:s=1280x720:d=1`, '-frames:v', '1', out]);
                    imagePaths.push(out);
                }
                sceneIndex++;
            }

            // 3) Audio source
            let audioPath: string;
            let durationSec: number;
            if (typeof audioUrl === 'string' && audioUrl.startsWith('http')) {
                // Reuse existing long-form audio generated earlier by /api/audio/generate
                try {
                    const ab = await (await fetchWithTimeout(audioUrl, {}, 30000)).arrayBuffer();
                    const buf = Buffer.from(ab);
                    const name = `slideshow-audio-reuse-${Date.now()}.mp3`;
                    audioPath = path.join(uploads, name);
                    fs.writeFileSync(audioPath, buf);
                    durationSec = await probeDuration(audioPath);
                } catch (e) {
                    // Fallback to synthesizing from scene narrations if reuse fails
                    const narration = scenes.map(s => s.narration).join(' ');
                    const t = await synthesizeGoogleTTS(narration);
                    audioPath = t.audioPath; durationSec = t.durationSec;
                }
            } else {
                // Synthesize from scene narrations
                const narration = scenes.map(s => s.narration).join(' ');
                const t = await synthesizeGoogleTTS(narration);
                audioPath = t.audioPath; durationSec = t.durationSec;
            }

            // 4) Build slideshow: durations cover full audio; concat segments; no trimming
            const basePerImage = Math.max(2, Math.floor(durationSec / imagePaths.length));
            const lastDuration = Math.max(basePerImage, durationSec - basePerImage * (imagePaths.length - 1));
            const segPaths: string[] = [];
            for (let i = 0; i < imagePaths.length; i++) {
                const segDur = i === imagePaths.length - 1 ? lastDuration : basePerImage;
                const seg = path.join(tempDir, `seg-${i}.mp4`);
                const fadeDur = 0.5;
                const fadeOutStart = Math.max(0.1, segDur - fadeDur);
                const args = [
                    '-y', '-loop', '1',
                    '-i', imagePaths[i],
                    '-t', String(segDur),
                    '-vf', `scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fade=t=in:st=0:d=${fadeDur},fade=t=out:st=${fadeOutStart}:d=${fadeDur},format=yuv420p`,
                    '-r', '30',
                    '-pix_fmt', 'yuv420p',
                    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
                    seg
                ];
                const r = await execF('ffmpeg', args);
                if (r.code !== 0) throw new Error('ffmpeg segment failed');
                segPaths.push(seg);
            }
            const listFile = path.join(tempDir, 'list.txt');
            fs.writeFileSync(listFile, segPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
            const mergedVideo = path.join(tempDir, 'video_merged.mp4');
            {
                const rcat = await execF('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', mergedVideo]);
                if (rcat.code !== 0) throw new Error('ffmpeg concat failed');
            }

            const outName = `slideshow-${Date.now()}.mp4`;
            const outPath = path.join(uploads, outName);
            const rmux = await execF('ffmpeg', [
                '-y', '-i', mergedVideo, '-i', audioPath,
                '-c:v', 'copy', '-c:a', 'aac', outPath
            ]);
            if (rmux.code !== 0) throw new Error('ffmpeg mux failed');

            // Cleanup temp dir (best-effort)
            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { }

            // Lưu vào database (tránh trùng lặp)
            const finalVideoUrl = `http://localhost:3001/uploads/${outName}`;
            let insertedId: number | null = null;
            if (userId) {
                try {
                    const script = scenes.map(s => s.narration).join(' ');
                    const { videoTitle, style, length, language } = req.body;
                    const dup = db.prepare('SELECT id FROM videos WHERE user_id = ? AND video_url = ?').get(userId, finalVideoUrl) as any;
                    const recentDup = db.prepare(
                        "SELECT id FROM videos WHERE user_id = ? AND provider = 'slideshow' AND (video_title = ? OR prompt = ?) AND datetime(created_at) > datetime('now','-120 seconds') ORDER BY id DESC LIMIT 1"
                    ).get(userId, videoTitle || null, prompt) as any;

                    if (!dup && !recentDup) {
                        // Transcript = script (narration từ scenes) trong branch B
                        const transcript = script; // script = scenes narration joined
                        const stmt = db.prepare(`
                            INSERT INTO videos (user_id, study_set_id, prompt, script, transcript, provider, status, video_url, duration, video_title, style, length, language, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, 'slideshow', 'completed', ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                        `);
                        const info = stmt.run(
                            userId,
                            studySetId || null,
                            prompt,
                            script,
                            transcript,
                            finalVideoUrl,
                            Math.round(durationSec),
                            videoTitle || null,
                            style || null,
                            length || null,
                            language || 'vi'
                        );
                        insertedId = Number(info.lastInsertRowid);
                    } else {
                        insertedId = dup?.id || recentDup?.id || null;
                        console.log('Skip saving duplicate video record for url:', finalVideoUrl, 'use id:', insertedId);
                    }
                } catch (dbErr) {
                    console.error('Failed to save video to database:', dbErr);
                    // Không throw error, vẫn trả về video cho user
                }
            }

            return res.json({
                videoUrl: finalVideoUrl,
                id: insertedId,
                scenes: scenes.map(s => ({ slideText: s.slideText })),
                audioPath,
                durationSec,
                perImage: basePerImage
            });
        } catch (err: any) {
            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { }
            throw err;
        }
    } catch (error: any) {
        console.error('Slideshow error:', error?.message);
        return res.status(500).json({ error: 'Failed to create slideshow', details: error?.message });
    }
});

export default router;


