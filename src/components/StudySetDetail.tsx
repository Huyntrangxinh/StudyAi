import React, { useState, useEffect } from 'react';
import {
    Upload,
    Settings,
    BookOpen,
    CreditCard,
    CheckSquare,
    HelpCircle,
    Gamepad2,
    Volume2,
    Lock,
    Plus,
    Share2,
    Target,
    FileText,
    Play,
    ArrowLeft
} from 'lucide-react';
import StudyPathViewer from './StudyPathViewer';

interface StudySetDetailProps {
    studySet: {
        id: string;
        name: string;
        description: string;
        createdAt: string;
    };
    onBack: () => void;
    onViewMaterial?: () => void;
    onViewFlashcards?: () => void;
    onViewGames?: () => void;
    onModuleClick?: (module: { id: number, title: string }) => void;
    isCollapsed?: boolean;
    onUploadMaterial?: () => void;
}

const StudySetDetail: React.FC<StudySetDetailProps> = ({ studySet, onBack, onViewMaterial, onViewFlashcards, onViewGames, onModuleClick, isCollapsed = false, onUploadMaterial }) => {
    const [showSuccessMessage, setShowSuccessMessage] = useState(true);
    const [materials, setMaterials] = useState<any[]>([]);
    const [isGeneratingSubRoadmap, setIsGeneratingSubRoadmap] = useState(false);
    const [stats, setStats] = useState([
        { label: 'Tài liệu', count: 0, icon: FileText, color: 'text-blue-500' },
        { label: 'Thẻ ghi nhớ', count: 0, icon: CreditCard, color: 'text-green-500' },
        { label: 'Tests & QuizFetch', count: 0, icon: CheckSquare, color: 'text-red-500' },
        { label: 'Gia sư của tôi', count: 0, icon: HelpCircle, color: 'text-purple-500' },
        { label: 'Trò chơi', count: 0, icon: Gamepad2, color: 'text-pink-500' },
        { label: 'Tóm tắt âm thanh', count: 0, icon: Volume2, color: 'text-blue-500' }
    ]);
    const [overallProgress, setOverallProgress] = useState<number>(0);

    // Load stats from database
    useEffect(() => {
        console.log('🔄 useEffect triggered for study set:', studySet.id);
        loadStats();
    }, [studySet.id, studySet.name]); // Add studySet.name to dependencies

    const loadStats = async () => {
        try {
            console.log('🔍 Loading stats for study set:', studySet.id, studySet.name);

            // Load materials count
            const materialsResponse = await fetch(`http://localhost:3001/api/materials/${studySet.id}`);
            const materialsData = materialsResponse.ok ? await materialsResponse.json() : [];
            console.log('📄 Materials for study set', studySet.id, ':', materialsData.length, materialsData);
            setMaterials(materialsData);

            // Load flashcard sets count belonging to this study set
            const setResp = await fetch('http://localhost:3001/api/flashcard-sets');
            const allSets = setResp.ok ? await setResp.json() : [];
            const flashcardSetCount = Array.isArray(allSets)
                ? allSets.filter((s: any) => String(s.study_set_id) === String(studySet.id)).length
                : 0;

            // Load tests count
            const testsRes = await fetch(`http://localhost:3001/api/tests/study-set/${studySet.id}`);
            const testsData = testsRes.ok ? await testsRes.json() : [];
            const testsCount = Array.isArray(testsData) ? testsData.length : 0;

            // Load arcade games count
            let arcadeCount = 0;
            try {
                const gamesRes = await fetch(`http://localhost:3001/api/games?studySetId=${studySet.id}`);
                if (gamesRes.ok) {
                    const gamesData = await gamesRes.json();
                    arcadeCount = Array.isArray(gamesData) ? gamesData.length : 0;
                }
            } catch (gamesError) {
                console.error('Error loading games count:', gamesError);
            }

            setStats(prev => prev.map(stat => {
                if (stat.label === 'Tài liệu') {
                    console.log('📊 Setting materials count to:', materialsData.length);
                    return { ...stat, count: materialsData.length };
                } else if (stat.label === 'Thẻ ghi nhớ') {
                    return { ...stat, count: flashcardSetCount };
                } else if (stat.label === 'Tests & QuizFetch') {
                    return { ...stat, count: testsCount };
                } else if (stat.label === 'Trò chơi') {
                    return { ...stat, count: arcadeCount };
                }
                return stat;
            }));
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    return (
        <div className="flex-1 p-8 bg-white transition-all duration-300">
            <div className="max-w-7xl mx-auto">
                {/* Success Message */}
                {showSuccessMessage && (
                    <div className="fixed bottom-6 right-6 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-50">
                        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span className="font-medium">Bộ học đã được tạo thành công</span>
                        <button
                            onClick={() => setShowSuccessMessage(false)}
                            className="ml-2 text-white hover:text-gray-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={onBack}
                                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
                                title="Quay lại"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-700" />
                            </button>
                            <div className="w-12 h-12 bg-orange-200 rounded-lg flex items-center justify-center">
                                <div className="flex flex-wrap w-6 h-6">
                                    <div className="w-1 h-1 bg-blue-600 rounded-full m-0.5"></div>
                                    <div className="w-1 h-1 bg-yellow-500 rounded-full m-0.5"></div>
                                    <div className="w-1 h-1 bg-green-500 rounded-full m-0.5"></div>
                                    <div className="w-1 h-1 bg-blue-500 rounded-full m-0.5"></div>
                                </div>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">{studySet.name}</h1>
                                <p className="text-gray-600">{studySet.description || 'Hè'}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-6">
                            {/* Overall progress small donut */}
                            <div className="flex flex-col items-center">
                                <div className="relative w-16 h-16">
                                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                                        <path className="text-blue-100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2a16 16 0 1 1 0 32 16 16 0 1 1 0-32" />
                                        <path className="text-blue-500" strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none"
                                            strokeDasharray={`${Math.max(0, Math.min(100, overallProgress))}, 100`} d="M18 2a16 16 0 1 1 0 32 16 16 0 1 1 0-32" />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-sm font-bold text-blue-600">{overallProgress}%</span>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-600 mt-1">Hoàn thành</span>
                            </div>
                            <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                <Target className="w-4 h-4" />
                                <span>Tiếp tục học</span>
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-6 gap-3 mb-8">
                        {stats.map((stat, index) => (
                            <div
                                key={index}
                                className={`bg-white rounded-md p-3 text-center shadow-sm border border-gray-200 ${(stat.label === 'Tài liệu' && stat.count > 0) || stat.label === 'Thẻ ghi nhớ' || stat.label === 'Trò chơi'
                                    ? 'cursor-pointer hover:shadow-md transition-shadow duration-200 hover:bg-blue-50'
                                    : ''
                                    }`}
                                onClick={() => {
                                    if (stat.label === 'Tài liệu' && stat.count > 0 && onViewMaterial) {
                                        onViewMaterial();
                                    } else if (stat.label === 'Thẻ ghi nhớ' && onViewFlashcards) {
                                        onViewFlashcards();
                                    } else if (stat.label === 'Trò chơi' && onViewGames) {
                                        onViewGames();
                                    }
                                }}
                            >
                                <stat.icon className={`w-5 h-5 mx-auto mb-1.5 ${stat.color}`} />
                                <div className="text-xl font-bold text-gray-900">{stat.count}</div>
                                <div className="text-xs text-gray-600">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="space-y-6">
                    {/* Loading Screen for Sub-Roadmap Generation */}
                    {isGeneratingSubRoadmap && (
                        <div className="fixed inset-0 bg-white z-50 flex items-center justify-center border border-gray-200" style={{ marginLeft: isCollapsed ? '64px' : '192px' }}>
                            <div className="flex flex-col items-center justify-center">
                                <img
                                    src="/SparkeSurf.gif"
                                    alt="Loading"
                                    className="w-64 h-64 object-contain"
                                />
                                <p className="text-gray-600 text-lg mt-4">Đang tạo sub-roadmap...</p>
                            </div>
                        </div>
                    )}

                    {/* Study Path Viewer - Hiển thị nếu có materials */}
                    {materials.length > 0 && !isGeneratingSubRoadmap && (
                        <StudyPathViewer
                            studySetId={studySet.id}
                            onProgressUpdate={(value) => setOverallProgress(value)}
                            onModuleClick={async (module) => {
                                console.log('Module clicked:', module);
                                console.log('Module ID:', module.id, 'Type:', typeof module.id);
                                console.log('Study Set ID:', studySet.id, 'Type:', typeof studySet.id);

                                // Check if sub-roadmap already exists
                                try {
                                    const checkResponse = await fetch(`http://localhost:3001/api/study-paths/module/${module.id}/sub-modules`);

                                    if (checkResponse.ok) {
                                        const existingData = await checkResponse.json();
                                        if (Array.isArray(existingData) && existingData.length > 0) {
                                            // Sub-roadmap already exists, show it immediately without loading
                                            console.log('Sub-roadmap already exists, showing directly');
                                            setIsGeneratingSubRoadmap(false);
                                            if (onModuleClick) {
                                                onModuleClick(module);
                                            }
                                            return;
                                        }
                                    }

                                    // Sub-roadmap doesn't exist, need to generate it
                                    // Show loading screen only when generating
                                    setIsGeneratingSubRoadmap(true);

                                    const requestBody = {
                                        moduleId: module.id,
                                        studySetId: studySet.id
                                    };
                                    console.log('Request body:', requestBody);

                                    const response = await fetch('http://localhost:3001/api/study-paths/generate-sub-roadmap', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(requestBody)
                                    });

                                    if (response.ok) {
                                        const data = await response.json();
                                        console.log('Sub-roadmap generated:', data);
                                        // Hide loading and show sub-roadmap
                                        setIsGeneratingSubRoadmap(false);
                                        // Call parent callback to show sub-roadmap
                                        if (onModuleClick) {
                                            onModuleClick(module);
                                        }
                                    } else {
                                        const error = await response.json();
                                        setIsGeneratingSubRoadmap(false);
                                        alert('Không thể tạo sub-roadmap: ' + (error.error || 'Lỗi không xác định'));
                                    }
                                } catch (error) {
                                    console.error('Error checking/generating sub-roadmap:', error);
                                    setIsGeneratingSubRoadmap(false);
                                    alert('Lỗi khi tạo sub-roadmap');
                                }
                            }}
                        />
                    )}

                    {/* Upload First Material - Chỉ hiển thị nếu chưa có materials */}
                    {materials.length === 0 && (
                        <div className="bg-white rounded-xl p-8 border-2 border-dashed border-gray-200 text-center">
                            <div className="max-w-md mx-auto">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Bắt đầu bằng cách tải lên tài liệu</h2>
                                <p className="text-gray-600 mb-4">Tải lên tài liệu để tạo lộ trình học tập và nội dung học phù hợp.</p>
                                <button
                                    onClick={() => onUploadMaterial?.()}
                                    className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    <Upload className="inline w-4 h-4 mr-2" /> Tải lên tài liệu
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudySetDetail;
