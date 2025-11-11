import { useState, useEffect } from 'react';
import { isFillBlankCard, isMultipleChoiceCard } from '../utils/flashcardStudyHelpers';

interface UseFlashcardStudyProps {
    flashcards: any[];
    currentCardIndex: number;
    userId?: string;
    flashcardSetId?: number;
}

export const useFlashcardStudy = ({ flashcards, currentCardIndex, userId, flashcardSetId }: UseFlashcardStudyProps) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isShuffled, setIsShuffled] = useState(false);
    const [bookmarkedCards, setBookmarkedCards] = useState<Set<string>>(new Set());
    const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
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

    // Load bookmarks from database when component mounts or flashcards change
    useEffect(() => {
        if (!userId || !flashcardSetId) return;

        const loadBookmarks = async () => {
            try {
                setIsLoadingBookmarks(true);
                // Load bookmark status for all flashcards
                const bookmarkPromises = flashcards.map(async (card) => {
                    try {
                        const response = await fetch(
                            `http://localhost:3001/api/flashcards/${card.id}/bookmark-status?userId=${userId}`
                        );
                        if (response.ok) {
                            const data = await response.json();
                            return data.bookmarked ? String(card.id) : null;
                        }
                        return null;
                    } catch (error) {
                        console.error(`Error checking bookmark for card ${card.id}:`, error);
                        return null;
                    }
                });

                const bookmarkedIds = (await Promise.all(bookmarkPromises)).filter((id): id is string => id !== null);
                setBookmarkedCards(new Set(bookmarkedIds));
            } catch (error) {
                console.error('Error loading bookmarks:', error);
            } finally {
                setIsLoadingBookmarks(false);
            }
        };

        loadBookmarks();
    }, [userId, flashcardSetId, flashcards.length]); // Only reload when these change

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

    const toggleBookmark = async () => {
        if (!currentCard) {
            console.log('❌ [BOOKMARK] No current card');
            return;
        }

        if (!userId) {
            console.log('❌ [BOOKMARK] No user ID');
            return;
        }

        // Ensure id is string for consistent comparison
        const cardId = String(currentCard.id);
        console.log('🔖 [BOOKMARK] Toggling bookmark for card:', cardId);
        console.log('🔖 [BOOKMARK] Current bookmarkedCards:', Array.from(bookmarkedCards));

        // Optimistically update UI
        const newBookmarked = new Set(bookmarkedCards);
        const wasBookmarked = newBookmarked.has(cardId);
        if (wasBookmarked) {
            newBookmarked.delete(cardId);
            console.log('🔖 [BOOKMARK] Removed bookmark (optimistic)');
        } else {
            newBookmarked.add(cardId);
            console.log('🔖 [BOOKMARK] Added bookmark (optimistic)');
        }
        setBookmarkedCards(newBookmarked);

        // Call API to persist bookmark
        try {
            const response = await fetch(`http://localhost:3001/api/flashcards/${cardId}/bookmark`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    flashcardSetId: flashcardSetId || null
                })
            });

            if (!response.ok) {
                // Revert optimistic update on error
                console.error('❌ [BOOKMARK] Failed to toggle bookmark, reverting');
                if (wasBookmarked) {
                    newBookmarked.add(cardId);
                } else {
                    newBookmarked.delete(cardId);
                }
                setBookmarkedCards(newBookmarked);
                throw new Error('Failed to toggle bookmark');
            }

            const data = await response.json();
            console.log('✅ [BOOKMARK] Bookmark toggled successfully:', data);
        } catch (error) {
            console.error('❌ [BOOKMARK] Error toggling bookmark:', error);
        }
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
        isLoadingBookmarks,
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

