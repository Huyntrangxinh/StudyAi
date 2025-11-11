import React from 'react';
import { Lightbulb } from 'lucide-react';
import { parseFillBlankText, FillBlankPart } from '../../utils/flashcardStudyHelpers';

interface FillBlankCardProps {
    card: any;
    fillBlankInput: string;
    fillBlankChecked: boolean;
    fillBlankIsCorrect: boolean | null;
    fillBlankHint: string;
    showCorrectAnswer: boolean;
    correctAnswer: string;
    onInputChange: (value: string) => void;
    onCheckAnswer: () => void;
    onShowHint: () => void;
    onShowCorrectAnswer: () => void;
}

export const FillBlankCard: React.FC<FillBlankCardProps> = ({
    card,
    fillBlankInput,
    fillBlankChecked,
    fillBlankIsCorrect,
    fillBlankHint,
    showCorrectAnswer,
    correctAnswer,
    onInputChange,
    onCheckAnswer,
    onShowHint,
    onShowCorrectAnswer
}) => {
    return (
        <div className="w-full flex flex-col items-center space-y-4">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onShowHint();
                }}
                className="absolute top-3 left-3 p-2 rounded-full transition-colors text-gray-400 hover:text-yellow-500 hover:bg-yellow-50"
                aria-label="hint"
                title="Gợi ý"
            >
                <Lightbulb className="w-5 h-5" />
            </button>

            <div className="text-2xl text-gray-800 mb-4 flex items-center flex-wrap justify-center gap-2">
                {parseFillBlankText(card.term).map((part: FillBlankPart, index: number) => (
                    part.type === 'text' ? (
                        <span key={index}>{part.content}</span>
                    ) : (
                        <div key={index} className="relative inline-block">
                            <input
                                type="text"
                                value={fillBlankInput}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    onInputChange(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !fillBlankChecked) {
                                        e.stopPropagation();
                                        onCheckAnswer();
                                    }
                                }}
                                onFocus={(e) => {
                                    if (fillBlankHint && fillBlankInput.length === 0) {
                                        e.target.style.color = 'transparent';
                                    }
                                }}
                                onBlur={(e) => {
                                    if (fillBlankInput.length === 0) {
                                        e.target.style.color = '';
                                    }
                                }}
                                disabled={fillBlankChecked}
                                className={`min-w-[120px] px-3 py-2 text-2xl text-center border-b-2 border-gray-400 focus:outline-none focus:border-blue-500 ${fillBlankChecked
                                    ? fillBlankIsCorrect
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-red-500 bg-red-50'
                                    : ''
                                    } ${fillBlankHint && fillBlankInput.length === 0 ? 'relative' : ''}`}
                                style={fillBlankHint && fillBlankInput.length === 0 ? { color: 'transparent' } : {}}
                                autoFocus
                            />
                            {fillBlankHint && fillBlankInput.length === 0 && (
                                <span
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onInputChange(fillBlankHint);
                                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                        if (input) {
                                            setTimeout(() => {
                                                input.focus();
                                                const length = fillBlankHint.length;
                                                input.setSelectionRange(length, length);
                                                input.style.color = '';
                                            }, 0);
                                        }
                                    }}
                                    className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-orange-500 cursor-pointer hover:text-orange-600 pointer-events-auto"
                                    title="Click để điền chữ đầu tiên"
                                >
                                    {fillBlankHint}
                                </span>
                            )}
                        </div>
                    )
                ))}
            </div>
            {fillBlankChecked && fillBlankIsCorrect === false && (
                <div className="text-sm text-gray-600 mb-2">
                    You got 1 incorrect.
                </div>
            )}
            {showCorrectAnswer && (
                <div className="text-2xl text-gray-800 mb-4">
                    {correctAnswer}
                </div>
            )}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (fillBlankChecked && fillBlankIsCorrect === false) {
                        onShowCorrectAnswer();
                    } else {
                        onCheckAnswer();
                    }
                }}
                disabled={!fillBlankInput.trim() || (fillBlankChecked && fillBlankIsCorrect === true)}
                className={`px-6 py-3 text-white font-semibold rounded-lg transition-colors ${fillBlankChecked && fillBlankIsCorrect === false
                    ? 'bg-purple-900 hover:bg-purple-800'
                    : 'bg-purple-700 hover:bg-purple-800'
                    } disabled:bg-gray-400 disabled:cursor-not-allowed`}
            >
                {fillBlankChecked && fillBlankIsCorrect === false ? 'Show Correct Answers' : 'Check Answers'}
            </button>
            {card.termImage && (
                <div className="flex-shrink-0 mb-4 mt-4">
                    <img
                        src={card.termImage}
                        alt="Term"
                        className="max-w-xs max-h-64 w-auto h-auto mx-auto rounded-lg object-contain"
                    />
                </div>
            )}
        </div>
    );
};

