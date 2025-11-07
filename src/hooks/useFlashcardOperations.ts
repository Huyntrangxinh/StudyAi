import { useState, useCallback } from 'react';
import { Card } from '../types/flashcard';
import { formatFlashcardFromDB } from '../utils/flashcardHelpers';

export const useFlashcardOperations = (studySetId: string) => {
    const [flashcards, setFlashcards] = useState<Card[]>([]);
    const [isLoadingFlashcards, setIsLoadingFlashcards] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [createdCount, setCreatedCount] = useState<number>(0);

    const loadFlashcardsByFlashcardSetId = useCallback(async (flashcardSetId: number) => {
        try {
            setIsLoadingFlashcards(true);
            const res = await fetch(`http://localhost:3001/api/flashcards?flashcardSetId=${flashcardSetId}`);
            if (!res.ok) return setFlashcards([]);
            const data = await res.json();
            const formatted = Array.isArray(data)
                ? data.map((c: any) => formatFlashcardFromDB(c))
                : [];
            setFlashcards(formatted);
        } catch (e) {
            setFlashcards([]);
        } finally {
            setIsLoadingFlashcards(false);
        }
    }, []);

    const loadFlashcardsFromDB = useCallback(async (isReverseEnabled: boolean, isAudioEnabled: boolean) => {
        try {
            setIsLoadingFlashcards(true);
            const response = await fetch(`http://localhost:3001/api/flashcards/${studySetId}`);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    const formattedData = data.map((card: any) => formatFlashcardFromDB(card));
                    setFlashcards(formattedData.map(c => ({
                        ...c,
                        reverseEnabled: isReverseEnabled,
                        audioEnabled: isAudioEnabled
                    })));
                } else {
                    setFlashcards([]);
                }
            }
        } catch (error) {
            console.error('Error loading flashcards from DB:', error);
        } finally {
            setIsLoadingFlashcards(false);
        }
    }, [studySetId]);

    const saveFlashcard = useCallback(async (
        cardData: {
            term: string;
            definition: string;
            type?: string;
            fillBlankAnswers?: string[];
            multipleChoiceOptions?: string[];
            correctAnswerIndex?: number;
            termImage?: string;
            definitionImage?: string;
        },
        flashcardSetId: number | null,
        isReverseEnabled: boolean,
        isAudioEnabled: boolean
    ): Promise<Card | null> => {
        setIsSaving(true);
        try {
            const res = await fetch('http://localhost:3001/api/flashcards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    front: cardData.term,
                    back: cardData.definition,
                    materialId: null,
                    flashcardSetId: Number(flashcardSetId ?? studySetId),
                    studySetId: Number(studySetId),
                    type: cardData.type || 'pair',
                    fillBlankAnswers: cardData.fillBlankAnswers,
                    multipleChoiceOptions: cardData.multipleChoiceOptions,
                    correctAnswerIndex: cardData.correctAnswerIndex
                })
            });

            if (!res.ok) throw new Error(await res.text());
            const savedCard = await res.json();

            const newCard: Card = {
                id: String(savedCard.id),
                term: cardData.term,
                definition: cardData.definition,
                termImage: cardData.termImage || '',
                definitionImage: cardData.definitionImage || '',
                reverseEnabled: isReverseEnabled,
                audioEnabled: isAudioEnabled,
                saved: true,
                dbId: savedCard.id,
                type: cardData.type || 'pair',
                fillBlankAnswers: cardData.fillBlankAnswers,
                multipleChoiceOptions: cardData.multipleChoiceOptions,
                correctAnswerIndex: cardData.correctAnswerIndex
            };

            setFlashcards(prev => [...prev, newCard]);
            setCreatedCount(prev => prev + 1);
            return newCard;
        } catch (error) {
            console.error('Error saving flashcard:', error);
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, [studySetId]);

    const saveAllFlashcards = useCallback(async (
        cards: Card[],
        flashcardSetId: number | null
    ): Promise<Array<{ id: string; term: string; definition: string; termImage?: string; definitionImage?: string }>> => {
        const toSave = cards.filter(c => !c.saved);

        if (toSave.length === 0) {
            return cards.map(fc => ({
                id: String(fc.dbId ?? fc.id),
                term: fc.term,
                definition: fc.definition,
                termImage: fc.termImage,
                definitionImage: fc.definitionImage
            }));
        }

        try {
            setIsSaving(true);
            const results = await Promise.all(
                toSave.map(async (fc) => {
                    const res = await fetch('http://localhost:3001/api/flashcards', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            front: fc.term,
                            back: fc.definition,
                            materialId: null,
                            flashcardSetId: Number(flashcardSetId ?? studySetId),
                            studySetId: Number(studySetId)
                        })
                    });
                    if (!res.ok) throw new Error(await res.text());
                    const saved = await res.json();
                    return { uiId: fc.id, dbId: Number(saved.id), term: saved.front ?? fc.term, definition: saved.back ?? fc.definition };
                })
            );

            setFlashcards(prev =>
                cards.map(fc => {
                    const hit = results.find(r => r.uiId === fc.id);
                    return hit ? { ...fc, id: String(hit.dbId), dbId: hit.dbId, term: hit.term, definition: hit.definition, saved: true } : fc;
                })
            );

            return cards.map(fc => ({
                id: String(fc.dbId ?? fc.id),
                term: fc.term,
                definition: fc.definition,
                termImage: fc.termImage,
                definitionImage: fc.definitionImage
            }));
        } finally {
            setIsSaving(false);
        }
    }, [studySetId]);

    const deleteFlashcard = useCallback((id: string) => {
        setFlashcards(prev => prev.filter(card => card.id !== id));
    }, []);

    const updateFlashcard = useCallback((id: string, updates: Partial<Card>) => {
        setFlashcards(prev => prev.map(card =>
            card.id === id ? { ...card, ...updates } : card
        ));
    }, []);

    return {
        flashcards,
        setFlashcards,
        isLoadingFlashcards,
        isSaving,
        setIsSaving,
        createdCount,
        setCreatedCount,
        loadFlashcardsByFlashcardSetId,
        loadFlashcardsFromDB,
        saveFlashcard,
        saveAllFlashcards,
        deleteFlashcard,
        updateFlashcard
    };
};

