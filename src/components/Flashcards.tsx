import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Plus, Search, RotateCcw, ChevronLeft, ChevronRight, Eye, EyeOff, FileText, Share, Link, Upload, Bell, Pencil, Trash2 } from 'lucide-react';
import CreateFlashcardSet from './CreateFlashcardSet';
import StudyFlashcardsWrapper from './StudyFlashcardsWrapper';

// Debug: Check if components are loaded
if (!CreateFlashcardSet) {
    console.error('CreateFlashcardSet is undefined');
}
if (!StudyFlashcardsWrapper) {
    console.error('StudyFlashcardsWrapper is undefined');
}

interface Flashcard {
    id: number;
    front: string;
    back: string;
    studySetId: number;
    materialId?: number;
    createdAt: string;
}

interface Material {
    id: number;
    name: string;
    type: string;
    size: number;
    file_path: string;
    study_set_id: number;
    created_at: string;
}

interface StudySet {
    id: number;
    name: string;
    description: string;
    user_id: string;
    status: string;
    color: string;
    icon: string;
    created_at: string;
    updated_at: string;
}

interface FlashcardsProps {
    studySetId: string;
    studySetName: string;
    onBack: () => void;
    isCollapsed?: boolean;
}

const Flashcards: React.FC<FlashcardsProps> = ({ studySetId, studySetName, onBack, isCollapsed = false }) => {
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCreateSet, setShowCreateSet] = useState(false);
    const [newCard, setNewCard] = useState({ front: '', back: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [studySets, setStudySets] = useState<StudySet[]>([]);
    const { user } = useAuth();
    const [viewingFlashcardSetId, setViewingFlashcardSetId] = useState<number | null>(null);
    const [viewingFlashcards, setViewingFlashcards] = useState<Array<{ id: string; term: string; definition: string; termImage?: string; definitionImage?: string; type?: string; fillBlankAnswers?: string[]; multipleChoiceOptions?: string[]; correctAnswerIndex?: number }>>([]);
    const [isLoadingViewing, setIsLoadingViewing] = useState<boolean>(false);
    const [editingSetId, setEditingSetId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const [allUserStudySets, setAllUserStudySets] = useState<StudySet[]>([]);
    const [showStudySetDropdown, setShowStudySetDropdown] = useState<boolean>(false);
    const [selectedStudySetId, setSelectedStudySetId] = useState<string>(studySetId);
    const [selectedStudySetName, setSelectedStudySetName] = useState<string>(studySetName);
    const [studySetSearch, setStudySetSearch] = useState<string>('');
    // Folder (frontend only)
    type Folder = { id: number; name: string; color: string; setIds: number[] };
    const [folders, setFolders] = useState<Folder[]>([]);
    const [showCreateFolder, setShowCreateFolder] = useState<boolean>(false);
    const [newFolderName, setNewFolderName] = useState<string>('');
    const [newFolderColor, setNewFolderColor] = useState<string>('#a78bfa');
    const [viewingFolderId, setViewingFolderId] = useState<number | null>(null);
    const [flashcardCounts, setFlashcardCounts] = useState<Record<number, number>>({});
    // Handler sửa tên set
    const startEditSet = (id: number, name: string) => {
        setEditingSetId(id); setEditingName(name);
    };
    const cancelEditSet = () => { setEditingSetId(null); setEditingName(''); };
    const saveEditSet = async (id: number) => {
        try {
            const res = await fetch(`http://localhost:3001/api/flashcard-sets/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editingName }) });
            if (res.ok) {
                setEditingSetId(null); setEditingName('');
                await reloadSets(); // reload
            }
        } catch (e) { console.error(e); }
    }
    // Xóa set
    const deleteSet = async (id: number) => {
        if (!window.confirm('Bạn chắc chắn muốn xóa bộ thẻ này?')) return;
        try {
            const res = await fetch(`http://localhost:3001/api/flashcard-sets/${id}`, { method: 'DELETE' });
            if (res.ok) await reloadSets();
        } catch (e) { console.error(e); }
    };
    // Refetch sets
    const reloadSets = async () => {
        try {
            const res = await fetch(`http://localhost:3001/api/flashcard-sets`);
            if (!res.ok) return setStudySets([]);
            const data = await res.json();
            const curSetId = String(studySetId ?? '').trim();
            const filtered = Array.isArray(data)
                ? data.filter((s: any) => String(s.study_set_id) === curSetId)
                : [];
            setStudySets(filtered || []);
            if (Array.isArray(filtered)) {
                loadCountsForSets(filtered as any);
            }
        } catch (e) { setStudySets([]); }
    };

    // Load flashcards and materials
    useEffect(() => {
        loadFlashcards();
        loadMaterials();
    }, [selectedStudySetId]);

    // Load all flashcard sets, filter theo study_set_id hiện tại
    useEffect(() => {
        const loadStudySets = async () => {
            try {
                const res = await fetch(`http://localhost:3001/api/flashcard-sets`);
                if (!res.ok) {
                    console.error('Failed to load study sets');
                    setStudySets([]);
                    return;
                }
                const data = await res.json();
                // Lấy studySetId string hiện tại từ dropdown
                const curSetId = String(selectedStudySetId ?? '').trim();
                // Chỉ hiển thị bộ thẻ với study_set_id đúng
                const filtered = Array.isArray(data)
                    ? data.filter((s: any) => String(s.study_set_id) === curSetId)
                    : [];
                setStudySets(filtered || []);
                // nạp số lượng flashcards cho từng set
                if (Array.isArray(filtered)) {
                    loadCountsForSets(filtered as any);
                }
            } catch (err) {
                setStudySets([]);
            }
        };
        loadStudySets();
    }, [selectedStudySetId]);

    // Load all study sets for current user (for dropdown)
    useEffect(() => {
        const fetchUserStudySets = async () => {
            try {
                if (!user?.id) return;
                const res = await fetch(`http://localhost:3001/api/study-sets?userId=${encodeURIComponent(user.id)}`);
                if (!res.ok) return;
                const data = await res.json();
                setAllUserStudySets(Array.isArray(data) ? data : []);
            } catch { }
        };
        fetchUserStudySets();
    }, [user?.id]);

    // Load folders from API per study set
    const fetchFolders = async () => {
        try {
            const res = await fetch(`http://localhost:3001/api/folders?studySetId=${encodeURIComponent(String(selectedStudySetId))}`);
            if (!res.ok) return setFolders([]);
            const data = await res.json();
            setFolders(Array.isArray(data) ? data : []);
        } catch { setFolders([]); }
    };
    useEffect(() => { fetchFolders(); }, [selectedStudySetId]);

    const createFolder = async () => {
        const name = newFolderName.trim();
        if (!name) return;
        try {
            const res = await fetch('http://localhost:3001/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, color: newFolderColor, studySetId: Number(selectedStudySetId) })
            });
            if (res.ok) {
                await fetchFolders();
                setShowCreateFolder(false);
                setNewFolderName('');
            }
        } catch { }
    };

    const onDropToFolder = async (folderId: number, e: React.DragEvent) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('text/plain');
        const setId = Number(data);
        if (!setId) return;
        try {
            await fetch(`http://localhost:3001/api/folders/${folderId}/sets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ flashcardSetId: setId })
            });
            await fetchFolders();
        } catch { }
    };

    const loadCountsForSets = async (sets: Array<{ id: number }>) => {
        try {
            const entries = await Promise.all(
                sets.map(async (s) => {
                    try {
                        const res = await fetch(`http://localhost:3001/api/flashcards?flashcardSetId=${s.id}`);
                        if (!res.ok) return [s.id, 0] as [number, number];
                        const data = await res.json();
                        const count = Array.isArray(data) ? data.length : 0;
                        return [s.id, count] as [number, number];
                    } catch {
                        return [s.id, 0] as [number, number];
                    }
                })
            );
            const map: Record<number, number> = {};
            for (const [id, count] of entries) map[id] = count;
            setFlashcardCounts(map);
        } catch {
            setFlashcardCounts({});
        }
    };

    // Load flashcards by flashcard_set id
    const openFlashcardSet = async (flashcardSetId: number) => {
        try {
            setIsLoadingViewing(true);
            setViewingFlashcardSetId(flashcardSetId);
            const res = await fetch(`http://localhost:3001/api/flashcards?flashcardSetId=${flashcardSetId}`);
            if (!res.ok) {
                console.error('Failed to load flashcards by flashcard_set id');
                setViewingFlashcards([]);
                return;
            }
            const data = await res.json();
            const mapped = Array.isArray(data)
                ? data.map((c: any) => {
                    const card: any = {
                        id: String(c.id),
                        term: c.front || '',
                        definition: c.back || '',
                        termImage: c.term_image || c.termImage,
                        definitionImage: c.definition_image || c.definitionImage,
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
                                } else if (typeof backData === 'string') {
                                    card.fillBlankAnswers = [backData];
                                }
                                if (!c.type && hasFillBlankSyntax) {
                                    card.type = 'fillblank';
                                }
                            } catch (e) {
                                // If can't parse, try to extract from term
                                if (hasFillBlankSyntax) {
                                    if (!c.type) {
                                        card.type = 'fillblank';
                                    }
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
            setViewingFlashcards(mapped);
        } catch (e) {
            console.error('Error loading flashcards by set:', e);
            setViewingFlashcards([]);
        } finally {
            setIsLoadingViewing(false);
        }
    };

    // If viewing a specific flashcard set, render StudyFlashcardsWrapper
    if (viewingFlashcardSetId !== null) {
        if (isLoadingViewing) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Đang tải thẻ ghi nhớ...</p>
                    </div>
                </div>
            );
        }
        const viewingName = (studySets.find(s => s.id === viewingFlashcardSetId)?.name) || `Flashcard Set #${viewingFlashcardSetId}`;
        return (
            <StudyFlashcardsWrapper
                flashcards={viewingFlashcards}
                onBack={() => setViewingFlashcardSetId(null)}
                isCollapsed={isCollapsed}
                flashcardName={viewingName}
                studySetId={selectedStudySetId}
            />
        );
    }

    // No separate screen: folder filter will be applied in the main list

    const loadFlashcards = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`http://localhost:3001/api/flashcards/${selectedStudySetId}`);
            if (response.ok) {
                const data = await response.json();
                setFlashcards(data);
            } else {
                console.error('Failed to load flashcards');
            }
        } catch (error) {
            console.error('Error loading flashcards:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMaterials = async () => {
        try {
            const response = await fetch(`http://localhost:3001/api/materials/${selectedStudySetId}`);
            if (response.ok) {
                const data = await response.json();
                setMaterials(data);
                if (data.length > 0) {
                    setSelectedMaterial(data[0]); // Select first material by default
                }
            } else {
                console.error('Failed to load materials');
            }
        } catch (error) {
            console.error('Error loading materials:', error);
        }
    };


    // Create new flashcard
    const createFlashcard = async () => {
        if (!newCard.front.trim() || !newCard.back.trim()) return;

        try {
            const response = await fetch('http://localhost:3001/api/flashcards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    front: newCard.front,
                    back: newCard.back,
                    studySetId: parseInt(studySetId),
                    materialId: selectedMaterial?.id
                }),
            });

            if (response.ok) {
                const createdCard = await response.json();
                setFlashcards(prev => [...prev, createdCard]);
                setNewCard({ front: '', back: '' });
                setShowCreateModal(false);
            } else {
                console.error('Failed to create flashcard');
            }
        } catch (error) {
            console.error('Error creating flashcard:', error);
        }
    };

    // Navigation
    const nextCard = () => {
        if (currentCardIndex < flashcards.length - 1) {
            setCurrentCardIndex(currentCardIndex + 1);
            setIsFlipped(false);
        }
    };

    const prevCard = () => {
        if (currentCardIndex > 0) {
            setCurrentCardIndex(currentCardIndex - 1);
            setIsFlipped(false);
        }
    };

    const flipCard = () => {
        setIsFlipped(!isFlipped);
    };

    const resetCards = () => {
        setCurrentCardIndex(0);
        setIsFlipped(false);
    };

    // Filter flashcards based on search
    const filteredFlashcards = flashcards.filter(card =>
        card.front.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.back.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const currentCard = filteredFlashcards[currentCardIndex];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Đang tải thẻ ghi nhớ...</p>
                </div>
            </div>
        );
    }

    // Show CreateFlashcardSet if showCreateSet is true
    if (showCreateSet) {
        return (
            <CreateFlashcardSet
                onBack={() => setShowCreateSet(false)}
                studySetId={studySetId}
                studySetName={studySetName}
                isCollapsed={isCollapsed}
            />
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Application Header - Luôn hiện */}
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

            {/* Scrollable Main Content */}
            <div className={`flex-1 pt-16 overflow-y-auto transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-40'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Top Section */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Thẻ ghi nhớ</h1>
                            <p className="text-gray-600">
                                Quản lý, tạo và ôn luyện thẻ ghi nhớ cho bộ học của bạn.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowCreateSet(true)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Tạo bộ thẻ</span>
                        </button>
                    </div>

                    {/* Viewing Flashcards Section */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-4 relative">
                            <span className="text-gray-600">Đang xem thẻ cho</span>
                            <button onClick={() => setShowStudySetDropdown(v => !v)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
                                <span>{selectedStudySetName}</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {showStudySetDropdown && (
                                <div className="absolute top-full mt-2 left-0 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-3">
                                    <div className="text-sm font-semibold text-gray-700 mb-2">Bộ học của bạn</div>
                                    <div className="mb-2">
                                        <input
                                            value={studySetSearch}
                                            onChange={(e) => setStudySetSearch(e.target.value)}
                                            placeholder="Tìm bộ học..."
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {(studySetSearch ? allUserStudySets.filter(ss => ss.name.toLowerCase().includes(studySetSearch.toLowerCase())) : allUserStudySets).map(ss => (
                                            <button
                                                key={ss.id}
                                                onClick={() => { setSelectedStudySetId(String(ss.id)); setSelectedStudySetName(ss.name); setShowStudySetDropdown(false); }}
                                                className={`w-full text-left px-3 py-2 rounded hover:bg-gray-50 ${String(ss.id) === String(selectedStudySetId) ? 'bg-blue-50' : ''}`}
                                            >
                                                {ss.name}
                                            </button>
                                        ))}
                                        {allUserStudySets.length === 0 && (
                                            <div className="text-sm text-gray-500 px-2 py-1">Không có bộ học</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center space-x-4">
                            <button onClick={() => setShowCreateFolder(true)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                Tạo thư mục
                            </button>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm..."
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>
                    </div>

                    {/* Folders Section */}
                    {folders.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">Thư mục</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {folders.map(folder => (
                                    <div
                                        key={folder.id}
                                        className="border border-gray-200 rounded-xl bg-white p-4 shadow-sm cursor-pointer"
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => onDropToFolder(folder.id, e)}
                                        onClick={() => setViewingFolderId(folder.id)}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-6 h-6 rounded" style={{ backgroundColor: folder.color }}></div>
                                                <div className="font-semibold text-gray-900">{folder.name}</div>
                                            </div>
                                            <div className="text-xs text-gray-500">{folder.setIds.length} bộ thẻ</div>
                                        </div>
                                        {/* Hidden list of set ids; no direct display */}
                                        <div className="text-xs text-gray-400 mt-2">Kéo thả bộ thẻ vào đây để thêm</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Folder filter chip */}
                    {viewingFolderId !== null && (
                        <div className="mb-4 flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Đang lọc theo thư mục:</span>
                            <div className="px-2 py-1 rounded-lg border text-sm flex items-center space-x-2">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: (folders.find(f => f.id === viewingFolderId)?.color) || '#ddd' }} />
                                <span>{folders.find(f => f.id === viewingFolderId)?.name || ''}</span>
                                <button onClick={() => setViewingFolderId(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                            </div>
                        </div>
                    )}

                    {/* Flashcard Sets Grid */}
                    <div className="mb-10">
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">Danh sách bộ thẻ ghi nhớ</h2>
                        {(() => {
                            const folder = viewingFolderId !== null ? folders.find(f => f.id === viewingFolderId) : null;
                            const list = folder ? studySets.filter(s => folder?.setIds.includes(s.id)) : studySets;
                            return list.length === 0 ? (
                                <p className="text-gray-500">Không có bộ thẻ nào.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {list.map((s) => (
                                        <div
                                            key={s.id}
                                            className="border border-gray-200 rounded-xl bg-white p-4 shadow-sm hover:shadow transition cursor-pointer"
                                            onClick={() => openFlashcardSet(Number(s.id))}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => { if (e.key === 'Enter') openFlashcardSet(Number(s.id)); }}
                                            draggable
                                            onDragStart={(e) => e.dataTransfer.setData('text/plain', String(s.id))}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                                                        <img src={(process.env.PUBLIC_URL || '') + '/card.png'} alt="" className="w-5 h-5 object-contain" />
                                                    </div>
                                                    <div>
                                                        {editingSetId === s.id ? (
                                                            <div className="flex items-center space-x-2">
                                                                <input value={editingName} onChange={e => setEditingName(e.target.value)} className="border rounded px-2 py-1 text-gray-900" style={{ width: 200 }} />
                                                                <button className="text-blue-600 hover:underline" onClick={() => saveEditSet(s.id)}>Lưu</button>
                                                                <button className="text-gray-400 hover:text-red-500" onClick={cancelEditSet}>Hủy</button>
                                                            </div>
                                                        ) : (
                                                            <div className="font-semibold text-gray-900">{s.name}</div>
                                                        )}
                                                        <div className="text-xs text-gray-500">{flashcardCounts[s.id] ?? 0} Flashcards</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <button title="Sửa" className="p-2 text-gray-500 hover:text-gray-800" onClick={(e) => { e.stopPropagation(); try { sessionStorage.setItem('editingFlashcardSetId', String(s.id)); } catch { } setShowCreateSet(true); }}><Pencil className="w-4 h-4" /></button>
                                                    <button title="Xóa" className="p-2 text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); deleteSet(s.id); }}><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Empty State - only show when there is no flashcard set */}
                    {studySets.length === 0 && (
                        <div className="text-center py-20">
                            <div className="w-24 h-24 mx-auto mb-6 relative">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-16 h-16 bg-yellow-400 rounded-lg transform rotate-12"></div>
                                    <div className="w-16 h-16 bg-teal-400 rounded-lg transform -rotate-6 absolute"></div>
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-900 mb-4">Flashcards</h3>
                            <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
                                Generate flashcards from your materials to practice memorizing concepts.
                            </p>
                            <button
                                onClick={() => setShowCreateSet(true)}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg flex items-center space-x-2 mx-auto transition-colors text-lg"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Create New</span>
                            </button>
                        </div>
                    )}


                    {/* Calendar Grid */}
                    <div className="mt-16">
                        <div className="flex items-center justify-center mb-6">
                            <button className="p-2 text-gray-400 hover:text-gray-600">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <h3 className="text-2xl font-bold text-gray-900 mx-6">2025</h3>
                            <button className="p-2 text-gray-400 hover:text-gray-600">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-12 gap-4">
                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => (
                                <div key={month} className="text-center">
                                    <div className="text-sm font-medium text-gray-600 mb-2">{month}</div>
                                    <div className="grid grid-cols-7 gap-1">
                                        {Array.from({ length: 30 }, (_, i) => (
                                            <div
                                                key={i}
                                                className={`w-2 h-2 rounded-sm ${month === 'Nov' && i === 15
                                                    ? 'bg-green-500'
                                                    : 'bg-gray-200'
                                                    }`}
                                            ></div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tạo thẻ ghi nhớ mới</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tài liệu nguồn
                                </label>
                                <select
                                    value={selectedMaterial?.id || ''}
                                    onChange={(e) => {
                                        const material = materials.find(m => m.id === parseInt(e.target.value));
                                        setSelectedMaterial(material || null);
                                    }}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    {materials.map((material) => (
                                        <option key={material.id} value={material.id}>
                                            {material.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mặt trước
                                </label>
                                <textarea
                                    value={newCard.front}
                                    onChange={(e) => setNewCard(prev => ({ ...prev, front: e.target.value }))}
                                    placeholder="Nhập câu hỏi hoặc từ khóa..."
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mặt sau
                                </label>
                                <textarea
                                    value={newCard.back}
                                    onChange={(e) => setNewCard(prev => ({ ...prev, back: e.target.value }))}
                                    placeholder="Nhập câu trả lời hoặc định nghĩa..."
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={createFlashcard}
                                disabled={!newCard.front.trim() || !newCard.back.trim() || !selectedMaterial}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            >
                                Tạo thẻ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Folder Modal */}
            {showCreateFolder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tạo thư mục</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tên thư mục</label>
                                <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Nhập tên thư mục" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Màu thư mục</label>
                                <input type="color" value={newFolderColor} onChange={(e) => setNewFolderColor(e.target.value)} className="w-12 h-10 p-0 border border-gray-300 rounded" />
                            </div>
                        </div>
                        <div className="flex items-center justify-end space-x-3 mt-6">
                            <button onClick={() => setShowCreateFolder(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">Hủy</button>
                            <button onClick={createFolder} disabled={!newFolderName.trim()} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors">Tạo</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Flashcards;

