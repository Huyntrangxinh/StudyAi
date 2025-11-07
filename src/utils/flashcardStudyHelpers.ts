export interface FillBlankPart {
    type: 'text' | 'blank';
    content: string;
}

export const parseFillBlankText = (text: string): FillBlankPart[] => {
    const parts: FillBlankPart[] = [];
    let currentIndex = 0;
    const regex = /\{\{([^}]*)\}\}/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > currentIndex) {
            parts.push({
                type: 'text',
                content: text.substring(currentIndex, match.index)
            });
        }
        parts.push({
            type: 'blank',
            content: match[1]
        });
        currentIndex = match.index + match[0].length;
    }

    if (currentIndex < text.length) {
        parts.push({
            type: 'text',
            content: text.substring(currentIndex)
        });
    }

    if (parts.length === 0) {
        parts.push({ type: 'text', content: text });
    }

    return parts;
};

export const isFillBlankCard = (card: any): boolean => {
    if (!card) return false;
    if (card.type === 'fillblank') return true;
    if (card.term && /\{\{[^}]+\}\}/.test(card.term)) return true;
    if (card.fillBlankAnswers && Array.isArray(card.fillBlankAnswers) && card.fillBlankAnswers.length > 0) return true;
    if (card.definition) {
        try {
            const parsed = typeof card.definition === 'string' ? JSON.parse(card.definition) : card.definition;
            if (Array.isArray(parsed) && parsed.length > 0) {
                return !card.type || card.type !== 'multiplechoice';
            }
        } catch (e) {
            // Not JSON, ignore
        }
    }
    return false;
};

export const isMultipleChoiceCard = (card: any): boolean => {
    if (!card) return false;
    if (card.type === 'multiplechoice') return true;
    if (card.multipleChoiceOptions && Array.isArray(card.multipleChoiceOptions) && card.multipleChoiceOptions.length > 0) return true;
    if (card.definition) {
        try {
            const parsed = typeof card.definition === 'string' ? JSON.parse(card.definition) : card.definition;
            if (parsed && parsed.options && Array.isArray(parsed.options)) return true;
        } catch (e) {
            // Not JSON, ignore
        }
    }
    return false;
};

