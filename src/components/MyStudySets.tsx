import React, { useState, useEffect } from 'react';
import { Search, Plus, FolderPlus, MoreVertical, Calendar, FileText, Globe } from 'lucide-react';

interface StudySet {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    icon?: string;
    color?: string;
    materialsCount?: number;
}

interface MyStudySetsProps {
    userId: string;
    onSelectStudySet?: (studySet: StudySet) => void;
    onCreateStudySet?: () => void;
    onCreateFolder?: () => void;
}

const MyStudySets: React.FC<MyStudySetsProps> = ({
    userId,
    onSelectStudySet,
    onCreateStudySet,
    onCreateFolder
}) => {
    const [studySets, setStudySets] = useState<StudySet[]>([]);
    const [filteredStudySets, setFilteredStudySets] = useState<StudySet[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Load study sets
    useEffect(() => {
        const loadStudySets = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`http://localhost:3001/api/study-sets?userId=${userId}`);
                if (response.ok) {
                    const data = await response.json();

                    // Load materials count for each study set
                    const setsWithCounts = await Promise.all(
                        data.map(async (set: StudySet) => {
                            try {
                                const materialsRes = await fetch(`http://localhost:3001/api/materials/${set.id}`);
                                const materials = materialsRes.ok ? await materialsRes.json() : [];
                                return {
                                    ...set,
                                    materialsCount: Array.isArray(materials) ? materials.length : 0
                                };
                            } catch {
                                return { ...set, materialsCount: 0 };
                            }
                        })
                    );

                    setStudySets(setsWithCounts);
                    setFilteredStudySets(setsWithCounts);
                }
            } catch (error) {
                console.error('Error loading study sets:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (userId) {
            loadStudySets();
        }
    }, [userId]);

    // Filter study sets based on search term
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredStudySets(studySets);
        } else {
            const filtered = studySets.filter(set =>
                set.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                set.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredStudySets(filtered);
        }
    }, [searchTerm, studySets]);

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        } catch {
            return dateString;
        }
    };

    const getIconComponent = (iconName?: string) => {
        // Map icon names to components (simplified - you can expand this)
        const iconMap: { [key: string]: React.ReactNode } = {
            'book': <FileText className="w-4 h-4" />,
            'calculator': <FileText className="w-4 h-4" />,
            'globe': <FileText className="w-4 h-4" />,
            'hard-hat': <FileText className="w-4 h-4" />
        };
        return iconMap[iconName || 'book'] || <FileText className="w-4 h-4" />;
    };

    // Generate random color for icon container based on study set ID
    const getRandomIconColor = (id: string) => {
        const colors = [
            '#3b82f6', // Blue
            '#10b981', // Green
            '#f59e0b', // Amber
            '#ef4444', // Red
            '#8b5cf6', // Purple
            '#ec4899', // Pink
            '#06b6d4', // Cyan
            '#f97316', // Orange
            '#14b8a6', // Teal
            '#6366f1', // Indigo
        ];
        // Use study set ID to get consistent color for same set
        const index = parseInt(id) % colors.length;
        return colors[index];
    };

    const truncateDescription = (text: string, maxLength: number = 80) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    return (
        <div className="flex-1 p-8 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">My Study Sets</h1>
                    <p className="text-sm text-gray-600">Manage and access all your study materials in one place</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onCreateFolder}
                        className="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <FolderPlus className="w-4 h-4" />
                        <span className="text-sm font-medium">Create Folder</span>
                    </button>
                    <button
                        onClick={onCreateStudySet}
                        className="flex items-center gap-2 px-4 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-medium">Create Study Set</span>
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative max-w-4xl">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search study sets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Study Sets List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="text-gray-500">Loading study sets...</div>
                </div>
            ) : filteredStudySets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No study sets found</h3>
                    <p className="text-gray-500 mb-4">
                        {searchTerm ? 'Try a different search term' : 'Create your first study set to get started'}
                    </p>
                    {!searchTerm && (
                        <button
                            onClick={onCreateStudySet}
                            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Create Study Set
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredStudySets.map((set) => {
                        // Generate pastel background color based on set color or use default
                        const getCardBackgroundColor = () => {
                            if (set.color) {
                                // Convert hex to pastel
                                const hex = set.color.replace('#', '');
                                const r = parseInt(hex.substr(0, 2), 16);
                                const g = parseInt(hex.substr(2, 2), 16);
                                const b = parseInt(hex.substr(4, 2), 16);
                                // Lighten the color
                                return `rgb(${Math.min(255, r + 200)}, ${Math.min(255, g + 200)}, ${Math.min(255, b + 200)})`;
                            }
                            // Default pastel colors
                            const pastels = [
                                'rgb(255, 250, 220)', // Light yellow
                                'rgb(255, 235, 205)', // Light orange
                                'rgb(220, 255, 220)', // Light green
                                'rgb(220, 240, 255)', // Light blue
                                'rgb(255, 220, 255)', // Light pink
                                'rgb(240, 240, 255)', // Light purple
                            ];
                            return pastels[parseInt(set.id) % pastels.length];
                        };

                        return (
                            <div
                                key={set.id}
                                onClick={() => onSelectStudySet?.(set)}
                                className="relative flex flex-col p-3.5 rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer"
                                style={{ backgroundColor: getCardBackgroundColor() }}
                            >
                                {/* Menu Button - Top Right */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // TODO: Show menu
                                    }}
                                    className="absolute top-2.5 right-2.5 p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded transition-colors"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>

                                {/* Icon - Top Left */}
                                <div className="mb-2.5">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: getRandomIconColor(set.id) }}
                                    >
                                        <div className="text-white">
                                            {getIconComponent(set.icon)}
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 flex flex-col min-h-0">
                                    <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-1" style={{ color: '#1e3a8a' }}>
                                        {set.name}
                                    </h3>
                                    {set.description && (
                                        <p className="text-xs text-gray-600 mb-2.5 line-clamp-1">
                                            {truncateDescription(set.description, 60)}
                                        </p>
                                    )}

                                    {/* Metadata - Horizontal at bottom */}
                                    <div className="mt-auto pt-2 border-t border-gray-200/50">
                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <FileText className="w-3 h-3" />
                                                {set.materialsCount || 0} materials
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(set.createdAt)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Globe className="w-3 h-3" />
                                                Public
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MyStudySets;

