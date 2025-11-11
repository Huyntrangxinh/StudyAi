import React, { useState, useEffect } from 'react';
import { Search, Plus, FolderPlus, FileText } from 'lucide-react';
import MyStudySetsCard from './MyStudySetsCard';
import RenameStudySetModal from './modals/RenameStudySetModal';
import type { StudySet } from '../types/studySet';

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
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [renameTarget, setRenameTarget] = useState<StudySet | null>(null);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [renameError, setRenameError] = useState('');

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

    const applyStudySetUpdates = (updater: (prev: StudySet[]) => StudySet[]) => {
        setStudySets(prev => {
            const next = updater(prev);
            if (!searchTerm.trim()) {
                setFilteredStudySets(next);
            } else {
                const lower = searchTerm.toLowerCase();
                setFilteredStudySets(
                    next.filter(set =>
                        set.name.toLowerCase().includes(lower) ||
                        set.description?.toLowerCase().includes(lower)
                    )
                );
            }
            return next;
        });
    };

    const handleRenameClick = (set: StudySet) => {
        setOpenMenuId(null);
        setRenameTarget(set);
        setRenameValue(set.name);
        setRenameError('');
        setIsRenameModalOpen(true);
    };

    const handleRenameSubmit = async () => {
        if (!renameTarget) {
            return;
        }

        const trimmedName = renameValue.trim();
        if (!trimmedName) {
            setRenameError('Tên study set không được để trống.');
            return;
        }

        if (trimmedName === renameTarget.name) {
            setIsRenameModalOpen(false);
            setRenameTarget(null);
            return;
        }

        try {
            setIsProcessing(true);
            setRenameError('');
            const response = await fetch(`http://localhost:3001/api/study-sets/${renameTarget.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmedName, userId })
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => null);
                throw new Error(errorBody?.error || 'Failed to rename study set');
            }

            const updated = await response.json();
            applyStudySetUpdates(prev =>
                prev.map(s => (s.id === renameTarget.id ? { ...s, name: updated.name || trimmedName } : s))
            );
            setIsRenameModalOpen(false);
            setRenameTarget(null);
        } catch (error) {
            console.error('Error renaming study set:', error);
            setRenameError('Không thể đổi tên study set. Vui lòng thử lại.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRenameCancel = () => {
        setIsRenameModalOpen(false);
        setRenameTarget(null);
        setRenameError('');
    };

    const handleDeleteSet = async (set: StudySet) => {
        const confirmed = window.confirm(`Bạn có chắc muốn xóa study set "${set.name}"?`);
        if (!confirmed) {
            setOpenMenuId(null);
            return;
        }

        try {
            setIsProcessing(true);
            const response = await fetch(`http://localhost:3001/api/study-sets/${set.id}?userId=${encodeURIComponent(userId)}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete study set');
            }

            applyStudySetUpdates(prev => prev.filter(s => s.id !== set.id));
        } catch (error) {
            console.error('Error deleting study set:', error);
            alert('Không thể xóa study set. Vui lòng thử lại.');
        } finally {
            setIsProcessing(false);
            setOpenMenuId(null);
        }
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
                    {filteredStudySets.map((set) => (
                        <MyStudySetsCard
                            key={set.id}
                            studySet={set}
                            isMenuOpen={openMenuId === set.id}
                            isProcessing={isProcessing}
                            onSelect={() => onSelectStudySet?.(set)}
                            onToggleMenu={(e: React.MouseEvent<HTMLButtonElement>) => {
                                e.stopPropagation();
                                setOpenMenuId(prev => (prev === set.id ? null : set.id));
                            }}
                            onRenameClick={() => handleRenameClick(set)}
                            onDeleteClick={() => handleDeleteSet(set)}
                            formatDate={formatDate}
                        />
                    ))}
                </div>
            )}

            <RenameStudySetModal
                isOpen={isRenameModalOpen}
                currentName={renameTarget?.name}
                value={renameValue}
                error={renameError}
                isSubmitting={isProcessing}
                onChange={setRenameValue}
                onCancel={handleRenameCancel}
                onSubmit={handleRenameSubmit}
            />
        </div>
    );
};

export default MyStudySets;

