import OpenAI from 'openai';
const config = require('../../config.js');

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
const MODEL = config.OPENAI_MODEL || 'gpt-4o-mini';

export interface OpenAITextOptions {
    prompt: string;
    instruction?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
}

export interface OpenAITextResult {
    text: string;
    model: string;
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
}

/**
 * Generate text from prompt using OpenAI Chat Completion API
 * @param options - Configuration options
 * @returns Generated text and metadata
 */
export async function generateOpenAIText(options: OpenAITextOptions): Promise<OpenAITextResult> {
    const {
        prompt,
        instruction,
        temperature = 0.7,
        maxTokens = 2000,
        timeout = 30000
    } = options;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        throw new Error('Prompt is required and cannot be empty');
    }

    const apiKey = config.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured');
    }


    const systemMessage = instruction || 'You are a helpful assistant that creates detailed educational content.';
    const userMessage = prompt;

    console.log('📝 [OpenAI Text] Generating text...');
    console.log('   System message:', systemMessage);
    console.log('   User message:', userMessage);
    console.log('   Model:', MODEL);


    try {
        const startTime = Date.now();

        const completionPromise = openai.chat.completions.create({
            model: MODEL,
            temperature: temperature,
            max_tokens: maxTokens,
            messages: [
                {
                    role: 'system',
                    content: systemMessage
                },
                {
                    role: 'user',
                    content: userMessage
                }
            ],
        });

        // Add timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('OpenAI API timeout')), timeout)
        );

        const completion = await Promise.race([
            completionPromise,
            timeoutPromise
        ]);

        const duration = Date.now() - startTime;
        const text = completion.choices[0]?.message?.content?.trim() || '';

        if (!text) {
            throw new Error('OpenAI returned empty response');
        }

        console.log('✅ [OpenAI Text] SUCCESS');
        console.log('   - Duration:', duration, 'ms');
        console.log('   - Response length:', text.length, 'characters');
        console.log('   - Word count:', text.split(' ').length);
        console.log('   - Usage:', completion.usage);

        return {
            text: text,
            model: MODEL,
            usage: completion.usage ? {
                promptTokens: completion.usage.prompt_tokens,
                completionTokens: completion.usage.completion_tokens,
                totalTokens: completion.usage.total_tokens
            } : undefined
        };

    } catch (error: any) {
        console.error('❌ [OpenAI Text] Error:', error.message);
        throw error;
    }
}

/**
 * Generate text with automatic instruction from prompt template
 * @param prompt - User prompt/topic
 * @param instruction - Full instruction template (from aiPrompts.ts)
 * @param language - Language for output ('vi' | 'en')
 * @returns Generated text
 */
export async function generateOpenAITextAuto(
    prompt: string,
    instruction: string,
    language: 'en' | 'vi' = 'vi'
): Promise<OpenAITextResult> {
    return generateOpenAIText({
        prompt: prompt,
        instruction: instruction,
        temperature: 0.7,
        maxTokens: 3000, // Increased for 500-700 words content
        timeout: 45000 // Increased timeout for longer responses
    });
}

