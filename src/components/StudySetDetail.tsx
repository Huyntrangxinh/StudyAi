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
import UploadMaterials from './UploadMaterials';

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
    isCollapsed?: boolean;
}

const StudySetDetail: React.FC<StudySetDetailProps> = ({ studySet, onBack, onViewMaterial, onViewFlashcards, isCollapsed = false }) => {
    const [showSuccessMessage, setShowSuccessMessage] = useState(true);
    const [showUploadMaterials, setShowUploadMaterials] = useState(false);
    const [materials, setMaterials] = useState<any[]>([]);
    const [stats, setStats] = useState([
        { label: 'Tài liệu', count: 0, icon: FileText, color: 'text-blue-500' },
        { label: 'Thẻ ghi nhớ', count: 0, icon: CreditCard, color: 'text-green-500' },
        { label: 'Tests & QuizFetch', count: 0, icon: CheckSquare, color: 'text-red-500' },
        { label: 'Gia sư của tôi', count: 0, icon: HelpCircle, color: 'text-purple-500' },
        { label: 'Trò chơi', count: 0, icon: Gamepad2, color: 'text-pink-500' },
        { label: 'Tóm tắt âm thanh', count: 0, icon: Volume2, color: 'text-blue-500' }
    ]);

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

            setStats(prev => prev.map(stat => {
                if (stat.label === 'Tài liệu') {
                    console.log('📊 Setting materials count to:', materialsData.length);
                    return { ...stat, count: materialsData.length };
                } else if (stat.label === 'Thẻ ghi nhớ') {
                    return { ...stat, count: flashcardSetCount };
                }
                return stat;
            }));
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    if (showUploadMaterials) {
        return (
            <UploadMaterials
                studySetId={studySet.id}
                studySetName={studySet.name}
                onBack={() => setShowUploadMaterials(false)}
                onViewMaterial={onViewMaterial}
                isCollapsed={isCollapsed}
            />
        );
    }

    return (
        <div className={`flex-1 p-8 bg-gray-50 transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-48'}`}>
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
                            className="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
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
                    <div className="flex items-center space-x-3">
                        <button className="flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <BookOpen className="w-4 h-4" />
                            <span>Chuyển bộ học</span>
                        </button>
                        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            <Target className="w-4 h-4" />
                            <span>Mục tiêu hàng ngày</span>
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-6 gap-4 mb-8">
                    {stats.map((stat, index) => (
                        <div
                            key={index}
                            className={`bg-white rounded-lg p-4 text-center shadow-sm ${(stat.label === 'Tài liệu' && stat.count > 0) || stat.label === 'Thẻ ghi nhớ'
                                ? 'cursor-pointer hover:shadow-md transition-shadow duration-200 hover:bg-blue-50'
                                : ''
                                }`}
                            onClick={() => {
                                if (stat.label === 'Tài liệu' && stat.count > 0 && onViewMaterial) {
                                    onViewMaterial();
                                } else if (stat.label === 'Thẻ ghi nhớ' && onViewFlashcards) {
                                    onViewFlashcards();
                                }
                            }}
                        >
                            <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                            <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
                            <div className="text-sm text-gray-600">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Materials List */}
                {materials.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Danh sách tài liệu ({materials.length})</h3>
                        <div className="bg-white rounded-lg shadow-sm border">
                            <div className="divide-y divide-gray-200">
                                {materials.map((material, index) => (
                                    <div key={material.id} className="p-4 flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <FileText className="w-5 h-5 text-blue-500" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{material.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {(material.size / 1024 / 1024).toFixed(2)} MB •
                                                    {new Date(material.created_at).toLocaleDateString('vi-VN')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <button
                                                onClick={async () => {
                                                    const newName = window.prompt('Nhập tên mới cho tài liệu', material.name);
                                                    if (!newName || newName.trim() === '' || newName === material.name) return;
                                                    try {
                                                        const resp = await fetch(`http://localhost:3001/api/materials/${material.id}`, {
                                                            method: 'PUT',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ name: newName.trim() })
                                                        });
                                                        if (!resp.ok) throw new Error('Rename failed');
                                                        await loadStats();
                                                    } catch (e) {
                                                        console.error('Rename material error:', e);
                                                        alert('Đổi tên thất bại');
                                                    }
                                                }}
                                                className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                                            >
                                                Đổi tên
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (!window.confirm('Xóa tài liệu này?')) return;
                                                    try {
                                                        const resp = await fetch(`http://localhost:3001/api/materials/${material.id}`, { method: 'DELETE' });
                                                        if (!resp.ok) throw new Error('Delete failed');
                                                        await loadStats();
                                                    } catch (e) {
                                                        console.error('Delete material error:', e);
                                                        alert('Xóa thất bại');
                                                    }
                                                }}
                                                className="text-sm px-3 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50"
                                            >
                                                Xóa
                                            </button>
                                            <div className="text-xs text-gray-400">#{index + 1}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="space-y-6">
                {/* Upload First Material */}
                <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
                    <div className="flex items-start space-x-6">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Plus className="w-8 h-8 text-gray-400" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                    Chưa bắt đầu
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">Tải lên tài liệu đầu tiên</h2>
                            <p className="text-gray-600 mb-6">
                                Bắt đầu bằng cách tải lên tài liệu học tập đầu tiên của bạn vào bộ học này.
                            </p>
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => setShowUploadMaterials(true)}
                                    className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    <Upload className="w-5 h-5" />
                                    <span>Tải lên tài liệu</span>
                                </button>
                                <button className="flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                                    <Settings className="w-5 h-5" />
                                    <span>Tạo tài liệu từ chủ đề</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Locked Sections */}
                <div className="space-y-4">
                    {[1, 2].map((index) => (
                        <div key={index} className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 opacity-60">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <Lock className="w-6 h-6 text-gray-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                            Đã khóa
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StudySetDetail;
