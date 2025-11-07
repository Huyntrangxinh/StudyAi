import React from 'react';
import {
    BookOpen,
    Bookmark,
    Settings,
    CheckSquare,
    Play,
    HelpCircle,
    Gamepad2,
    CreditCard,
    Volume2
} from 'lucide-react';

interface StudySetCardProps {
    studySetName?: string;
    studySetId?: string | number;
    materialsCount?: number;
    testsCount?: number;
    flashcardsCount?: number;
    explainersCount?: number;
    onStartLearning?: () => void;
    onFeatureClick?: (featureId: string) => void;
}

const StudySetCard: React.FC<StudySetCardProps> = ({
    studySetName = "Bộ học đầu tiên của tôi",
    studySetId,
    materialsCount = 0,
    testsCount = 0,
    flashcardsCount = 0,
    explainersCount = 0,
    onStartLearning,
    onFeatureClick
}) => {
    const features = [
        { id: 'tests', icon: CheckSquare, label: 'Bài kiểm tra/Câu đố', count: testsCount, color: 'text-red-500' },
        { id: 'explainers', icon: Play, label: 'Giải thích', count: explainersCount, color: 'text-blue-500' },
        { id: 'tutor', icon: HelpCircle, label: 'Gia sư của tôi', count: 0, color: 'text-purple-500' },
        { id: 'arcade', icon: Gamepad2, label: 'Trò chơi', count: 0, color: 'text-pink-500' },
        { id: 'flashcards', icon: CreditCard, label: 'Thẻ ghi nhớ', count: flashcardsCount, color: 'text-green-500' },
        { id: 'audio', icon: Volume2, label: 'Tóm tắt âm thanh', count: 0, color: 'text-blue-500' }
    ];

    return (
        <div className="bg-blue-50 rounded-2xl p-8 shadow-sm border border-blue-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-blue-200">
                        <img
                            src="/SPARKE.gif"
                            alt="Study Set"
                            className="w-8 h-8 object-contain"
                        />
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

            {/* Start Learning Button */}
            <div className="text-center mb-6">
                <button
                    onClick={onStartLearning}
                    className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-3 mx-auto"
                >
                    <Play className="w-6 h-6" />
                    <span>Bắt đầu học</span>
                </button>
            </div>

            {/* Study Path Info */}
            <div className="text-center text-gray-600">
                <p className="text-lg mb-2">Chưa có lộ trình học tập nào được tạo</p>
                <p className="text-sm">
                    Nhấp vào "Bắt đầu học" để tạo lộ trình học tập cá nhân hóa và theo dõi tiến độ của bạn
                </p>
            </div>
        </div>
    );
};

export default StudySetCard;
