import React from 'react';
import { GraduationCap } from 'lucide-react';

interface ActionButtonsProps {
    isCollapsed: boolean;
    showScratchEditor: boolean;
    onBack: () => void;
    onContinue: () => void;
    onStudyNow: () => Promise<void>;
    selectedOption?: string;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
    isCollapsed,
    showScratchEditor,
    onBack,
    onContinue,
    onStudyNow,
    selectedOption
}) => {
    if (showScratchEditor) {
        return (
            <div className={`fixed bottom-0 z-20 transition-all duration-300 ${isCollapsed ? 'left-16' : 'left-40'} w-full bg-white border-t border-gray-200 p-4 flex justify-center space-x-4 shadow-lg`} style={{ transform: 'translateX(-20px)' }}>
                <button
                    onClick={onStudyNow}
                    className="px-6 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 flex items-center"
                >
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Học ngay
                </button>
            </div>
        );
    }

    return (
        <div className={`fixed bottom-0 z-20 transition-all duration-300 ${isCollapsed ? 'left-16' : 'left-40'} w-full bg-white border-t border-gray-200 p-4 flex justify-center space-x-4 shadow-lg`}>
            <button
                onClick={onBack}
                className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 transition-colors duration-200"
            >
                Hủy
            </button>
            <button
                onClick={onContinue}
                disabled={!selectedOption}
                className={`px-6 py-2 rounded-lg transition-colors duration-200 ${selectedOption
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
            >
                Tiếp tục
            </button>
        </div>
    );
};

