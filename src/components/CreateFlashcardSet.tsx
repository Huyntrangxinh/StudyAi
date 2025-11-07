import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Share, Upload, User, Link, Plus, Search, FileCog, GraduationCap, BookOpen, Volume2, List, PenTool, ListChecks, ChevronDown, ChevronUp, GripVertical, Trash2, Pencil } from 'lucide-react';
import StudyFlashcardsWrapper from './StudyFlashcardsWrapper';
import { useAuth } from '../hooks/useAuth';

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
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [createdCount, setCreatedCount] = useState<number>(0);
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
    type Card = {
        id: string;
        term: string;
        definition: string;
        termImage?: string;
        definitionImage?: string;
        // Tùy chọn khi học - copy từ thanh tuỳ chọn chung lúc tạo
        reverseEnabled?: boolean;
        audioEnabled?: boolean;
        saved?: boolean;   // đã lưu DB hay chưa
        dbId?: number;     // id trong DB (nếu có)
        // Fill in the blank specific
        type?: string;     // 'pair', 'fillblank', 'multiplechoice'
        fillBlankAnswers?: string[]; // Correct answers for fill in the blank
        // Multiple choice specific
        multipleChoiceOptions?: string[]; // Array of options
        correctAnswerIndex?: number; // Index of correct answer
    };

    const [flashcards, setFlashcards] = useState<Card[]>([]);
    const [editingCardId, setEditingCardId] = useState<string | null>(null);
    const [editTerm, setEditTerm] = useState<string>('');
    const [editDefinition, setEditDefinition] = useState<string>('');
    const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(new Set());
    const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
    const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
    const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [showImageModal, setShowImageModal] = useState<boolean>(false);
    const [imageModalType, setImageModalType] = useState<'term' | 'definition' | null>(null);
    const [showImageSearch, setShowImageSearch] = useState<boolean>(false);
    const [imageSearchTerm, setImageSearchTerm] = useState<string>('');
    const [imageSearchResults, setImageSearchResults] = useState<any[]>([]);
    const [isSearchingImages, setIsSearchingImages] = useState<boolean>(false);
    const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
    const [imageUrl, setImageUrl] = useState<string>('');
    const [selectedImage, setSelectedImage] = useState<string>('');
    const [selectedImageType, setSelectedImageType] = useState<'search' | 'upload' | 'url' | null>(null);
    const [termImage, setTermImage] = useState<string>('');
    const [definitionImage, setDefinitionImage] = useState<string>('');
    const [showStudyMode, setShowStudyMode] = useState<boolean>(false);
    const [isLoadingFlashcards, setIsLoadingFlashcards] = useState<boolean>(false);
    // Keep the exact flashcards created in this editor session to study immediately
    const [studyFlashcardsForSession, setStudyFlashcardsForSession] = useState<Array<{ id: string; term: string; definition: string; termImage?: string; definitionImage?: string }>>([]);
    // Generate-from-materials view
    const [showMaterialPicker, setShowMaterialPicker] = useState<boolean>(false);
    const [showTypePicker, setShowTypePicker] = useState<boolean>(false);
    const [materialsInSet, setMaterialsInSet] = useState<Array<{ id: string; name: string; created_at?: string; size?: number; file_path?: string }>>([]);
    const [isLoadingMaterials, setIsLoadingMaterials] = useState<boolean>(false);
    const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [typeCounts, setTypeCounts] = useState<{ termDef: number; fillBlank: number; multipleChoice: number }>({
        termDef: 10,
        fillBlank: 0,
        multipleChoice: 0
    });
    const [selectedType, setSelectedType] = useState<'termDef' | 'fillBlank' | 'multipleChoice'>('termDef');

    const clampCount = (n: number) => {
        if (Number.isNaN(n)) return 0;
        return Math.max(0, Math.min(50, Math.floor(n)));
    };

    const totalSelected = typeCounts.termDef + typeCounts.fillBlank + typeCounts.multipleChoice;

    // Realtime generation progress
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [genDone, setGenDone] = useState<number>(0);
    const [genTotal, setGenTotal] = useState<number>(0);

    const loadMaterialsForStudySet = async () => {
        try {
            setIsLoadingMaterials(true);
            const res = await fetch(`http://localhost:3001/api/materials/${studySetId}`);
            const data = res.ok ? await res.json() : [];
            setMaterialsInSet(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to load materials for study set', e);
            setMaterialsInSet([]);
        } finally {
            setIsLoadingMaterials(false);
        }
    };

    const loadFlashcardsByFlashcardSetId = async (flashcardSetId: number) => {
        try {
            setIsLoadingFlashcards(true);
            const res = await fetch(`http://localhost:3001/api/flashcards?flashcardSetId=${flashcardSetId}`);
            if (!res.ok) return setFlashcards([]);
            const data = await res.json();
            const formatted = Array.isArray(data)
                ? data.map((c: any) => {
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

                    // Parse Multiple Choice data - prioritize database columns, fallback to back field
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

                    // Parse Fill in the blank data - prioritize database column, fallback to back field
                    // Auto-detect fillblank from term or type
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

                        // Fallback to parsing from back field if fill_blank_answers column not available
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
                                // Nếu không parse được nhưng có {{ }} trong term, vẫn set type
                                if (hasFillBlankSyntax && !c.type) {
                                    card.type = 'fillblank';
                                    // Try to extract answers from term
                                    const matches = (c.front || '').match(/\{\{([^}]+)\}\}/g);
                                    if (matches) {
                                        card.fillBlankAnswers = matches.map((m: string) => m.replace(/\{\{|\}\}/g, '').trim()).filter((a: string) => a);
                                    }
                                }
                            }
                        }
                    }

                    return card;
                })
                : [];
            setFlashcards(formatted);
        } catch (e) {
            setFlashcards([]);
        } finally {
            setIsLoadingFlashcards(false);
        }
    };

    // Load flashcards from database when entering study mode
    const loadFlashcardsFromDB = async () => {
        try {
            setIsLoadingFlashcards(true);
            console.log('Loading flashcards for studySetId:', studySetId);
            const response = await fetch(`http://localhost:3001/api/flashcards/${studySetId}`);
            console.log('Response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Raw data from API:', data);

                // Ensure data is an array and has the correct structure
                if (Array.isArray(data)) {
                    const formattedData = data.map(card => {
                        const c: Card = {
                            id: card.id,
                            term: card.front || '',
                            definition: card.back || '',
                            termImage: card.term_image || card.termImage,
                            definitionImage: card.definition_image || card.definitionImage,
                            type: card.type || 'pair'
                        };

                        // Parse Multiple Choice data - prioritize database columns, fallback to back field
                        if (card.type === 'multiplechoice') {
                            if (card.multiple_choice_options) {
                                try {
                                    const options = typeof card.multiple_choice_options === 'string'
                                        ? JSON.parse(card.multiple_choice_options)
                                        : card.multiple_choice_options;
                                    if (Array.isArray(options)) {
                                        c.multipleChoiceOptions = options;
                                        c.correctAnswerIndex = card.correct_answer_index !== undefined
                                            ? card.correct_answer_index
                                            : (card.correctAnswerIndex ?? 0);
                                    }
                                } catch (e) {
                                    console.error('Error parsing multiple_choice_options from DB:', e);
                                }
                            } else if (card.back) {
                                try {
                                    const backData = typeof card.back === 'string' ? JSON.parse(card.back) : card.back;
                                    if (backData.options && Array.isArray(backData.options)) {
                                        c.multipleChoiceOptions = backData.options;
                                        c.correctAnswerIndex = backData.correctIndex ?? backData.correctAnswerIndex ?? 0;
                                    }
                                } catch (e) {
                                    console.error('Error parsing multiple choice data from back:', e);
                                }
                            }
                        }

                        // Parse Fill in the blank data - prioritize database column, fallback to back field
                        // Auto-detect fillblank from term or type
                        const hasFillBlankSyntax = (card.front || '').match(/\{\{[^}]+\}\}/);
                        if (card.type === 'fillblank' || hasFillBlankSyntax) {
                            if (card.fill_blank_answers) {
                                try {
                                    const answers = typeof card.fill_blank_answers === 'string'
                                        ? JSON.parse(card.fill_blank_answers)
                                        : card.fill_blank_answers;
                                    if (Array.isArray(answers)) {
                                        c.fillBlankAnswers = answers;
                                        if (!card.type && hasFillBlankSyntax) {
                                            c.type = 'fillblank';
                                        }
                                    }
                                } catch (e) {
                                    console.error('Error parsing fill_blank_answers from DB:', e);
                                }
                            }

                            // Fallback to parsing from back field if fill_blank_answers column not available
                            if (!c.fillBlankAnswers && card.back) {
                                try {
                                    const backData = typeof card.back === 'string' ? JSON.parse(card.back) : card.back;
                                    if (Array.isArray(backData)) {
                                        c.fillBlankAnswers = backData;
                                        if (!card.type && hasFillBlankSyntax) {
                                            c.type = 'fillblank';
                                        }
                                    } else if (typeof backData === 'string') {
                                        c.fillBlankAnswers = [backData];
                                        if (!card.type && hasFillBlankSyntax) {
                                            c.type = 'fillblank';
                                        }
                                    }
                                } catch (e) {
                                    // Nếu không parse được nhưng có {{ }} trong term, vẫn set type
                                    if (hasFillBlankSyntax && !card.type) {
                                        c.type = 'fillblank';
                                        // Try to extract answers from term
                                        const matches = (card.front || '').match(/\{\{([^}]+)\}\}/g);
                                        if (matches) {
                                            c.fillBlankAnswers = matches.map((m: string) => m.replace(/\{\{|\}\}/g, '').trim()).filter((a: string) => a);
                                        }
                                    }
                                }
                            }
                        }

                        return c;
                    });

                    console.log('Formatted flashcards:', formattedData);
                    // Khi nạp từ DB, gán mặc định theo tuỳ chọn chung hiện tại
                    setFlashcards(formattedData.map(c => ({
                        ...c,
                        reverseEnabled: isReverseEnabled,
                        audioEnabled: isAudioEnabled
                    })));
                } else {
                    console.error('Data is not an array:', data);
                    setFlashcards([]);
                }
            } else {
                console.error('Failed to load flashcards from DB, status:', response.status);
                const errorText = await response.text();
                console.error('Error response:', errorText);
            }
        } catch (error) {
            console.error('Error loading flashcards from DB:', error);
        } finally {
            setIsLoadingFlashcards(false);
        }
    };

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
                loadFlashcardsByFlashcardSetId(id);
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
            loadFlashcardsFromDB();
        } else if (showStudyMode && studyFlashcardsForSession.length > 0) {
            console.log('Using studyFlashcardsForSession:', studyFlashcardsForSession);
        }
    }, [showStudyMode, studySetId, studyFlashcardsForSession.length]);

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
            loadMaterialsForStudySet();
            return;
        }
        // Các lựa chọn khác có thể được xử lý sau
    };

    // Helper functions for Fill in the blank
    const extractAnswersFromText = (text: string): string[] => {
        const regex = /\{\{([^}]+)\}\}/g;
        const answers: string[] = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            answers.push(match[1].trim());
        }
        return answers;
    };

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

    // Auto-scroll functions
    const startAutoScroll = (direction: 'up' | 'down') => {
        // Stop existing scroll if any
        if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
        }

        const scrollSpeed = 10; // pixels per interval
        const scrollInterval = 16; // ~60fps

        scrollIntervalRef.current = setInterval(() => {
            const scrollAmount = direction === 'up' ? -scrollSpeed : scrollSpeed;
            window.scrollBy({
                top: scrollAmount,
                behavior: 'auto'
            });
        }, scrollInterval);
    };

    const stopAutoScroll = () => {
        if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
        }
    };

    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent, cardId: string) => {
        setDraggedCardId(cardId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', cardId);
    };

    const handleDragOver = (e: React.DragEvent, cardId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (draggedCardId && draggedCardId !== cardId) {
            setDragOverCardId(cardId);
        }
        // Auto-scroll is handled by global drag handler
    };

    const handleDragLeave = () => {
        setDragOverCardId(null);
        stopAutoScroll();
    };

    const handleDrop = (e: React.DragEvent, targetCardId: string) => {
        e.preventDefault();
        stopAutoScroll(); // Stop auto-scroll when dropped

        if (!draggedCardId || draggedCardId === targetCardId) {
            setDraggedCardId(null);
            setDragOverCardId(null);
            return;
        }

        const draggedIndex = flashcards.findIndex(c => c.id === draggedCardId);
        const targetIndex = flashcards.findIndex(c => c.id === targetCardId);

        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedCardId(null);
            setDragOverCardId(null);
            return;
        }

        const newFlashcards = [...flashcards];
        const [removed] = newFlashcards.splice(draggedIndex, 1);
        newFlashcards.splice(targetIndex, 0, removed);

        setFlashcards(newFlashcards);
        setDraggedCardId(null);
        setDragOverCardId(null);
    };

    const handleDragEnd = () => {
        stopAutoScroll(); // Always stop auto-scroll when drag ends
        setDraggedCardId(null);
        setDragOverCardId(null);
    };

    // Global drag handler for auto-scroll
    useEffect(() => {
        if (!draggedCardId) {
            stopAutoScroll();
            return;
        }

        const handleGlobalDragOver = (e: DragEvent) => {
            const scrollThreshold = 100;
            const mouseY = e.clientY;
            const viewportHeight = window.innerHeight;

            // Check if near top edge
            if (mouseY < scrollThreshold) {
                startAutoScroll('up');
            }
            // Check if near bottom edge
            else if (mouseY > viewportHeight - scrollThreshold) {
                startAutoScroll('down');
            }
            // Stop scrolling if in middle area
            else {
                stopAutoScroll();
            }
        };

        const handleGlobalDragEnd = () => {
            stopAutoScroll();
        };

        document.addEventListener('dragover', handleGlobalDragOver);
        document.addEventListener('dragend', handleGlobalDragEnd);

        return () => {
            document.removeEventListener('dragover', handleGlobalDragOver);
            document.removeEventListener('dragend', handleGlobalDragEnd);
            stopAutoScroll();
        };
    }, [draggedCardId]);

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

    const deleteFlashcard = (id: string) => {
        setFlashcards(prev => prev.filter(card => card.id !== id));
    };

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
    };

    const saveEdit = () => {
        if (editingCardId && editTerm.trim() && editDefinition.trim()) {
            setFlashcards(prev => prev.map(card =>
                card.id === editingCardId
                    ? { ...card, term: editTerm.trim(), definition: editDefinition.trim() }
                    : card
            ));
            setEditingCardId(null);
            setEditTerm('');
            setEditDefinition('');
        }
    };

    const cancelEdit = () => {
        setEditingCardId(null);
        setEditTerm('');
        setEditDefinition('');
    };

    const searchImages = async (query: string) => {
        if (!query.trim()) return;

        setIsSearchingImages(true);
        try {
            const PIXABAY_API_KEY = '52964011-5fc353a36548e7363e6b02445';
            const response = await fetch(
                `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=12&safesearch=true`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch images');
            }

            const data = await response.json();

            // Transform Pixabay response to our format
            const results = data.hits.map((hit: any) => ({
                id: hit.id.toString(),
                url: hit.largeImageURL,
                title: hit.tags || 'Image',
                thumbnail: hit.webformatURL,
                user: hit.user,
                views: hit.views,
                downloads: hit.downloads
            }));

            setImageSearchResults(results);
        } catch (error) {
            console.error('Error searching images:', error);
            // Fallback to empty results on error
            setImageSearchResults([]);
        } finally {
            setIsSearchingImages(false);
        }
    };

    const selectImage = (imageUrl: string, type: 'search' | 'upload' | 'url' = 'search') => {
        setSelectedImage(imageUrl);
        setSelectedImageType(type);
        setShowImageSearch(false);
        setShowUrlInput(false);

        // Auto-confirm the selection
        if (imageModalType) {
            if (imageModalType === 'term') {
                setTermImage(imageUrl);
                console.log('Term image selected:', imageUrl);
            } else if (imageModalType === 'definition') {
                setDefinitionImage(imageUrl);
                console.log('Definition image selected:', imageUrl);
            }
            closeImageModal();
        }

        console.log('Selected image:', imageUrl, 'Type:', type);
    };

    const openImageModal = (type: 'term' | 'definition') => {
        setImageModalType(type);
        setShowImageModal(true);
        setSelectedImage('');
        setSelectedImageType(null);
    };

    const closeImageModal = () => {
        // If editing a card, apply selected image to that card
        if (editingCardId && selectedImage && imageModalType) {
            setFlashcards(prev => prev.map(card => {
                if (card.id !== editingCardId) return card;
                if (imageModalType === 'term') {
                    return { ...card, termImage: selectedImage };
                }
                return { ...card, definitionImage: selectedImage };
            }));
        }
        setShowImageModal(false);
        setImageModalType(null);
        setShowImageSearch(false);
        setShowUrlInput(false);
        setSelectedImage('');
        setSelectedImageType(null);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Vui lòng chọn file hình ảnh');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('File quá lớn. Vui lòng chọn file nhỏ hơn 5MB');
                return;
            }

            // Create object URL for preview
            const imageUrl = URL.createObjectURL(file);
            selectImage(imageUrl, 'upload');
        }
    };

    const handleUrlSubmit = () => {
        if (!imageUrl.trim()) {
            alert('Vui lòng nhập URL hình ảnh');
            return;
        }

        // Basic URL validation
        try {
            new URL(imageUrl);
            selectImage(imageUrl, 'url');
        } catch {
            alert('URL không hợp lệ');
        }
    };

    const removeSelectedImage = () => {
        setSelectedImage('');
        setSelectedImageType(null);
    };


    // Nếu đang ở chế độ học, hiển thị StudyFlashcards
    if (showStudyMode) {
        const rawFlashcards = studyFlashcardsForSession.length > 0 ? studyFlashcardsForSession : flashcards;

        // Normalize flashcards to ensure type and fillBlankAnswers are set correctly
        const toStudy = rawFlashcards.map((card: Card) => {
            const normalized = { ...card };

            // Auto-detect fillblank if term has {{ }} syntax
            const hasFillBlankSyntax = normalized.term && /\{\{[^}]+\}\}/.test(normalized.term);
            if (hasFillBlankSyntax && !normalized.type) {
                normalized.type = 'fillblank';
            }

            // Parse fillBlankAnswers if type is fillblank or has {{ }} syntax
            if ((normalized.type === 'fillblank' || hasFillBlankSyntax) && normalized.definition) {
                try {
                    const parsed = typeof normalized.definition === 'string' ? JSON.parse(normalized.definition) : normalized.definition;
                    if (Array.isArray(parsed)) {
                        normalized.fillBlankAnswers = parsed;
                    }
                } catch (e) {
                    // If can't parse, try to extract from term
                    if (hasFillBlankSyntax && !normalized.fillBlankAnswers) {
                        const matches = normalized.term.match(/\{\{([^}]+)\}\}/g);
                        if (matches) {
                            normalized.fillBlankAnswers = matches.map((m: string) => m.replace(/\{\{|\}\}/g, '').trim()).filter((a: string) => a);
                        }
                    }
                }
            }

            // Parse Multiple Choice data
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
        });

        console.log('Entering study mode with flashcards:', toStudy);

        if (isLoadingFlashcards && studyFlashcardsForSession.length === 0) {
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
            <div className={`relative min-h-screen transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-48'}`}>
                {/* Full-viewport white background to cover any parent gray */}
                <div className="fixed inset-0 bg-white z-0"></div>
                <div className="relative z-10">
                    {/* App Header - always visible (copied from Flashcards header) */}
                    <div className={`bg-white fixed top-0 right-0 z-10 transition-all duration-300 ${isCollapsed ? 'left-16' : 'left-40'}`}>
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between h-16">
                                <div className="flex items-center space-x-4">
                                    <button
                                        onClick={onBack}
                                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                        <span>Quay lại</span>
                                    </button>
                                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-yellow-400 rounded-lg flex items-center justify-center">
                                        <img src="/18.gif" alt="Flashcard" className="w-6 h-6 object-contain" />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <h1 className="text-xl font-bold text-gray-900">{flashcardName || 'Flashcard'}</h1>
                                        <button className="p-1 text-gray-400 hover:text-gray-600" aria-label="More">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center space-x-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                        </svg>
                                        <span className="text-sm">Chia sẻ</span>
                                    </button>
                                    <button className="px-3 py-2 text-gray-600 hover:bg-gray-50 border border-gray-300 rounded-lg flex items-center space-x-2">
                                        <span className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">i</span>
                                        <span className="text-sm">Phản hồi</span>
                                    </button>
                                    <button className="p-2 text-gray-400 hover:text-gray-600">
                                        <Link className="w-4 h-4" />
                                    </button>
                                    <button className="p-2 text-gray-400 hover:text-gray-600">
                                        <Upload className="w-4 h-4" />
                                    </button>
                                    <div className="relative">
                                        <button className="p-2 text-gray-400 hover:text-gray-600">
                                            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">H</div>
                                        </button>
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">2</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Header like reference */}
                    <div className="px-8 pt-16">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Generate From Materials</h1>
                                <p className="text-gray-500 mt-2">Select materials you want to generate this flashcard set from</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => setShowMaterialPicker(false)}
                                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => { if (selectedMaterialIds.size > 0) { setShowMaterialPicker(false); setShowTypePicker(true); } }}
                                    className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                    disabled={selectedMaterialIds.size === 0}
                                >
                                    Continue
                                </button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="mt-6 flex justify-end">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search for materials"
                                className="w-full md:w-96 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Materials row like tiles */}
                    <div className="px-8 mt-6">
                        {isLoadingMaterials ? (
                            <div className="py-16 text-center text-gray-500">Đang tải tài liệu...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {/* Upload New Material tile */}
                                <div className="border-2 border-dashed border-gray-200 rounded-xl bg-white p-4 hover:border-gray-300 cursor-pointer flex items-center">
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mr-3">+</div>
                                    <div className="font-medium text-gray-800">Upload New Material</div>
                                </div>

                                {materialsInSet
                                    .filter(m => !searchTerm.trim() || m.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((m) => {
                                        const selected = selectedMaterialIds.has(String(m.id));
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => {
                                                    const next = new Set(selectedMaterialIds);
                                                    const idStr = String(m.id);
                                                    if (next.has(idStr)) next.delete(idStr); else next.add(idStr);
                                                    setSelectedMaterialIds(next);
                                                }}
                                                className={`text-left border rounded-xl bg-white p-4 shadow-sm hover:shadow transition flex items-center justify-between ${selected ? 'ring-2 ring-blue-500 border-blue-200' : 'border-gray-200'}`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                                        <img src={(process.env.PUBLIC_URL || '') + '/card.png'} alt="" className="w-5 h-5 object-contain" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 truncate max-w-[260px]" title={m.name}>{m.name}</div>
                                                        <div className="text-xs text-gray-500">{m.size ? `${(m.size / 1024 / 1024).toFixed(2)} MB` : ''}</div>
                                                    </div>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border ${selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}></div>
                                            </button>
                                        );
                                    })}

                                {materialsInSet.length === 0 && (
                                    <div className="col-span-full text-center text-gray-500 py-16">Không có tài liệu trong bộ học này.</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Advanced collapsible placeholder */}
                    <div className="px-8 py-8">
                        <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                            <span className="text-lg">›</span>
                            <span className="font-medium">Advanced</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Type picker view
    if (showTypePicker) {
        return (
            <div className={`relative min-h-screen transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-48'}`}>
                <div className="fixed inset-0 bg-white z-0"></div>
                <div className="relative z-10">
                    {/* App Header - exact header from Flashcards with back wired to previous step */}
                    <div className={`bg-white fixed top-0 right-0 z-10 transition-all duration-300 ${isCollapsed ? 'left-16' : 'left-40'}`}>
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between h-16">
                                <div className="flex items-center space-x-4">
                                    <button
                                        onClick={() => { setShowTypePicker(false); setShowMaterialPicker(true); }}
                                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                        <span>Quay lại</span>
                                    </button>
                                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-yellow-400 rounded-lg flex items-center justify-center">
                                        <img src="/18.gif" alt="Flashcard" className="w-6 h-6 object-contain" />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <h1 className="text-xl font-bold text-gray-900">{flashcardName || 'Flashcard'}</h1>
                                        <button className="p-1 text-gray-400 hover:text-gray-600" aria-label="More">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center space-x-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                        </svg>
                                        <span className="text-sm">Chia sẻ</span>
                                    </button>
                                    <button className="px-3 py-2 text-gray-600 hover:bg-gray-50 border border-gray-300 rounded-lg flex items-center space-x-2">
                                        <span className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">i</span>
                                        <span className="text-sm">Phản hồi</span>
                                    </button>
                                    <button className="p-2 text-gray-400 hover:text-gray-600">
                                        <Link className="w-4 h-4" />
                                    </button>
                                    <button className="p-2 text-gray-400 hover:text-gray-600">
                                        <Upload className="w-4 h-4" />
                                    </button>
                                    <div className="relative">
                                        <button className="p-2 text-gray-400 hover:text-gray-600">
                                            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">H</div>
                                        </button>
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">2</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Content */}
                    <div className="px-8 pt-16">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Chọn loại Flashcard</h1>
                                <p className="text-gray-500 mt-2">Chọn loại và số lượng thẻ bạn muốn tạo</p>
                            </div>
                            <button
                                className={`px-5 py-2 rounded-lg transition-colors ${totalSelected > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-200 text-white cursor-not-allowed'}`}
                                disabled={totalSelected === 0}
                                onClick={async () => {
                                    try {
                                        if (selectedMaterialIds.size === 0) return;
                                        if (totalSelected === 0) return;
                                        // Ensure flashcard set exists
                                        let workingSetId = createdStudySetId;
                                        if (!workingSetId) {
                                            const res = await fetch('http://localhost:3001/api/flashcard-sets', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ name: flashcardName, studySetId: Number(studySetId) })
                                            });
                                            if (res.ok) {
                                                const data = await res.json();
                                                workingSetId = Number(data.id);
                                                setCreatedStudySetId(workingSetId);
                                            }
                                        }

                                        if (!workingSetId) return;

                                        // 1) Lấy file PDF đầu tiên đã chọn và gửi sang Flask
                                        const firstId = Array.from(selectedMaterialIds)[0];
                                        const material = materialsInSet.find((m: any) => String(m.id) === String(firstId));
                                        if (!material || !material.file_path) {
                                            alert('Không tìm thấy file tài liệu đã chọn.');
                                            return;
                                        }

                                        const fileResp = await fetch(`http://localhost:3001/api/materials/file/${material.file_path}`);
                                        if (!fileResp.ok) {
                                            alert('Không tải được file tài liệu.');
                                            return;
                                        }
                                        const blob = await fileResp.blob();
                                        const form = new FormData();
                                        form.append('document', new File([blob], material.name || 'document.pdf', { type: blob.type || 'application/pdf' }));
                                        form.append('requests', JSON.stringify({
                                            term_definition: clampCount(typeCounts.termDef),
                                            multiple_choice: clampCount(typeCounts.multipleChoice),
                                            fill_blank: clampCount(typeCounts.fillBlank),
                                        }));

                                        // Chuyển về màn editor để hiển thị progress ngay trong lúc tạo
                                        setShowTypePicker(false);
                                        setShowMaterialPicker(false);
                                        setShowScratchEditor(true);

                                        const flaskUrl = (process.env.REACT_APP_FLASK_URL || 'http://localhost:5050') + '/api/generate';
                                        // Tính tổng số thẻ cần tạo (tất cả các loại)
                                        const totalCards = clampCount(typeCounts.termDef) + clampCount(typeCounts.fillBlank) + clampCount(typeCounts.multipleChoice);
                                        // Hiển thị thanh tiến trình NGAY TỪ ĐẦU với tổng dự kiến
                                        setIsGenerating(true);
                                        setGenDone(0);
                                        setGenTotal(totalCards);
                                        let genResp: Response | null = null;
                                        try {
                                            genResp = await fetch(flaskUrl, { method: 'POST', body: form });
                                        } catch (e) {
                                            console.error('Fetch to', flaskUrl, 'failed:', e);
                                            alert('Không kết nối được AI backend (Flask) ở ' + flaskUrl);
                                            return;
                                        }
                                        if (!genResp.ok) {
                                            const errText = await genResp.text().catch(() => '');
                                            console.error('Flask error', genResp.status, errText);
                                            alert('AI tạo nội dung thất bại: ' + (errText || ('HTTP ' + genResp.status)));
                                            return;
                                        }
                                        const genData = await genResp.json();

                                        // 2) Xử lý tất cả các loại flashcard từ response

                                        // 2a) Xử lý term_definition
                                        const td = Array.isArray(genData.term_definition) ? genData.term_definition : [];
                                        for (let i = 0; i < td.length; i++) {
                                            const item = td[i] || {};
                                            const payload = {
                                                front: String(item.term || ''),
                                                back: String(item.definition || ''),
                                                materialId: null,
                                                flashcardSetId: Number(workingSetId ?? studySetId),
                                                studySetId: Number(studySetId),
                                                type: 'pair'
                                            };
                                            try {
                                                const saveResp = await fetch('http://localhost:3001/api/flashcards', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(payload)
                                                });
                                                if (saveResp.ok) {
                                                    const saved = await saveResp.json();
                                                    // Cập nhật UI ngay
                                                    setFlashcards(prev => ([
                                                        ...prev,
                                                        {
                                                            id: String(saved.id),
                                                            term: saved.front || payload.front,
                                                            definition: saved.back || payload.back,
                                                            termImage: '',
                                                            definitionImage: '',
                                                            saved: true,
                                                            dbId: Number(saved.id),
                                                            type: 'pair'
                                                        }
                                                    ]));
                                                    // Nhường frame để trình duyệt render ngay
                                                    await new Promise(res => setTimeout(res, 150));
                                                }
                                            } catch (e) {
                                                console.error('Save term_definition card error', e);
                                            } finally {
                                                setGenDone(d => d + 1);
                                                // Nhường frame để cập nhật thanh tiến trình
                                                await new Promise(res => setTimeout(res, 50));
                                            }
                                        }

                                        // 2b) Xử lý fill_blank
                                        const fb = Array.isArray(genData.fill_blank) ? genData.fill_blank : [];
                                        for (let i = 0; i < fb.length; i++) {
                                            const item = fb[i] || {};
                                            // Convert question với ____ thành {{ }} format
                                            const questionText = String(item.question || '');
                                            const answer = String(item.answer || '');
                                            // Thay tất cả các ____ bằng {{answer}} (giữ nguyên nếu có nhiều chỗ trống cùng đáp án)
                                            const fillBlankText = questionText.replace(/____+/g, `{{${answer}}}`);

                                            // Lấy tất cả các đáp án (có thể có nhiều từ nếu có nhiều chỗ trống)
                                            const answers = Array.isArray(item.answer) ? item.answer.map((a: any) => String(a)) : [answer];
                                            const uniqueAnswers: string[] = Array.from(new Set(answers.filter((a: string) => a && a.trim())));

                                            const payload = {
                                                front: fillBlankText,
                                                back: JSON.stringify(uniqueAnswers.length > 0 ? uniqueAnswers : [answer]),
                                                materialId: null,
                                                flashcardSetId: Number(workingSetId ?? studySetId),
                                                studySetId: Number(studySetId),
                                                type: 'fillblank',
                                                fillBlankAnswers: uniqueAnswers.length > 0 ? uniqueAnswers : [answer]
                                            };
                                            try {
                                                const saveResp = await fetch('http://localhost:3001/api/flashcards', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(payload)
                                                });
                                                if (saveResp.ok) {
                                                    const saved = await saveResp.json();
                                                    // Cập nhật UI ngay
                                                    setFlashcards(prev => ([
                                                        ...prev,
                                                        {
                                                            id: String(saved.id),
                                                            term: fillBlankText,
                                                            definition: JSON.stringify(uniqueAnswers.length > 0 ? uniqueAnswers : [answer]),
                                                            termImage: '',
                                                            definitionImage: '',
                                                            saved: true,
                                                            dbId: Number(saved.id),
                                                            type: 'fillblank',
                                                            fillBlankAnswers: uniqueAnswers.length > 0 ? uniqueAnswers : [answer]
                                                        }
                                                    ]));
                                                    await new Promise(res => setTimeout(res, 150));
                                                }
                                            } catch (e) {
                                                console.error('Save fill_blank card error', e);
                                            } finally {
                                                setGenDone(d => d + 1);
                                                await new Promise(res => setTimeout(res, 50));
                                            }
                                        }

                                        // 2c) Xử lý multiple_choice
                                        const mc = Array.isArray(genData.multiple_choice) ? genData.multiple_choice : [];
                                        for (let i = 0; i < mc.length; i++) {
                                            const item = mc[i] || {};
                                            const question = String(item.question || '');
                                            const options = Array.isArray(item.options) ? item.options : [];
                                            const correctAnswer = String(item.correct_answer || '');

                                            // Tìm index của đáp án đúng
                                            let correctIndex = -1;

                                            // Thử 1: Tìm theo exact match
                                            correctIndex = options.findIndex((opt: string) =>
                                                String(opt).trim().toLowerCase() === correctAnswer.trim().toLowerCase()
                                            );

                                            // Thử 2: Nếu không tìm thấy, thử match với label (A, B, C, D)
                                            if (correctIndex === -1) {
                                                const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
                                                const labelIndex = labels.findIndex(l => l === correctAnswer.trim().toUpperCase());
                                                if (labelIndex >= 0 && labelIndex < options.length) {
                                                    correctIndex = labelIndex;
                                                }
                                            }

                                            // Thử 3: Nếu vẫn không tìm thấy, thử parse như số (index)
                                            if (correctIndex === -1) {
                                                const numIndex = parseInt(correctAnswer);
                                                if (!isNaN(numIndex) && numIndex >= 0 && numIndex < options.length) {
                                                    correctIndex = numIndex;
                                                }
                                            }

                                            // Fallback: Nếu vẫn không tìm thấy, dùng index 0
                                            if (correctIndex === -1 && options.length > 0) {
                                                correctIndex = 0;
                                            }

                                            const payload = {
                                                front: question,
                                                back: JSON.stringify({
                                                    options: options,
                                                    correctIndex: correctIndex
                                                }),
                                                materialId: null,
                                                flashcardSetId: Number(workingSetId ?? studySetId),
                                                studySetId: Number(studySetId),
                                                type: 'multiplechoice',
                                                multipleChoiceOptions: options,
                                                correctAnswerIndex: correctIndex
                                            };
                                            try {
                                                const saveResp = await fetch('http://localhost:3001/api/flashcards', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(payload)
                                                });
                                                if (saveResp.ok) {
                                                    const saved = await saveResp.json();
                                                    // Cập nhật UI ngay
                                                    setFlashcards(prev => ([
                                                        ...prev,
                                                        {
                                                            id: String(saved.id),
                                                            term: question,
                                                            definition: JSON.stringify({
                                                                options: options,
                                                                correctIndex: correctIndex
                                                            }),
                                                            termImage: '',
                                                            definitionImage: '',
                                                            saved: true,
                                                            dbId: Number(saved.id),
                                                            type: 'multiplechoice',
                                                            multipleChoiceOptions: options,
                                                            correctAnswerIndex: correctIndex
                                                        }
                                                    ]));
                                                    await new Promise(res => setTimeout(res, 150));
                                                }
                                            } catch (e) {
                                                console.error('Save multiple_choice card error', e);
                                            } finally {
                                                setGenDone(d => d + 1);
                                                await new Promise(res => setTimeout(res, 50));
                                            }
                                        }

                                        // Giữ thanh tiến trình thêm một chút để người dùng nhận biết hoàn thành
                                        await new Promise(res => setTimeout(res, 500));
                                        setIsGenerating(false);
                                        // Ở lại màn editor để người dùng tiếp tục xem/sửa hoặc bấm Học ngay khi muốn
                                        setShowScratchEditor(true);
                                    } catch (e) {
                                        console.error('Generate error', e);
                                        alert('Có lỗi xảy ra khi tạo flashcards');
                                    }
                                }}
                            >
                                Tạo
                            </button>
                        </div>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Term and Definition */}
                            <div onClick={() => setSelectedType('termDef')} className={`bg-white border rounded-xl p-4 flex items-center justify-between cursor-pointer ${selectedType === 'termDef' ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200'}`}>
                                <div className="flex items-center space-x-3 text-gray-800">
                                    <BookOpen className="w-6 h-6" />
                                    <div className="font-medium">Thuật ngữ và Định nghĩa</div>
                                </div>
                                <input type="number" min={0} max={50} className="w-20 px-3 py-2 border rounded-lg text-right"
                                    value={typeCounts.termDef}
                                    onChange={(e) => setTypeCounts({ ...typeCounts, termDef: clampCount(Number(e.target.value)) })}
                                    onBlur={(e) => setTypeCounts({ ...typeCounts, termDef: clampCount(Number(e.target.value)) })}
                                    onFocus={() => setSelectedType('termDef')}
                                />
                            </div>
                            {/* Fill in the Blank */}
                            <div onClick={() => setSelectedType('fillBlank')} className={`bg-white border rounded-xl p-4 flex items-center justify-between cursor-pointer ${selectedType === 'fillBlank' ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200'}`}>
                                <div className="flex items-center space-x-3 text-gray-800">
                                    <PenTool className="w-6 h-6" />
                                    <div className="font-medium">Điền vào chỗ trống</div>
                                </div>
                                <input type="number" min={0} max={50} className="w-20 px-3 py-2 border rounded-lg text-right"
                                    value={typeCounts.fillBlank}
                                    onChange={(e) => setTypeCounts({ ...typeCounts, fillBlank: clampCount(Number(e.target.value)) })}
                                    onBlur={(e) => setTypeCounts({ ...typeCounts, fillBlank: clampCount(Number(e.target.value)) })}
                                    onFocus={() => setSelectedType('fillBlank')}
                                />
                            </div>
                            {/* Multiple Choice */}
                            <div onClick={() => setSelectedType('multipleChoice')} className={`bg-white border rounded-xl p-4 flex items-center justify-between cursor-pointer ${selectedType === 'multipleChoice' ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200'}`}>
                                <div className="flex items-center space-x-3 text-gray-800">
                                    <ListChecks className="w-6 h-6" />
                                    <div className="font-medium">Trắc nghiệm</div>
                                </div>
                                <input type="number" min={0} max={50} className="w-20 px-3 py-2 border rounded-lg text-right"
                                    value={typeCounts.multipleChoice}
                                    onChange={(e) => setTypeCounts({ ...typeCounts, multipleChoice: clampCount(Number(e.target.value)) })}
                                    onBlur={(e) => setTypeCounts({ ...typeCounts, multipleChoice: clampCount(Number(e.target.value)) })}
                                    onFocus={() => setSelectedType('multipleChoice')}
                                />
                            </div>
                        </div>

                        {/* Example Preview */}
                        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-6">
                            <div className="text-sm font-semibold text-gray-700 mb-3">Xem trước ví dụ:</div>
                            {selectedType === 'termDef' && (
                                <div className="bg-white border rounded-lg p-4">
                                    <div className="text-sm text-gray-800"><strong>Mặt trước:</strong> Photosynthesis là gì?</div>
                                    <div className="mt-2 text-sm text-gray-600"><strong>Mặt sau:</strong> Quá trình cây xanh chuyển đổi ánh sáng thành năng lượng hóa học.</div>
                                </div>
                            )}
                            {selectedType === 'fillBlank' && (
                                <div className="bg-white border rounded-lg p-4">
                                    <div className="text-sm text-gray-800">Điền từ còn thiếu: Water boils at <strong>_____</strong> °C.</div>
                                    <div className="mt-2 text-xs text-gray-500">Đáp án: 100</div>
                                </div>
                            )}
                            {selectedType === 'multipleChoice' && (
                                <div className="bg-white border rounded-lg p-4">
                                    <div className="text-sm font-medium text-gray-800 mb-3">Cơ quan nào là "nhà máy năng lượng" của tế bào?</div>
                                    <div className="space-y-2">
                                        {[
                                            { key: 'A', label: 'Nhân tế bào' },
                                            { key: 'B', label: 'Ty thể' },
                                            { key: 'C', label: 'Ribosome' },
                                            { key: 'D', label: 'Lục lạp' },
                                        ].map((opt) => (
                                            <label key={opt.key} className="flex items-center justify-between border rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50">
                                                <div className="flex items-center space-x-3">
                                                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full border text-gray-700">{opt.key}</span>
                                                    <span className="text-sm text-gray-800">{opt.label}</span>
                                                </div>
                                                <span className="w-4 h-4 rounded-full border border-gray-300"></span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-3 text-xs text-gray-500">Mỗi loại tối đa 50 câu hỏi. Bạn có thể chọn nhiều loại cùng lúc.</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* App Header - always visible (copied from Flashcards) */}
            <div className={`bg-white fixed top-0 right-0 z-10 transition-all duration-300 ${isCollapsed ? 'left-16' : 'left-40'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={onBack}
                                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span>Quay lại</span>
                            </button>
                            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-yellow-400 rounded-lg flex items-center justify-center">
                                <img src="/18.gif" alt="Flashcard" className="w-6 h-6 object-contain" />
                            </div>
                            <div className="flex items-center space-x-2">
                                <h1 className="text-xl font-bold text-gray-900">{flashcardName || 'Flashcard'}</h1>
                                <button className="p-1 text-gray-400 hover:text-gray-600" aria-label="More">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                                <span className="text-sm">Chia sẻ</span>
                            </button>
                            <button className="px-3 py-2 text-gray-600 hover:bg-gray-50 border border-gray-300 rounded-lg flex items-center space-x-2">
                                <span className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">i</span>
                                <span className="text-sm">Phản hồi</span>
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600">
                                <Link className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600">
                                <Upload className="w-4 h-4" />
                            </button>
                            <div className="relative">
                                <button className="p-2 text-gray-400 hover:text-gray-600">
                                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">H</div>
                                </button>
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">1</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - Scrollable */}
            <div className={`pt-16 flex-1 overflow-y-auto pb-20 transition-all duration-300`}>
                <div className="w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col min-h-0">
                    {/* Title Section */}


                    {!showScratchEditor && (
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-gray-900 mb-6">Chọn một tùy chọn *</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {options.map((option) => (
                                    <div
                                        key={option.id}
                                        onClick={() => setSelectedOption(option.id)}
                                        className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${selectedOption === option.id
                                            ? 'border-blue-500 bg-blue-50 shadow-md'
                                            : `${option.color} border-gray-200`
                                            }`}
                                    >
                                        <div className="flex items-start space-x-2">
                                            <div className="flex-shrink-0">
                                                {option.id === 'scratch' ? (
                                                    <div className="w-16 h-16 flex items-center justify-center overflow-hidden">
                                                        <img src={`/${option.icon}`} alt={option.title} className="w-full h-full object-contain" />
                                                    </div>
                                                ) : option.id === 'material' ? (
                                                    <div className="w-16 h-16 flex items-center justify-center overflow-hidden">
                                                        <img src={`/${option.icon}`} alt={option.title} className="w-full h-full object-contain" />
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">{option.icon}</div>
                                                )}
                                            </div>
                                            <div className="flex-1 flex flex-col justify-center">
                                                <h3 className="text-xl font-bold text-gray-900 mb-1">{option.title}</h3>
                                                <p className="text-gray-600 text-base">{option.description}</p>
                                            </div>
                                            {selectedOption === option.id && (
                                                <div className="absolute top-4 right-4">
                                                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {showScratchEditor && (
                        <div className="mb-4">

                            {isGenerating && (
                                <div className="mb-4 border border-blue-200 rounded-lg p-3 bg-blue-50 text-sm text-blue-800">
                                    <div className="flex items-center gap-2">
                                        <img src="/Tapta.gif" alt="loading" className="w-6 h-6 rounded-full" />
                                        <span>Đang tạo thêm thẻ ghi nhớ… Tiến độ {genDone} / {genTotal} thẻ</span>
                                    </div>
                                    <div className="mt-2 h-2 bg-blue-100 rounded">
                                        <div className="h-2 bg-blue-500 rounded transition-all" style={{ width: `${genTotal ? Math.min(100, Math.round((genDone / genTotal) * 100)) : 0}%` }}></div>
                                    </div>
                                </div>
                            )}

                            {/* Empty/Generating State */}
                            {isGenerating ? (
                                <div className="text-center py-16">
                                    <div className="w-28 h-28 mx-auto mb-6">
                                        <img src="/Tapta.gif" alt="Generating" className="w-full h-full object-contain" />
                                    </div>
                                    <h3 className="text-3xl font-bold text-gray-900 mb-3">Đang tạo thẻ ghi nhớ</h3>
                                    <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
                                        Hệ thống đang tạo thẻ ghi nhớ cho bạn. Chúng sẽ xuất hiện tại đây ngay khi sẵn sàng. Bạn có thể ở lại trang này hoặc quay lại sau.
                                    </p>
                                </div>
                            ) : flashcards.length === 0 ? (
                                <div className="text-center py-4">
                                    <div className="w-32 h-32 mx-auto mb-4">
                                        <img src="/18.gif" alt="Flashcard" className="w-full h-full object-contain" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Thêm thẻ ghi nhớ đầu tiên</h3>
                                    <p className="text-gray-600">Thẻ ghi nhớ là cách tuyệt vời để ghi nhớ thông tin.</p>
                                </div>
                            ) : null}

                            {/* Existing Flashcards */}
                            {flashcards.map((flashcard, index) => (
                                <div
                                    key={`${flashcard.dbId ?? flashcard.id}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, flashcard.id)}
                                    onDragOver={(e) => handleDragOver(e, flashcard.id)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, flashcard.id)}
                                    onDragEnd={handleDragEnd}
                                    className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 w-full mb-4 transition-all ${draggedCardId === flashcard.id ? 'opacity-50' : ''
                                        } ${dragOverCardId === flashcard.id ? 'border-blue-500 border-2' : ''
                                        }`}
                                >
                                    {flashcard.type === 'fillblank' ? (
                                        // Fill in the blank UI (như ảnh 1)
                                        <>
                                            {/* Header với badge, dropdown, icons */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                        <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                                                    </div>
                                                    <select
                                                        value="fillblank"
                                                        onChange={(e) => {
                                                            // Có thể thêm logic đổi type ở đây nếu cần
                                                        }}
                                                        className="text-sm border border-gray-300 rounded-lg px-3 py-2"
                                                    >
                                                        <option value="fillblank">Điền vào chỗ trống</option>
                                                        <option value="pair">Thuật ngữ và Định nghĩa</option>
                                                        <option value="multiplechoice">Trắc nghiệm</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <GripVertical
                                                        className="w-5 h-5 text-gray-400 cursor-move hover:text-gray-600"
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                    />
                                                    <button
                                                        onClick={() => deleteFlashcard(flashcard.id)}
                                                        className="p-1 text-red-400 hover:text-red-600"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Term Input với + Blank button */}
                                            {editingCardId === flashcard.id ? (
                                                // Edit Mode for Fill Blank
                                                <div className="mb-4">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <label className="block text-sm font-medium text-gray-700">Thuật ngữ</label>
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-xs text-gray-600 mb-3">
                                                        Nhấp vào nút +Trống để tạo khoảng trống. Chọn văn bản trước để xóa các từ cụ thể.
                                                    </p>
                                                    <div className="flex items-start space-x-2">
                                                        <textarea
                                                            id={`fillBlankEditTextarea-${flashcard.id}`}
                                                            value={editTerm}
                                                            onChange={(e) => {
                                                                setEditTerm(e.target.value);
                                                                const answers = extractAnswersFromText(e.target.value);
                                                                // Update edit state with answers
                                                            }}
                                                            className="flex-1 h-32 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 p-4 bg-purple-50 resize-none text-sm"
                                                            placeholder="Nhập văn bản và sử dụng nút {{...}} để thêm khoảng trống..."
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const textarea = document.getElementById(`fillBlankEditTextarea-${flashcard.id}`) as HTMLTextAreaElement;
                                                                if (!textarea) return;
                                                                const start = textarea.selectionStart;
                                                                const end = textarea.selectionEnd;
                                                                const selectedText = editTerm.substring(start, end);
                                                                const before = editTerm.substring(0, start);
                                                                const after = editTerm.substring(end);
                                                                if (selectedText) {
                                                                    setEditTerm(before + `{{${selectedText}}}` + after);
                                                                } else {
                                                                    setEditTerm(before + `{{}}` + after);
                                                                }
                                                                setTimeout(() => {
                                                                    textarea.focus();
                                                                    const newPos = before.length + (selectedText ? 2 + selectedText.length + 3 : 2);
                                                                    textarea.setSelectionRange(newPos, newPos);
                                                                }, 0);
                                                            }}
                                                            className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center space-x-2 whitespace-nowrap"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                            <span>Trống</span>
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => openImageModal('term')}
                                                        className="mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg flex items-center space-x-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <span>Thêm hình ảnh</span>
                                                    </button>
                                                    <div className="flex justify-end space-x-2 mt-4">
                                                        <button
                                                            onClick={cancelEdit}
                                                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                                                        >
                                                            Hủy
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const answers = extractAnswersFromText(editTerm);
                                                                if (answers.length === 0) {
                                                                    alert('Vui lòng điền ít nhất 1 đáp án vào chỗ trống.');
                                                                    return;
                                                                }
                                                                setFlashcards(prev => prev.map(card =>
                                                                    card.id === editingCardId
                                                                        ? {
                                                                            ...card,
                                                                            term: editTerm.trim(),
                                                                            fillBlankAnswers: answers,
                                                                            definition: JSON.stringify(answers)
                                                                        }
                                                                        : card
                                                                ));
                                                                setEditingCardId(null);
                                                                setEditTerm('');
                                                                setEditDefinition('');
                                                            }}
                                                            disabled={!editTerm.trim()}
                                                            className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50"
                                                        >
                                                            Lưu
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                // View Mode
                                                <>
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <label className="block text-sm font-medium text-gray-700">Thuật ngữ</label>
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex items-start space-x-2">
                                                        <textarea
                                                            value={flashcard.term}
                                                            readOnly
                                                            className="flex-1 h-24 rounded-lg border border-gray-200 p-4 bg-purple-50 resize-none text-sm"
                                                        />
                                                        <button
                                                            onClick={() => startEdit(flashcard)}
                                                            className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center space-x-2 whitespace-nowrap"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                            <span>Trống</span>
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => openImageModal('term')}
                                                        className="mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg flex items-center space-x-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <span>Thêm hình ảnh</span>
                                                    </button>
                                                </>
                                            )}

                                            {/* Preview Section (Collapsed by default) - chỉ hiển thị khi không edit */}
                                            {editingCardId !== flashcard.id && (
                                                <div className="mb-4">
                                                    <button
                                                        onClick={() => {
                                                            const newSet = new Set(expandedPreviews);
                                                            if (newSet.has(flashcard.id)) {
                                                                newSet.delete(flashcard.id);
                                                            } else {
                                                                newSet.add(flashcard.id);
                                                            }
                                                            setExpandedPreviews(newSet);
                                                        }}
                                                        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100"
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            <GraduationCap className="w-4 h-4" />
                                                            <span>Preview</span>
                                                        </div>
                                                        {expandedPreviews.has(flashcard.id) ? (
                                                            <ChevronUp className="w-4 h-4" />
                                                        ) : (
                                                            <ChevronDown className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                    {expandedPreviews.has(flashcard.id) && (
                                                        <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                            <p className="text-sm text-gray-600 mb-2">Văn bản:</p>
                                                            <p className="text-sm text-gray-900">{flashcard.term}</p>
                                                            {flashcard.fillBlankAnswers && flashcard.fillBlankAnswers.length > 0 && (
                                                                <>
                                                                    <p className="text-sm text-gray-600 mt-4 mb-2">Đáp án đúng:</p>
                                                                    <ul className="list-disc list-inside text-sm text-gray-900">
                                                                        {flashcard.fillBlankAnswers.map((ans, i) => (
                                                                            <li key={i}>{ans}</li>
                                                                        ))}
                                                                    </ul>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    ) : flashcard.type === 'multiplechoice' ? (
                                        // Multiple Choice UI (như ảnh 1)
                                        <>
                                            {/* Header với badge, dropdown, icons */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                        <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                                                    </div>
                                                    <select
                                                        value="multiplechoice"
                                                        onChange={(e) => {
                                                            // Có thể thêm logic đổi type ở đây nếu cần
                                                        }}
                                                        className="text-sm border border-gray-300 rounded-lg px-3 py-2"
                                                    >
                                                        <option value="fillblank">Điền vào chỗ trống</option>
                                                        <option value="pair">Thuật ngữ và Định nghĩa</option>
                                                        <option value="multiplechoice">Trắc nghiệm</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => startEdit(flashcard)}
                                                        className="p-1 text-blue-400 hover:text-blue-600"
                                                        title="Sửa"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <GripVertical
                                                        className="w-5 h-5 text-gray-400 cursor-move hover:text-gray-600"
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                    />
                                                    <button
                                                        onClick={() => deleteFlashcard(flashcard.id)}
                                                        className="p-1 text-red-400 hover:text-red-600"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Term và Choices Layout */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                                                {/* Left: Term */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-3">Term</label>
                                                    <div className="w-full h-32 rounded-lg border border-gray-200 p-4 bg-gray-50 text-sm">
                                                        {flashcard.term}
                                                    </div>
                                                    <button
                                                        onClick={() => openImageModal('term')}
                                                        className="mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg flex items-center space-x-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                        <span>Add Image</span>
                                                    </button>
                                                    {flashcard.termImage && (
                                                        <div className="mt-3 relative group">
                                                            <img
                                                                src={flashcard.termImage}
                                                                alt="Term image"
                                                                className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                }}
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const updatedFlashcards = flashcards.map(f =>
                                                                        f.id === flashcard.id
                                                                            ? { ...f, termImage: '' }
                                                                            : f
                                                                    );
                                                                    setFlashcards(updatedFlashcards);
                                                                }}
                                                                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: Choices */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-3">Choices</label>
                                                    <div className="space-y-3">
                                                        {flashcard.multipleChoiceOptions && flashcard.multipleChoiceOptions.length > 0 ? (
                                                            flashcard.multipleChoiceOptions.map((option, optIndex) => {
                                                                const isCorrect = flashcard.correctAnswerIndex === optIndex;
                                                                return (
                                                                    <div
                                                                        key={optIndex}
                                                                        className={`flex items-center space-x-2 p-3 rounded-lg border ${isCorrect
                                                                            ? 'border-blue-500 bg-blue-50'
                                                                            : 'border-gray-200 bg-white'
                                                                            }`}
                                                                    >
                                                                        {/* Correct/Incorrect Indicator */}
                                                                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isCorrect
                                                                            ? 'bg-green-500 text-white'
                                                                            : 'bg-gray-200 text-gray-500'
                                                                            }`}>
                                                                            {isCorrect ? (
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                                </svg>
                                                                            ) : (
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                                </svg>
                                                                            )}
                                                                        </div>
                                                                        {/* Option Display */}
                                                                        <div className={`flex-1 px-3 py-2 rounded-lg border ${isCorrect
                                                                            ? 'border-blue-300 bg-white'
                                                                            : 'border-gray-300 bg-gray-50'
                                                                            } text-sm`}>
                                                                            {option || `Option ${optIndex + 1}${isCorrect ? ' (Correct)' : ''}`}
                                                                        </div>
                                                                        {/* Delete Button (disabled in view mode) */}
                                                                        <div className="flex-shrink-0 w-8 h-8 text-gray-400 rounded-lg flex items-center justify-center">
                                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                            </svg>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="text-sm text-gray-500">No options available</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        // Default UI (Term and Definition)
                                        <>
                                            {/* Header với badge, dropdown, icons - giống fillblank */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                        <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                                                    </div>
                                                    <select
                                                        value={flashcard.type || 'pair'}
                                                        onChange={(e) => {
                                                            const newType = e.target.value;
                                                            setFlashcards(prev => prev.map(c => {
                                                                if (c.id === flashcard.id) {
                                                                    // Khi đổi type, reset một số fields nếu cần
                                                                    if (newType === 'fillblank') {
                                                                        // Nếu chuyển sang fillblank, extract answers từ term nếu có {{ }}
                                                                        const answers = extractAnswersFromText(c.term || '');
                                                                        return {
                                                                            ...c,
                                                                            type: newType,
                                                                            fillBlankAnswers: answers.length > 0 ? answers : ['']
                                                                        };
                                                                    } else {
                                                                        // Nếu chuyển sang loại khác, xóa fillBlankAnswers
                                                                        return {
                                                                            ...c,
                                                                            type: newType,
                                                                            fillBlankAnswers: undefined
                                                                        };
                                                                    }
                                                                }
                                                                return c;
                                                            }));
                                                        }}
                                                        className="text-sm border border-gray-300 rounded-lg px-3 py-2"
                                                    >
                                                        <option value="pair">Thuật ngữ và Định nghĩa</option>
                                                        <option value="fillblank">Điền vào chỗ trống</option>
                                                        <option value="multiplechoice">Trắc nghiệm</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <GripVertical
                                                        className="w-5 h-5 text-gray-400 cursor-move hover:text-gray-600"
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                    />
                                                    <button
                                                        onClick={() => deleteFlashcard(flashcard.id)}
                                                        className="p-1 text-red-400 hover:text-red-600"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {editingCardId === flashcard.id ? (
                                                // Edit Mode
                                                <>
                                                    {/* Hàng tuỳ chọn giống "Thẻ ghi nhớ mới" */}
                                                    <div className="flex flex-wrap items-center gap-6 mb-4">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-sm font-medium text-gray-700">Loại</span>
                                                            <select className="text-sm border border-gray-300 rounded-lg px-3 py-2 min-w-48" defaultValue="pair">
                                                                <option value="pair">Thuật ngữ và Định nghĩa</option>
                                                                <option value="fillblank">Điền vào chỗ trống</option>
                                                                <option value="multiplechoice">Trắc nghiệm</option>
                                                            </select>
                                                        </div>
                                                        {flashcard.type !== 'fillblank' && (
                                                            <>
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="text-sm font-medium text-gray-700">Tạo ngược</span>
                                                                    <button
                                                                        onClick={() => setFlashcards(prev => prev.map(c => c.id === flashcard.id ? { ...c, reverseEnabled: !c.reverseEnabled } : c))}
                                                                        className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${flashcard.reverseEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                                                                    >
                                                                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${flashcard.reverseEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                                                                    </button>
                                                                    <span className={`text-xs ${flashcard.reverseEnabled ? 'text-green-500' : 'text-red-500'}`}>{flashcard.reverseEnabled ? 'BẬT' : 'TẮT'}</span>
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="text-sm font-medium text-gray-700">Thuật ngữ dạng âm thanh</span>
                                                                    <button
                                                                        onClick={() => setFlashcards(prev => prev.map(c => c.id === flashcard.id ? { ...c, audioEnabled: !c.audioEnabled } : c))}
                                                                        className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${flashcard.audioEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                                                                    >
                                                                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${flashcard.audioEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                                                                    </button>
                                                                    <span className={`text-xs ${flashcard.audioEnabled ? 'text-green-500' : 'text-red-500'}`}>{flashcard.audioEnabled ? 'BẬT' : 'TẮT'}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-3">Thuật ngữ</label>
                                                            <textarea
                                                                value={editTerm}
                                                                onChange={(e) => setEditTerm(e.target.value)}
                                                                className="w-full h-24 rounded-lg border border-gray-200 p-4 bg-purple-50 text-sm resize-none"
                                                                placeholder="Nhập thuật ngữ..."
                                                            />
                                                            <button
                                                                onClick={() => openImageModal('term')}
                                                                className="mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg flex items-center space-x-2"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                                <span>Thêm hình ảnh</span>
                                                            </button>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-3">Định nghĩa</label>
                                                            <textarea
                                                                value={editDefinition}
                                                                onChange={(e) => setEditDefinition(e.target.value)}
                                                                className="w-full h-24 rounded-lg border border-gray-200 p-4 bg-purple-50 text-sm resize-none"
                                                                placeholder="Nhập định nghĩa..."
                                                            />
                                                            <button
                                                                onClick={() => openImageModal('definition')}
                                                                className="mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg flex items-center space-x-2"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                                <span>Thêm hình ảnh</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                // View Mode
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-3">Thuật ngữ</label>
                                                        <div className="w-full min-h-24 rounded-lg border border-gray-200 p-4 bg-purple-50 text-sm">
                                                            {flashcard.term}
                                                        </div>
                                                        {flashcard.termImage && (
                                                            <div className="mt-3 relative group">
                                                                <img
                                                                    src={flashcard.termImage}
                                                                    alt="Term image"
                                                                    className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                    }}
                                                                />
                                                                <button
                                                                    onClick={() => {
                                                                        const updatedFlashcards = flashcards.map(f =>
                                                                            f.id === flashcard.id
                                                                                ? { ...f, termImage: '' }
                                                                                : f
                                                                        );
                                                                        setFlashcards(updatedFlashcards);
                                                                    }}
                                                                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-3">Định nghĩa</label>
                                                        <div className="w-full min-h-24 rounded-lg border border-gray-200 p-4 bg-purple-50 text-sm">
                                                            {flashcard.definition}
                                                        </div>
                                                        {flashcard.definitionImage && (
                                                            <div className="mt-3 relative group">
                                                                <img
                                                                    src={flashcard.definitionImage}
                                                                    alt="Definition image"
                                                                    className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                    }}
                                                                />
                                                                <button
                                                                    onClick={() => {
                                                                        const updatedFlashcards = flashcards.map(f =>
                                                                            f.id === flashcard.id
                                                                                ? { ...f, definitionImage: '' }
                                                                                : f
                                                                        );
                                                                        setFlashcards(updatedFlashcards);
                                                                    }}
                                                                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Edit Action Buttons */}
                                            {editingCardId === flashcard.id && (
                                                <div className="flex justify-end space-x-2 mt-4">
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                                                    >
                                                        Hủy
                                                    </button>
                                                    <button
                                                        onClick={saveEdit}
                                                        disabled={!editTerm.trim() || !editDefinition.trim()}
                                                        className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50"
                                                    >
                                                        Lưu
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}

                            {/* New Flashcard Form */}
                            <div className="bg-gray-50 rounded-xl shadow-lg border border-gray-200 p-4 w-full" data-new-flashcard-form>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">Thẻ ghi nhớ mới</h3>

                                {/* Options Row */}
                                <div className="flex flex-wrap items-center gap-6 mb-4">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-gray-700">Loại</span>
                                        <select
                                            value={flashcardType === 'pair' ? 'pair' : flashcardType === 'fillblank' ? 'fillblank' : flashcardType === 'multiplechoice' ? 'multiplechoice' : 'pair'}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setFlashcardType(value);
                                                // Reset fields khi đổi loại
                                                if (value !== 'fillblank') {
                                                    setFillBlankText('');
                                                    setFillBlankAnswers(['']);
                                                }
                                                if (value !== 'multiplechoice') {
                                                    setMultipleChoiceTerm('');
                                                    setMultipleChoiceOptions(['', '']);
                                                    setCorrectAnswerIndex(1);
                                                }
                                                if (value !== 'pair') {
                                                    setTermText('');
                                                    setDefinitionText('');
                                                }
                                            }}
                                            className="text-sm border border-gray-300 rounded-lg px-3 py-2 min-w-48"
                                        >
                                            <option value="pair">Thuật ngữ và Định nghĩa</option>
                                            <option value="fillblank">Điền vào chỗ trống</option>
                                            <option value="multiplechoice">Trắc nghiệm</option>
                                        </select>
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    {flashcardType !== 'fillblank' && flashcardType !== 'multiplechoice' && (
                                        <>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm font-medium text-gray-700">Tạo ngược</span>
                                                <button
                                                    onClick={() => setIsReverseEnabled(!isReverseEnabled)}
                                                    className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${isReverseEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                                                >
                                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${isReverseEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                                                </button>
                                                <span className={`text-xs ${isReverseEnabled ? 'text-green-500' : 'text-red-500'}`}>
                                                    {isReverseEnabled ? 'BẬT' : 'TẮT'}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm font-medium text-gray-700">Thuật ngữ dạng âm thanh</span>
                                                <button
                                                    onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                                                    className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${isAudioEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                                                >
                                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${isAudioEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                                                </button>
                                                <span className={`text-xs ${isAudioEnabled ? 'text-green-500' : 'text-red-500'}`}>
                                                    {isAudioEnabled ? 'BẬT' : 'TẮT'}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Input Fields */}
                                {flashcardType === 'fillblank' ? (
                                    // Fill in the blank UI
                                    <div className="mb-4">
                                        <div className="mb-4">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <label className="block text-sm font-medium text-gray-700">Thuật ngữ</label>
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <p className="text-xs text-gray-600 mb-3">
                                                Nhấp vào nút +Trống để tạo khoảng trống. Chọn văn bản trước để xóa các từ cụ thể.
                                            </p>
                                            <div className="flex items-start space-x-2">
                                                <textarea
                                                    id="fillBlankTextarea"
                                                    value={fillBlankText}
                                                    onChange={(e) => handleFillBlankTextChange(e.target.value)}
                                                    className="flex-1 h-32 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 p-4 bg-purple-50 resize-none text-sm"
                                                    placeholder="Nhập văn bản và sử dụng nút {{...}} để thêm khoảng trống..."
                                                />
                                                <button
                                                    onClick={addBlankToText}
                                                    className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center space-x-2 whitespace-nowrap"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    <span>Trống</span>
                                                </button>
                                            </div>
                                            {/* Answer inputs */}
                                            <div className="mt-4 space-y-2">
                                                {fillBlankAnswers.map((answer, index) => (
                                                    <div key={index} className="flex items-center space-x-2">
                                                        <input
                                                            type="text"
                                                            value={answer}
                                                            onChange={(e) => handleFillBlankAnswerChange(index, e.target.value)}
                                                            placeholder={`Đáp án ${index + 1}`}
                                                            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                        {fillBlankAnswers.length > 1 && (
                                                            <button
                                                                onClick={() => removeFillBlankAnswer(index)}
                                                                className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Xóa đáp án"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={addFillBlankAnswer}
                                                    className="mt-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors flex items-center space-x-2"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    <span>Thêm đáp án</span>
                                                </button>
                                            </div>
                                            {/* Warning box */}
                                            {(extractAnswersFromText(fillBlankText).length === 0 && fillBlankAnswers.every(a => !a.trim())) && (
                                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                    <p className="text-xs text-red-700">
                                                        Vui lòng điền ít nhất 1 đáp án vào chỗ trống, bạn có thể thực hiện bằng cách thêm {'{{CORRECT_ANSWER}}'}.
                                                    </p>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => openImageModal('term')}
                                                className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg flex items-center space-x-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span>Thêm hình ảnh</span>
                                            </button>
                                            {termImage && (
                                                <div className="mt-3 relative group">
                                                    <img
                                                        src={termImage}
                                                        alt="Term image"
                                                        className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => setTermImage('')}
                                                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : flashcardType === 'multiplechoice' ? (
                                    // Multiple Choice UI
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                                        {/* Left: Term */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-3">Term</label>
                                            <textarea
                                                value={multipleChoiceTerm}
                                                onChange={(e) => setMultipleChoiceTerm(e.target.value)}
                                                className="w-full h-32 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 p-4 bg-gray-50 resize-none text-sm"
                                                placeholder="Enter content here..."
                                            />
                                            <button
                                                onClick={() => openImageModal('term')}
                                                className="mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg flex items-center space-x-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                <span>Add Image</span>
                                            </button>
                                            {termImage && (
                                                <div className="mt-3 relative group">
                                                    <img
                                                        src={termImage}
                                                        alt="Term image"
                                                        className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => setTermImage('')}
                                                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {/* Right: Choices */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-3">Choices</label>
                                            <div className="space-y-3">
                                                {multipleChoiceOptions.map((option, index) => (
                                                    <div
                                                        key={index}
                                                        className={`flex items-center space-x-2 p-3 rounded-lg border ${correctAnswerIndex === index
                                                            ? 'border-blue-500 bg-blue-50'
                                                            : 'border-gray-200 bg-white'
                                                            }`}
                                                    >
                                                        {/* Correct/Incorrect Indicator */}
                                                        <button
                                                            onClick={() => handleCorrectAnswerChange(index)}
                                                            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${correctAnswerIndex === index
                                                                ? 'bg-blue-500 text-white'
                                                                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                                                }`}
                                                        >
                                                            {correctAnswerIndex === index ? (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                        {/* Option Input */}
                                                        <input
                                                            type="text"
                                                            value={option}
                                                            onChange={(e) => handleMultipleChoiceOptionChange(index, e.target.value)}
                                                            placeholder={index === correctAnswerIndex ? `Option ${index + 1} (Correct)` : `Option ${index + 1}`}
                                                            className={`flex-1 px-3 py-2 rounded-lg border ${correctAnswerIndex === index
                                                                ? 'border-blue-300 bg-white'
                                                                : 'border-gray-300 bg-gray-50'
                                                                } focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                                                        />
                                                        {/* Delete Button */}
                                                        <button
                                                            onClick={() => removeMultipleChoiceOption(index)}
                                                            className="flex-shrink-0 w-8 h-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors"
                                                            disabled={multipleChoiceOptions.length <= 2}
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                onClick={addMultipleChoiceOption}
                                                className="mt-3 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors flex items-center space-x-2"
                                            >
                                                <Plus className="w-4 h-4" />
                                                <span>Add option</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // Default Term and Definition UI
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-3">Thuật ngữ</label>
                                            <textarea
                                                value={termText}
                                                onChange={(e) => setTermText(e.target.value)}
                                                className="w-full h-24 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 p-4 bg-purple-50 resize-none text-sm"
                                                placeholder="Nhập nội dung ở đây..."
                                            />
                                            <button
                                                onClick={() => openImageModal('term')}
                                                className="mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg flex items-center space-x-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span>Thêm hình ảnh</span>
                                            </button>
                                            {termImage && (
                                                <div className="mt-3 relative group">
                                                    <img
                                                        src={termImage}
                                                        alt="Term image"
                                                        className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => setTermImage('')}
                                                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-3">Định nghĩa</label>
                                            <textarea
                                                value={definitionText}
                                                onChange={(e) => setDefinitionText(e.target.value)}
                                                className="w-full h-24 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 p-4 bg-purple-50 resize-none text-sm"
                                                placeholder="Nhập nội dung ở đây..."
                                            />
                                            <button
                                                onClick={() => openImageModal('definition')}
                                                className="mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg flex items-center space-x-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span>Thêm hình ảnh</span>
                                            </button>
                                            {definitionImage && (
                                                <div className="mt-3 relative group">
                                                    <img
                                                        src={definitionImage}
                                                        alt="Definition image"
                                                        className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => setDefinitionImage('')}
                                                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Image Selection Modal */}
                                {showImageModal && (
                                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-lg font-semibold text-gray-900">
                                                    Thêm hình ảnh cho {imageModalType === 'term' ? 'Thuật ngữ' : 'Định nghĩa'}
                                                </h4>
                                                <button
                                                    onClick={closeImageModal}
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* Three Options */}
                                            <div className="space-y-4">
                                                {/* Option 1: Search */}
                                                <div className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-center space-x-3 mb-3">
                                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <h5 className="font-medium text-gray-900">Tìm kiếm từ internet</h5>
                                                            <p className="text-sm text-gray-500">Tìm hình ảnh từ Pixabay</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setShowImageSearch(!showImageSearch)}
                                                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                    >
                                                        Tìm kiếm hình ảnh
                                                    </button>
                                                </div>

                                                {/* Option 2: URL */}
                                                <div className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-center space-x-3 mb-3">
                                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <h5 className="font-medium text-gray-900">Dán URL</h5>
                                                            <p className="text-sm text-gray-500">Nhập link hình ảnh trực tiếp</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setShowUrlInput(!showUrlInput)}
                                                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                                    >
                                                        Dán URL hình ảnh
                                                    </button>
                                                </div>

                                                {/* Option 3: Upload */}
                                                <div className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-center space-x-3 mb-3">
                                                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <h5 className="font-medium text-gray-900">Tải lên từ máy</h5>
                                                            <p className="text-sm text-gray-500">Chọn file từ thiết bị của bạn</p>
                                                        </div>
                                                    </div>
                                                    <label className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer flex items-center justify-center">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleFileUpload}
                                                            className="hidden"
                                                        />
                                                        Tải lên hình ảnh
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Search Section */}
                                            {showImageSearch && (
                                                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                                    <h5 className="font-medium text-gray-900 mb-3">Tìm kiếm hình ảnh</h5>
                                                    <div className="flex items-center space-x-2 mb-4">
                                                        <input
                                                            type="text"
                                                            value={imageSearchTerm}
                                                            onChange={(e) => setImageSearchTerm(e.target.value)}
                                                            placeholder="Tìm kiếm hình ảnh..."
                                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            onKeyPress={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    searchImages(imageSearchTerm);
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => searchImages(imageSearchTerm)}
                                                            disabled={isSearchingImages}
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                        >
                                                            {isSearchingImages ? 'Đang tìm...' : 'Tìm kiếm'}
                                                        </button>
                                                    </div>

                                                    {/* Search Results */}
                                                    {imageSearchResults.length > 0 && (
                                                        <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                                                            {imageSearchResults.map((image) => (
                                                                <div
                                                                    key={image.id}
                                                                    className="relative group cursor-pointer bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
                                                                    onClick={() => selectImage(image.url, 'search')}
                                                                >
                                                                    <img
                                                                        src={image.thumbnail}
                                                                        alt={image.title}
                                                                        className="w-full h-20 object-cover group-hover:scale-105 transition-transform duration-200"
                                                                    />
                                                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                                                                        <div className="opacity-0 group-hover:opacity-100 bg-white rounded-full p-1 shadow-lg">
                                                                            <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                                            </svg>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* No Results */}
                                                    {imageSearchResults.length === 0 && imageSearchTerm && !isSearchingImages && (
                                                        <div className="text-center py-4 text-gray-500">
                                                            <p className="text-sm">Không tìm thấy hình ảnh nào</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* URL Input Section */}
                                            {showUrlInput && (
                                                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                                    <h5 className="font-medium text-gray-900 mb-3">Dán URL hình ảnh</h5>
                                                    <div className="flex space-x-2">
                                                        <input
                                                            type="url"
                                                            value={imageUrl}
                                                            onChange={(e) => setImageUrl(e.target.value)}
                                                            placeholder="https://example.com/image.jpg"
                                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                                        />
                                                        <button
                                                            onClick={handleUrlSubmit}
                                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                                        >
                                                            Thêm
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-2">Hỗ trợ: JPG, PNG, GIF, WebP</p>
                                                </div>
                                            )}


                                            {/* Action Buttons */}
                                            <div className="flex justify-end space-x-3 mt-6">
                                                <button
                                                    onClick={closeImageModal}
                                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                                                >
                                                    Đóng
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Add Flashcard Button - Right aligned */}
                                <div className="flex justify-end mt-4">
                                    <button
                                        onClick={saveFlashcard}
                                        disabled={
                                            isSaving ||
                                            (flashcardType === 'fillblank'
                                                ? !fillBlankText.trim() || (extractAnswersFromText(fillBlankText).length === 0 && fillBlankAnswers.every(a => !a.trim()))
                                                : flashcardType === 'multiplechoice'
                                                    ? !multipleChoiceTerm.trim() || multipleChoiceOptions.length < 2 || multipleChoiceOptions.some(opt => !opt.trim()) || correctAnswerIndex < 0 || correctAnswerIndex >= multipleChoiceOptions.length
                                                    : !termText.trim() || !definitionText.trim())
                                        }
                                        className={`px-4 py-2 rounded-full flex items-center space-x-2 disabled:opacity-50 transition-colors duration-200 ${(flashcardType === 'fillblank'
                                            ? fillBlankText.trim() && (extractAnswersFromText(fillBlankText).length > 0 || fillBlankAnswers.some(a => a.trim()))
                                            : flashcardType === 'multiplechoice'
                                                ? multipleChoiceTerm.trim() && multipleChoiceOptions.length >= 2 && multipleChoiceOptions.every(opt => opt.trim()) && correctAnswerIndex >= 0 && correctAnswerIndex < multipleChoiceOptions.length
                                                : termText.trim() && definitionText.trim())
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-gray-400 text-white hover:bg-gray-500'
                                            }`}
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Thêm thẻ ghi nhớ</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Advanced Section */}
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

                    {/* Fixed Action Buttons - Only show when in flashcard editor */}
                    {showScratchEditor && (
                        <div className={`fixed bottom-0 z-20 transition-all duration-300 ${isCollapsed ? 'left-16' : 'left-40'} w-full bg-white border-t border-gray-200 p-4 flex justify-center space-x-4 shadow-lg`} style={{ transform: 'translateX(-20px)' }}>
                            <button
                                onClick={async () => {
                                    // Tạo mảng CỤC BỘ để dùng ngay, không phụ thuộc setState
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

                                    // Dọn form (để lần sau không bị lặp)
                                    setTermText('');
                                    setDefinitionText('');
                                    setTermImage('');
                                    setDefinitionImage('');

                                    // (tuỳ chọn) cập nhật state cho khớp UI nhưng KHÔNG đọc lại từ state ngay sau đó
                                    setFlashcards(cardsToSave);

                                    // Lưu dựa trên MẢNG TRUYỀN VÀO → không bị mất thẻ cuối
                                    const results = await saveAllFlashcards(cardsToSave);
                                    if (results.length > 0) setShowStudyMode(true);
                                }}
                                className="px-6 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 flex items-center"
                            >
                                <GraduationCap className="w-4 h-4 mr-2" />
                                Học ngay
                            </button>
                        </div>
                    )}

                    {/* Fixed Action Buttons - Only show when selecting options */}
                    {!showScratchEditor && (
                        <div className={`fixed bottom-0 z-20 transition-all duration-300 ${isCollapsed ? 'left-16' : 'left-40'} w-full bg-white border-t border-gray-200 p-4 flex justify-center space-x-4 shadow-lg`}>
                            <button
                                onClick={onBack}
                                className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 transition-colors duration-200"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleContinue}
                                disabled={!selectedOption}
                                className={`px-6 py-2 rounded-lg transition-colors duration-200 ${selectedOption
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                Tiếp tục
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateFlashcardSet;
