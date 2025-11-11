import React from 'react';
import { Star, Lightbulb } from 'lucide-react';
import { isFillBlankCard, isMultipleChoiceCard } from '../../utils/flashcardStudyHelpers';
import { FillBlankCard } from './FillBlankCard';
import { MultipleChoiceCard } from './MultipleChoiceCard';
import { PairCard } from './PairCard';

interface CardFlipContainerProps {
    currentCard: any;
    isFlipped: boolean;
    slideDirection: 'left' | 'right' | null;
    isSliding: boolean;
    bookmarkedCards: Set<string>;
    fillBlankInput: string;
    fillBlankChecked: boolean;
    fillBlankIsCorrect: boolean | null;
    fillBlankHint: string;
    showCorrectAnswer: boolean;
    correctAnswer: string;
    selectedOptionIndex: number | null;
    multipleChoiceChecked: boolean;
    multipleChoiceIsCorrect: boolean | null;
    onFlip: () => void;
    onToggleBookmark: () => void;
    onShowFillBlankHint: () => void;
    onSetFillBlankInput: (value: string) => void;
    onCheckFillBlankAnswer: () => void;
    onShowCorrectAnswer: () => void;
    onSetSelectedOptionIndex: (index: number) => void;
    onCheckMultipleChoiceAnswer: () => void;
}

export const CardFlipContainer: React.FC<CardFlipContainerProps> = ({
    currentCard,
    isFlipped,
    slideDirection,
    isSliding,
    bookmarkedCards,
    fillBlankInput,
    fillBlankChecked,
    fillBlankIsCorrect,
    fillBlankHint,
    showCorrectAnswer,
    correctAnswer,
    selectedOptionIndex,
    multipleChoiceChecked,
    multipleChoiceIsCorrect,
    onFlip,
    onToggleBookmark,
    onShowFillBlankHint,
    onSetFillBlankInput,
    onCheckFillBlankAnswer,
    onShowCorrectAnswer,
    onSetSelectedOptionIndex,
    onCheckMultipleChoiceAnswer
}) => {
    return (
        <div
            className={`relative w-full h-full cursor-pointer transition-all duration-300 ease-in-out`}
            style={{
                transformStyle: 'preserve-3d',
                transform: `
                    ${isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)'}
                    ${slideDirection === 'left' ? 'translateX(-100%)' : ''}
                    ${slideDirection === 'right' ? 'translateX(100%)' : ''}
                `,
                opacity: isSliding ? 0.7 : 1
            }}
            onClick={onFlip}
        >
            {/* Front */}
            <div
                className="absolute inset-0 bg-white rounded-2xl border border-gray-200 shadow-xl p-8 flex flex-col items-center text-center cursor-pointer overflow-y-auto scrollbar-hover"
                style={{ backfaceVisibility: 'hidden', justifyContent: isMultipleChoiceCard(currentCard) ? 'flex-start' : 'center' }}
            >
                {isFillBlankCard(currentCard) && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onShowFillBlankHint();
                        }}
                        className="absolute top-3 left-3 p-2 rounded-full transition-colors text-gray-400 hover:text-yellow-500 hover:bg-yellow-50"
                        aria-label="hint"
                        title="Gợi ý"
                    >
                        <Lightbulb className="w-5 h-5" />
                    </button>
                )}

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        console.log('⭐ [CARD FRONT] Star clicked, card id:', currentCard.id, 'type:', typeof currentCard.id);
                        onToggleBookmark();
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full transition-colors text-gray-400 hover:text-yellow-500"
                    aria-label="bookmark"
                >
                    <Star className={`w-5 h-5 ${bookmarkedCards.has(String(currentCard.id)) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                </button>

                {isFillBlankCard(currentCard) ? (
                    <FillBlankCard
                        card={currentCard}
                        fillBlankInput={fillBlankInput}
                        fillBlankChecked={fillBlankChecked}
                        fillBlankIsCorrect={fillBlankIsCorrect}
                        fillBlankHint={fillBlankHint}
                        showCorrectAnswer={showCorrectAnswer}
                        correctAnswer={correctAnswer}
                        onInputChange={onSetFillBlankInput}
                        onCheckAnswer={onCheckFillBlankAnswer}
                        onShowHint={onShowFillBlankHint}
                        onShowCorrectAnswer={onShowCorrectAnswer}
                    />
                ) : isMultipleChoiceCard(currentCard) ? (
                    <MultipleChoiceCard
                        card={currentCard}
                        selectedOptionIndex={selectedOptionIndex}
                        multipleChoiceChecked={multipleChoiceChecked}
                        multipleChoiceIsCorrect={multipleChoiceIsCorrect}
                        onSelectOption={onSetSelectedOptionIndex}
                        onCheckAnswer={onCheckMultipleChoiceAnswer}
                    />
                ) : (
                    <PairCard card={currentCard} isFlipped={false} />
                )}
            </div>

            {/* Back */}
            <div
                className="absolute inset-0 bg-white rounded-2xl border border-gray-200 shadow-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer overflow-y-auto scrollbar-hover"
                style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateX(180deg)'
                }}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        console.log('⭐ [CARD BACK] Star clicked, card id:', currentCard.id);
                        onToggleBookmark();
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full transition-colors text-gray-400 hover:text-yellow-500"
                    aria-label="bookmark"
                >
                    <Star className={`w-5 h-5 ${bookmarkedCards.has(String(currentCard.id)) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                </button>
                {isMultipleChoiceCard(currentCard) ? (
                    <div className="w-full">
                        {(() => {
                            let explanation = null;
                            let correctAnswer = null;

                            if (currentCard.definition) {
                                try {
                                    const parsed = typeof currentCard.definition === 'string'
                                        ? JSON.parse(currentCard.definition)
                                        : currentCard.definition;
                                    if (parsed && parsed.options && parsed.correctIndex !== undefined) {
                                        correctAnswer = parsed.options[parsed.correctIndex];
                                        explanation = parsed.explanation || `Đáp án đúng: ${correctAnswer}`;
                                    } else {
                                        explanation = currentCard.definition;
                                    }
                                } catch (e) {
                                    explanation = currentCard.definition;
                                }
                            }

                            if (!explanation && currentCard.multipleChoiceOptions && currentCard.correctAnswerIndex !== undefined) {
                                const correctOpt = currentCard.multipleChoiceOptions[currentCard.correctAnswerIndex];
                                explanation = `Đáp án đúng: ${correctOpt}`;
                            }

                            return (
                                <div className="space-y-4">
                                    {explanation && (
                                        <p className="text-2xl text-gray-800 mb-4">{explanation}</p>
                                    )}
                                    {correctAnswer && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <p className="text-lg font-semibold text-green-800">Đáp án đúng:</p>
                                            <p className="text-xl text-green-900 mt-2">{correctAnswer}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                ) : (
                    <PairCard card={currentCard} isFlipped={true} />
                )}
            </div>
        </div>
    );
};

