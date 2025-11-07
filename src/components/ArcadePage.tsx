import React, { useState } from 'react';
import { Lightbulb, Play, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

interface ArcadePageProps {
    studySetId?: string | number;
    onBack?: () => void;
    isCollapsed?: boolean;
}

const ArcadePage: React.FC<ArcadePageProps> = ({ studySetId, onBack, isCollapsed = false }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [inputMethod, setInputMethod] = useState<'topic' | 'materials' | 'flashcards'>('topic');
    const [topic, setTopic] = useState('');
    const [selectedGame, setSelectedGame] = useState<string | null>(null);
    const [style, setStyle] = useState('');
    const [isCreating, setIsCreating] = useState(false);

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

        if (inputMethod === 'materials' && !studySetId) {
            toast.error('Vui lòng chọn một bộ học có tài liệu');
            return;
        }

        if (!user) {
            toast.error('Vui lòng đăng nhập để tạo game');
            return;
        }

        setIsCreating(true);

        try {
            toast.loading('Game đang được tạo...', { id: 'creating-game' });

            const response = await fetch('http://localhost:3001/api/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    studySetId: studySetId || null,
                    gameType: selectedGame,
                    topic: topic.trim(),
                    style: style.trim() || null,
                    inputMethod: inputMethod
                })
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

    const contentOffsetClass = isCollapsed ? 'ml-16' : 'ml-64';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Content */}
            <div className={`flex-1 bg-gray-50 min-h-screen transition-all duration-300 ${contentOffsetClass}`}>
                <div className="max-w-4xl py-4 px-4 sm:px-6 lg:px-8">
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
                            </div>
                        </div>

                        {/* Input Field */}
                        <div className="mb-4">
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
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-blue-900 text-xs">
                                        Tài liệu sẽ được tải từ bộ học đã chọn. Bạn có thể chọn tài liệu cụ thể sau khi chọn game.
                                    </p>
                                </div>
                            )}
                            {inputMethod === 'flashcards' && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-blue-900 text-xs">
                                        Flashcards sẽ được tải từ bộ học đã chọn. Bạn có thể chọn set cụ thể sau khi chọn game.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Game Selection */}
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

                        {/* Style Game (Optional) */}
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

                        {/* Create Game Button */}
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArcadePage;