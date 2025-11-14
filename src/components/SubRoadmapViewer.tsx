import React, { useState, useEffect } from 'react';
import {
    Check,
    Play,
    FileText,
    ArrowLeft
} from 'lucide-react';
import LearningMethodModal from './LearningMethodModal';

interface SubModule {
    id: number;
    title: string;
    description?: string;
    status: 'ready' | 'in_progress' | 'completed';
    progress: number;
    topicsCount: number;
    materialsCount: number;
    orderIndex: number;
    materialIds?: number[];
}

interface SubRoadmapViewerProps {
    moduleId: number;
    moduleTitle: string;
    studySetId: string;
    onBack: () => void;
    onFlashcardGenerated?: (flashcardSetId: number, subModuleId?: number) => void;
    isDarkMode?: boolean;
}

const SubRoadmapViewer: React.FC<SubRoadmapViewerProps> = ({ moduleId, moduleTitle, studySetId, onBack, onFlashcardGenerated, isDarkMode = false }) => {
    const [subModules, setSubModules] = useState<SubModule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [materials, setMaterials] = useState<any[]>([]);
    const [selectedSubModule, setSelectedSubModule] = useState<SubModule | null>(null);
    const [showLearningModal, setShowLearningModal] = useState(false);

    useEffect(() => {
        loadSubModules();
        loadMaterials();
    }, [moduleId, studySetId]);

    // Reload data when modal closes (after selecting a learning method)
    useEffect(() => {
        if (!showLearningModal) {
            loadSubModules();
        }
    }, [showLearningModal]);

    const loadMaterials = async () => {
        try {
            const response = await fetch(`http://localhost:3001/api/materials/${studySetId}`);
            if (response.ok) {
                const data = await response.json();
                setMaterials(data);
            }
        } catch (err) {
            console.error('Error loading materials:', err);
        }
    };

    const loadSubModules = async () => {
        try {
            // Only show loading if sub-modules don't exist (first time)
            const response = await fetch(`http://localhost:3001/api/study-paths/module/${moduleId}/sub-modules`);

            if (!response.ok) {
                if (response.status === 404) {
                    // Sub-roadmap doesn't exist yet, don't show loading, just show empty state
                    setSubModules([]);
                    setError(null);
                    setLoading(false);
                    return;
                }
                throw new Error('Failed to load sub-modules');
            }

            const data = await response.json();
            console.log('📊 Sub-Roadmap JSON Data:', JSON.stringify(data, null, 2));
            console.log('📊 Sub-Modules:', data);

            if (Array.isArray(data) && data.length > 0) {
                // Sub-roadmap exists, load it immediately without loading screen
                setSubModules(data);
                setError(null);
                setLoading(false);
            } else {
                // No sub-modules yet, show empty state
                setSubModules([]);
                setError(null);
                setLoading(false);
            }
        } catch (err) {
            console.error('Error loading sub-modules:', err);
            setError('Không thể tải sub-roadmap');
            setLoading(false);
        }
    };

    const getModuleMaterials = (subModule: SubModule) => {
        if (!subModule.materialIds || subModule.materialIds.length === 0) return [];
        return materials.filter(m => subModule.materialIds?.includes(m.id));
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl p-8">
                <div className="text-center text-red-600">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (subModules.length === 0) {
        return (
            <div className="bg-white rounded-xl p-8">
                <div className="text-center text-gray-500">
                    <p>Chưa có sub-roadmap cho module này. Click vào module để tạo sub-roadmap.</p>
                </div>
            </div>
        );
    }

    // Calculate progress statistics
    const totalTopics = subModules.length;
    const completedTopics = subModules.filter(m => m.status === 'completed').length;
    const progressPercentage = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;

    return (
        <div className="bg-white rounded-xl p-8">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Quay lại roadmap chính</span>
                </button>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">{moduleTitle}</h2>
                    <p className="text-sm text-gray-600">
                        {completedTopics} of {totalTopics} topics completed
                    </p>
                </div>
                {/* Progress Bar */}
                <div className="mb-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.max(progressPercentage, 0)}%` }}
                        ></div>
                    </div>
                </div>
                <p className="text-gray-600">Lộ trình học tập chi tiết</p>
            </div>

            {/* Sub-modules Timeline */}
            <div className="relative max-w-5xl mx-auto">
                {/* Central Vertical Timeline Line */}
                <div className="absolute left-1/2 transform -translate-x-1/2 top-0 bottom-0 w-0.5 bg-gray-100 z-0"></div>

                {subModules.map((subModule, index) => {
                    const moduleMaterials = getModuleMaterials(subModule);
                    const isLeft = index % 2 === 0;

                    return (
                        <div key={subModule.id} className="relative mb-6 last:mb-0">
                            {/* Timeline Connector Circle - Center */}
                            <div className="absolute left-1/2 transform -translate-x-1/2 z-10 top-4">
                                {subModule.progress === 100 ? (
                                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                        <Check className="w-4 h-4 text-white" />
                                    </div>
                                ) : subModule.progress === 50 ? (
                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-blue-300">
                                        <Play className="w-3.5 h-3.5 text-white fill-white" />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center shadow-lg">
                                        <Play className="w-3.5 h-3.5 text-white fill-white" />
                                    </div>
                                )}
                            </div>

                            {/* Sub-module Card - Alternating Left/Right */}
                            <div className={`relative ${isLeft ? 'pr-[55%]' : 'pl-[55%]'}`}>
                                <div
                                    onClick={() => {
                                        setSelectedSubModule(subModule);
                                        setShowLearningModal(true);
                                    }}
                                    className={`bg-white rounded-xl border-2 shadow-sm transition-all hover:shadow-md relative cursor-pointer ${subModule.status === 'completed'
                                        ? 'border-green-200'
                                        : subModule.status === 'in_progress'
                                            ? 'border-blue-200'
                                            : 'border-gray-200'
                                        } hover:border-blue-400`}
                                >
                                    <div className="p-4">
                                        {/* Status Badge */}
                                        <div className="mb-2">
                                            {subModule.status === 'completed' && (
                                                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-white text-gray-800 rounded-md border border-gray-300">
                                                    Completed
                                                </span>
                                            )}
                                            {subModule.status === 'in_progress' && (
                                                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-white text-gray-800 rounded-md border border-gray-300">
                                                    In Progress
                                                </span>
                                            )}
                                            {subModule.status === 'ready' && (
                                                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-white text-gray-800 rounded-md border border-gray-300">
                                                    Ready
                                                </span>
                                            )}
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-base font-bold text-gray-900 mb-1">
                                            {subModule.title}
                                        </h3>

                                        {/* Description */}
                                        {subModule.description && (
                                            <p className="text-xs text-gray-600 mb-2">
                                                {subModule.description}
                                            </p>
                                        )}

                                        {/* Sub-module Stats */}
                                        <div className="mb-2 space-y-1.5">
                                            {subModule.topicsCount > 0 && (
                                                <p className="text-xs text-gray-700">
                                                    {subModule.topicsCount} topics
                                                </p>
                                            )}
                                            {subModule.materialsCount > 0 && (
                                                <div>
                                                    <p className="text-xs text-gray-700 mb-1.5">
                                                        Materials ({subModule.materialsCount})
                                                    </p>
                                                    {/* Materials List */}
                                                    <div className="space-y-1">
                                                        {moduleMaterials.slice(0, 3).map((material: any) => (
                                                            <div
                                                                key={material.id}
                                                                className="flex items-center space-x-2 p-1.5 bg-gray-50 rounded-md border border-gray-200"
                                                            >
                                                                <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                                <span className="text-xs text-gray-700 truncate">
                                                                    {material.name}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Progress Bar - Hide for completed */}
                                        {subModule.status !== 'completed' && (
                                            <div className="mt-2">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-xs text-gray-600 font-medium">
                                                        Progress
                                                    </p>
                                                    <p className="text-xs text-gray-900 font-semibold">
                                                        {Math.round(subModule.progress)}%
                                                    </p>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full transition-all ${subModule.progress > 0
                                                            ? 'bg-blue-500'
                                                            : 'bg-gray-200'
                                                            }`}
                                                        style={{ width: `${Math.max(subModule.progress, 0)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Learning Method Modal */}
            <LearningMethodModal
                moduleTitle={selectedSubModule?.title || moduleTitle}
                isOpen={showLearningModal}
                onClose={() => {
                    setShowLearningModal(false);
                    setSelectedSubModule(null);
                }}
                onSelectMethod={(methodId, generatedFlashcardSetId) => {
                    console.log('Selected learning method:', methodId, 'for module:', selectedSubModule?.title);
                    if (methodId === 'flashcards' && generatedFlashcardSetId) {
                        // Navigate to flashcards with the generated flashcard set
                        setShowLearningModal(false);
                        const currentSubModule = selectedSubModule;
                        setSelectedSubModule(null);
                        if (onFlashcardGenerated) {
                            onFlashcardGenerated(generatedFlashcardSetId, currentSubModule?.id);
                        }
                    } else {
                        // TODO: Handle other methods (quiz, test, game)
                        setShowLearningModal(false);
                        setSelectedSubModule(null);
                    }
                }}
                studySetId={studySetId}
                subModule={selectedSubModule}
                materials={materials}
                isDarkMode={isDarkMode}
            />
        </div>
    );
};

export default SubRoadmapViewer;

