import React, { useState, useEffect } from 'react';
import { Lightbulb, Play, HelpCircle, FileText, Search, Upload, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

interface ArcadePageProps {
    studySetId?: string | number;
    onBack?: () => void;
    isCollapsed?: boolean;
    isDarkMode?: boolean;
}

interface Material {
    id: number;
    name: string;
    file_path?: string;
    created_at?: string;
}

interface FlashcardSet {
    id: number;
    name: string;
    study_set_id: string;
    created_at?: string;
}

const ArcadePage: React.FC<ArcadePageProps> = ({ studySetId, onBack, isCollapsed = false, isDarkMode = false }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [inputMethod, setInputMethod] = useState<'topic' | 'materials' | 'flashcards' | 'myGames'>('topic');
    const [topic, setTopic] = useState('');
    const [selectedGame, setSelectedGame] = useState<string | null>(null);
    const [style, setStyle] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Materials state
    const [materials, setMaterials] = useState<Material[]>([]);
    const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
    const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<number>>(new Set());
    const [materialSearchTerm, setMaterialSearchTerm] = useState('');

    // Flashcard sets state
    const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
    const [isLoadingFlashcardSets, setIsLoadingFlashcardSets] = useState(false);
    const [selectedFlashcardSetIds, setSelectedFlashcardSetIds] = useState<Set<number>>(new Set());
    const [flashcardSearchTerm, setFlashcardSearchTerm] = useState('');

    const [myGames, setMyGames] = useState<any[]>([]);
    const [isLoadingMyGames, setIsLoadingMyGames] = useState(false);
    const [deletingGameId, setDeletingGameId] = useState<number | null>(null);

    const gameTypes = [
        {
            id: 'match',
            name: 'Match Game',
            preview: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop',
            description: 'Ghép cặp đúng để giành điểm',
            color: 'from-blue-500 to-blue-600'
        },
        {
            id: 'city_run',
            name: 'City Run',
            preview: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop',
            description: 'Chạy qua thành phố và trả lời câu hỏi',
            color: 'from-red-500 to-red-600'
        },
        {
            id: 'rocket_defender',
            name: 'Rocket Defender',
            preview: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=400&h=300&fit=crop',
            description: 'Bảo vệ trái đất bằng cách trả lời đúng',
            color: 'from-pink-500 to-pink-600'
        },
        {
            id: 'platform_jump',
            name: 'Platform Jump',
            preview: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=300&fit=crop',
            description: 'Nhảy qua các platform và vượt qua thử thách',
            color: 'from-purple-500 to-purple-600'
        },
        {
            id: 'track_race',
            name: 'Track Race',
            preview: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=300&fit=crop',
            description: 'Đua tốc độ với bạn bè',
            multiplayer: true,
            color: 'from-orange-500 to-orange-600'
        },
        {
            id: 'jetpack_quiz',
            name: 'Jetpack Quiz',
            preview: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=300&fit=crop',
            description: 'Bay lên bầu trời với kiến thức của bạn',
            color: 'from-teal-500 to-teal-600'
        },
        {
            id: 'cloud_bridge',
            name: 'Cloud Bridge',
            preview: 'https://images.unsplash.com/photo-1517685352821-92cf88aee5a5?w=400&h=300&fit=crop',
            description: 'Xây cầu mây bằng cách trả lời đúng',
            color: 'from-cyan-500 to-cyan-600'
        },
        {
            id: 'quiz_with_friends',
            name: 'Quiz With Friends',
            preview: 'https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=400&h=300&fit=crop',
            description: 'Thi đấu với bạn bè',
            multiplayer: true,
            color: 'from-indigo-500 to-indigo-600'
        }
    ];

    const handleCreateGame = async () => {
        if (!selectedGame) {
            toast.error('Vui lòng chọn một loại game');
            return;
        }

        if (inputMethod === 'topic' && !topic.trim()) {
            toast.error('Vui lòng nhập chủ đề');
            return;
        }

        if (inputMethod === 'materials') {
            if (!studySetId) {
                toast.error('Vui lòng chọn một bộ học có tài liệu');
                return;
            }
            if (selectedMaterialIds.size === 0) {
                toast.error('Vui lòng chọn ít nhất một tài liệu');
                return;
            }
        }

        if (inputMethod === 'flashcards') {
            if (!studySetId) {
                toast.error('Vui lòng chọn một bộ học có flashcard sets');
                return;
            }
            if (selectedFlashcardSetIds.size === 0) {
                toast.error('Vui lòng chọn ít nhất một flashcard set');
                return;
            }
        }

        if (!user) {
            toast.error('Vui lòng đăng nhập để tạo game');
            return;
        }

        setIsCreating(true);

        try {
            toast.loading('Game đang được tạo...', { id: 'creating-game' });

            const requestBody: any = {
                userId: user.id,
                studySetId: studySetId || null,
                gameType: selectedGame,
                topic: inputMethod === 'topic' ? topic.trim() : null,
                style: style.trim() || null,
                inputMethod: inputMethod
            };

            if (inputMethod === 'materials') {
                requestBody.materialIds = Array.from(selectedMaterialIds);
            }

            if (inputMethod === 'flashcards') {
                requestBody.flashcardSetIds = Array.from(selectedFlashcardSetIds);
            }

            const response = await fetch('http://localhost:3001/api/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }).catch((fetchError) => {
                // Network error - server có thể chưa chạy
                console.error('Network error:', fetchError);
                throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra xem server đã chạy chưa (port 3001).');
            });

            if (!response.ok) {
                let errorMessage = 'Không thể tạo game';
                try {
                    const error = await response.json();
                    errorMessage = error.error || errorMessage;
                } catch (parseError) {
                    errorMessage = `Lỗi server: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            toast.success('Game đã được tạo thành công!', { id: 'creating-game' });

            // Navigate to game play screen
            navigate(`/dashboard/arcade/game/${data.id}`, {
                state: { gameData: data }
            });
        } catch (error: any) {
            console.error('Create game error:', error);
            const errorMessage = error.message || 'Không thể tạo game. Vui lòng thử lại.';
            toast.error(errorMessage, { id: 'creating-game', duration: 5000 });
        } finally {
            setIsCreating(false);
        }
    };

    useEffect(() => {
        if (!selectedGame && gameTypes.length > 0) {
            setSelectedGame(gameTypes[0].id);
        }
    }, [selectedGame]);

    // Load materials for study set
    useEffect(() => {
        if (inputMethod === 'materials' && studySetId) {
            loadMaterials();
        }
    }, [inputMethod, studySetId]);

    // Load flashcard sets for study set
    useEffect(() => {
        if (inputMethod === 'flashcards' && studySetId) {
            loadFlashcardSets();
        }
    }, [inputMethod, studySetId]);

    useEffect(() => {
        if (inputMethod === 'myGames' && studySetId) {
            loadMyGames();
        }
    }, [inputMethod, studySetId]);

    const loadMaterials = async () => {
        if (!studySetId) return;
        try {
            setIsLoadingMaterials(true);
            const res = await fetch(`http://localhost:3001/api/materials/${studySetId}`);
            if (res.ok) {
                const data = await res.json();
                setMaterials(Array.isArray(data) ? data : []);
            } else {
                setMaterials([]);
            }
        } catch (error) {
            console.error('Error loading materials:', error);
            setMaterials([]);
        } finally {
            setIsLoadingMaterials(false);
        }
    };

    const loadFlashcardSets = async () => {
        if (!studySetId) return;
        try {
            setIsLoadingFlashcardSets(true);
            const res = await fetch('http://localhost:3001/api/flashcard-sets');
            if (res.ok) {
                const data = await res.json();
                const filtered = Array.isArray(data)
                    ? data.filter((set: any) => String(set.study_set_id) === String(studySetId))
                    : [];
                setFlashcardSets(filtered);
            } else {
                setFlashcardSets([]);
            }
        } catch (error) {
            console.error('Error loading flashcard sets:', error);
            setFlashcardSets([]);
        } finally {
            setIsLoadingFlashcardSets(false);
        }
    };

    const loadMyGames = async () => {
        if (!studySetId) return;
        try {
            setIsLoadingMyGames(true);
            const params = new URLSearchParams();
            params.append('studySetId', String(studySetId));
            if (user?.id) {
                params.append('userId', String(user.id));
            }
            const res = await fetch(`http://localhost:3001/api/games?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setMyGames(Array.isArray(data) ? data : []);
            } else {
                setMyGames([]);
            }
        } catch (error) {
            console.error('Error loading games:', error);
            setMyGames([]);
        } finally {
            setIsLoadingMyGames(false);
        }
    };

    const handleDeleteGame = async (gameId: number) => {
        if (!window.confirm('Bạn có chắc muốn xóa game này?')) {
            return;
        }
        setDeletingGameId(gameId);
        try {
            const res = await fetch(`http://localhost:3001/api/games/${gameId}`, {
                method: 'DELETE'
            });
            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                throw new Error(error.error || 'Không thể xóa game');
            }
            toast.success('Đã xóa game');
            setMyGames((prev) => prev.filter((game) => String(game.id) !== String(gameId)));
        } catch (error: any) {
            console.error('Delete game error:', error);
            toast.error(error.message || 'Không thể xóa game');
        } finally {
            setDeletingGameId(null);
        }
    };

    const toggleMaterialSelection = (materialId: number) => {
        setSelectedMaterialIds(prev => {
            const next = new Set(prev);
            if (next.has(materialId)) {
                next.delete(materialId);
            } else {
                next.add(materialId);
            }
            return next;
        });
    };

    const toggleFlashcardSetSelection = (flashcardSetId: number) => {
        setSelectedFlashcardSetIds(prev => {
            const next = new Set(prev);
            if (next.has(flashcardSetId)) {
                next.delete(flashcardSetId);
            } else {
                next.add(flashcardSetId);
            }
            return next;
        });
    };

    const filteredMaterials = materials.filter(material =>
        material.name?.toLowerCase().includes(materialSearchTerm.toLowerCase())
    );

    const filteredFlashcardSets = flashcardSets.filter(set =>
        set.name?.toLowerCase().includes(flashcardSearchTerm.toLowerCase())
    );

    return (
        <div
            className={`min-h-screen w-full transition-all duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
        >
            {/* Content */}
            <div className="min-h-screen">
                <div className="w-full flex justify-center">
                    <div className="max-w-4xl w-full py-4 px-4 sm:px-6 lg:px-8">
                        {/* Header */}
                        <div className="mb-4 text-center">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                                <img
                                    src="/cautruot.gif"
                                    alt="Game controller"
                                    className="w-16 h-16 object-contain"
                                />
                                <h1 className="text-3xl font-bold">
                                    Biến tài liệu của bạn thành <span className="text-blue-600">Games</span>
                                </h1>
                            </div>
                            <p className="text-sm text-gray-600">
                                Chuyển đổi tài liệu học tập của bạn thành các trò chơi tương tác thú vị với PDF to Game
                            </p>
                        </div>

                        {/* Main Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            {/* Input Method Tabs */}
                            <div className="mb-3">
                                <div className="flex space-x-1 border-b border-gray-200">
                                    <button
                                        onClick={() => setInputMethod('topic')}
                                        className={`px-4 py-2 font-medium text-xs transition-colors relative ${inputMethod === 'topic'
                                            ? 'text-blue-600'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        Nhập chủ đề
                                        {inputMethod === 'topic' && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setInputMethod('materials')}
                                        className={`px-4 py-2 font-medium text-xs transition-colors relative ${inputMethod === 'materials'
                                            ? 'text-blue-600'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        Tạo từ tài liệu
                                        {inputMethod === 'materials' && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setInputMethod('flashcards')}
                                        className={`px-4 py-2 font-medium text-xs transition-colors relative ${inputMethod === 'flashcards'
                                            ? 'text-blue-600'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        Tạo từ Flashcards
                                        {inputMethod === 'flashcards' && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setInputMethod('myGames')}
                                        className={`px-4 py-2 font-medium text-xs transition-colors relative ${inputMethod === 'myGames'
                                            ? 'text-blue-600'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        Game của bạn
                                        {inputMethod === 'myGames' && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Input Field */}
                            <div className="mb-4">
                                {inputMethod === 'myGames' && (
                                    <div className="space-y-3">
                                        {!studySetId ? (
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-blue-900 text-xs">
                                                    Vui lòng chọn một bộ học để xem danh sách game của bạn.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {isLoadingMyGames ? (
                                                    <div className="text-center text-sm text-gray-500 py-4">Đang tải game...</div>
                                                ) : myGames.length === 0 ? (
                                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                                                        <p className="text-sm text-gray-500 mb-2">Chưa có game nào cho bộ học này</p>
                                                        <button
                                                            onClick={() => setInputMethod('flashcards')}
                                                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                                        >
                                                            Tạo game mới ngay
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {myGames.map((game) => (
                                                            <div
                                                                key={game.id}
                                                                className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-colors"
                                                            >
                                                                <div className="flex items-center space-x-3">
                                                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 overflow-hidden">
                                                                        <img
                                                                            src="/MatchGame2.gif"
                                                                            alt="Match Game"
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-semibold text-gray-900 text-sm">
                                                                            {game.title || game.game_type}
                                                                        </p>
                                                                        <p className="text-xs text-gray-500">
                                                                            {new Date(game.created_at).toLocaleString('vi-VN')}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="h-px bg-gray-100 my-3" />
                                                                <div className="flex items-center space-x-3">
                                                                    <button
                                                                        onClick={() => navigate(`/dashboard/arcade/game/${game.id}`)}
                                                                        className="flex-1 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                        <span>Play Match Game</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteGame(game.id)}
                                                                        disabled={deletingGameId === game.id}
                                                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors ${deletingGameId === game.id
                                                                            ? 'bg-red-300 cursor-not-allowed'
                                                                            : 'bg-red-500 hover:bg-red-600'
                                                                            }`}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {inputMethod === 'topic' && (
                                    <div className="relative">
                                        <Lightbulb className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            placeholder="Nhập chủ đề để học (ví dụ: 'Cách mạng Mỹ')"
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none text-sm transition-all"
                                        />
                                    </div>
                                )}
                                {inputMethod === 'materials' && (
                                    <div className="space-y-3">
                                        {!studySetId ? (
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-blue-900 text-xs">
                                                    Vui lòng chọn một bộ học để xem tài liệu.
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Search bar and Upload button */}
                                                <div className="flex items-center space-x-2">
                                                    <div className="relative flex-1">
                                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            value={materialSearchTerm}
                                                            onChange={(e) => setMaterialSearchTerm(e.target.value)}
                                                            placeholder="Tìm kiếm tài liệu..."
                                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none text-sm"
                                                        />
                                                    </div>
                                                    <button className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                                                        <Upload className="w-4 h-4" />
                                                        <span>Tải lên</span>
                                                    </button>
                                                </div>

                                                {/* Materials list */}
                                                {isLoadingMaterials ? (
                                                    <div className="text-center py-4 text-sm text-gray-500">Đang tải tài liệu...</div>
                                                ) : filteredMaterials.length === 0 ? (
                                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                                                        <p className="text-sm text-gray-500 mb-2">Chưa có tài liệu nào</p>
                                                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                                                            Tải lên tài liệu
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {filteredMaterials.map((material) => (
                                                                <div
                                                                    key={material.id}
                                                                    onClick={() => toggleMaterialSelection(material.id)}
                                                                    className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-colors ${selectedMaterialIds.has(material.id)
                                                                        ? 'bg-blue-50 border-2 border-blue-500'
                                                                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                                                                        }`}
                                                                >
                                                                    <FileText className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-xs font-medium text-gray-900 truncate">
                                                                            {material.name || 'Tài liệu không tên'}
                                                                        </p>
                                                                    </div>
                                                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedMaterialIds.has(material.id)
                                                                        ? 'bg-blue-600 border-blue-600'
                                                                        : 'border-gray-300'
                                                                        }`}>
                                                                        {selectedMaterialIds.has(material.id) && (
                                                                            <span className="text-white text-[10px]">✓</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                                {inputMethod === 'flashcards' && (
                                    <div className="space-y-3">
                                        {!studySetId ? (
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-blue-900 text-xs">
                                                    Vui lòng chọn một bộ học để xem flashcard sets.
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Search bar and Create button */}
                                                <div className="flex items-center space-x-2">
                                                    <div className="relative flex-1">
                                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            value={flashcardSearchTerm}
                                                            onChange={(e) => setFlashcardSearchTerm(e.target.value)}
                                                            placeholder="Tìm kiếm flashcard sets..."
                                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none text-sm"
                                                        />
                                                    </div>
                                                    <button className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                                                        <Upload className="w-4 h-4" />
                                                        <span>Tạo Flashcards</span>
                                                    </button>
                                                </div>

                                                {/* Flashcard sets list */}
                                                {isLoadingFlashcardSets ? (
                                                    <div className="text-center py-4 text-sm text-gray-500">Đang tải flashcard sets...</div>
                                                ) : filteredFlashcardSets.length === 0 ? (
                                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                                                        <p className="text-sm text-gray-500 mb-2">Chưa có flashcard set nào</p>
                                                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                                                            Tạo flashcard set
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {filteredFlashcardSets.map((set) => (
                                                                <div
                                                                    key={set.id}
                                                                    onClick={() => toggleFlashcardSetSelection(set.id)}
                                                                    className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-colors ${selectedFlashcardSetIds.has(set.id)
                                                                        ? 'bg-blue-50 border-2 border-blue-500'
                                                                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                                                                        }`}
                                                                >
                                                                    <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                        <FileText className="w-3 h-3 text-white" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-xs font-medium text-gray-900 truncate">
                                                                            {set.name || 'Flashcard set không tên'}
                                                                        </p>
                                                                    </div>
                                                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedFlashcardSetIds.has(set.id)
                                                                        ? 'bg-blue-600 border-blue-600'
                                                                        : 'border-gray-300'
                                                                        }`}>
                                                                        {selectedFlashcardSetIds.has(set.id) && (
                                                                            <span className="text-white text-[10px]">✓</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Game Selection */}
                            {inputMethod !== 'myGames' && (
                                <div className="mb-3">
                                    <h2 className="text-base font-semibold text-gray-900 mb-2">Chọn một Game</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {gameTypes.map((game) => (
                                            <div
                                                key={game.id}
                                                onClick={() => setSelectedGame(game.id)}
                                                className={`relative cursor-pointer rounded-lg overflow-hidden transition-all group ${selectedGame === game.id
                                                    ? 'ring-2 ring-blue-500 ring-offset-1 shadow-lg scale-105'
                                                    : 'hover:shadow-md hover:scale-102'
                                                    }`}
                                            >
                                                {/* Preview Image with Gradient Overlay */}
                                                <div className="relative aspect-video bg-gradient-to-br ${game.color} overflow-hidden">
                                                    <img
                                                        src={game.preview}
                                                        alt={game.name}
                                                        className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                                                    />

                                                    {/* Play Button Overlay */}
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all">
                                                        <div className="w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                            <Play className="w-4 h-4 text-gray-800 ml-0.5" fill="currentColor" />
                                                        </div>
                                                    </div>

                                                    {/* Multiplayer Badge */}
                                                    {game.multiplayer && (
                                                        <div className="absolute top-1.5 right-1.5 bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow-md">
                                                            MP
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Game Info */}
                                                <div className="bg-white p-2">
                                                    <h3 className="font-semibold text-gray-900 text-center mb-0.5 text-xs">{game.name}</h3>
                                                    <p className="text-xs text-gray-600 text-center leading-tight">{game.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Style Game (Optional) */}
                            {inputMethod !== 'myGames' && (
                                <div className="mb-3">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <label className="text-xs font-medium text-gray-700">Tùy chỉnh Game (tùy chọn):</label>
                                        <HelpCircle className="w-3 h-3 text-gray-400" />
                                    </div>
                                    <div className="relative">
                                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                        </svg>
                                        <input
                                            type="text"
                                            value={style}
                                            onChange={(e) => setStyle(e.target.value)}
                                            placeholder="ví dụ: 'Retro 80s', 'Neon Cyberpunk', 'Space Adventure'"
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none text-xs transition-all"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Create Game Button */}
                            {inputMethod !== 'myGames' && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleCreateGame}
                                        disabled={isCreating || !selectedGame}
                                        className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${isCreating || !selectedGame
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg hover:scale-105'
                                            }`}
                                    >
                                        {isCreating ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Đang tạo...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-5 h-5" />
                                                <span>Tạo Game</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArcadePage;