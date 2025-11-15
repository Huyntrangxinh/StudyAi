import React, { useState, useEffect } from 'react';
import { Search, Plus, FolderPlus, FileText, X } from 'lucide-react';
import MyStudySetsCard from './MyStudySetsCard';
import RenameStudySetModal from './modals/RenameStudySetModal';
import type { StudySet } from '../types/studySet';

interface MyStudySetsProps {
    userId: string;
    onSelectStudySet?: (studySet: StudySet) => void;
    onCreateStudySet?: () => void;
    onCreateFolder?: () => void;
    isDarkMode?: boolean;
}

const MyStudySets: React.FC<MyStudySetsProps> = ({
    userId,
    onSelectStudySet,
    onCreateStudySet,
    onCreateFolder,
    isDarkMode = false
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
    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
    const [folderName, setFolderName] = useState('');
    const [folderError, setFolderError] = useState('');

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

    const handleCreateFolder = () => {
        setIsCreateFolderModalOpen(true);
        setFolderName('');
        setFolderError('');
    };

    const handleCreateFolderSubmit = async () => {
        const trimmedName = folderName.trim();
        if (!trimmedName) {
            setFolderError('Tên folder không được để trống.');
            return;
        }

        try {
            setIsProcessing(true);
            setFolderError('');
            // TODO: Implement API call to create folder
            // For now, just show success message
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call

            setIsCreateFolderModalOpen(false);
            setFolderName('');
            // Show success toast if available
            if (onCreateFolder) {
                onCreateFolder();
            }
        } catch (error) {
            console.error('Error creating folder:', error);
            setFolderError('Không thể tạo folder. Vui lòng thử lại.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCreateFolderCancel = () => {
        setIsCreateFolderModalOpen(false);
        setFolderName('');
        setFolderError('');
    };

    return (
        <div className={`flex-1 p-6 min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
            {/* Header */}
            <div className="mb-5 flex items-center justify-between pt-12">
                <div>
                    <h1 className={`text-xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Bộ học của tôi</h1>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Quản lý và truy cập tất cả tài liệu học tập của bạn ở một nơi</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onCreateStudySet}
                        className="flex items-center gap-2 px-3 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-medium">Tạo Bộ Học</span>
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-5">
                <div className="relative w-full">
                    <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm bộ học..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${isDarkMode
                            ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-500'
                            : 'bg-white border border-gray-200 text-gray-900'
                            }`}
                    />
                </div>
            </div>

            {/* Study Sets List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Đang tải bộ học...</div>
                </div>
            ) : filteredStudySets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className={`w-16 h-16 mb-4 ${isDarkMode ? 'text-gray-700' : 'text-gray-300'}`} />
                    <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Không tìm thấy bộ học</h3>
                    <p className={isDarkMode ? 'text-gray-400 mb-4' : 'text-gray-500 mb-4'}>
                        {searchTerm ? 'Thử từ khóa tìm kiếm khác' : 'Tạo bộ học đầu tiên của bạn để bắt đầu'}
                    </p>
                    {!searchTerm && (
                        <button
                            onClick={onCreateStudySet}
                            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Tạo Bộ Học
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredStudySets.map((set) => (
                        <MyStudySetsCard
                            key={set.id}
                            studySet={set}
                            isMenuOpen={openMenuId === set.id}
                            isProcessing={isProcessing}
                            isDarkMode={isDarkMode}
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
                isDarkMode={isDarkMode}
                onChange={setRenameValue}
                onCancel={handleRenameCancel}
                onSubmit={handleRenameSubmit}
            />

            {/* Create Folder Modal */}
            {isCreateFolderModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className={`rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Tạo Folder</h3>
                            <button
                                onClick={handleCreateFolderCancel}
                                className={`p-1 rounded-lg hover:bg-gray-100 ${isDarkMode ? 'hover:bg-gray-700' : ''}`}
                            >
                                <X className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                            </button>
                        </div>
                        <div className="mb-4">
                            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Tên folder
                            </label>
                            <input
                                type="text"
                                value={folderName}
                                onChange={(e) => {
                                    setFolderName(e.target.value);
                                    setFolderError('');
                                }}
                                placeholder="Nhập tên folder"
                                className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${folderError
                                    ? 'border-red-500'
                                    : isDarkMode
                                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                        : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                autoFocus
                            />
                            {folderError && (
                                <p className="mt-1 text-sm text-red-500">{folderError}</p>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={handleCreateFolderCancel}
                                disabled={isProcessing}
                                className={`px-4 py-2 rounded-lg transition-colors ${isDarkMode
                                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    } disabled:opacity-50`}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCreateFolderSubmit}
                                disabled={isProcessing || !folderName.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? 'Đang tạo...' : 'Tạo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyStudySets;

