import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Share, Upload, User, Link, Plus, Search, FileCog, GraduationCap, BookOpen, Volume2, List, PenTool, ListChecks, ChevronDown, ChevronUp, GripVertical, Trash2, Pencil } from 'lucide-react';
import StudyFlashcardsWrapper from './StudyFlashcardsWrapper';
import { useAuth } from '../hooks/useAuth';
import { MaterialPicker } from './flashcard/MaterialPicker';
import { FlashcardHeader } from './flashcard/FlashcardHeader';
import { OptionSelector } from './flashcard/OptionSelector';
import { TypePicker } from './flashcard/TypePicker';
import { ImageModal } from './flashcard/ImageModal';
import { GenerationProgress } from './flashcard/GenerationProgress';
import { EmptyState } from './flashcard/EmptyState';
import { ActionButtons } from './flashcard/ActionButtons';
import { FlashcardList } from './flashcard/FlashcardList';
import { NewFlashcardForm } from './flashcard/NewFlashcardForm';
import { useFlashcardGeneration } from '../hooks/useFlashcardGeneration';
import { Card } from '../types/flashcard';
import { extractAnswersFromText, clampCount, normalizeFlashcardForStudy } from '../utils/flashcardHelpers';
import { useFlashcardOperations } from '../hooks/useFlashcardOperations';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { useImageManagement } from '../hooks/useImageManagement';
import { useMaterialManagement } from '../hooks/useMaterialManagement';

interface CreateFlashcardSetProps {
    onBack: () => void;
    studySetId: string;
    studySetName: string;
    isCollapsed?: boolean;
}

const CreateFlashcardSet: React.FC<CreateFlashcardSetProps> = ({ onBack, studySetId, studySetName, isCollapsed = false }) => {
    const [selectedOption, setSelectedOption] = useState<string>('');
    const [showScratchEditor, setShowScratchEditor] = useState<boolean>(false);
    const [termText, setTermText] = useState<string>('');
    const [definitionText, setDefinitionText] = useState<string>('');
    const [flashcardName, setFlashcardName] = useState<string>(() => `Flashcard ${Math.floor(Math.random() * 1000000)}`);
    const [isReverseEnabled, setIsReverseEnabled] = useState<boolean>(false);
    const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(false);
    const [flashcardType, setFlashcardType] = useState<string>('pair'); // 'pair', 'fillblank', 'multiplechoice'
    const [fillBlankText, setFillBlankText] = useState<string>(''); // Text với {{ }} syntax
    const [fillBlankAnswers, setFillBlankAnswers] = useState<string[]>(['']); // Array of correct answers
    const [multipleChoiceTerm, setMultipleChoiceTerm] = useState<string>(''); // Question text for multiple choice
    const [multipleChoiceOptions, setMultipleChoiceOptions] = useState<string[]>(['', '']); // Array of options
    const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number>(1); // Index of correct answer (default to option 2)
    const { user } = useAuth();
    const [createdStudySetId, setCreatedStudySetId] = useState<number | null>(null);
    const [editingFlashcardSetId, setEditingFlashcardSetId] = useState<number | null>(null);

    const flashcardOps = useFlashcardOperations(studySetId);
    const { flashcards, setFlashcards, isSaving, setIsSaving, createdCount, setCreatedCount } = flashcardOps;
    const [editingCardId, setEditingCardId] = useState<string | null>(null);
    const [editTerm, setEditTerm] = useState<string>('');
    const [editDefinition, setEditDefinition] = useState<string>('');
    const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(new Set());
    const dragDrop = useDragAndDrop(flashcards, setFlashcards);
    const { draggedCardId, dragOverCardId, handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd } = dragDrop;
    const imageMgmt = useImageManagement();
    const {
        showImageModal,
        imageModalType,
        showImageSearch,
        imageSearchTerm,
        setImageSearchTerm,
        imageSearchResults,
        isSearchingImages,
        showUrlInput,
        imageUrl,
        setImageUrl,
        selectedImage,
        setSelectedImage,
        selectedImageType,
        setSelectedImageType,
        termImage,
        setTermImage,
        definitionImage,
        setDefinitionImage,
        handleImageSearch,
        selectImage,
        openImageModal,
        closeImageModal,
        handleFileUpload,
        handleUrlSubmit,
        removeSelectedImage,
        setShowImageSearch,
        setShowUrlInput
    } = imageMgmt;
    const [showStudyMode, setShowStudyMode] = useState<boolean>(false);
    // Keep the exact flashcards created in this editor session to study immediately
    const [studyFlashcardsForSession, setStudyFlashcardsForSession] = useState<Array<{ id: string; term: string; definition: string; termImage?: string; definitionImage?: string }>>([]);
    // Generate-from-materials view
    const [showMaterialPicker, setShowMaterialPicker] = useState<boolean>(false);
    const [showTypePicker, setShowTypePicker] = useState<boolean>(false);
    const materialMgmt = useMaterialManagement(studySetId);
    const {
        materialsInSet,
        isLoadingMaterials,
        selectedMaterialIds,
        searchTerm,
        setSearchTerm,
        loadMaterialsForStudySet,
        toggleMaterialSelection
    } = materialMgmt;
    const [typeCounts, setTypeCounts] = useState<{ termDef: number; fillBlank: number; multipleChoice: number }>({
        termDef: 10,
        fillBlank: 0,
        multipleChoice: 0
    });
    const [selectedType, setSelectedType] = useState<'termDef' | 'fillBlank' | 'multipleChoice'>('termDef');

    const totalSelected = typeCounts.termDef + typeCounts.fillBlank + typeCounts.multipleChoice;

    // Realtime generation progress
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [genDone, setGenDone] = useState<number>(0);
    const [genTotal, setGenTotal] = useState<number>(0);

    // Flashcard generation hook - must be called before any early returns
    const flashcardGen = useFlashcardGeneration({
        studySetId,
        createdStudySetId,
        setCreatedStudySetId,
        setFlashcards,
        setShowTypePicker,
        setShowMaterialPicker,
        setShowScratchEditor,
        setIsGenerating,
        setGenDone,
        setGenTotal
    });




    // If opened from pencil icon: jump straight into editor with existing set
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('editingFlashcardSetId');
            if (raw) {
                const id = Number(raw);
                sessionStorage.removeItem('editingFlashcardSetId');
                setEditingFlashcardSetId(id);
                setCreatedStudySetId(id); // use as current working set id
                setShowScratchEditor(true);
                flashcardOps.loadFlashcardsByFlashcardSetId(id);
                // load set name
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load flashcards when entering study mode
    useEffect(() => {
        // Only hit DB if we don't already have the created flashcards for this session
        if (showStudyMode && studyFlashcardsForSession.length === 0) {
            console.log('Loading flashcards from DB because studyFlashcardsForSession is empty');
            flashcardOps.loadFlashcardsFromDB(isReverseEnabled, isAudioEnabled);
        } else if (showStudyMode && studyFlashcardsForSession.length > 0) {
            console.log('Using studyFlashcardsForSession:', studyFlashcardsForSession);
        }
    }, [showStudyMode, studySetId, studyFlashcardsForSession.length, isReverseEnabled, isAudioEnabled, flashcardOps]);

    // Reload flashcards when exiting study mode to ensure images are loaded
    const prevShowStudyMode = useRef(showStudyMode);
    useEffect(() => {
        if (prevShowStudyMode.current && !showStudyMode) {
            // Just exited study mode, reload flashcards from DB
            console.log('🔄 Exited study mode, reloading flashcards from DB');
            if (editingFlashcardSetId) {
                flashcardOps.loadFlashcardsByFlashcardSetId(editingFlashcardSetId);
            } else if (createdStudySetId) {
                flashcardOps.loadFlashcardsByFlashcardSetId(createdStudySetId);
            } else {
                flashcardOps.loadFlashcardsFromDB(isReverseEnabled, isAudioEnabled);
            }
        }
        prevShowStudyMode.current = showStudyMode;
    }, [showStudyMode, editingFlashcardSetId, createdStudySetId, isReverseEnabled, isAudioEnabled, flashcardOps]);

    const options = [
        {
            id: 'scratch',
            title: 'Bắt đầu từ đầu',
            description: 'Tạo bộ thẻ ghi nhớ từ đầu.',
            icon: 'writing.gif',
            color: 'bg-blue-50 border-blue-200 hover:border-blue-300'
        },
        {
            id: 'material',
            title: 'Tạo từ tài liệu',
            description: 'Tạo bộ thẻ ghi nhớ từ tài liệu trong bộ học hiện tại',
            icon: 'Teaching.gif',
            color: 'bg-green-50 border-green-200 hover:border-green-300'
        }
    ];

    const handleContinue = async () => {
        if (!selectedOption) return;
        if (selectedOption === 'scratch') {
            // Create a new study set first, then open editor
            try {
                // If we already created one in this session, reuse it
                if (!createdStudySetId) {
                    const payload = {
                        name: flashcardName,
                        studySetId: Number(studySetId)
                    };
                    console.log('payload:', payload);
                    if (!payload.studySetId) {
                        console.error('Missing studySetId to create flashcard set');
                    } else {
                        const res = await fetch('http://localhost:3001/api/flashcard-sets', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        if (!res.ok) {
                            const txt = await res.text();
                            console.error('Failed to create study set:', txt);
                        } else {
                            const created = await res.json();
                            console.log('Created flashcard_set:', created);
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
        // Các lựa chọn khác có thể được xử lý sau
    };

    // Helper functions for Fill in the blank - using utility function

    const addBlankToText = () => {
        const textarea = document.getElementById('fillBlankTextarea') as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = fillBlankText.substring(start, end);
        const before = fillBlankText.substring(0, start);
        const after = fillBlankText.substring(end);

        if (selectedText) {
            // Nếu có text được chọn, wrap nó trong {{ }}
            const newText = before + `{{${selectedText}}}` + after;
            setFillBlankText(newText);
            // Update answers
            const answers = extractAnswersFromText(newText);
            setFillBlankAnswers(answers.length > 0 ? answers : ['']);
        } else {
            // Nếu không có text được chọn, thêm {{ }}
            const newText = before + `{{}}` + after;
            setFillBlankText(newText);
        }

        // Focus lại textarea và set cursor position
        setTimeout(() => {
            textarea.focus();
            const newPos = before.length + (selectedText ? 2 + selectedText.length + 3 : 2);
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    };

    const handleFillBlankTextChange = (text: string) => {
        setFillBlankText(text);
        // Extract answers từ {{ }} và update fillBlankAnswers
        // Chỉ giữ lại các đáp án từ {{ }}, không tự động thêm đáp án rỗng
        const answers = extractAnswersFromText(text);
        if (answers.length > 0) {
            setFillBlankAnswers(answers);
        } else {
            // Nếu không có đáp án trong text, giữ 1 đáp án rỗng để người dùng có thể nhập
            setFillBlankAnswers(['']);
        }
    };

    const handleFillBlankAnswerChange = (index: number, value: string) => {
        const newAnswers = [...fillBlankAnswers];
        newAnswers[index] = value;
        setFillBlankAnswers(newAnswers);
    };

    const addFillBlankAnswer = () => {
        setFillBlankAnswers([...fillBlankAnswers, '']);
    };

    const removeFillBlankAnswer = (index: number) => {
        if (fillBlankAnswers.length > 1) {
            const newAnswers = fillBlankAnswers.filter((_, i) => i !== index);
            setFillBlankAnswers(newAnswers);
        }
    };

    // Helper functions for Multiple Choice
    const addMultipleChoiceOption = () => {
        setMultipleChoiceOptions([...multipleChoiceOptions, '']);
    };

    const removeMultipleChoiceOption = (index: number) => {
        if (multipleChoiceOptions.length > 2) {
            const newOptions = multipleChoiceOptions.filter((_, i) => i !== index);
            setMultipleChoiceOptions(newOptions);
            // Adjust correctAnswerIndex if needed
            if (correctAnswerIndex >= newOptions.length) {
                setCorrectAnswerIndex(newOptions.length - 1);
            } else if (correctAnswerIndex > index) {
                setCorrectAnswerIndex(correctAnswerIndex - 1);
            }
        }
    };

    const handleMultipleChoiceOptionChange = (index: number, value: string) => {
        const newOptions = [...multipleChoiceOptions];
        newOptions[index] = value;
        setMultipleChoiceOptions(newOptions);
    };

    const handleCorrectAnswerChange = (index: number) => {
        setCorrectAnswerIndex(index);
    };

    // Drag and Drop handlers - using hook

    const saveFlashcard = async () => {
        if (flashcardType === 'fillblank') {
            // Validate fill in the blank
            const answers = extractAnswersFromText(fillBlankText);
            if (answers.length === 0 && fillBlankAnswers.every(a => !a.trim())) {
                alert('Vui lòng điền ít nhất 1 đáp án vào chỗ trống.');
                return;
            }
            // Merge answers from text and manual inputs
            const allAnswers = [...answers, ...fillBlankAnswers.filter(a => a.trim())];
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
                        front: fillBlankText, // Text với {{ }} syntax
                        back: JSON.stringify(uniqueAnswers), // Lưu answers dưới dạng JSON string
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
                    term: fillBlankText,
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
                setFillBlankText('');
                setFillBlankAnswers(['']);
                setTermImage('');
                setDefinitionImage('');
            } catch (error) {
                console.error('Error saving flashcard:', error);
                alert('Lỗi khi lưu thẻ ghi nhớ');
            } finally {
                setIsSaving(false);
            }
            return;
        }

        if (flashcardType === 'multiplechoice') {
            // Validate multiple choice
            if (!multipleChoiceTerm.trim()) {
                alert('Vui lòng nhập câu hỏi (Term).');
                return;
            }
            if (multipleChoiceOptions.length < 2) {
                alert('Vui lòng thêm ít nhất 2 lựa chọn.');
                return;
            }
            if (multipleChoiceOptions.some(opt => !opt.trim())) {
                alert('Vui lòng điền đầy đủ tất cả các lựa chọn.');
                return;
            }
            if (correctAnswerIndex < 0 || correctAnswerIndex >= multipleChoiceOptions.length) {
                alert('Vui lòng chọn đáp án đúng.');
                return;
            }

            setIsSaving(true);
            try {
                // Check if editing existing card
                const isEditing = editingCardId !== null;
                const cardId = isEditing ? editingCardId : null;

                let savedCard;
                if (isEditing && cardId) {
                    // Update existing flashcard
                    const existingCard = flashcards.find(c => c.id === cardId);
                    if (!existingCard || !existingCard.dbId) {
                        throw new Error('Không tìm thấy thẻ ghi nhớ để cập nhật');
                    }

                    const res = await fetch(`http://localhost:3001/api/flashcards/${existingCard.dbId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            front: multipleChoiceTerm,
                            back: JSON.stringify({
                                options: multipleChoiceOptions,
                                correctIndex: correctAnswerIndex
                            }),
                            type: 'multiplechoice',
                            termImage: termImage || null,
                            definitionImage: definitionImage || null,
                            multipleChoiceOptions: multipleChoiceOptions,
                            correctAnswerIndex: correctAnswerIndex
                        })
                    });

                    if (!res.ok) throw new Error(await res.text());
                    savedCard = await res.json();

                    // Update in state
                    setFlashcards(prev => prev.map(card =>
                        card.id === cardId
                            ? {
                                ...card,
                                term: multipleChoiceTerm,
                                definition: JSON.stringify({
                                    options: multipleChoiceOptions,
                                    correctIndex: correctAnswerIndex
                                }),
                                termImage: termImage || card.termImage,
                                type: 'multiplechoice',
                                multipleChoiceOptions: multipleChoiceOptions,
                                correctAnswerIndex: correctAnswerIndex
                            }
                            : card
                    ));

                    // Reset editing state
                    setEditingCardId(null);
                } else {
                    // Create new flashcard
                    const res = await fetch('http://localhost:3001/api/flashcards', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            front: multipleChoiceTerm,
                            back: JSON.stringify({
                                options: multipleChoiceOptions,
                                correctIndex: correctAnswerIndex
                            }),
                            materialId: null,
                            flashcardSetId: Number(createdStudySetId ?? studySetId),
                            studySetId: Number(studySetId),
                            type: 'multiplechoice',
                            termImage: termImage || null,
                            definitionImage: definitionImage || null,
                            multipleChoiceOptions: multipleChoiceOptions,
                            correctAnswerIndex: correctAnswerIndex
                        })
                    });

                    if (!res.ok) throw new Error(await res.text());
                    savedCard = await res.json();

                    const newCard: Card = {
                        id: String(savedCard.id),
                        term: multipleChoiceTerm,
                        definition: JSON.stringify({
                            options: multipleChoiceOptions,
                            correctIndex: correctAnswerIndex
                        }),
                        termImage: termImage || '',
                        reverseEnabled: isReverseEnabled,
                        audioEnabled: isAudioEnabled,
                        saved: true,
                        dbId: savedCard.id,
                        type: 'multiplechoice',
                        multipleChoiceOptions: multipleChoiceOptions,
                        correctAnswerIndex: correctAnswerIndex
                    };
                    setFlashcards(prev => [...prev, newCard]);
                    setCreatedCount(prev => prev + 1);
                }

                // Reset form
                setMultipleChoiceTerm('');
                setMultipleChoiceOptions(['', '']);
                setCorrectAnswerIndex(1);
                setTermImage('');
                setDefinitionImage('');
                setFlashcardType('pair'); // Reset to default type
            } catch (error) {
                console.error('Error saving flashcard:', error);
                alert('Lỗi khi lưu thẻ ghi nhớ');
            } finally {
                setIsSaving(false);
            }
            return;
        }

        if (!termText.trim() || !definitionText.trim() || isSaving) return;

        const currentTerm = termText.trim();
        const currentDefinition = definitionText.trim();

        setIsSaving(true);
        try {
            const res = await fetch('http://localhost:3001/api/flashcards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    front: currentTerm,
                    back: currentDefinition,
                    materialId: null,
                    flashcardSetId: Number(createdStudySetId ?? studySetId),
                    studySetId: Number(studySetId)
                })
            });

            if (!res.ok) throw new Error(await res.text());
            const savedCard = await res.json();

            // chỉ set state MỘT LẦN sau khi lưu thành công
            setFlashcards(prev => [
                ...prev,
                {
                    id: String(savedCard.id),
                    term: currentTerm,
                    definition: currentDefinition,
                    termImage: termImage || '',
                    definitionImage: definitionImage || '',
                    reverseEnabled: isReverseEnabled,
                    audioEnabled: isAudioEnabled,
                    saved: true,
                    dbId: Number(savedCard.id)
                }
            ]);
        } catch (e) {
            console.error(e);
            alert('Lưu thẻ thất bại');
            return;
        } finally {
            setIsSaving(false);
        }

        // dọn form
        setTermText('');
        setDefinitionText('');
        setTermImage('');
        setDefinitionImage('');
        setSelectedImage('');
        setSelectedImageType(null);
        setCreatedCount(c => c + 1);
    };

    const saveAllFlashcards = async (cardsParam?: Card[]) => {
        const cards = cardsParam ?? flashcards;      // ưu tiên mảng được truyền vào
        const toSave = cards.filter(c => !c.saved);

        if (toSave.length === 0) {
            const studyList = cards.map(fc => ({
                id: String(fc.dbId ?? fc.id),
                term: fc.term,
                definition: fc.definition,
                termImage: fc.termImage,
                definitionImage: fc.definitionImage
            }));
            setStudyFlashcardsForSession(studyList);
            return studyList;
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
                            flashcardSetId: Number(createdStudySetId ?? studySetId),
                            studySetId: Number(studySetId)
                        })
                    });
                    if (!res.ok) throw new Error(await res.text());
                    const saved = await res.json();
                    return { uiId: fc.id, dbId: Number(saved.id), term: saved.front ?? fc.term, definition: saved.back ?? fc.definition };
                })
            );

            // cập nhật lại mảng gốc (nếu muốn)
            setFlashcards(prev =>
                (cardsParam ?? prev).map(fc => {
                    const hit = results.find(r => r.uiId === fc.id);
                    return hit ? { ...fc, id: String(hit.dbId), dbId: hit.dbId, term: hit.term, definition: hit.definition, saved: true } : fc;
                })
            );

            const studyList = (cardsParam ?? flashcards).map(fc => ({
                id: String(fc.dbId ?? fc.id),
                term: fc.term,
                definition: fc.definition,
                termImage: fc.termImage,
                definitionImage: fc.definitionImage
            }));
            setStudyFlashcardsForSession(studyList);
            return studyList;
        } finally {
            setIsSaving(false);
        }
    };

    const deleteFlashcard = flashcardOps.deleteFlashcard;

    const startEdit = (card: any) => {
        setEditingCardId(card.id);

        // Handle Multiple Choice flashcard
        if (card.type === 'multiplechoice') {
            setFlashcardType('multiplechoice');
            setMultipleChoiceTerm(card.term || '');
            setMultipleChoiceOptions(card.multipleChoiceOptions && card.multipleChoiceOptions.length > 0
                ? card.multipleChoiceOptions
                : ['', '']);
            setCorrectAnswerIndex(card.correctAnswerIndex !== undefined ? card.correctAnswerIndex : 0);
            setTermImage(card.termImage || '');
            // Scroll to form
            setTimeout(() => {
                const formElement = document.querySelector('[data-new-flashcard-form]');
                if (formElement) {
                    formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
            return; // Exit early for Multiple Choice
        }

        // Handle Fill in the blank flashcard
        if (card.type === 'fillblank') {
            setFlashcardType('fillblank');
            setFillBlankText(card.term || '');
            setFillBlankAnswers(card.fillBlankAnswers && card.fillBlankAnswers.length > 0
                ? card.fillBlankAnswers
                : ['']);
            setTermImage(card.termImage || '');
            // Scroll to form
            setTimeout(() => {
                const formElement = document.querySelector('[data-new-flashcard-form]');
                if (formElement) {
                    formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
            return; // Exit early for Fill in the blank
        }

        // Default: Term and Definition
        setEditTerm(card.term);
        setEditDefinition(card.definition);
        setTermImage(card.termImage || '');
        setDefinitionImage(card.definitionImage || '');
    };

    const saveEdit = async () => {
        if (!editingCardId || !editTerm.trim() || !editDefinition.trim()) return;

        const cardToEdit = flashcards.find(c => c.id === editingCardId);
        if (!cardToEdit || !cardToEdit.dbId) {
            // Nếu không có dbId, chỉ update state (card chưa được lưu vào DB)
            setFlashcards(prev => prev.map(card =>
                card.id === editingCardId
                    ? {
                        ...card,
                        term: editTerm.trim(),
                        definition: editDefinition.trim(),
                        termImage: termImage || card.termImage || '',
                        definitionImage: definitionImage || card.definitionImage || ''
                    }
                    : card
            ));
            setEditingCardId(null);
            setEditTerm('');
            setEditDefinition('');
            return;
        }

        // Có dbId, gọi API để update vào DB
        // Use termImage and definitionImage from state (updated by selectImage) instead of cardToEdit
        setIsSaving(true);
        try {
            const res = await fetch(`http://localhost:3001/api/flashcards/${cardToEdit.dbId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    front: editTerm.trim(),
                    back: editDefinition.trim(),
                    type: cardToEdit.type || 'pair',
                    termImage: termImage || null,
                    definitionImage: definitionImage || null,
                    multipleChoiceOptions: cardToEdit.multipleChoiceOptions || null,
                    correctAnswerIndex: cardToEdit.correctAnswerIndex !== undefined ? cardToEdit.correctAnswerIndex : null
                })
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || 'Failed to update flashcard');
            }

            // Update state sau khi API thành công, including images
            setFlashcards(prev => prev.map(card =>
                card.id === editingCardId
                    ? {
                        ...card,
                        term: editTerm.trim(),
                        definition: editDefinition.trim(),
                        termImage: termImage || '',
                        definitionImage: definitionImage || ''
                    }
                    : card
            ));
            setEditingCardId(null);
            setEditTerm('');
            setEditDefinition('');
            // Reset images after saving
            setTermImage('');
            setDefinitionImage('');
        } catch (error) {
            console.error('Error updating flashcard:', error);
            alert('Lỗi khi cập nhật thẻ ghi nhớ');
        } finally {
            setIsSaving(false);
        }
    };

    // Sync termImage and definitionImage from hook to flashcard being edited
    useEffect(() => {
        if (editingCardId) {
            setFlashcards(prev => prev.map(card => {
                if (card.id === editingCardId) {
                    // Always sync images from hook state to flashcard
                    return {
                        ...card,
                        termImage: termImage || card.termImage || '',
                        definitionImage: definitionImage || card.definitionImage || ''
                    };
                }
                return card;
            }));
        }
    }, [editingCardId, termImage, definitionImage]);

    const cancelEdit = () => {
        setEditingCardId(null);
        setEditTerm('');
        setEditDefinition('');
        // Reset images when canceling edit
        setTermImage('');
        setDefinitionImage('');
    };

    // Image management - using hook


    // Nếu đang ở chế độ học, hiển thị StudyFlashcards
    if (showStudyMode) {
        const rawFlashcards = studyFlashcardsForSession.length > 0 ? studyFlashcardsForSession : flashcards;
        const toStudy = rawFlashcards.map((card: Card) => normalizeFlashcardForStudy(card));

        console.log('Entering study mode with flashcards:', toStudy);

        if (flashcardOps.isLoadingFlashcards && studyFlashcardsForSession.length === 0) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Đang tải thẻ ghi nhớ...</p>
                    </div>
                </div>
            );
        }

        return (
            <StudyFlashcardsWrapper
                flashcards={toStudy}
                onBack={() => setShowStudyMode(false)}
                isCollapsed={isCollapsed}
                flashcardName={flashcardName}
            />
        );
    }

    // Generate-from-materials view (keeps left navigation; swap only content)
    if (showMaterialPicker) {
        return (
            <MaterialPicker
                isCollapsed={isCollapsed}
                flashcardName={flashcardName}
                materialsInSet={materialsInSet}
                isLoadingMaterials={isLoadingMaterials}
                selectedMaterialIds={selectedMaterialIds}
                searchTerm={searchTerm}
                onBack={onBack}
                onSetSearchTerm={setSearchTerm}
                onToggleMaterial={toggleMaterialSelection}
                onContinue={() => {
                    if (selectedMaterialIds.size > 0) {
                        setShowMaterialPicker(false);
                        setShowTypePicker(true);
                    }
                }}
            />
        );
    }

    // Type picker view
    if (showTypePicker) {
        return (
            <TypePicker
                isCollapsed={isCollapsed}
                flashcardName={flashcardName}
                selectedMaterialIds={selectedMaterialIds}
                materialsInSet={materialsInSet}
                typeCounts={typeCounts}
                selectedType={selectedType}
                onBack={() => { setShowTypePicker(false); setShowMaterialPicker(true); }}
                onSetTypeCounts={setTypeCounts}
                onSetSelectedType={setSelectedType}
                onGenerate={() => flashcardGen.generateFlashcards(selectedMaterialIds, materialsInSet, typeCounts, flashcardName)}
            />
        );
    }


    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <FlashcardHeader
                isCollapsed={isCollapsed}
                flashcardName={flashcardName}
                onBack={onBack}
            />
            <div className={`pt-16 flex-1 overflow-y-auto pb-20 transition-all duration-300`}>
                <div className="w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col min-h-0">
                    {!showScratchEditor && (
                        <OptionSelector
                            options={options}
                            selectedOption={selectedOption}
                            onSelectOption={setSelectedOption}
                        />
                    )}
                    <FlashcardList
                        showScratchEditor={showScratchEditor}
                        flashcards={flashcards}
                        isGenerating={isGenerating}
                        genDone={genDone}
                        genTotal={genTotal}
                        draggedCardId={draggedCardId}
                        dragOverCardId={dragOverCardId}
                        editingCardId={editingCardId}
                        editTerm={editTerm}
                        editDefinition={editDefinition}
                        expandedPreviews={expandedPreviews}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                        onDeleteFlashcard={deleteFlashcard}
                        onStartEdit={startEdit}
                        onCancelEdit={cancelEdit}
                        onSaveEdit={async (cardId, term, definition) => {
                            const cardToEdit = flashcards.find(c => c.id === cardId);
                            if (!cardToEdit || !cardToEdit.dbId) {
                                // Nếu không có dbId, chỉ update state (card chưa được lưu vào DB)
                                setFlashcards(prev => prev.map(card =>
                                    card.id === cardId
                                        ? {
                                            ...card,
                                            term: term.trim(),
                                            definition: definition.trim(),
                                            termImage: termImage || card.termImage || '',
                                            definitionImage: definitionImage || card.definitionImage || ''
                                        }
                                        : card
                                ));
                                setEditingCardId(null);
                                setEditTerm('');
                                setEditDefinition('');
                                return;
                            }

                            // Có dbId, gọi API để update vào DB
                            // Use termImage and definitionImage from state (updated by selectImage) instead of cardToEdit
                            setIsSaving(true);
                            try {
                                const res = await fetch(`http://localhost:3001/api/flashcards/${cardToEdit.dbId}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        front: term.trim(),
                                        back: definition.trim(),
                                        type: cardToEdit.type || 'pair',
                                        termImage: termImage || null,
                                        definitionImage: definitionImage || null,
                                        multipleChoiceOptions: cardToEdit.multipleChoiceOptions || null,
                                        correctAnswerIndex: cardToEdit.correctAnswerIndex !== undefined ? cardToEdit.correctAnswerIndex : null
                                    })
                                });

                                if (!res.ok) {
                                    const errorText = await res.text();
                                    throw new Error(errorText || 'Failed to update flashcard');
                                }

                                // Update state sau khi API thành công, including images
                                setFlashcards(prev => prev.map(card =>
                                    card.id === cardId
                                        ? {
                                            ...card,
                                            term: term.trim(),
                                            definition: definition.trim(),
                                            termImage: termImage || '',
                                            definitionImage: definitionImage || ''
                                        }
                                        : card
                                ));
                                setEditingCardId(null);
                                setEditTerm('');
                                setEditDefinition('');
                            } catch (error) {
                                console.error('Error updating flashcard:', error);
                                alert('Lỗi khi cập nhật thẻ ghi nhớ');
                            } finally {
                                setIsSaving(false);
                            }
                        }}
                        isSaving={isSaving}
                        onSetEditTerm={setEditTerm}
                        onSetEditDefinition={setEditDefinition}
                        onSetFlashcards={setFlashcards}
                        onSetExpandedPreviews={setExpandedPreviews}
                        onOpenImageModal={openImageModal}
                    />
                    <NewFlashcardForm
                        showScratchEditor={showScratchEditor}
                        flashcardType={flashcardType}
                        isReverseEnabled={isReverseEnabled}
                        isAudioEnabled={isAudioEnabled}
                        termText={termText}
                        definitionText={definitionText}
                        fillBlankText={fillBlankText}
                        fillBlankAnswers={fillBlankAnswers}
                        multipleChoiceTerm={multipleChoiceTerm}
                        multipleChoiceOptions={multipleChoiceOptions}
                        correctAnswerIndex={correctAnswerIndex}
                        termImage={termImage}
                        definitionImage={definitionImage}
                        isSaving={isSaving}
                        showImageModal={showImageModal}
                        imageModalType={imageModalType}
                        showImageSearch={showImageSearch}
                        imageSearchTerm={imageSearchTerm}
                        imageSearchResults={imageSearchResults}
                        isSearchingImages={isSearchingImages}
                        showUrlInput={showUrlInput}
                        imageUrl={imageUrl}
                        onSetFlashcardType={setFlashcardType}
                        onSetIsReverseEnabled={setIsReverseEnabled}
                        onSetIsAudioEnabled={setIsAudioEnabled}
                        onSetTermText={setTermText}
                        onSetDefinitionText={setDefinitionText}
                        onSetFillBlankText={setFillBlankText}
                        onSetFillBlankAnswers={setFillBlankAnswers}
                        onSetMultipleChoiceTerm={setMultipleChoiceTerm}
                        onSetMultipleChoiceOptions={setMultipleChoiceOptions}
                        onSetCorrectAnswerIndex={setCorrectAnswerIndex}
                        onSetTermImage={setTermImage}
                        onSetDefinitionImage={setDefinitionImage}
                        onHandleFillBlankTextChange={handleFillBlankTextChange}
                        onAddBlankToText={addBlankToText}
                        onHandleFillBlankAnswerChange={handleFillBlankAnswerChange}
                        onRemoveFillBlankAnswer={removeFillBlankAnswer}
                        onAddFillBlankAnswer={addFillBlankAnswer}
                        onHandleCorrectAnswerChange={handleCorrectAnswerChange}
                        onHandleMultipleChoiceOptionChange={handleMultipleChoiceOptionChange}
                        onRemoveMultipleChoiceOption={removeMultipleChoiceOption}
                        onAddMultipleChoiceOption={addMultipleChoiceOption}
                        onOpenImageModal={openImageModal}
                        onCloseImageModal={closeImageModal}
                        onSetImageSearchTerm={setImageSearchTerm}
                        onSetShowImageSearch={setShowImageSearch}
                        onSetShowUrlInput={setShowUrlInput}
                        onSetImageUrl={setImageUrl}
                        onImageSearch={handleImageSearch}
                        onSelectImage={selectImage}
                        onFileUpload={handleFileUpload}
                        onUrlSubmit={handleUrlSubmit}
                        onSaveFlashcard={saveFlashcard}
                    />
                    {!showScratchEditor && (
                        <div className="mb-6">
                            <div className="max-w-2xl">
                                <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
                                    <span className="text-lg">›</span>
                                    <span className="font-medium">Nâng cao</span>
                                </button>
                            </div>
                        </div>
                    )}
                    <ActionButtons
                        isCollapsed={isCollapsed}
                        showScratchEditor={showScratchEditor}
                        onBack={onBack}
                        onContinue={handleContinue}
                        onStudyNow={async () => {
                            const cardsToSave: Card[] = [
                                ...flashcards,
                                ...(termText.trim() && definitionText.trim()
                                    ? [{
                                        id: `tmp-${Date.now()}`,
                                        term: termText.trim(),
                                        definition: definitionText.trim(),
                                        termImage: termImage || '',
                                        definitionImage: definitionImage || '',
                                        saved: false
                                    }]
                                    : [])
                            ];
                            setTermText('');
                            setDefinitionText('');
                            setTermImage('');
                            setDefinitionImage('');
                            setFlashcards(cardsToSave);
                            const results = await saveAllFlashcards(cardsToSave);
                            if (results.length > 0) setShowStudyMode(true);
                        }}
                        selectedOption={selectedOption}
                    />
                </div>
            </div>
        </div>
    );
};

export default CreateFlashcardSet;
