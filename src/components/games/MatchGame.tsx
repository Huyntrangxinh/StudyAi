import React, { useState, useEffect } from 'react';
import { CheckCircle2, RotateCcw, ArrowLeft, Play } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

export interface MatchGameProps {
    gameData?: {
        id: number;
        content?: {
            pairs: Array<{ key: string; value: string }>;
        };
    };
}

const MatchGame: React.FC<MatchGameProps> = ({ gameData: propGameData }) => {
    const navigate = useNavigate();
    const location = useLocation();
    // Ưu tiên propGameData, sau đó location.state, cuối cùng là lấy từ URL
    const gameData = propGameData || location.state?.gameData || (location.pathname.match(/\/game\/(\d+)/) ? { id: parseInt(location.pathname.match(/\/game\/(\d+)/)![1], 10) } : null);

    const [pairs, setPairs] = useState<Array<{ key: string; value: string }>>([]);
    const [keys, setKeys] = useState<string[]>([]);
    const [values, setValues] = useState<string[]>([]);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [selectedValue, setSelectedValue] = useState<string | null>(null);
    const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
    const [correctMatches, setCorrectMatches] = useState<Set<string>>(new Set()); // Track correct matches for green animation
    const [wrongMatches, setWrongMatches] = useState<Set<string>>(new Set()); // Track wrong matches for red animation
    const [score, setScore] = useState(0);
    const [attempts, setAttempts] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isReady, setIsReady] = useState(false); // Ready to play screen
    const [startTime, setStartTime] = useState(Date.now());

    useEffect(() => {
        console.log('MatchGame useEffect - gameData:', gameData);
        console.log('MatchGame useEffect - location.state:', location.state);
        console.log('MatchGame useEffect - location.pathname:', location.pathname);

        // Reset state khi load game mới
        setPairs([]);
        setKeys([]);
        setValues([]);
        setSelectedKey(null);
        setSelectedValue(null);
        setMatchedPairs(new Set());
        setCorrectMatches(new Set());
        setWrongMatches(new Set());
        setScore(0);
        setAttempts(0);
        setIsLoading(true);
        setIsReady(false);

        // Ưu tiên: location.state.gameData (game mới được tạo) > propGameData > URL gameId
        const stateGameData = location.state?.gameData;
        const finalGameData = stateGameData || gameData;

        // Nếu có content.pairs trong gameData từ state, dùng luôn (game mới)
        if (stateGameData?.content?.pairs && Array.isArray(stateGameData.content.pairs) && stateGameData.content.pairs.length > 0) {
            console.log('Using gameData from location.state (new game), pairs count:', stateGameData.content.pairs.length);
            setPairs(stateGameData.content.pairs);
            shuffleAndSetCards(stateGameData.content.pairs);
            setIsLoading(false);
        }
        // Nếu có content.pairs trong propGameData, dùng luôn
        else if (finalGameData?.content?.pairs && Array.isArray(finalGameData.content.pairs) && finalGameData.content.pairs.length > 0) {
            console.log('Using gameData from props, pairs count:', finalGameData.content.pairs.length);
            setPairs(finalGameData.content.pairs);
            shuffleAndSetCards(finalGameData.content.pairs);
            setIsLoading(false);
        }
        // Nếu có gameId, fetch từ API
        else if (finalGameData?.id) {
            console.log('Fetching game data from API, gameId:', finalGameData.id);
            fetchGameData(finalGameData.id);
        }
        // Nếu không có gameData, thử lấy từ URL
        else {
            const gameIdMatch = location.pathname.match(/\/game\/(\d+)/);
            if (gameIdMatch) {
                const gameId = parseInt(gameIdMatch[1], 10);
                console.log('Extracting gameId from URL:', gameId);
                fetchGameData(gameId);
            } else {
                console.error('No game data found:', { gameData, locationState: location.state, pathname: location.pathname });
                toast.error('Không tìm thấy dữ liệu game');
                setTimeout(() => {
                    navigate('/dashboard/arcade');
                }, 2000);
            }
        }
    }, [location.pathname, location.state]);

    const fetchGameData = async (gameId: number) => {
        try {
            console.log('Fetching game data for ID:', gameId);
            const response = await fetch(`http://localhost:3001/api/games/${gameId}`);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API error response:', errorText);
                throw new Error(`Không thể tải game: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            console.log('Fetched game data:', data);
            console.log('Content pairs:', data.content?.pairs);

            if (!data.content || !data.content.pairs || !Array.isArray(data.content.pairs) || data.content.pairs.length === 0) {
                throw new Error('Game data không hợp lệ hoặc không có pairs');
            }

            setPairs(data.content.pairs);
            shuffleAndSetCards(data.content.pairs);
            setIsLoading(false);
        } catch (error: any) {
            console.error('Fetch game error:', error);
            toast.error(error.message || 'Không thể tải game');
            setTimeout(() => {
                navigate('/dashboard/arcade');
            }, 2000);
        }
    };

    const shuffleAndSetCards = (pairsData: Array<{ key: string; value: string }>) => {
        const shuffledKeys = [...pairsData.map(p => p.key)].sort(() => Math.random() - 0.5);
        const shuffledValues = [...pairsData.map(p => p.value)].sort(() => Math.random() - 0.5);
        setKeys(shuffledKeys);
        setValues(shuffledValues);
    };

    const handleKeyClick = (key: string) => {
        if (matchedPairs.has(key)) return;

        if (selectedKey === key) {
            setSelectedKey(null);
        } else {
            setSelectedKey(key);
            if (selectedValue) {
                checkMatch(key, selectedValue);
            }
        }
    };

    const handleValueClick = (value: string) => {
        const isMatched = Array.from(matchedPairs).some(k => {
            const pair = pairs.find(p => p.key === k);
            return pair?.value === value;
        });
        if (isMatched) return;

        if (selectedValue === value) {
            setSelectedValue(null);
        } else {
            setSelectedValue(value);
            if (selectedKey) {
                checkMatch(selectedKey, value);
            }
        }
    };

    const checkMatch = (key: string, value: string) => {
        const pair = pairs.find(p => p.key === key && p.value === value);
        setAttempts(prev => prev + 1);

        if (pair) {
            // Match đúng - hiển thị màu xanh lá rồi biến mất
            setScore(prev => prev + 10);
            toast.success('Đúng rồi! 🎉', { duration: 1000 });

            // Hiển thị màu xanh lá
            const correctKey = `correct-${key}-${value}`;
            setCorrectMatches(prev => {
                const newSet = new Set(prev);
                newSet.add(correctKey);
                return newSet;
            });

            // Sau 800ms, ẩn thẻ và thêm vào matchedPairs
            setTimeout(() => {
                setMatchedPairs(prev => {
                    const newSet = new Set(prev);
                    newSet.add(key);

                    // Kiểm tra hoàn thành
                    if (newSet.size === pairs.length) {
                        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
                        setTimeout(() => {
                            setScore(currentScore => {
                                const finalScore = currentScore;
                                toast.success(`Hoàn thành! Điểm: ${finalScore}`, { duration: 3000 });
                                saveGameSession(finalScore, timeSpent);
                                return finalScore;
                            });
                        }, 500);
                    }

                    return newSet;
                });
                setCorrectMatches(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(correctKey);
                    return newSet;
                });
                setSelectedKey(null);
                setSelectedValue(null);
            }, 800);
        } else {
            // Match sai - hiển thị màu đỏ trong 1 giây
            const wrongKey = `wrong-${key}-${value}`;
            setWrongMatches(prev => {
                const newSet = new Set(prev);
                newSet.add(wrongKey);
                return newSet;
            });

            toast.error('Không khớp! Thử lại nhé', { duration: 1000 });

            // Sau 1 giây, reset về bình thường
            setTimeout(() => {
                setWrongMatches(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(wrongKey);
                    return newSet;
                });
                setSelectedKey(null);
                setSelectedValue(null);
            }, 1000);
        }
    };

    const saveGameSession = async (finalScore: number, timeSpent: number) => {
        if (!gameData?.id) return;

        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            await fetch(`http://localhost:3001/api/games/${gameData.id}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    score: finalScore,
                    completed: true,
                    timeSpent: timeSpent
                })
            });
        } catch (error) {
            console.error('Save game session error:', error);
        }
    };

    const resetGame = () => {
        setMatchedPairs(new Set());
        setCorrectMatches(new Set());
        setWrongMatches(new Set());
        setScore(0);
        setAttempts(0);
        setSelectedKey(null);
        setSelectedValue(null);
        shuffleAndSetCards(pairs);
    };

    const handleStartGame = () => {
        setIsReady(true);
        setStartTime(Date.now());
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Đang tải game...</p>
                </div>
            </div>
        );
    }

    // Ready to Play Screen - chỉ hiển thị khi đã có data
    if (!isReady && pairs.length > 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="max-w-2xl w-full px-6">
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                        <h1 className="text-5xl font-bold text-purple-700 mb-6">Ready to Play</h1>
                        <div className="space-y-4 mb-8">
                            <p className="text-lg text-gray-700">
                                Match all the terms with their definitions as fast as you can.
                            </p>
                            <p className="text-lg text-gray-700">
                                Avoid wrong matches!
                            </p>
                        </div>
                        <button
                            onClick={handleStartGame}
                            className="bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xl px-12 py-4 rounded-xl transition-all transform hover:scale-105 shadow-lg"
                        >
                            <div className="flex items-center justify-center space-x-2">
                                <Play className="w-6 h-6" fill="currentColor" />
                                <span>Start</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Nếu chưa có data nhưng đã ready, hiển thị game (có thể data đang load)
    if (isReady && pairs.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Đang tải dữ liệu game...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => navigate('/dashboard/arcade')}
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Quay lại</span>
                    </button>
                    <div className="flex items-center space-x-6">
                        <div className="text-lg">
                            <span className="font-semibold text-gray-700">Điểm:</span>{' '}
                            <span className="text-blue-600 font-bold">{score}</span>
                        </div>
                        <div className="text-lg">
                            <span className="font-semibold text-gray-700">Lần thử:</span>{' '}
                            <span className="text-gray-600">{attempts}</span>
                        </div>
                        <button
                            onClick={resetGame}
                            className="flex items-center space-x-2 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span>Chơi lại</span>
                        </button>
                    </div>
                </div>

                {/* Game Title */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Match Game</h1>
                    <p className="text-gray-600">Ghép cặp từ khóa với định nghĩa đúng</p>
                </div>

                {/* Game Board */}
                {pairs.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">Không có dữ liệu game. Vui lòng tạo game mới.</p>
                        <button
                            onClick={() => navigate('/dashboard/arcade')}
                            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Quay lại
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Keys Column */}
                        <div>
                            <h3 className="text-xl font-semibold mb-4 text-gray-800">Từ khóa</h3>
                            <div className="space-y-3">
                                {keys.length === 0 ? (
                                    <p className="text-gray-500">Đang tải...</p>
                                ) : (
                                    keys.map((key) => {
                                        const isMatched = matchedPairs.has(key);
                                        const isSelected = selectedKey === key;
                                        const isCorrect = Array.from(correctMatches).some(c => c.includes(key));
                                        const isWrong = Array.from(wrongMatches).some(w => w.includes(key));

                                        return (
                                            <button
                                                key={key}
                                                onClick={() => handleKeyClick(key)}
                                                disabled={isMatched}
                                                className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-300 ${isMatched
                                                    ? 'bg-green-100 border-green-500 opacity-0 scale-0 pointer-events-none'
                                                    : isCorrect
                                                        ? 'bg-green-100 border-green-500 shadow-md'
                                                        : isWrong
                                                            ? 'bg-red-100 border-red-500 shadow-md'
                                                            : isSelected
                                                                ? 'bg-blue-100 border-blue-500 shadow-md'
                                                                : 'bg-white border-gray-300 hover:border-blue-400 hover:shadow-sm'
                                                    }`}
                                                style={{
                                                    transition: isMatched ? 'opacity 0.3s, transform 0.3s' : 'all 0.3s'
                                                }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-gray-900">{key}</span>
                                                    {(isMatched || isCorrect) && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />}
                                                </div>
                                            </button>
                                        );
                                    }))}
                            </div>
                        </div>

                        {/* Values Column */}
                        <div>
                            <h3 className="text-xl font-semibold mb-4 text-gray-800">Định nghĩa</h3>
                            <div className="space-y-3">
                                {values.length === 0 ? (
                                    <p className="text-gray-500">Đang tải...</p>
                                ) : (
                                    values.map((value) => {
                                        const matchedKey = Array.from(matchedPairs).find(k => {
                                            const pair = pairs.find(p => p.key === k);
                                            return pair?.value === value;
                                        });
                                        const isMatched = !!matchedKey;
                                        const isSelected = selectedValue === value;
                                        const isCorrect = Array.from(correctMatches).some(c => c.includes(value));
                                        const isWrong = Array.from(wrongMatches).some(w => w.includes(value));

                                        return (
                                            <button
                                                key={value}
                                                onClick={() => handleValueClick(value)}
                                                disabled={isMatched}
                                                className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-300 ${isMatched
                                                    ? 'bg-green-100 border-green-500 opacity-0 scale-0 pointer-events-none'
                                                    : isCorrect
                                                        ? 'bg-green-100 border-green-500 shadow-md'
                                                        : isWrong
                                                            ? 'bg-red-100 border-red-500 shadow-md'
                                                            : isSelected
                                                                ? 'bg-blue-100 border-blue-500 shadow-md'
                                                                : 'bg-white border-gray-300 hover:border-blue-400 hover:shadow-sm'
                                                    }`}
                                                style={{
                                                    transition: isMatched ? 'opacity 0.3s, transform 0.3s' : 'all 0.3s'
                                                }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-700">{value}</span>
                                                    {(isMatched || isCorrect) && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />}
                                                </div>
                                            </button>
                                        );
                                    }))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Progress Indicator */}
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Tiến độ</span>
                        <span className="text-sm text-gray-600">
                            {matchedPairs.size} / {pairs.length}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(matchedPairs.size / pairs.length) * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MatchGame;

