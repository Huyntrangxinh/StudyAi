import { useState, useEffect } from 'react';
import { isFillBlankCard, isMultipleChoiceCard } from '../utils/flashcardStudyHelpers';

interface UseFlashcardStudyProps {
    flashcards: any[];
    currentCardIndex: number;
}

export const useFlashcardStudy = ({ flashcards, currentCardIndex }: UseFlashcardStudyProps) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isShuffled, setIsShuffled] = useState(false);
    const [bookmarkedCards, setBookmarkedCards] = useState<Set<string>>(new Set());
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
    const [isSliding, setIsSliding] = useState(false);

    // Fill in the blank states
    const [fillBlankInput, setFillBlankInput] = useState<string>('');
    const [fillBlankChecked, setFillBlankChecked] = useState<boolean>(false);
    const [fillBlankIsCorrect, setFillBlankIsCorrect] = useState<boolean | null>(null);
    const [fillBlankHint, setFillBlankHint] = useState<string>('');
    const [showCorrectAnswer, setShowCorrectAnswer] = useState<boolean>(false);
    const [correctAnswer, setCorrectAnswer] = useState<string>('');

    // Multiple Choice states
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
    const [multipleChoiceChecked, setMultipleChoiceChecked] = useState<boolean>(false);
    const [multipleChoiceIsCorrect, setMultipleChoiceIsCorrect] = useState<boolean | null>(null);

    const currentCard = flashcards[currentCardIndex];

    // Reset fillBlank state when card changes
    useEffect(() => {
        setFillBlankInput('');
        setFillBlankChecked(false);
        setFillBlankIsCorrect(null);
        setFillBlankHint('');
        setShowCorrectAnswer(false);
        setCorrectAnswer('');
        setSelectedOptionIndex(null);
        setMultipleChoiceChecked(false);
        setMultipleChoiceIsCorrect(null);
    }, [currentCardIndex]);

    const flipCard = () => {
        if (!currentCard) return;
        if (isFillBlankCard(currentCard) || isMultipleChoiceCard(currentCard)) {
            return;
        }
        setIsFlipped(!isFlipped);
    };

    const toggleBookmark = () => {
        if (!currentCard) return;
        const newBookmarked = new Set(bookmarkedCards);
        if (newBookmarked.has(currentCard.id)) {
            newBookmarked.delete(currentCard.id);
        } else {
            newBookmarked.add(currentCard.id);
        }
        setBookmarkedCards(newBookmarked);
    };

    const showFillBlankHint = () => {
        if (!currentCard) return;
        let answers = currentCard.fillBlankAnswers;

        if (!answers || answers.length === 0) {
            const matches = currentCard.term?.match(/\{\{([^}]+)\}\}/g);
            if (matches) {
                answers = matches.map((m: string) => m.replace(/\{\{|\}\}/g, '').trim()).filter((a: string) => a);
            }
        }

        if (!answers || answers.length === 0) {
            return;
        }

        const firstAnswer = answers[0].trim();
        if (firstAnswer.length > 0) {
            setFillBlankHint(firstAnswer[0]);
        }
    };

    const checkFillBlankAnswer = () => {
        if (!currentCard) return;
        let answers = currentCard.fillBlankAnswers;

        if (!answers || answers.length === 0) {
            const matches = currentCard.term?.match(/\{\{([^}]+)\}\}/g);
            if (matches) {
                answers = matches.map((m: string) => m.replace(/\{\{|\}\}/g, '').trim()).filter((a: string) => a);
            }
        }

        if (!answers || answers.length === 0) {
            return;
        }

        const userAnswer = fillBlankInput.trim().toLowerCase();
        const isCorrect = answers.some((answer: string) =>
            answer.trim().toLowerCase() === userAnswer
        );

        setFillBlankIsCorrect(isCorrect);
        setFillBlankChecked(true);

        if (answers.length > 0) {
            setCorrectAnswer(answers[0]);
        }
    };

    const checkMultipleChoiceAnswer = () => {
        if (!currentCard || selectedOptionIndex === null) return;

        let correctIndex = currentCard.correctAnswerIndex;
        let options = currentCard.multipleChoiceOptions;

        if (!options && currentCard.definition) {
            try {
                const parsed = typeof currentCard.definition === 'string' ? JSON.parse(currentCard.definition) : currentCard.definition;
                if (parsed && parsed.options) {
                    options = parsed.options;
                    correctIndex = parsed.correctIndex ?? parsed.correctAnswerIndex ?? 0;
                }
            } catch (e) {
                console.error('Error parsing multiple choice data:', e);
            }
        }

        if (!options || correctIndex === undefined) return;

        const isCorrect = selectedOptionIndex === correctIndex;
        setMultipleChoiceIsCorrect(isCorrect);
        setMultipleChoiceChecked(true);
    };

    return {
        isFlipped,
        setIsFlipped,
        isShuffled,
        setIsShuffled,
        bookmarkedCards,
        slideDirection,
        setSlideDirection,
        isSliding,
        setIsSliding,
        fillBlankInput,
        setFillBlankInput,
        fillBlankChecked,
        fillBlankIsCorrect,
        fillBlankHint,
        showCorrectAnswer,
        setShowCorrectAnswer,
        correctAnswer,
        selectedOptionIndex,
        setSelectedOptionIndex,
        multipleChoiceChecked,
        multipleChoiceIsCorrect,
        flipCard,
        toggleBookmark,
        showFillBlankHint,
        checkFillBlankAnswer,
        checkMultipleChoiceAnswer
    };
};

