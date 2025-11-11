import React from 'react';
import { MoreVertical, Calendar, FileText, Globe } from 'lucide-react';
import type { StudySet } from '../types/studySet';

interface MyStudySetsCardProps {
    studySet: StudySet;
    isMenuOpen: boolean;
    isProcessing: boolean;
    onSelect: () => void;
    onToggleMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onRenameClick: () => void;
    onDeleteClick: () => void;
    formatDate: (date: string) => string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
    book: <FileText className="w-4 h-4" />,
    calculator: <FileText className="w-4 h-4" />,
    globe: <FileText className="w-4 h-4" />,
    'hard-hat': <FileText className="w-4 h-4" />
};

const TIMELINE_COLORS = [
    'rgb(255, 250, 220)',
    'rgb(255, 235, 205)',
    'rgb(220, 255, 220)',
    'rgb(220, 240, 255)',
    'rgb(255, 220, 255)',
    'rgb(240, 240, 255)'
];

const ICON_COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#f97316',
    '#14b8a6',
    '#6366f1'
];

const truncateText = (text: string, maxLength: number) =>
    text.length <= maxLength ? text : `${text.substring(0, maxLength)}...`;

const MyStudySetsCard: React.FC<MyStudySetsCardProps> = ({
    studySet,
    isMenuOpen,
    isProcessing,
    onSelect,
    onToggleMenu,
    onRenameClick,
    onDeleteClick,
    formatDate
}) => {
    const icon = ICON_MAP[studySet.icon || 'book'] || ICON_MAP.book;
    const iconColor = ICON_COLORS[parseInt(studySet.id) % ICON_COLORS.length];
    const backgroundColor = studySet.color
        ? (() => {
            const hex = studySet.color.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return `rgb(${Math.min(255, r + 200)}, ${Math.min(255, g + 200)}, ${Math.min(255, b + 200)})`;
        })()
        : TIMELINE_COLORS[parseInt(studySet.id) % TIMELINE_COLORS.length];

    return (
        <div
            onClick={onSelect}
            className="relative flex flex-col p-3.5 rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer"
            style={{ backgroundColor }}
        >
            <div className="absolute top-2.5 right-2.5">
                <button
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleMenu(event);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded transition-colors"
                >
                    <MoreVertical className="w-4 h-4" />
                </button>
                {isMenuOpen && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 mt-2 w-36 rounded-lg border border-gray-200 bg-white shadow-lg z-10"
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRenameClick();
                            }}
                            className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                            disabled={isProcessing}
                        >
                            Đổi tên
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteClick();
                            }}
                            className="w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 disabled:opacity-60"
                            disabled={isProcessing}
                        >
                            Xóa
                        </button>
                    </div>
                )}
            </div>

            <div className="mb-2.5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: iconColor }}>
                    <div className="text-white">
                        {icon}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-1" style={{ color: '#1e3a8a' }}>
                    {studySet.name}
                </h3>
                {studySet.description && (
                    <p className="text-xs text-gray-600 mb-2.5 line-clamp-1">
                        {truncateText(studySet.description, 60)}
                    </p>
                )}

                <div className="mt-auto pt-2 border-t border-gray-200/50">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {studySet.materialsCount || 0} materials
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(studySet.createdAt)}
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
};

export default MyStudySetsCard;


