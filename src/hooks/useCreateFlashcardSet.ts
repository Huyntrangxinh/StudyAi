import { useState, useEffect, useCallback } from 'react';
import { Card, FlashcardType, TypeCounts, SelectedType } from '../types/flashcard';
import { useFlashcardOperations } from './useFlashcardOperations';
import { useDragAndDrop } from './useDragAndDrop';
import { useImageManagement } from './useImageManagement';
import { useMaterialManagement } from './useMaterialManagement';
import { extractAnswersFromText, clampCount, normalizeFlashcardForStudy } from '../utils/flashcardHelpers';

export const useCreateFlashcardSet = (studySetId: string) => {
    const [selectedOption, setSelectedOption] = useState<string>('');
    const [showScratchEditor, setShowScratchEditor] = useState<boolean>(false);
    const [showMaterialPicker, setShowMaterialPicker] = useState<boolean>(false);
    const [showTypePicker, setShowTypePicker] = useState<boolean>(false);
    const [showStudyMode, setShowStudyMode] = useState<boolean>(false);
    const [flashcardName, setFlashcardName] = useState<string>(() => `Flashcard ${Math.floor(Math.random() * 1000000)}`);
    const [createdStudySetId, setCreatedStudySetId] = useState<number | null>(null);
    const [editingFlashcardSetId, setEditingFlashcardSetId] = useState<number | null>(null);

    // Form states
    const [termText, setTermText] = useState<string>('');
    const [definitionText, setDefinitionText] = useState<string>('');
    const [flashcardType, setFlashcardType] = useState<FlashcardType>('pair');
    const [fillBlankText, setFillBlankText] = useState<string>('');
    const [fillBlankAnswers, setFillBlankAnswers] = useState<string[]>(['']);
    const [multipleChoiceTerm, setMultipleChoiceTerm] = useState<string>('');
    const [multipleChoiceOptions, setMultipleChoiceOptions] = useState<string[]>(['', '']);
    const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number>(1);
    const [isReverseEnabled, setIsReverseEnabled] = useState<boolean>(false);
    const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(false);

    // Edit states
    const [editingCardId, setEditingCardId] = useState<string | null>(null);
    const [editTerm, setEditTerm] = useState<string>('');
    const [editDefinition, setEditDefinition] = useState<string>('');
    const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(new Set());

    // Generation states
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [genDone, setGenDone] = useState<number>(0);
    const [genTotal, setGenTotal] = useState<number>(0);

    // Type picker states
    const [typeCounts, setTypeCounts] = useState<TypeCounts>({
        termDef: 10,
        fillBlank: 0,
        multipleChoice: 0
    });
    const [selectedType, setSelectedType] = useState<SelectedType>('termDef');

    // Study mode states
    const [studyFlashcardsForSession, setStudyFlashcardsForSession] = useState<Array<{ id: string; term: string; definition: string; termImage?: string; definitionImage?: string }>>([]);

    const flashcardOps = useFlashcardOperations(studySetId);
    const dragDrop = useDragAndDrop(flashcardOps.flashcards, flashcardOps.setFlashcards);
    const imageMgmt = useImageManagement();
    const materialMgmt = useMaterialManagement(studySetId);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('editingFlashcardSetId');
            if (raw) {
                const id = Number(raw);
                sessionStorage.removeItem('editingFlashcardSetId');
                setEditingFlashcardSetId(id);
                setCreatedStudySetId(id);
                setShowScratchEditor(true);
                flashcardOps.loadFlashcardsByFlashcardSetId(id);
                (async () => {
                    try {
                        const res = await fetch('http://localhost:3001/api/flashcard-sets');
                        if (res.ok) {
                            const data = await res.json();
                            const hit = Array.isArray(data) ? data.find((s: any) => Number(s.id) === id) : null;
                            if (hit?.name) setFlashcardName(hit.name);
                        }
                    } catch { }
                })();
            }
        } catch { }
    }, [flashcardOps]);

    useEffect(() => {
        if (showStudyMode && studyFlashcardsForSession.length === 0) {
            flashcardOps.loadFlashcardsFromDB(isReverseEnabled, isAudioEnabled);
        }
    }, [showStudyMode, studySetId, studyFlashcardsForSession.length, isReverseEnabled, isAudioEnabled, flashcardOps]);

    const handleContinue = useCallback(async () => {
        if (!selectedOption) return;
        if (selectedOption === 'scratch') {
            try {
                if (!createdStudySetId) {
                    const payload = {
                        name: flashcardName,
                        studySetId: Number(studySetId)
                    };
                    if (!payload.studySetId) {
                        console.error('Missing studySetId to create flashcard set');
                    } else {
                        const res = await fetch('http://localhost:3001/api/flashcard-sets', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        if (res.ok) {
                            const created = await res.json();
                            setCreatedStudySetId(Number(created.id));
                            if (created?.name) setFlashcardName(created.name);
                        }
                    }
                }
            } catch (e) {
                console.error('Error creating study set:', e);
            } finally {
                setShowScratchEditor(true);
            }
            return;
        }
        if (selectedOption === 'material') {
            setShowMaterialPicker(true);
            materialMgmt.loadMaterialsForStudySet();
            return;
        }
    }, [selectedOption, createdStudySetId, flashcardName, studySetId, materialMgmt]);

    return {
        // States
        selectedOption,
        showScratchEditor,
        showMaterialPicker,
        showTypePicker,
        showStudyMode,
        flashcardName,
        createdStudySetId,
        editingFlashcardSetId,
        termText,
        definitionText,
        flashcardType,
        fillBlankText,
        fillBlankAnswers,
        multipleChoiceTerm,
        multipleChoiceOptions,
        correctAnswerIndex,
        isReverseEnabled,
        isAudioEnabled,
        editingCardId,
        editTerm,
        editDefinition,
        expandedPreviews,
        isGenerating,
        genDone,
        genTotal,
        typeCounts,
        selectedType,
        studyFlashcardsForSession,

        // Setters
        setSelectedOption,
        setShowScratchEditor,
        setShowMaterialPicker,
        setShowTypePicker,
        setShowStudyMode,
        setFlashcardName,
        setCreatedStudySetId,
        setEditingFlashcardSetId,
        setTermText,
        setDefinitionText,
        setFlashcardType,
        setFillBlankText,
        setFillBlankAnswers,
        setMultipleChoiceTerm,
        setMultipleChoiceOptions,
        setCorrectAnswerIndex,
        setIsReverseEnabled,
        setIsAudioEnabled,
        setEditingCardId,
        setEditTerm,
        setEditDefinition,
        setExpandedPreviews,
        setIsGenerating,
        setGenDone,
        setGenTotal,
        setTypeCounts,
        setSelectedType,
        setStudyFlashcardsForSession,

        // Operations
        handleContinue,
        flashcardOps,
        dragDrop,
        imageMgmt,
        materialMgmt,

        // Helpers
        clampCount,
        extractAnswersFromText,
        normalizeFlashcardForStudy
    };
};

