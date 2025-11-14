import React, { useState, useEffect } from 'react';
import {
    BookOpen,
    Bookmark,
    Settings,
    CheckSquare,
    Play,
    HelpCircle,
    Gamepad2,
    CreditCard,
    Volume2,
    Pencil,
    FileText
} from 'lucide-react';

interface Module {
    id: number;
    title: string;
    progress?: number;
}

interface StudyPath {
    modules?: Module[];
}

interface StudySetCardProps {
    studySetName?: string;
    studySetId?: string | number;
    materialsCount?: number;
    testsCount?: number;
    flashcardsCount?: number;
    explainersCount?: number;
    arcadeCount?: number;
    audioCount?: number;
    onStartLearning?: () => void;
    onFeatureClick?: (featureId: string) => void;
    studyPath?: StudyPath | null;
    onViewAll?: () => void;
    icon?: string;
}

const StudySetCard: React.FC<StudySetCardProps> = ({
    studySetName = "Bộ học đầu tiên của tôi",
    studySetId,
    materialsCount = 0,
    testsCount = 0,
    flashcardsCount = 0,
    explainersCount = 0,
    arcadeCount = 0,
    audioCount = 0,
    onStartLearning,
    onFeatureClick,
    studyPath,
    onViewAll,
    icon
}) => {
    const [moduleProgress, setModuleProgress] = useState<Record<number, number>>({});

    // Load module progress when study path is available
    // Tính progress bằng cách lấy trung bình progress của các sub-modules
    useEffect(() => {
        const loadModuleProgress = async () => {
            if (!studyPath?.modules || !studySetId) return;

            const progressMap: Record<number, number> = {};

            // Load progress cho từng module bằng cách tính trung bình của sub-modules
            const progressPromises = studyPath.modules
                .filter(module => module.id > 0)
                .map(async (module) => {
                    try {
                        // Lấy sub-modules của module này
                        const response = await fetch(`http://localhost:3001/api/study-paths/module/${module.id}/sub-modules`);
                        if (response.ok) {
                            const subModules = await response.json();
                            if (Array.isArray(subModules) && subModules.length > 0) {
                                // Tính trung bình progress của các sub-modules
                                const avgProgress = subModules.reduce((sum: number, sub: any) => {
                                    return sum + (Number(sub.progress) || 0);
                                }, 0) / subModules.length;
                                return [module.id, avgProgress] as const;
                            } else {
                                // Nếu không có sub-modules, dùng progress của module chính
                                return [module.id, Number(module.progress) || 0] as const;
                            }
                        } else {
                            // Nếu không lấy được sub-modules, dùng progress của module chính
                            return [module.id, Number(module.progress) || 0] as const;
                        }
                    } catch (error) {
                        console.error('Error loading module progress:', error);
                        // Fallback: dùng progress của module chính
                        return [module.id, Number(module.progress) || 0] as const;
                    }
                });

            const results = await Promise.all(progressPromises);
            results.forEach(([moduleId, progress]) => {
                progressMap[moduleId] = progress;
            });

            setModuleProgress(progressMap);
        };

        loadModuleProgress();
    }, [studyPath, studySetId]);

    const hasRoadmap = studyPath?.modules && studyPath.modules.length > 0;

    // Icon mapping (same as MyStudySetsCard)
    const ICON_MAP: { [key: string]: React.ReactNode } = {
        'book': <FileText className="w-4 h-4" />,
        'calculator': <FileText className="w-4 h-4" />,
        'globe': <FileText className="w-4 h-4" />,
        'hard-hat': <FileText className="w-4 h-4" />
    };

    // Get icon component or default to dots pattern
    const getIconDisplay = () => {
        if (icon && ICON_MAP[icon]) {
            // If icon is a named icon, show it with colored background
            const ICON_COLORS = [
                '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
                '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
                '#14b8a6', '#6366f1'
            ];
            const iconColor = ICON_COLORS[parseInt(String(studySetId || '0')) % ICON_COLORS.length];
            return (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: iconColor }}>
                    <div className="text-white">
                        {ICON_MAP[icon]}
                    </div>
                </div>
            );
        } else {
            // Default: show dots pattern (like study set buttons) or SPARKE.gif
            // For now, show SPARKE.gif as default, but can be changed to dots
            return (
                <img
                    src="/SPARKE.gif"
                    alt="Study Set"
                    className="w-8 h-8 object-contain"
                />
            );
        }
    };

    const features = [
        { id: 'tests', icon: CheckSquare, label: 'Bài kiểm tra', count: testsCount, color: 'text-red-500' },
        { id: 'explainers', icon: Play, label: 'Video giải thích', count: explainersCount, color: 'text-blue-500' },
        { id: 'tutor', icon: HelpCircle, label: 'Tutor Me', count: 0, color: 'text-purple-500' },
        { id: 'arcade', icon: Gamepad2, label: 'Arcade', count: arcadeCount, color: 'text-pink-500' },
        { id: 'flashcards', icon: CreditCard, label: 'Flashcards', count: flashcardsCount, color: 'text-green-500' },
        { id: 'audio', icon: Volume2, label: 'Audio Recap', count: audioCount, color: 'text-blue-500' }
    ];

    return (
        <div className="bg-blue-50 rounded-2xl p-8 shadow-sm border border-blue-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-blue-200 relative">
                        {getIconDisplay()}
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                            <Pencil className="w-2.5 h-2.5 text-white" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{studySetName}</h2>
                        <p className="text-gray-600 text-sm">{materialsCount} tài liệu</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <Bookmark className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                        <button
                            key={index}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Feature clicked:', feature.id, feature.label);
                                onFeatureClick?.(feature.id);
                            }}
                            className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
                        >
                            <div className="flex items-center justify-center space-x-2 mb-2">
                                <Icon className={`w-5 h-5 ${feature.color}`} />
                                <span className="text-2xl font-bold text-gray-900">{feature.count}</span>
                            </div>
                            <p className="text-sm text-gray-600">{feature.label}</p>
                        </button>
                    );
                })}
            </div>

            {/* Continue Learning Button */}
            <div className="text-center mb-6">
                <button
                    onClick={onStartLearning}
                    className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-3 mx-auto"
                >
                    <Play className="w-6 h-6 fill-white" />
                    <span>{hasRoadmap ? 'Continue Learning' : 'Bắt đầu học'}</span>
                </button>
            </div>

            {/* Roadmap Progress List - Hiển thị nếu có roadmap */}
            {hasRoadmap && studyPath.modules && (
                <div className="space-y-4 mb-4">
                    {studyPath.modules.slice(0, 4).map((module) => {
                        const progress = moduleProgress[module.id] || module.progress || 0;
                        return (
                            <div key={module.id} className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {module.title}
                                    </p>
                                    <p className="text-sm font-semibold text-gray-900 ml-2 flex-shrink-0">
                                        {Math.round(progress)}%
                                    </p>
                                </div>
                                <div className="w-full bg-white rounded-full h-2">
                                    <div
                                        className="h-2 rounded-full transition-all bg-blue-500"
                                        style={{ width: `${Math.max(progress, 0)}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* View All Button - Chỉ hiển thị nếu có roadmap */}
            {hasRoadmap && (
                <div className="text-center">
                    <button
                        onClick={onViewAll}
                        className="bg-gray-200 text-gray-900 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors border border-gray-300"
                    >
                        View All
                    </button>
                </div>
            )}

            {/* Study Path Info - Chỉ hiển thị nếu chưa có roadmap */}
            {!hasRoadmap && (
                <div className="text-center text-gray-600">
                    <p className="text-lg mb-2">Chưa có lộ trình học tập nào được tạo</p>
                    <p className="text-sm">
                        Nhấp vào "Bắt đầu học" để tạo lộ trình học tập cá nhân hóa và theo dõi tiến độ của bạn
                    </p>
                </div>
            )}
        </div>
    );
};

export default StudySetCard;
