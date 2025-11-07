import { useState, useCallback } from 'react';
import { Card, FlashcardType } from '../types/flashcard';
import { extractAnswersFromText } from '../utils/flashcardHelpers';

interface UseFlashcardFormProps {
    studySetId: string;
    createdStudySetId: number | null;
    isReverseEnabled: boolean;
    isAudioEnabled: boolean;
    setFlashcards: React.Dispatch<React.SetStateAction<Card[]>>;
    setIsSaving: (saving: boolean) => void;
    setCreatedCount: (count: number | ((prev: number) => number)) => void;
}

export const useFlashcardForm = ({
    studySetId,
    createdStudySetId,
    isReverseEnabled,
    isAudioEnabled,
    setFlashcards,
    setIsSaving,
    setCreatedCount
}: UseFlashcardFormProps) => {
    const saveFlashcard = useCallback(async (
        flashcardType: FlashcardType,
        cardData: {
            termText?: string;
            definitionText?: string;
            fillBlankText?: string;
            fillBlankAnswers?: string[];
            multipleChoiceTerm?: string;
            multipleChoiceOptions?: string[];
            correctAnswerIndex?: number;
            termImage?: string;
            definitionImage?: string;
        }
    ) => {
        if (flashcardType === 'fillblank') {
            const answers = extractAnswersFromText(cardData.fillBlankText || '');
            if (answers.length === 0 && (cardData.fillBlankAnswers || []).every(a => !a.trim())) {
                alert('Vui lòng điền ít nhất 1 đáp án vào chỗ trống.');
                return;
            }
            const allAnswers = [...answers, ...(cardData.fillBlankAnswers || []).filter(a => a.trim())];
            const uniqueAnswers = Array.from(new Set(allAnswers.filter(a => a.trim())));

            if (uniqueAnswers.length === 0) {
                alert('Vui lòng điền ít nhất 1 đáp án vào chỗ trống.');
                return;
            }

            setIsSaving(true);
            try {
                const res = await fetch('http://localhost:3001/api/flashcards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        front: cardData.fillBlankText,
                        back: JSON.stringify(uniqueAnswers),
                        materialId: null,
                        flashcardSetId: Number(createdStudySetId ?? studySetId),
                        studySetId: Number(studySetId),
                        type: 'fillblank',
                        fillBlankAnswers: uniqueAnswers
                    })
                });

                if (!res.ok) throw new Error(await res.text());
                const savedCard = await res.json();

                const newCard: Card = {
                    id: String(savedCard.id),
                    term: cardData.fillBlankText || '',
                    definition: JSON.stringify(uniqueAnswers),
                    reverseEnabled: isReverseEnabled,
                    audioEnabled: isAudioEnabled,
                    saved: true,
                    dbId: savedCard.id,
                    type: 'fillblank',
                    fillBlankAnswers: uniqueAnswers
                };
                setFlashcards(prev => [...prev, newCard]);
                setCreatedCount(prev => prev + 1);
            } catch (error) {
                console.error('Error saving flashcard:', error);
                alert('Lỗi khi lưu thẻ ghi nhớ');
            } finally {
                setIsSaving(false);
            }
            return;
        }

        if (flashcardType === 'multiplechoice') {
            if (!cardData.multipleChoiceTerm?.trim()) {
                alert('Vui lòng nhập câu hỏi (Term).');
                return;
            }
            if ((cardData.multipleChoiceOptions || []).length < 2) {
                alert('Vui lòng thêm ít nhất 2 lựa chọn.');
                return;
            }
            if ((cardData.multipleChoiceOptions || []).some(opt => !opt.trim())) {
                alert('Vui lòng điền đầy đủ tất cả các lựa chọn.');
                return;
            }
            if ((cardData.correctAnswerIndex ?? -1) < 0 || (cardData.correctAnswerIndex ?? -1) >= (cardData.multipleChoiceOptions || []).length) {
                alert('Vui lòng chọn đáp án đúng.');
                return;
            }

            setIsSaving(true);
            try {
                const res = await fetch('http://localhost:3001/api/flashcards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        front: cardData.multipleChoiceTerm,
                        back: JSON.stringify({
                            options: cardData.multipleChoiceOptions,
                            correctIndex: cardData.correctAnswerIndex
                        }),
                        materialId: null,
                        flashcardSetId: Number(createdStudySetId ?? studySetId),
                        studySetId: Number(studySetId),
                        type: 'multiplechoice',
                        multipleChoiceOptions: cardData.multipleChoiceOptions,
                        correctAnswerIndex: cardData.correctAnswerIndex
                    })
                });

                if (!res.ok) throw new Error(await res.text());
                const savedCard = await res.json();

                const newCard: Card = {
                    id: String(savedCard.id),
                    term: cardData.multipleChoiceTerm || '',
                    definition: JSON.stringify({
                        options: cardData.multipleChoiceOptions,
                        correctIndex: cardData.correctAnswerIndex
                    }),
                    termImage: cardData.termImage || '',
                    reverseEnabled: isReverseEnabled,
                    audioEnabled: isAudioEnabled,
                    saved: true,
                    dbId: savedCard.id,
                    type: 'multiplechoice',
                    multipleChoiceOptions: cardData.multipleChoiceOptions,
                    correctAnswerIndex: cardData.correctAnswerIndex
                };
                setFlashcards(prev => [...prev, newCard]);
                setCreatedCount(prev => prev + 1);
            } catch (error) {
                console.error('Error saving flashcard:', error);
                alert('Lỗi khi lưu thẻ ghi nhớ');
            } finally {
                setIsSaving(false);
            }
            return;
        }

        if (!cardData.termText?.trim() || !cardData.definitionText?.trim()) return;

        setIsSaving(true);
        try {
            const res = await fetch('http://localhost:3001/api/flashcards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    front: cardData.termText.trim(),
                    back: cardData.definitionText.trim(),
                    materialId: null,
                    flashcardSetId: Number(createdStudySetId ?? studySetId),
                    studySetId: Number(studySetId)
                })
            });

            if (!res.ok) throw new Error(await res.text());
            const savedCard = await res.json();

            setFlashcards(prev => [
                ...prev,
                {
                    id: String(savedCard.id),
                    term: cardData.termText?.trim() || '',
                    definition: cardData.definitionText?.trim() || '',
                    termImage: cardData.termImage || '',
                    definitionImage: cardData.definitionImage || '',
                    reverseEnabled: isReverseEnabled,
                    audioEnabled: isAudioEnabled,
                    saved: true,
                    dbId: Number(savedCard.id)
                }
            ]);
        } catch (e) {
            console.error(e);
            alert('Lưu thẻ thất bại');
        } finally {
            setIsSaving(false);
        }
    }, [studySetId, createdStudySetId, isReverseEnabled, isAudioEnabled, setFlashcards, setIsSaving, setCreatedCount]);

    return { saveFlashcard };
};

