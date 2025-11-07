import React from 'react';

interface MultipleChoiceCardProps {
    card: any;
    selectedOptionIndex: number | null;
    multipleChoiceChecked: boolean;
    multipleChoiceIsCorrect: boolean | null;
    onSelectOption: (index: number) => void;
    onCheckAnswer: () => void;
}

export const MultipleChoiceCard: React.FC<MultipleChoiceCardProps> = ({
    card,
    selectedOptionIndex,
    multipleChoiceChecked,
    multipleChoiceIsCorrect,
    onSelectOption,
    onCheckAnswer
}) => {
    let options = card.multipleChoiceOptions;
    let correctIndex = card.correctAnswerIndex;

    if (!options && card.definition) {
        try {
            const parsed = typeof card.definition === 'string' ? JSON.parse(card.definition) : card.definition;
            if (parsed && parsed.options) {
                options = parsed.options;
                correctIndex = parsed.correctIndex ?? parsed.correctAnswerIndex ?? 0;
            }
        } catch (e) {
            console.error('Error parsing multiple choice:', e);
        }
    }

    if (!options || options.length === 0) {
        return <div className="text-gray-500">No options available</div>;
    }

    return (
        <div className="w-full flex flex-col items-center space-y-4 py-4">
            <div className="text-2xl text-gray-800 mb-4 max-w-4xl w-full px-4 break-words overflow-y-auto max-h-40 scrollbar-hover">
                {card.term}
            </div>
            {card.termImage && (
                <img
                    src={card.termImage}
                    alt="Term"
                    className="w-full max-w-md mx-auto rounded-lg object-contain mb-4"
                />
            )}

            <div className="w-full max-w-2xl">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {options.map((option: string, index: number) => {
                        const isSelected = selectedOptionIndex === index;
                        const isCorrect = correctIndex === index;
                        const showResult = multipleChoiceChecked;

                        let bgColor = 'bg-white';
                        let borderColor = 'border-gray-300';
                        let textColor = 'text-gray-800';
                        let icon = null;

                        if (showResult) {
                            if (isCorrect) {
                                bgColor = 'bg-green-50';
                                borderColor = 'border-green-500';
                                textColor = 'text-green-800';
                                icon = (
                                    <div className="absolute top-2 right-2">
                                        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                );
                            } else {
                                bgColor = 'bg-red-50';
                                borderColor = 'border-red-500';
                                textColor = 'text-red-800';
                                icon = (
                                    <div className="absolute top-2 right-2">
                                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </div>
                                );
                            }
                        } else if (isSelected) {
                            borderColor = 'border-blue-500';
                        }

                        return (
                            <div
                                key={index}
                                data-option
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!multipleChoiceChecked) {
                                        onSelectOption(index);
                                    }
                                }}
                                className={`relative p-6 rounded-lg border-2 ${borderColor} ${bgColor} ${textColor} cursor-pointer transition-all overflow-y-auto min-h-[80px] max-h-56 scrollbar-hover ${!multipleChoiceChecked ? 'hover:border-blue-400 hover:shadow-md' : ''
                                    }`}
                            >
                                {icon}
                                <div className="text-lg font-medium break-words pr-8">
                                    {option || `Option ${index + 1}`}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {multipleChoiceChecked && multipleChoiceIsCorrect === false && (
                    <div className="text-center text-xl font-semibold text-gray-900 mb-4">
                        You are incorrect!
                    </div>
                )}

                <button
                    data-check-button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (selectedOptionIndex !== null && !multipleChoiceChecked) {
                            onCheckAnswer();
                        }
                    }}
                    disabled={selectedOptionIndex === null || multipleChoiceChecked}
                    className="px-6 py-3 bg-purple-700 hover:bg-purple-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                    Check Answers
                </button>
            </div>
        </div>
    );
};

