import { Card } from '../types/flashcard';

export const extractAnswersFromText = (text: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const answers: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        answers.push(match[1].trim());
    }
    return answers;
};

export const clampCount = (n: number): number => {
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(50, Math.floor(n)));
};

export const normalizeFlashcardForStudy = (card: Card): Card => {
    const normalized = { ...card };

    const hasFillBlankSyntax = normalized.term && /\{\{[^}]+\}\}/.test(normalized.term);
    if (hasFillBlankSyntax && !normalized.type) {
        normalized.type = 'fillblank';
    }

    if ((normalized.type === 'fillblank' || hasFillBlankSyntax) && normalized.definition) {
        try {
            const parsed = typeof normalized.definition === 'string' ? JSON.parse(normalized.definition) : normalized.definition;
            if (Array.isArray(parsed)) {
                normalized.fillBlankAnswers = parsed;
            }
        } catch (e) {
            if (hasFillBlankSyntax && !normalized.fillBlankAnswers) {
                const matches = normalized.term.match(/\{\{([^}]+)\}\}/g);
                if (matches) {
                    normalized.fillBlankAnswers = matches.map((m: string) => m.replace(/\{\{|\}\}/g, '').trim()).filter((a: string) => a);
                }
            }
        }
    }

    if (normalized.type === 'multiplechoice' && normalized.definition) {
        try {
            const parsed = typeof normalized.definition === 'string' ? JSON.parse(normalized.definition) : normalized.definition;
            if (parsed && parsed.options) {
                normalized.multipleChoiceOptions = parsed.options;
                normalized.correctAnswerIndex = parsed.correctIndex ?? parsed.correctAnswerIndex ?? 0;
            }
        } catch (e) {
            console.error('Error parsing multiple choice in normalize:', e);
        }
    }

    return normalized;
};

export const formatFlashcardFromDB = (c: any): Card => {
    const card: Card = {
        id: String(c.id),
        term: c.front || '',
        definition: c.back || '',
        termImage: c.term_image || c.termImage,
        definitionImage: c.definition_image || c.definitionImage,
        saved: true,
        dbId: Number(c.id),
        type: c.type || 'pair'
    };

    if (c.type === 'multiplechoice') {
        if (c.multiple_choice_options) {
            try {
                const options = typeof c.multiple_choice_options === 'string'
                    ? JSON.parse(c.multiple_choice_options)
                    : c.multiple_choice_options;
                if (Array.isArray(options)) {
                    card.multipleChoiceOptions = options;
                    card.correctAnswerIndex = c.correct_answer_index !== undefined
                        ? c.correct_answer_index
                        : (c.correctAnswerIndex ?? 0);
                }
            } catch (e) {
                console.error('Error parsing multiple_choice_options from DB:', e);
            }
        } else if (c.back) {
            try {
                const backData = typeof c.back === 'string' ? JSON.parse(c.back) : c.back;
                if (backData.options && Array.isArray(backData.options)) {
                    card.multipleChoiceOptions = backData.options;
                    card.correctAnswerIndex = backData.correctIndex ?? backData.correctAnswerIndex ?? 0;
                }
            } catch (e) {
                console.error('Error parsing multiple choice data from back:', e);
            }
        }
    }

    const hasFillBlankSyntax = (c.front || '').match(/\{\{[^}]+\}\}/);
    if (c.type === 'fillblank' || hasFillBlankSyntax) {
        if (c.fill_blank_answers) {
            try {
                const answers = typeof c.fill_blank_answers === 'string'
                    ? JSON.parse(c.fill_blank_answers)
                    : c.fill_blank_answers;
                if (Array.isArray(answers)) {
                    card.fillBlankAnswers = answers;
                    if (!c.type && hasFillBlankSyntax) {
                        card.type = 'fillblank';
                    }
                }
            } catch (e) {
                console.error('Error parsing fill_blank_answers from DB:', e);
            }
        }

        if (!card.fillBlankAnswers && c.back) {
            try {
                const backData = typeof c.back === 'string' ? JSON.parse(c.back) : c.back;
                if (Array.isArray(backData)) {
                    card.fillBlankAnswers = backData;
                    if (!c.type && hasFillBlankSyntax) {
                        card.type = 'fillblank';
                    }
                } else if (typeof backData === 'string') {
                    card.fillBlankAnswers = [backData];
                    if (!c.type && hasFillBlankSyntax) {
                        card.type = 'fillblank';
                    }
                }
            } catch (e) {
                if (hasFillBlankSyntax && !c.type) {
                    card.type = 'fillblank';
                    const matches = (c.front || '').match(/\{\{([^}]+)\}\}/g);
                    if (matches) {
                        card.fillBlankAnswers = matches.map((m: string) => m.replace(/\{\{|\}\}/g, '').trim()).filter((a: string) => a);
                    }
                }
            }
        }
    }

    return card;
};

