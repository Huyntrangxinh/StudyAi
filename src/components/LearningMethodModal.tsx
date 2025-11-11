import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronDown, BookOpen, CheckSquare, MessageCircle, Gamepad2, PenTool } from 'lucide-react';
import { useFlashcardGeneration } from '../hooks/useFlashcardGeneration';
import { clampCount } from '../utils/flashcardHelpers';
import { useAuth } from '../hooks/useAuth';

interface LearningMethod {
    id: string;
    title: string;
    description: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    icon: React.ReactNode;
    color: string;
}

interface SubModule {
    id: number;
    title: string;
    materialIds?: number[];
    progress?: number;
}

interface Material {
    id: string | number;
    name: string;
    file_path: string;
}

interface LearningMethodModalProps {
    moduleTitle: string;
    isOpen: boolean;
    onClose: () => void;
    onSelectMethod: (methodId: string, generatedFlashcardSetId?: number) => void;
    studySetId: string;
    subModule?: SubModule | null;
    materials?: Material[];
}

const LearningMethodModal: React.FC<LearningMethodModalProps> = ({
    moduleTitle,
    isOpen,
    onClose,
    onSelectMethod,
    studySetId,
    subModule,
    materials = []
}) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isGenerating, setIsGenerating] = useState(false);
    const [genDone, setGenDone] = useState(0);
    const [genTotal, setGenTotal] = useState(0);
    const [createdFlashcardSetId, setCreatedFlashcardSetId] = useState<number | null>(null);
    const [flashcards, setFlashcards] = useState<any[]>([]);
    const [isGeneratingTest, setIsGeneratingTest] = useState(false);

    // Flashcard generation hook
    const flashcardGen = useFlashcardGeneration({
        studySetId,
        createdStudySetId: createdFlashcardSetId,
        setCreatedStudySetId: setCreatedFlashcardSetId,
        setFlashcards,
        setShowTypePicker: () => { },
        setShowMaterialPicker: () => { },
        setShowScratchEditor: () => { },
        setIsGenerating,
        setGenDone,
        setGenTotal
    });

    // Get materials for this sub-module
    const getModuleMaterials = useCallback(() => {
        if (!subModule || !subModule.materialIds || subModule.materialIds.length === 0) {
            // If no specific materials for sub-module, use all materials from study set
            return materials.map(m => ({
                ...m,
                id: String(m.id) // Convert to string to match Material type
            }));
        }
        return materials
            .filter(m => {
                const materialId = typeof m.id === 'number' ? m.id : parseInt(String(m.id), 10);
                return subModule.materialIds?.includes(materialId);
            })
            .map(m => ({
                ...m,
                id: String(m.id) // Convert to string to match Material type
            }));
    }, [subModule, materials]);

    // Helper: bump sub-module progress based on current value
    const bumpProgressOnSelect = async () => {
        try {
            if (!subModule || !subModule.id) return;
            const current = Number(subModule.progress ?? 0);
            const next = current >= 50 ? 100 : 50;
            await fetch(`http://localhost:3001/api/study-paths/sub-module/${subModule.id}/progress`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ progress: next })
            });
        } catch (e) {
            console.warn('Could not update sub-module progress on select', e);
        }
    };

    // Handle flashcards generation
    const handleFlashcardsClick = useCallback(async () => {
        const moduleMaterials = getModuleMaterials();

        if (moduleMaterials.length === 0) {
            alert('Không tìm thấy tài liệu để tạo flashcard. Vui lòng upload tài liệu trước.');
            return;
        }

        // Generate flashcard name from module title
        const flashcardName = `Khái niệm ${moduleTitle}`;

        try {
            // Mark progress (50% on first method, 100% on second)
            await bumpProgressOnSelect();

            // Check if flashcard set already exists for this sub-module
            const flashcardSetsRes = await fetch(`http://localhost:3001/api/flashcard-sets`);
            if (!flashcardSetsRes.ok) {
                throw new Error('Không tải được flashcard sets.');
            }
            const allFlashcardSets = await flashcardSetsRes.json();

            // Filter flashcard sets by study_set_id
            const flashcardSetsInSet = allFlashcardSets.filter((set: any) =>
                String(set.study_set_id) === String(studySetId)
            );

            // Try to find existing flashcard set for this sub-module
            let existingFlashcardSet = null;

            if (flashcardSetsInSet.length > 0) {
                // Strategy 1: Find by name matching module title
                const moduleTitleLower = moduleTitle.toLowerCase();
                const nameMatch = flashcardSetsInSet.find((set: any) => {
                    const setName = (set.name || '').toLowerCase();
                    // Check if set name contains module title or vice versa
                    return setName.includes(moduleTitleLower) ||
                        moduleTitleLower.includes(setName) ||
                        setName.includes('khái niệm') && moduleTitleLower.includes(setName.replace('khái niệm', '').trim());
                });

                if (nameMatch) {
                    existingFlashcardSet = nameMatch;
                } else if (subModule && subModule.materialIds && subModule.materialIds.length > 0) {
                    // Strategy 2: Find by matching materials
                    // Load flashcards for each set and check if they match sub-module materials
                    for (const set of flashcardSetsInSet) {
                        const flashcardsRes = await fetch(`http://localhost:3001/api/flashcards?flashcardSetId=${set.id}`);
                        if (flashcardsRes.ok) {
                            const flashcards = await flashcardsRes.json();
                            // Check if any flashcard has material_id matching sub-module materials
                            const hasMatchingMaterial = flashcards.some((card: any) =>
                                card.material_id && subModule.materialIds?.includes(card.material_id)
                            );
                            if (hasMatchingMaterial && flashcards.length > 0) {
                                existingFlashcardSet = set;
                                break;
                            }
                        }
                    }
                }

                // Strategy 3: If still not found, use the most recent set with matching name pattern
                if (!existingFlashcardSet) {
                    const sortedSets = [...flashcardSetsInSet]
                        .filter((set: any) => {
                            const setName = (set.name || '').toLowerCase();
                            return setName.includes('khái niệm');
                        })
                        .sort((a: any, b: any) => {
                            const dateA = new Date(a.created_at || 0).getTime();
                            const dateB = new Date(b.created_at || 0).getTime();
                            return dateB - dateA; // Most recent first
                        });
                    if (sortedSets.length > 0) {
                        existingFlashcardSet = sortedSets[0];
                    }
                }
            }

            // If flashcard set exists, use it directly
            if (existingFlashcardSet) {
                console.log('✅ Found existing flashcard set:', existingFlashcardSet);
                // Verify it has flashcards
                const flashcardsRes = await fetch(`http://localhost:3001/api/flashcards?flashcardSetId=${existingFlashcardSet.id}`);
                if (flashcardsRes.ok) {
                    const flashcards = await flashcardsRes.json();
                    if (flashcards && flashcards.length > 0) {
                        // Use existing flashcard set
                        onSelectMethod('flashcards', existingFlashcardSet.id);
                        return;
                    }
                }
            }

            // No existing flashcard set found, create new one
            console.log('📝 No existing flashcard set found, creating new one...');
            setIsGenerating(true);

            // Auto-select first material
            const selectedMaterialIds = new Set<string>([String(moduleMaterials[0].id)]);

            // Default type counts: 10 term-definition cards
            const typeCounts = {
                termDef: 10,
                fillBlank: 0,
                multipleChoice: 0
            };

            await flashcardGen.generateFlashcards(
                selectedMaterialIds,
                moduleMaterials,
                typeCounts,
                flashcardName,
                moduleTitle // Pass module title as context for AI
            );

            // Wait for flashcard set to be created (it's set by the hook)
            // The hook will set createdFlashcardSetId after creating the set
            // We'll use useEffect to watch for this change
        } catch (error) {
            console.error('Error generating flashcards:', error);
            alert('Có lỗi xảy ra khi tạo flashcard');
            setIsGenerating(false);
        }
    }, [getModuleMaterials, flashcardGen, moduleTitle, studySetId, subModule, onSelectMethod]);

    // Watch for when generation completes and flashcard set is created
    React.useEffect(() => {
        if (!isGenerating && createdFlashcardSetId) {
            // Generation completed, navigate to flashcards
            onSelectMethod('flashcards', createdFlashcardSetId);
        }
    }, [isGenerating, createdFlashcardSetId, onSelectMethod]);

    // Handle quiz/test generation from flashcards
    const handleQuizClick = useCallback(async () => {
        try {
            setIsGeneratingTest(true);

            // Mark progress (50% on first method, 100% on second)
            await bumpProgressOnSelect();

            // Load all flashcard sets for this study set
            const flashcardSetsRes = await fetch(`http://localhost:3001/api/flashcard-sets`);
            if (!flashcardSetsRes.ok) {
                alert('Không tải được flashcard sets.');
                setIsGeneratingTest(false);
                return;
            }
            const allFlashcardSets = await flashcardSetsRes.json();

            // Filter flashcard sets by study_set_id
            const flashcardSetsInSet = allFlashcardSets.filter((set: any) =>
                String(set.study_set_id) === String(studySetId)
            );

            if (flashcardSetsInSet.length === 0) {
                alert('Không tìm thấy flashcard set nào trong bộ học này. Vui lòng tạo flashcard trước.');
                setIsGeneratingTest(false);
                return;
            }

            // Tìm flashcard set liên quan đến sub-module
            // Ưu tiên: 1) Flashcard set có tên liên quan đến module title, 2) Flashcard set mới nhất
            let selectedFlashcardSet = flashcardSetsInSet[0];

            if (flashcardSetsInSet.length > 1) {
                // Try to find flashcard set related to module title
                const moduleTitleLower = moduleTitle.toLowerCase();
                const relatedSet = flashcardSetsInSet.find((set: any) => {
                    const setName = (set.name || '').toLowerCase();
                    return setName.includes(moduleTitleLower) || moduleTitleLower.includes(setName);
                });

                if (relatedSet) {
                    selectedFlashcardSet = relatedSet;
                } else {
                    // If no related set found, try to find by checking flashcards' material_ids
                    // Load flashcards for each set and check if they match sub-module materials
                    if (subModule && subModule.materialIds && subModule.materialIds.length > 0) {
                        // Try to find flashcard set with flashcards matching sub-module materials
                        // For now, just use the first set or most recent one
                        const sortedSets = [...flashcardSetsInSet].sort((a: any, b: any) => {
                            const dateA = new Date(a.created_at || 0).getTime();
                            const dateB = new Date(b.created_at || 0).getTime();
                            return dateB - dateA; // Most recent first
                        });
                        selectedFlashcardSet = sortedSets[0];
                    } else {
                        // Sort by created_at, most recent first
                        const sortedSets = [...flashcardSetsInSet].sort((a: any, b: any) => {
                            const dateA = new Date(a.created_at || 0).getTime();
                            const dateB = new Date(b.created_at || 0).getTime();
                            return dateB - dateA;
                        });
                        selectedFlashcardSet = sortedSets[0];
                    }
                }
            }

            // Load flashcards từ flashcard set
            const flashcardsRes = await fetch(`http://localhost:3001/api/flashcards?flashcardSetId=${selectedFlashcardSet.id}`);
            if (!flashcardsRes.ok) {
                alert('Không tải được flashcards.');
                setIsGeneratingTest(false);
                return;
            }
            const flashcards = await flashcardsRes.json();

            if (!flashcards || flashcards.length === 0) {
                alert('Flashcard set này không có flashcard nào.');
                setIsGeneratingTest(false);
                return;
            }

            // Tạo text từ flashcards
            let flashcardText = `Nội dung flashcard set: ${selectedFlashcardSet.name}\n\n`;
            flashcardText += `Chủ đề: ${moduleTitle}\n\n`;
            flashcards.forEach((card: any, index: number) => {
                flashcardText += `\n=== Flashcard ${index + 1} ===\n`;

                // Xử lý các loại flashcard khác nhau
                if (card.type === 'term_def') {
                    flashcardText += `Thuật ngữ: ${card.term || card.front || ''}\n`;
                    flashcardText += `Định nghĩa: ${card.definition || card.back || ''}\n`;
                } else if (card.type === 'fill_blank') {
                    flashcardText += `Câu hỏi: ${card.question || card.front || ''}\n`;
                    flashcardText += `Đáp án: ${card.answer || card.back || ''}\n`;
                } else if (card.type === 'multiple_choice') {
                    flashcardText += `Câu hỏi: ${card.question || card.front || ''}\n`;
                    if (card.options && Array.isArray(card.options)) {
                        card.options.forEach((opt: string, optIdx: number) => {
                            const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
                            flashcardText += `${labels[optIdx]}. ${opt}\n`;
                        });
                    }
                    flashcardText += `Đáp án đúng: ${card.correct_answer || card.back || ''}\n`;
                } else {
                    // Fallback: dùng front và back
                    flashcardText += `Mặt trước: ${card.front || ''}\n`;
                    flashcardText += `Mặt sau: ${card.back || ''}\n`;
                }
                flashcardText += '\n';
            });

            // Tạo file text từ flashcard content
            const textBlob = new Blob([flashcardText], { type: 'text/plain' });
            const textFile = new File([textBlob], `${selectedFlashcardSet.name || 'flashcards'}.txt`, { type: 'text/plain' });

            // Default test type counts for quiz - chỉ tạo 10 câu trắc nghiệm
            const testTypeCounts = {
                multipleChoice: 10,
                shortAnswer: 0,
                freeResponse: 0,
                trueFalse: 0,
                fillBlank: 0
            };

            // Gửi request đến Flask để tạo câu hỏi
            const form = new FormData();
            form.append('document', textFile);
            form.append('requests', JSON.stringify({
                multiple_choice: testTypeCounts.multipleChoice || 0,
                short_answer: testTypeCounts.shortAnswer || 0,
                free_response: testTypeCounts.freeResponse || 0,
                true_false: testTypeCounts.trueFalse || 0,
                fill_blank: testTypeCounts.fillBlank || 0,
            }));

            const flaskUrl = (process.env.REACT_APP_FLASK_URL || 'http://localhost:5050') + '/api/generate';
            const genResp = await fetch(flaskUrl, { method: 'POST', body: form });

            if (!genResp.ok) {
                const errText = await genResp.text().catch(() => '');
                alert('AI tạo câu hỏi thất bại: ' + (errText || ('HTTP ' + genResp.status)));
                setIsGeneratingTest(false);
                return;
            }

            const genData = await genResp.json();

            // Xử lý response và chuyển đổi thành test questions
            const questions: Array<{
                id: string;
                type: string;
                question: string;
                options?: string[];
                correctAnswer?: number | string;
            }> = [];

            // Xử lý Multiple Choice
            const mc = Array.isArray(genData.multiple_choice) ? genData.multiple_choice : [];
            mc.forEach((item: any, index: number) => {
                const options = Array.isArray(item.options) ? item.options : [];
                const correctAnswer = String(item.correct_answer || '');
                let correctIndex = options.findIndex((opt: string) =>
                    String(opt).trim().toLowerCase() === correctAnswer.trim().toLowerCase()
                );
                if (correctIndex === -1) {
                    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
                    const labelIndex = labels.findIndex(l => l === correctAnswer.trim().toUpperCase());
                    if (labelIndex >= 0 && labelIndex < options.length) {
                        correctIndex = labelIndex;
                    } else {
                        const numIndex = parseInt(correctAnswer);
                        if (!isNaN(numIndex) && numIndex >= 0 && numIndex < options.length) {
                            correctIndex = numIndex;
                        }
                    }
                }
                if (correctIndex === -1 && options.length > 0) {
                    correctIndex = 0;
                }

                questions.push({
                    id: `mc_${index}`,
                    type: 'multipleChoice',
                    question: String(item.question || ''),
                    options: options,
                    correctAnswer: correctIndex
                });
            });

            // Xử lý Short Answer
            const sa = Array.isArray(genData.short_answer) ? genData.short_answer : [];
            sa.forEach((item: any, index: number) => {
                questions.push({
                    id: `sa_${index}`,
                    type: 'shortAnswer',
                    question: String(item.question || ''),
                    correctAnswer: String(item.answer || item.correct_answer || '')
                });
            });

            // Xử lý Free Response (FRQ)
            const fr = Array.isArray(genData.free_response) ? genData.free_response : [];
            fr.forEach((item: any, index: number) => {
                questions.push({
                    id: `fr_${index}`,
                    type: 'freeResponse',
                    question: String(item.question || ''),
                    correctAnswer: String(item.answer || item.correct_answer || '')
                });
            });

            // Xử lý Fill in the Blank
            const fb = Array.isArray(genData.fill_blank) ? genData.fill_blank : [];
            fb.forEach((item: any, index: number) => {
                questions.push({
                    id: `fb_${index}`,
                    type: 'fillBlank',
                    question: String(item.question || ''),
                    correctAnswer: String(item.answer || item.correct_answer || '')
                });
            });

            // Lưu test vào database
            let savedTestId: number | null = null;
            try {
                if (!studySetId || !user?.id) {
                    throw new Error('Missing studySetId or userId');
                }

                const testName = `Câu hỏi về ${moduleTitle} - ${new Date().toLocaleDateString('vi-VN')}`;
                const flashcardSetIds = [selectedFlashcardSet.id].filter(id => !isNaN(id));

                const saveResponse = await fetch('http://localhost:3001/api/tests', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        studySetId: studySetId,
                        userId: user.id,
                        name: testName,
                        description: `Bài kiểm tra được tạo từ flashcard: ${selectedFlashcardSet.name}`,
                        questions: questions.map((q, idx) => ({
                            type: q.type,
                            question: q.question,
                            options: q.options || null,
                            correctAnswer: q.correctAnswer,
                            position: idx
                        })),
                        materialIds: [], // Không có material IDs khi tạo từ flashcard
                        flashcardSetIds: flashcardSetIds,
                        timeLimit: null
                    }),
                });

                if (!saveResponse.ok) {
                    const errorData = await saveResponse.json().catch(() => ({ error: 'Unknown error' }));
                    console.error('Failed to save test:', errorData);
                } else {
                    const savedTest = await saveResponse.json();
                    console.log('Test saved successfully:', savedTest.id);
                    savedTestId = savedTest.id;
                }
            } catch (saveError) {
                console.error('Error saving test to database:', saveError);
            }

            setIsGeneratingTest(false);

            // Navigate to test view
            const url = savedTestId ? `/dashboard/test?id=${savedTestId}` : '/dashboard/test';
            navigate(url, {
                state: {
                    ready: true,
                    testQuestions: questions,
                    currentTestId: savedTestId
                }
            });

            // Close modal
            onClose();
        } catch (error) {
            console.error('Error generating test from flashcards:', error);
            alert('Có lỗi xảy ra khi tạo câu hỏi từ flashcard');
            setIsGeneratingTest(false);
        }
    }, [studySetId, moduleTitle, user, navigate, onClose, subModule]);

    if (!isOpen) return null;

    // Extract main topic from module title (remove English translation and common prefixes)
    const getMainTopic = (title: string) => {
        // Remove English translation in parentheses
        let topic = title.replace(/\([^)]*\)/g, '').trim();

        // Remove common prefixes (case insensitive)
        const prefixes = [
            'khái niệm về',
            'tổng quan về',
            'giới thiệu về',
            'giới thiệu và khái niệm',
            'giới thiệu và',
            'các loại',
            'phân loại',
            'tìm hiểu về',
            'nghiên cứu về',
            'biến thể và',
            'biến thể',
            'và các loại',
            'và sự phát triển',
            'và phương thức',
            'và các khái niệm'
        ];

        const topicLower = topic.toLowerCase();
        for (const prefix of prefixes) {
            if (topicLower.startsWith(prefix)) {
                topic = topic.substring(prefix.length).trim();
                // Remove leading "về" or "của" if present
                topic = topic.replace(/^(về|của)\s+/i, '').trim();
                break;
            }
            // Also check if prefix appears in the middle
            const prefixIndex = topicLower.indexOf(' ' + prefix + ' ');
            if (prefixIndex > 0) {
                topic = topic.substring(0, prefixIndex).trim();
                break;
            }
        }

        // If topic contains "và" or long phrases, extract just the main subject
        // For example: "Trojan và các loại hình thức của nó" -> "Trojan"
        // Or: "Mã độc và các loại" -> "Mã độc"
        const vàIndex = topic.toLowerCase().indexOf(' và ');
        if (vàIndex > 0) {
            const firstPart = topic.substring(0, vàIndex).trim();
            // Only use first part if it's reasonable length (not too short, not too long)
            if (firstPart.length > 0 && firstPart.length <= 20) {
                topic = firstPart;
            }
        }

        // Remove common suffixes
        const suffixes = [
            ' và các loại',
            ' và sự phát triển',
            ' và phương thức',
            ' và các khái niệm',
            ' và các biến thể',
            ' của nó',
            ' trong hệ thống'
        ];

        for (const suffix of suffixes) {
            if (topic.toLowerCase().endsWith(suffix.toLowerCase())) {
                topic = topic.substring(0, topic.length - suffix.length).trim();
                break;
            }
        }

        return topic || title;
    };

    const mainTopic = getMainTopic(moduleTitle);

    // Determine the third learning method - random between Test and Game
    const getThirdMethod = (): LearningMethod => {
        // Random between 0 and 1
        const random = Math.random();

        if (random < 0.5) {
            // Test option
            return {
                id: 'test',
                title: `Test về ${mainTopic}`,
                description: 'Get exam-ready with realistic practice questions',
                difficulty: 'Hard',
                icon: <PenTool className="w-8 h-8 text-orange-600" />,
                color: 'bg-orange-100'
            };
        } else {
            // Game option
            return {
                id: 'game',
                title: `Chơi trò chơi về ${mainTopic}`,
                description: 'Turn studying into a game you actually want to play',
                difficulty: 'Hard',
                icon: <Gamepad2 className="w-8 h-8 text-pink-600" />,
                color: 'bg-pink-100'
            };
        }
    };

    const thirdMethod = getThirdMethod();

    const learningMethods: LearningMethod[] = [
        {
            id: 'flashcards',
            title: `Khái niệm ${mainTopic}`,
            description: 'Understand concepts with smart spaced repetition',
            difficulty: 'Easy',
            icon: <BookOpen className="w-8 h-8 text-green-600" />,
            color: 'bg-green-100'
        },
        {
            id: 'quiz',
            title: `Câu hỏi về ${mainTopic}`,
            description: 'Quick quizzes that adapt to what you need to learn',
            difficulty: 'Medium',
            icon: <CheckSquare className="w-8 h-8 text-yellow-600" />,
            color: 'bg-yellow-100'
        },
        thirdMethod
    ];

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Easy':
                return 'bg-green-500 text-white';
            case 'Medium':
                return 'bg-yellow-500 text-white';
            case 'Hard':
                return 'bg-red-500 text-white';
            default:
                return 'bg-gray-500 text-white';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Continue Learning</h2>
                        <p className="text-sm text-gray-600 mt-1">{moduleTitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {/* Learning Methods Cards */}
                <div className="p-6">
                    {(isGenerating || isGeneratingTest) && (
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                    <span className="text-sm text-blue-700">
                                        {isGenerating
                                            ? `Đang tạo flashcard... (${genDone}/${genTotal})`
                                            : 'Đang tạo câu hỏi từ flashcard...'
                                        }
                                    </span>
                                </div>
                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${isGenerating && genTotal > 0 ? (genDone / genTotal) * 100 : isGeneratingTest ? 50 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {learningMethods.map((method) => (
                            <button
                                key={method.id}
                                onClick={() => {
                                    if (method.id === 'flashcards') {
                                        handleFlashcardsClick();
                                    } else if (method.id === 'quiz') {
                                        handleQuizClick();
                                    } else {
                                        onSelectMethod(method.id);
                                    }
                                }}
                                disabled={(isGenerating && method.id === 'flashcards') || (isGeneratingTest && method.id === 'quiz')}
                                className={`bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-lg transition-all text-left relative group ${(isGenerating && method.id === 'flashcards') || (isGeneratingTest && method.id === 'quiz') ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                            >
                                {/* Difficulty Badge */}
                                <div className="absolute top-4 right-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(method.difficulty)}`}>
                                        {method.difficulty}
                                    </span>
                                </div>

                                {/* Icon */}
                                <div className={`w-16 h-16 ${method.color} rounded-lg flex items-center justify-center mb-4`}>
                                    {method.icon}
                                </div>

                                {/* Title */}
                                <h3 className="text-lg font-bold text-gray-900 mb-2">
                                    {method.title}
                                </h3>

                                {/* Description */}
                                <p className="text-sm text-gray-600 mb-4">
                                    {method.description}
                                </p>

                                {/* Action Icon */}
                                <div className="flex justify-end">
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                        <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Explore More Options Button */}
                <div className="px-6 pb-6">
                    <button className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 font-medium">
                        <span>Explore more options</span>
                        <ChevronDown className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LearningMethodModal;

