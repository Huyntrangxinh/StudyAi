import React from 'react';
import { ArrowLeft, Link, Upload } from 'lucide-react';

interface FlashcardHeaderProps {
    isCollapsed: boolean;
    flashcardName: string;
    onBack: () => void;
}

export const FlashcardHeader: React.FC<FlashcardHeaderProps> = ({
    isCollapsed,
    flashcardName,
    onBack
}) => {
    return (
        <div className={`bg-white fixed top-0 right-0 z-10 transition-all duration-300 ${isCollapsed ? 'left-16' : 'left-40'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={onBack}
                            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Quay lại</span>
                        </button>
                        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-yellow-400 rounded-lg flex items-center justify-center">
                            <img src="/18.gif" alt="Flashcard" className="w-6 h-6 object-contain" />
                        </div>
                        <div className="flex items-center space-x-2">
                            <h1 className="text-xl font-bold text-gray-900">{flashcardName || 'Flashcard'}</h1>
                            <button className="p-1 text-gray-400 hover:text-gray-600" aria-label="More">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                            <span className="text-sm">Chia sẻ</span>
                        </button>
                        <button className="px-3 py-2 text-gray-600 hover:bg-gray-50 border border-gray-300 rounded-lg flex items-center space-x-2">
                            <span className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">i</span>
                            <span className="text-sm">Phản hồi</span>
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600">
                            <Link className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600">
                            <Upload className="w-4 h-4" />
                        </button>
                        <div className="relative">
                            <button className="p-2 text-gray-400 hover:text-gray-600">
                                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">H</div>
                            </button>
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">2</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

