import express from 'express';
import fs from 'fs';
import path from 'path';
const config = require('../../config');
import { generateOpenAITTSAuto } from '../services/openaiTtsService';
import { generateOpenAITextAuto } from '../services/openaiTextService';
import { getDetailedInstruction } from '../prompts/aiPrompts';

// Web search interface
interface WebSearchResult {
    title: string;
    link: string;
    snippet: string;
}

// Perform web search for topic information
async function performWebSearch(query: string): Promise<WebSearchResult[]> {
    const GOOGLE_API_KEY = config.GEMINI_API_KEY; // Using Gemini key as fallback, or add separate key
    const SEARCH_ENGINE_ID = config.SEARCH_ENGINE_ID || '820473ad04dab4ac3';

    if (!GOOGLE_API_KEY || !SEARCH_ENGINE_ID) {
        console.warn('⚠️ Web search not configured');
        return [];
    }

    try {
        const params = new URLSearchParams({
            key: GOOGLE_API_KEY,
            cx: SEARCH_ENGINE_ID,
            q: query,
            num: '5',
            lr: 'lang_vi',
            gl: 'vn',
            safe: 'active'
        });

        const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);

        if (!response.ok) {
            console.error('❌ Web search error:', response.status, response.statusText);
            return [];
        }

        const data: any = await response.json();
        if (!data.items || data.items.length === 0) {
            console.log('📭 No web search results found');
            return [];
        }

        const results: WebSearchResult[] = data.items.map((item: any) => ({
            title: item.title || '',
            link: item.link || '',
            snippet: item.snippet || ''
        }));

        console.log(`✅ Found ${results.length} web search results`);
        return results;
    } catch (error: any) {
        console.error('❌ Web search error:', error.message);
        return [];
    }
}

const router = express.Router();

// All prompt logic has been moved to server/src/prompts/aiPrompts.ts
// You can customize prompts there

router.post('/generate', async (req, res) => {
    try {
        const { prompt, userId, studySetId, language = 'vi' } = req.body || {};
        if (!prompt || !userId) {
            const errorResponse = { error: 'Prompt và userId là bắt buộc' };
            return res.status(400).json(errorResponse);
        }

        console.log('\n========================================');
        console.log('🎯 Starting audio generation for:', prompt);
        console.log('========================================\n');

        let script = '';
        let attemptLog: string[] = [];
        let webSearchResults: WebSearchResult[] = [];

        try {
            // Step 1: Search web for related information about the topic
            console.log('🔍 Step 1: Searching web for information about:', prompt);
            webSearchResults = await performWebSearch(prompt);
            let webSearchContext = '';

            if (webSearchResults.length > 0) {
                webSearchContext = `\n\nThông tin bổ sung từ tìm kiếm web về "${prompt}":\n${webSearchResults.map((r, i) =>
                    `${i + 1}. ${r.title}\n   ${r.snippet}\n   Nguồn: ${r.link}`
                ).join('\n\n')}\n\nHãy sử dụng thông tin trên để tạo nội dung chi tiết và chính xác về "${prompt}".`;
                console.log(`✅ Found ${webSearchResults.length} web search results, adding to context`);
            } else {
                console.log('⚠️ No web search results, proceeding without additional context');
            }

            // Step 2: Generate text using OpenAI
            console.log('📡 Step 2: Generating text with OpenAI...');
            attemptLog.push('OpenAI Text Generation');

            const baseInstruction = getDetailedInstruction(prompt, language);
            const additionalWarning = language === 'en'
                ? '\n\n⚠️ CRITICAL: Write actual content, NOT templates. Do NOT include phrases like "PART 1 is", "PART 2 is" in your response. Write the actual lesson content directly.'
                : '\n\n⚠️ QUAN TRỌNG: Viết nội dung thực tế, KHÔNG dùng template. KHÔNG bao gồm các cụm từ như "PHẦN 1 là", "PHẦN 2 là" trong câu trả lời. Viết nội dung bài học trực tiếp.';

            // Combine prompt with web search context and warnings
            const userPrompt = prompt + webSearchContext + additionalWarning;

            console.log('📝 Instruction length:', baseInstruction.length, 'chars');
            console.log('📝 User prompt length:', userPrompt.length, 'chars');
            console.log('📝 Language:', language);
            console.log('📝 Topic:', prompt);

            try {
                const openaiTextResult = await generateOpenAITextAuto(
                    userPrompt,
                    baseInstruction,
                    language
                );

                if (openaiTextResult.text && openaiTextResult.text.trim().length > 200) {
                    script = openaiTextResult.text.trim();
                    console.log('✅ OpenAI text generation success!');
                    console.log('   - Script length:', script.length, 'chars');
                    console.log('   - Word count:', script.split(' ').length);
                    console.log('   - Model:', openaiTextResult.model);
                    if (openaiTextResult.usage) {
                        console.log('   - Tokens used:', openaiTextResult.usage.totalTokens);
                    }
                } else {
                    console.log('⚠️ OpenAI response too short or empty');
                }
            } catch (openaiError: any) {
                console.error('❌ OpenAI text generation error:', openaiError.message);
                attemptLog.push(`OpenAI error: ${openaiError.message}`);
            }

            // Fallback if OpenAI failed or returned insufficient content
            if (!script || script.split(' ').length < 350) {
                console.log('\n🔄 Attempt 2: Using internal AI fallback...');
                attemptLog.push('Attempt 2: Internal AI fallback');

                // Use emergency fallback only if everything failed
                const finalWords = script ? script.split(' ').length : 0;
                const shouldUseFallback = !script || finalWords < 350 || /chưa có tài liệu|không tìm thấy|không thể|lỗi/i.test(script) || /PHẦN 1 LÀ|PHẦN 2 LÀ|PHẦN 3 LÀ|PHẦN 4 LÀ|PHẦN 5 LÀ|PART 1 IS|PART 2 IS|PART 3 IS|PART 4 IS|PART 5 IS/i.test(script);

                if (shouldUseFallback) {
                    console.log('\n🚨 Using FALLBACK - Retrying with same prompt');
                    console.log('   - Reason: script length =', script?.length || 0, 'chars');
                    console.log('   - Reason: word count =', finalWords, 'words');
                    console.log('   - Language:', language);
                    attemptLog.push('Using fallback - retry with prompt');

                    let fallbackScript = '';

                    // Ưu tiên: Dùng web search results nếu có
                    if (webSearchResults.length > 0) {
                        console.log('   - Using web search results as fallback content.');
                        const combinedSnippets = webSearchResults.map(r => r.snippet).join(' ');
                        fallbackScript = combinedSnippets;
                    } else {
                        // Fallback: Tạo nội dung đơn giản từ prompt
                        console.log('   - No web search results, using prompt template as fallback.');
                        if (language === 'en') {
                            fallbackScript = `${prompt} is an important concept that requires detailed explanation. This topic covers fundamental principles, practical applications, and real-world examples. Understanding ${prompt} helps build a comprehensive knowledge base and enables practical problem-solving. When studying this topic, focus on understanding the core mechanisms, key principles, and how they apply in different contexts. Practice with concrete examples and connect this knowledge to related concepts you've learned.`;
                        } else {
                            fallbackScript = `${prompt} là một khái niệm quan trọng cần được giải thích chi tiết. Chủ đề này bao gồm các nguyên tắc cơ bản, ứng dụng thực tế, và ví dụ thực tế. Hiểu về ${prompt} giúp xây dựng nền tảng kiến thức toàn diện và cho phép giải quyết vấn đề thực tế. Khi học chủ đề này, hãy tập trung vào việc hiểu các cơ chế cốt lõi, nguyên tắc chính, và cách chúng được áp dụng trong các bối cảnh khác nhau. Thực hành với các ví dụ cụ thể và kết nối kiến thức này với các khái niệm liên quan bạn đã học.`;
                        }
                    }

                    // Expand fallback if it's too short
                    let expandedFallback = fallbackScript;
                    const fallbackWords = fallbackScript.split(' ').length;

                    if (fallbackWords < 400) {
                        console.log('   - Expanding fallback from', fallbackWords, 'to 400+ words');
                        if (language === 'en') {
                            expandedFallback += ` To ensure you fully understand ${prompt}, let's dive deeper into its practical applications. Consider how this concept appears in everyday life, scientific research, and professional fields. When studying, create detailed notes, draw diagrams if helpful, and practice with real-world examples. Connect this knowledge to other topics you've learned to build a comprehensive understanding. Remember that learning is an active process - engage with the material, ask questions, and seek clarification when needed.`;
                        } else {
                            expandedFallback += ` Để đảm bảo bạn hiểu đầy đủ về ${prompt}, hãy cùng đi sâu vào các ứng dụng thực tế của nó. Hãy xem xét cách khái niệm này xuất hiện trong đời sống hàng ngày, nghiên cứu khoa học, và các lĩnh vực chuyên nghiệp. Khi học, hãy tạo ghi chú chi tiết, vẽ sơ đồ nếu hữu ích, và thực hành với các ví dụ thực tế. Kết nối kiến thức này với các chủ đề khác đã học để xây dựng hiểu biết toàn diện. Nhớ rằng học tập là một quá trình chủ động - tương tác với tài liệu, đặt câu hỏi, và tìm kiếm sự làm rõ khi cần thiết.`;
                        }
                    }

                    script = expandedFallback;
                    console.log('   - Fallback length:', script.length, 'chars');
                    console.log('   - Fallback words:', script.split(' ').length);
                    console.log('   - Fallback preview:', script.substring(0, 150));
                }
            }

            console.log('\n📊 FINAL SCRIPT STATS:');
            console.log('   - Length:', script.length, 'characters');
            console.log('   - Words:', script.split(' ').length);
            console.log('   - Attempt log:', attemptLog.join(' → '));
            console.log('   - First 250 chars:', script.substring(0, 250));

            // 2) Generate audio using OpenAI TTS
            console.log('\n🎵 Starting TTS generation...');
            console.log('   - Language:', language);
            console.log('\n📤 OpenAI TTS Payload:');
            console.log('   - Script length:', script.length, 'characters');
            console.log('   - Script word count:', script.split(' ').length, 'words');
            console.log('   - Language:', language);
            console.log('   - Script preview (first 500 chars):');
            console.log('   ', script.substring(0, 500));
            console.log('   - Script preview (last 200 chars):');
            console.log('   ', script.substring(Math.max(0, script.length - 200)));

            try {
                const ttsResult = await generateOpenAITTSAuto(
                    script,
                    language as 'en' | 'vi'
                );

                console.log('\n========================================');
                console.log('🎉 Audio generation completed!');
                console.log('   Provider: OpenAI TTS (gpt-4o-mini-tts)');
                console.log('   Language:', language);
                console.log('   Voice:', ttsResult.voice);
                console.log('   URL:', ttsResult.audioUrl);
                console.log('========================================\n');

                return res.json({
                    audioUrl: ttsResult.audioUrl,
                    script,
                    path: ttsResult.path,
                    provider: 'openai',
                    voice: ttsResult.voice,
                    language: language,
                    stats: {
                        scriptLength: script.length,
                        wordCount: script.split(' ').length,
                        attempts: attemptLog
                    }
                });

            } catch (ttsError: any) {
                console.error('❌ TTS generation failed:', ttsError.message);
                console.error('❌ Error details:', JSON.stringify(ttsError, null, 2));
                return res.status(500).json({
                    error: 'TTS generation failed',
                    details: ttsError.message,
                    debug: {
                        language: language,
                        scriptLength: script?.length || 0,
                        hasOpenAIKey: !!config.OPENAI_API_KEY
                    }
                });
            }

        } catch (error: any) {
            console.error('\n❌❌❌ FATAL ERROR ❌❌❌');
            console.error('Error:', error.message);
            console.error('Stack:', error.stack);
            console.error('========================================\n');

            return res.status(500).json({
                error: 'Internal error',
                details: error.message
            });
        }
    } catch (error: any) {
        console.error('\n❌❌❌ FATAL ERROR ❌❌❌');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('========================================\n');

        return res.status(500).json({
            error: 'Internal error',
            details: error.message
        });
    }
});

export default router;
