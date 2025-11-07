import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface CardNavigationProps {
    currentIndex: number;
    totalCards: number;
    onPrev: () => void;
    onNext: () => void;
    isSliding: boolean;
}

export const CardNavigation: React.FC<CardNavigationProps> = ({
    currentIndex,
    totalCards,
    onPrev,
    onNext,
    isSliding
}) => {
    return (
        <div className="flex items-center justify-center space-x-4 mt-8">
            <button
                onClick={onPrev}
                disabled={currentIndex === 0 || isSliding}
                className="p-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors"
            >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <button
                onClick={onNext}
                disabled={currentIndex === totalCards - 1 || isSliding}
                className="p-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors"
            >
                <ArrowRight className="w-6 h-6 text-gray-600" />
            </button>
        </div>
    );
};

