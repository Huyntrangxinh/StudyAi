import React from 'react';

interface EmptyStateProps {
    flashcardsLength: number;
    onBack: () => void;
    isCollapsed: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ flashcardsLength, onBack, isCollapsed }) => {
    return (
        <div className={`min-h-screen bg-gray-50 transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-48'}`}>
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Không có thẻ ghi nhớ nào</h2>
                    <p className="text-gray-600 mb-6">Hãy tạo thẻ ghi nhớ trước khi bắt đầu học</p>
                    <p className="text-sm text-gray-500 mb-4">Debug: {flashcardsLength} flashcards loaded</p>
                    <button
                        onClick={onBack}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Quay lại
                    </button>
                </div>
            </div>
        </div>
    );
};

