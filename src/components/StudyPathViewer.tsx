import React, { useState, useEffect } from 'react';
import {
    CheckCircle2,
    Circle,
    Clock,
    FileText,
    ArrowRight,
    Calendar,
    Play,
    Lock,
    ChevronDown,
    Check
} from 'lucide-react';

interface StudyPathModule {
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

interface StudyPath {
    id: number;
    study_set_id: number;
    exam_date?: string;
    status: 'draft' | 'generating' | 'ready' | 'active';
    created_at: string;
    updated_at: string;
    modules: StudyPathModule[];
}

interface StudyPathViewerProps {
    studySetId: string;
    onModuleClick?: (module: StudyPathModule) => void;
    onProgressUpdate?: (overallProgress: number) => void;
}

const StudyPathViewer: React.FC<StudyPathViewerProps> = ({ studySetId, onModuleClick, onProgressUpdate }) => {
    const [studyPath, setStudyPath] = useState<StudyPath | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [materials, setMaterials] = useState<any[]>([]);
    const [moduleProgress, setModuleProgress] = useState<Record<number, { progress: number; status: 'ready' | 'in_progress' | 'completed' }>>({});

    useEffect(() => {
        loadStudyPath();
        loadMaterials();
    }, [studySetId]);

    // Load sub-modules progress for each module and compute aggregate progress
    useEffect(() => {
        const fetchSubProgress = async () => {
            if (!studyPath || !Array.isArray(studyPath.modules)) {
                if (onProgressUpdate) {
                    onProgressUpdate(0);
                }
                return;
            }
            const validModules = studyPath.modules.filter(m => m.id > 0);
            if (validModules.length === 0) {
                setModuleProgress({});
                if (onProgressUpdate) {
                    onProgressUpdate(0);
                }
                return;
            }
            const entries = await Promise.all(
                validModules.map(async (m) => {
                    try {
                        const res = await fetch(`http://localhost:3001/api/study-paths/module/${m.id}/sub-modules`);
                        if (!res.ok) return [m.id, { progress: m.progress || 0, status: m.status }] as const;
                        const subs = await res.json();
                        if (!Array.isArray(subs) || subs.length === 0) return [m.id, { progress: m.progress || 0, status: m.status }] as const;
                        const avg = subs.reduce((sum: number, s: any) => sum + (Number(s.progress) || 0), 0) / subs.length;
                        const status: 'ready' | 'in_progress' | 'completed' = avg >= 100 ? 'completed' : avg > 0 ? 'in_progress' : 'ready';
                        return [m.id, { progress: avg, status }] as const;
                    } catch {
                        return [m.id, { progress: m.progress || 0, status: m.status }] as const;
                    }
                })
            );
            const map: Record<number, { progress: number; status: 'ready' | 'in_progress' | 'completed' }> = {};
            for (const [id, val] of entries) map[id] = val;
            setModuleProgress(map);

            if (onProgressUpdate) {
                const overall = Math.round(validModules.reduce((sum, module) => {
                    const agg = map[module.id];
                    const value = agg ? agg.progress : module.progress || 0;
                    return sum + value;
                }, 0) / validModules.length);
                onProgressUpdate(Number.isFinite(overall) ? overall : 0);
            }
        };
        fetchSubProgress();
    }, [studyPath?.modules, onProgressUpdate]);

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

    const loadStudyPath = async () => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:3001/api/study-paths/${studySetId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    setStudyPath(null);
                    setError(null);
                    return;
                }
                throw new Error('Failed to load study path');
            }

            const data = await response.json();
            console.log('📊 Roadmap JSON Data:', JSON.stringify(data, null, 2));
            console.log('📊 Roadmap Modules:', data?.modules);
            if (data) {
                setStudyPath(data);
            } else {
                setStudyPath(null);
            }
            setError(null);
        } catch (err) {
            console.error('Error loading study path:', err);
            setError('Không thể tải lộ trình học tập');
        } finally {
            setLoading(false);
        }
    };

    const getModuleMaterials = (module: StudyPathModule) => {
        if (!module.materialIds || module.materialIds.length === 0) return [];
        return materials.filter(m => module.materialIds?.includes(m.id));
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
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
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
                <div className="text-center text-red-600">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!studyPath) {
        return null;
    }

    // Tạo module "Upload Material" (luôn completed nếu có materials)
    const uploadModule: StudyPathModule = {
        id: -1,
        title: 'Upload Material',
        description: 'Materials uploaded successfully',
        status: 'completed',
        progress: 100,
        topicsCount: 0,
        materialsCount: materials.length,
        orderIndex: -1
    };

    // Tạo module "Add Exam Date"
    const examDateModule: StudyPathModule = {
        id: -2,
        title: 'Add Exam Date',
        description: 'Set your exam date to generate personalized study sessions on your calendar',
        status: studyPath.exam_date ? 'completed' : 'ready',
        progress: studyPath.exam_date ? 100 : 0,
        topicsCount: 0,
        materialsCount: 0,
        orderIndex: 0
    };

    // Combine modules
    const allModules = [uploadModule, examDateModule, ...studyPath.modules];

    return (
        <div className="bg-white rounded-xl p-8">
            {/* Study Path Modules - Zigzag Timeline Layout */}
            <div className="relative max-w-5xl mx-auto">
                {/* Central Vertical Timeline Line */}
                <div className="absolute left-1/2 transform -translate-x-1/2 top-0 bottom-0 w-0.5 bg-gray-100 z-0"></div>

                {allModules.map((module, index) => {
                    const moduleMaterials = getModuleMaterials(module);
                    const isLeft = index % 2 === 0; // Alternating left/right

                    // Override status/progress by aggregated sub-modules if available
                    const agg = moduleProgress[module.id];
                    const effectiveProgress = module.id > 0 && agg ? agg.progress : module.progress;
                    const effectiveStatus = module.id > 0 && agg ? agg.status : module.status;

                    return (
                        <div key={module.id} className="relative mb-6 last:mb-0">
                            {/* Timeline Connector Circle - Center */}
                            <div className="absolute left-1/2 transform -translate-x-1/2 z-10 top-4">
                                {effectiveStatus === 'completed' ? (
                                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-green-500">
                                        <Check className="w-4 h-4 text-green-600" />
                                    </div>
                                ) : effectiveStatus === 'in_progress' ? (
                                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-blue-500">
                                        <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-gray-300">
                                        <Play className="w-3.5 h-3.5 text-gray-600 fill-gray-600" />
                                    </div>
                                )}
                            </div>

                            {/* Module Card - Alternating Left/Right */}
                            <div className={`relative ${isLeft ? 'pr-[55%]' : 'pl-[55%]'}`}>
                                <div
                                    onClick={() => {
                                        // Only allow click for AI-generated modules (not Upload Material or Add Exam Date)
                                        if (module.id > 0 && onModuleClick) {
                                            onModuleClick(module);
                                        }
                                    }}
                                    className={`bg-white rounded-xl border-2 shadow-sm transition-all hover:shadow-md relative cursor-pointer ${effectiveStatus === 'completed'
                                        ? 'border-green-200'
                                        : effectiveStatus === 'in_progress'
                                            ? 'border-blue-200'
                                            : 'border-gray-200'
                                        } ${module.id > 0 ? 'hover:border-blue-400' : ''}`}
                                >
                                    <div className="p-4">
                                        {/* Status Badge */}
                                        <div className="mb-2">
                                            {effectiveStatus === 'completed' && (
                                                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-white text-gray-800 rounded-md border border-gray-300">
                                                    Completed
                                                </span>
                                            )}
                                            {effectiveStatus === 'in_progress' && (
                                                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-white text-gray-800 rounded-md border border-gray-300">
                                                    In Progress
                                                </span>
                                            )}
                                            {effectiveStatus === 'ready' && (
                                                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-white text-gray-800 rounded-md border border-gray-300">
                                                    Ready
                                                </span>
                                            )}
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-base font-bold text-gray-900 mb-1">
                                            {module.title}
                                        </h3>

                                        {/* Description */}
                                        {module.description && (
                                            <p className="text-xs text-gray-600 mb-2">
                                                {module.description}
                                            </p>
                                        )}

                                        {/* Module Stats */}
                                        <div className="mb-2 space-y-1.5">
                                            {module.topicsCount > 0 && (
                                                <p className="text-xs text-gray-700">
                                                    {module.topicsCount} topics
                                                </p>
                                            )}
                                            {module.materialsCount > 0 && (
                                                <div>
                                                    <p className="text-xs text-gray-700 mb-1.5">
                                                        Materials ({module.materialsCount})
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

                                        {/* Progress Bar - Hide for completed and Add Exam Date */}
                                        {effectiveStatus !== 'completed' && module.id !== -2 && (
                                            <div className="mt-2">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-xs text-gray-600 font-medium">
                                                        Progress
                                                    </p>
                                                    <p className="text-xs text-gray-900 font-semibold">
                                                        {Math.round(effectiveProgress)}%
                                                    </p>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full transition-all ${effectiveProgress > 0
                                                            ? 'bg-blue-500'
                                                            : 'bg-gray-200'
                                                            }`}
                                                        style={{ width: `${Math.max(effectiveProgress, 0)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Button for Ready */}
                                        {effectiveStatus === 'ready' && module.id === -2 && (
                                            <button
                                                onClick={() => onModuleClick && onModuleClick(module)}
                                                className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm mt-2"
                                            >
                                                <Calendar className="w-4 h-4" />
                                                <span>Add Exam Date</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StudyPathViewer;