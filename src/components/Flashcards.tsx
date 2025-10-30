import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Plus, Search, RotateCcw, ChevronLeft, ChevronRight, Eye, EyeOff, FileText, Share, Link, Upload, Bell } from 'lucide-react';
import CreateFlashcardSet from './CreateFlashcardSet';

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

    // Load flashcards and materials
    useEffect(() => {
        loadFlashcards();
        loadMaterials();
    }, [studySetId]);

    // Load study sets for current user and log them
    useEffect(() => {
        const loadStudySets = async () => {
            if (!user?.id) return;
            try {
                const res = await fetch(`http://localhost:3001/api/study-sets?userId=${encodeURIComponent(user.id)}`);
                if (!res.ok) {
                    console.error('Failed to load study sets');
                    return;
                }
                const data: StudySet[] = await res.json();
                console.log('flashcard_sets (study_sets) data:', data);
                setStudySets(data || []);
            } catch (err) {
                console.error('Error loading study sets:', err);
            }
        };
        loadStudySets();
    }, [user]);

    const loadFlashcards = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`http://localhost:3001/api/flashcards/${studySetId}`);
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
            const response = await fetch(`http://localhost:3001/api/materials/${studySetId}`);
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
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Flashcards</h1>
                            <p className="text-gray-600">
                                Manage, create, and review flashcards for your study set.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowCreateSet(true)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create Flashcard Set</span>
                        </button>
                    </div>

                    {/* Viewing Flashcards Section */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-4">
                            <span className="text-gray-600">Viewing Flashcards for</span>
                            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
                                <span>{studySetName}</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                View All
                            </button>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                Combine
                            </button>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>
                    </div>

                    {/* Flashcard Sets List (from study_sets) */}
                    <div className="mb-10">
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">Danh sách bộ thẻ (flashcard_sets)</h2>
                        {studySets.length === 0 ? (
                            <p className="text-gray-500">Không có bộ thẻ nào.</p>
                        ) : (
                            <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                                {studySets.map((s) => (
                                    <li key={s.id} className="px-4 py-3 flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                                            <div>
                                                <div className="font-medium text-gray-900">{s.name}</div>
                                                <div className="text-sm text-gray-500">{s.description}</div>
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-400">ID: {s.id}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Main Content Area - Always show the center section */}
                    <div className="text-center py-20">
                        {/* Overlapping squares icon */}
                        <div className="w-24 h-24 mx-auto mb-6 relative">
                            <div className="absolute inset-0 flex items-center justify-center">
                                {/* Bottom square (yellow/orange) */}
                                <div className="w-16 h-16 bg-yellow-400 rounded-lg transform rotate-12"></div>
                                {/* Top square (teal/mint) */}
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
        </div>
    );
};

export default Flashcards;

