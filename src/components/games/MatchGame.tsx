import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, RotateCcw, ArrowLeft, Play } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { awardXP } from '../../utils/xpHelper';

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
    const [elapsedTime, setElapsedTime] = useState(0);
    const [finalTime, setFinalTime] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(Date.now());

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

    const [allCards, setAllCards] = useState<Array<{ id: string; text: string; type: 'key' | 'value'; pairKey: string; pairValue: string }>>([]);

    const shuffleAndSetCards = (pairsData: Array<{ key: string; value: string }>) => {
        // Tạo tất cả cards (keys + values) và trộn lẫn
        const cards: Array<{ id: string; text: string; type: 'key' | 'value'; pairKey: string; pairValue: string }> = [];

        pairsData.forEach((pair, index) => {
            // Thêm key card
            cards.push({
                id: `key-${index}`,
                text: pair.key,
                type: 'key',
                pairKey: pair.key,
                pairValue: pair.value
            });
            // Thêm value card
            cards.push({
                id: `value-${index}`,
                text: pair.value,
                type: 'value',
                pairKey: pair.key,
                pairValue: pair.value
            });
        });

        // Trộn lẫn tất cả cards
        const shuffledCards = cards.sort(() => Math.random() - 0.5);
        setAllCards(shuffledCards);

        // Giữ lại keys và values riêng cho logic cũ (nếu cần)
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
                        stopTimer();
                        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
                        setTimeout(() => {
                            setScore(currentScore => {
                                const finalScore = currentScore;
                                toast.success(`Hoàn thành! Điểm: ${finalScore}`, { duration: 3000 });
                                saveGameSession(finalScore, timeSpent);

                                // Award XP for game completion
                                const user = JSON.parse(localStorage.getItem('user') || '{}');
                                if (user?.id) {
                                    const perfectScore = pairs.length * 10; // Each pair is worth 10 points
                                    if (finalScore === perfectScore && attempts === pairs.length) {
                                        // Perfect score (all correct, no mistakes)
                                        awardXP(user.id, 'match_game_perfect', 25);
                                    } else {
                                        // Regular completion
                                        awardXP(user.id, 'match_game', 10);
                                    }
                                }

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
        stopTimer();
        setMatchedPairs(new Set());
        setCorrectMatches(new Set());
        setWrongMatches(new Set());
        setScore(0);
        setAttempts(0);
        setSelectedKey(null);
        setSelectedValue(null);
        shuffleAndSetCards(pairs);
        const now = Date.now();
        setStartTime(now);
        setElapsedTime(0);
        setFinalTime(null);
        startTimer(now);
    };

    const startTimer = (startTimestamp: number) => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        startTimeRef.current = startTimestamp;
        setFinalTime(null);
        timerRef.current = setInterval(() => {
            const diff = (Date.now() - startTimeRef.current) / 1000;
            setElapsedTime(parseFloat(diff.toFixed(1)));
        }, 100);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        const diff = (Date.now() - startTimeRef.current) / 1000;
        const rounded = parseFloat(diff.toFixed(1));
        setElapsedTime(rounded);
        setFinalTime(rounded);
    };

    useEffect(() => {
        return () => {
            stopTimer();
        };
    }, []);

    const handleStartGame = () => {
        const now = Date.now();
        setIsReady(true);
        setStartTime(now);
        setElapsedTime(0);
        setFinalTime(null);
        startTimer(now);
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

    if (matchedPairs.size === pairs.length && pairs.length > 0 && isReady) {
        const correctCount = pairs.length;
        const wrongCount = attempts - correctCount >= 0 ? attempts - correctCount : 0;
        const percent = attempts > 0 ? Math.round((correctCount / attempts) * 100) : 100;
        const timeValue = finalTime ?? elapsedTime;
        const minutes = Math.floor(timeValue / 60);
        const seconds = (timeValue % 60).toFixed(1);

        return (
            <div className="min-h-screen bg-white flex items-center justify-center px-4">
                <div className="bg-white border border-gray-200 rounded-[32px] shadow-xl p-8 w-full max-w-md">
                    <h1 className="text-4xl font-bold text-center mb-6" style={{ color: '#3b315c' }}>
                        Match Stats
                    </h1>
                    <div className="flex items-center justify-between bg-[#f8f7ff] rounded-3xl px-6 py-4 mb-6">
                        <div className="text-gray-700 text-base space-y-1">
                            <p><span className="font-semibold">Amount Correct:</span> {correctCount}</p>
                            <p><span className="font-semibold">Amount Wrong:</span> {wrongCount}</p>
                            <p><span className="font-semibold">Percent Correct:</span> {percent}%</p>
                            <p><span className="font-semibold">Time:</span> {minutes} minutes and {seconds} seconds</p>
                        </div>
                        <div className="w-44 h-44 flex items-center justify-center">
                            <img src="/thinking.gif" alt="Thinking dog" className="w-full h-full object-contain" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <button
                            onClick={resetGame}
                            className="w-full py-3 rounded-full border border-[#c9c7d9] text-[#3b315c] font-semibold hover:bg-white transition-all shadow-sm"
                            style={{ borderWidth: '2px' }}
                        >
                            Play Again
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full py-3 rounded-full bg-[#1c69ff] text-white font-semibold hover:bg-blue-700 transition-all shadow"
                        >
                            Back to Study Set
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Ready to Play Screen - chỉ hiển thị khi đã có data
    if (!isReady && pairs.length > 0) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="max-w-3xl w-full px-6 text-center">
                    <h1 className="text-5xl font-bold mb-6" style={{ color: '#3b315c' }}>
                        Sẵn sàng chơi
                    </h1>
                    <p className="text-lg mb-2" style={{ color: '#3b315c' }}>
                        Ghép tất cả thuật ngữ với định nghĩa nhanh nhất có thể.
                    </p>
                    <p className="text-lg mb-10" style={{ color: '#3b315c' }}>
                        Tránh ghép nhầm nhé!
                    </p>
                    <button
                        onClick={handleStartGame}
                        className="px-16 py-4 rounded-full text-white text-lg font-semibold transition-transform duration-200 hover:scale-105"
                        style={{ backgroundColor: '#3b315c' }}
                    >
                        Bắt đầu
                    </button>
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
            <div className="max-w-5xl mx-auto px-6 py-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => navigate('/dashboard/arcade')}
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Quay lại</span>
                    </button>
                    <div className="flex items-center space-x-4">
                        <div className="text-base">
                            <span className="font-semibold text-gray-700">Điểm:</span>{' '}
                            <span className="text-blue-600 font-bold">{score}</span>
                        </div>
                        <div className="text-base">
                            <span className="font-semibold text-gray-700">Lần thử:</span>{' '}
                            <span className="text-gray-600">{attempts}</span>
                        </div>
                        <button
                            onClick={resetGame}
                            className="flex items-center space-x-2 px-3 py-1.5 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span>Chơi lại</span>
                        </button>
                    </div>
                </div>

                {/* Game Title */}
                <div className="text-center mb-4">
                    <h1 className="text-xl font-bold text-gray-900 mb-1">Match Game</h1>
                    <p className="text-gray-600 text-xs">Ghép cặp từ khóa với định nghĩa đúng</p>
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
                    <div className="w-full">
                        {/* Timer Display */}
                        <div className="mb-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Thời gian</p>
                            <p className="text-2xl font-bold text-gray-900">{(finalTime ?? elapsedTime).toFixed(1)}</p>
                        </div>

                        {/* Grid Layout - Full width */}
                        <div className="grid grid-cols-4 gap-2.5 mb-4">
                            {allCards.length === 0 ? (
                                <p className="text-gray-500 col-span-4 text-center py-8">Đang tải...</p>
                            ) : (
                                allCards.map((card) => {
                                    const isMatched = matchedPairs.has(card.pairKey);
                                    const isSelected = card.type === 'key'
                                        ? selectedKey === card.pairKey
                                        : selectedValue === card.pairValue;
                                    const isCorrect = Array.from(correctMatches).some(c =>
                                        c.includes(card.type === 'key' ? card.pairKey : card.pairValue)
                                    );
                                    const isWrong = Array.from(wrongMatches).some(w =>
                                        w.includes(card.type === 'key' ? card.pairKey : card.pairValue)
                                    );

                                    return (
                                        <button
                                            key={card.id}
                                            onClick={() =>
                                                card.type === 'key'
                                                    ? handleKeyClick(card.pairKey)
                                                    : handleValueClick(card.pairValue)
                                            }
                                            disabled={isMatched}
                                            className={`h-24 p-2 rounded-lg border transition-all duration-300 flex items-center justify-center text-center ${isMatched
                                                ? 'bg-green-50 border-green-300 opacity-0 scale-0 pointer-events-none'
                                                : isCorrect
                                                    ? 'bg-green-50 border-green-400 shadow-md'
                                                    : isWrong
                                                        ? 'bg-red-50 border-red-400 shadow-md'
                                                        : isSelected
                                                            ? 'bg-blue-50 border-blue-400 shadow-md'
                                                            : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow'
                                                }`}
                                            style={{
                                                transition: isMatched ? 'opacity 0.3s, transform 0.3s' : 'all 0.3s'
                                            }}
                                        >
                                            <span className={`text-xs font-medium leading-tight ${card.type === 'key' ? 'text-gray-900' : 'text-gray-700'}`}>
                                                {card.text}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Exit Game Button */}
                        <div className="flex justify-center mt-4">
                            <button
                                onClick={() => navigate('/dashboard/arcade')}
                                className="px-5 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow text-sm"
                            >
                                Exit Game
                            </button>
                        </div>
                    </div>
                )}

                {/* Progress Indicator */}
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">Tiến độ</span>
                        <span className="text-xs text-gray-600">
                            {matchedPairs.size} / {pairs.length}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${(matchedPairs.size / pairs.length) * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MatchGame;

