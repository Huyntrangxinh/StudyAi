// ========= PROMPT TEMPLATES FOR AI GENERATION =========
// This file contains all prompt templates and instructions for AI content generation.
// These prompts can be used across different services (audio, video, chat, etc.)
// You can modify these prompts to customize the AI's behavior.

// ========= MAIN PROMPT TEMPLATE =========
// Universal prompt that works for any topic
// Language parameter determines the output language, not the instruction language
export function getDetailedInstruction(prompt: string, language: string = 'vi'): string {
    const languageInstruction = language === 'en'
        ? 'Write ENTIRELY in ENGLISH. Do NOT use Vietnamese, Vietnamese words, or mix languages.'
        : 'Write ENTIRELY in Vietnamese with proper diacritics. Do NOT use English, English words, or mix languages.';

    // Section titles depending on language
    const sections = language === 'en'
        ? {
            def: 'Definition',
            mech: 'Detailed Explanation / Mechanism',
            ex: 'Concrete Example (with numbers)',
            lim: 'Limitations / Caveats',
            app: 'Real-world Applications',
            sum: 'Summary & Memory Tip'
        }
        : {
            def: 'Định nghĩa',
            mech: 'Cơ chế hoạt động / Giải thích chi tiết',
            ex: 'Ví dụ cụ thể (có số liệu)',
            lim: 'Hạn chế / Lưu ý',
            app: 'Ứng dụng thực tế',
            sum: 'Tóm tắt & Mẹo ghi nhớ'
        };

    const lectureGuidance = language === 'en'
        ? `ADOPT A TEACHING TONE: Write as if you are a teacher delivering a lecture. Use clear, engaging phrasing, occasional rhetorical questions, short signposting phrases (e.g., "Now consider…", "Note that…"), and explicit emphasis on key points. The voice should be suitable for voiceover: natural, measured, with obvious transitions between ideas.`
        : `GIỌNG GIẢNG DẠY: Viết như giáo viên đang giảng bài. Dùng giọng rõ ràng, lôi cuốn, thỉnh thoảng đặt câu hỏi tu từ, dùng các cụm dẫn dắt ngắn (ví dụ: "Bây giờ hãy xem...", "Lưu ý rằng...") và nhấn mạnh các điểm then chốt. Giọng đọc phù hợp làm voiceover: tự nhiên, chậm rãi, có chuyển ý rõ ràng giữa các ý.`

    const instruction = `You are an experienced educator. Create a COMPLETE, DETAILED educational explainer about: "${prompt}".

**LANGUAGE REQUIREMENT: ${languageInstruction}**

🚨 ABSOLUTE REQUIREMENTS:
- Length: MINIMUM 500 words, target 600-700 words (suitable for a 2-3 minute video).
- NO greetings or casual openings (do NOT start with "Hello", "Hi", "Today we will", etc.).
- Write as continuous, coherent prose within each section and maintain smooth transitions between sections.
- Start IMMEDIATELY with the core content (no preliminary chit-chat).
- Include detailed explanations, concrete examples with numbers or step-by-step demonstration, and clear practical applications where relevant.
- This is NOT an outline—write the FULL, COMPLETE lesson content.
- If the response is less than 500 words, continue expanding until the minimum is reached.

${lectureGuidance}

📐 OUTPUT FORMAT (must follow exactly):
Present the output **as clearly labeled sections** in the order below. Use the exact section titles shown (matching the language of the response). Each section should be at least one paragraph; the combination of sections must meet the minimum word count.

1) ${sections.def}: Begin with a precise definition of the topic. Explain what it is and why it matters. Keep this concise but specific.
2) ${sections.mech}: Provide an in-depth explanation or mechanism. For technical/scientific topics include process steps, key parameters, and how parts interact. For conceptual/humanities topics provide structured explanation and context.
3) ${sections.ex}: Provide at least one concrete example. For technical topics include numeric values, simple calculations or measurable outcomes. For historical or social topics include dates, figures or specific cases. Walk through the example step-by-step.
4) ${sections.lim}: Discuss limitations, boundary conditions, common misconceptions, and potential pitfalls. Make clear when the concept does NOT apply or what assumptions must hold.
5) ${sections.app}: Describe real-world applications or significance — where this idea is used in practice (industry, research, everyday life, policy, etc.). Give specific, relatable uses and practical advice an audience could act on.
6) ${sections.sum}: Finish with a short summary that reinforces the main takeaways and provide a memorable tip or mnemonic for the viewer/listener. Close with one clear call-to-action for study (e.g., "Try this exercise..." or "Check this next topic...") if appropriate.

⚠️ CRITICAL:
- Do NOT include template markers like "PART 1", "PHẦN 1", "PART 2", "Slide 1", "Slide 2", or other meta-instructions in the output.
- Do NOT output code blocks or JSON—plain readable text only.
- Write continuous, flowing prose within each section—do NOT use slide markers or numbered bullet points within sections.
- If supplemental web search context is appended (e.g. \`<<<WEB_SEARCH_CONTEXT>>>\`), integrate those facts naturally into the relevant sections and cite the source briefly in one short sentence if necessary (e.g., "Nguồn: [site]" or "Source: [site]").
- Make the language natural and audience-friendly (suitable for voiceover), while preserving technical correctness when required.

Deliver the complete explainer following the section order above, using a teacherly voice as instructed.`;

    return instruction;
}

