import React from 'react';
import { Shuffle, RotateCcw, Star, GraduationCap } from 'lucide-react';

interface ActionBarProps {
    isShuffled: boolean;
    audioEnabled: boolean;
    isBookmarked: boolean;
    isFlipped: boolean;
    showAiSidebar: boolean;
    sidebarWidth: number;
    onShuffle: () => void;
    onToggleAudio: () => void;
    onReplayAudio: () => void;
    onToggleBookmark: () => void;
    onFlip: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
    isShuffled,
    audioEnabled,
    isBookmarked,
    isFlipped,
    showAiSidebar,
    sidebarWidth,
    onShuffle,
    onToggleAudio,
    onReplayAudio,
    onToggleBookmark,
    onFlip
}) => {
    return (
        <div
            className="fixed bottom-4 left-0 z-10 pointer-events-none"
            style={{ right: showAiSidebar ? sidebarWidth + 24 : 0 }}
        >
            <div className="flex items-center gap-3 justify-center pointer-events-auto">
                <button
                    onClick={onShuffle}
                    className={`pointer-events-auto px-4 py-2 rounded-full border ${isShuffled ? 'border-emerald-400 text-emerald-600' : 'border-emerald-300 text-emerald-600'} bg-white shadow-sm hover:bg-emerald-50 transition-colors flex items-center gap-2`}
                >
                    <Shuffle className="w-4 h-4" />
                    <span className="text-sm">Shuffle Flashcards</span>
                </button>
                <button
                    onClick={onToggleAudio}
                    className={`pointer-events-auto px-4 py-2 rounded-full ${audioEnabled ? 'text-blue-600 border-blue-300 bg-blue-50' : 'text-gray-700 border-gray-300'} bg-white border shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2`}
                    title="Bật/Tắt đọc thuật ngữ"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 5l-6 6h-3v2h3l6 6V5z"></path>
                        <path d="M19 5a7 7 0 010 14"></path>
                        <path d="M19 9a3 3 0 010 6"></path>
                    </svg>
                    <span className="text-sm">{audioEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}</span>
                </button>
                {audioEnabled && (
                    <button
                        onClick={onReplayAudio}
                        className="pointer-events-auto px-4 py-2 rounded-full text-green-600 border-green-300 bg-white shadow-sm hover:bg-green-50 transition-colors flex items-center gap-2"
                        title={isFlipped ? "Đọc lại định nghĩa" : "Đọc lại thuật ngữ"}
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        </svg>
                        <span className="text-sm">Đọc lại</span>
                    </button>
                )}
                <button
                    onClick={onToggleBookmark}
                    className="pointer-events-auto px-4 py-2 rounded-full text-gray-700 bg-white shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                    <Star className="w-4 h-4" />
                    <span className="text-sm">Bookmarked</span>
                </button>
                <button
                    onClick={onFlip}
                    className="pointer-events-auto px-4 py-2 rounded-full text-gray-700 bg-white shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                    <RotateCcw className="w-4 h-4" />
                    <span className="text-sm">Click to Flip</span>
                </button>
                <button
                    className="pointer-events-auto px-4 py-2 rounded-full border border-blue-400 text-blue-600 bg-white shadow-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                    <GraduationCap className="w-4 h-4" />
                    <span className="text-sm">Track Stats with Spaced Repetition</span>
                </button>
            </div>
        </div>
    );
};

