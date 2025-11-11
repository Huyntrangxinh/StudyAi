import React from 'react';
import { CardFlipContainer } from './CardFlipContainer';
import { CardNavigation } from './CardNavigation';

interface CardDisplayAreaProps {
    currentCardIndex: number;
    totalCards: number;
    cardMaxWidth: number;
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
    onPrev: () => void;
    onNext: () => void;
}

export const CardDisplayArea: React.FC<CardDisplayAreaProps> = ({
    currentCardIndex,
    totalCards,
    cardMaxWidth,
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
    onCheckMultipleChoiceAnswer,
    onPrev,
    onNext
}) => {
    return (
        <div className="flex-1 flex items-start md:items-center justify-start pl-0 pr-2 md:pl-0 md:pr-4 py-4 md:py-6">
            <div className="w-full" style={{ maxWidth: Math.min(cardMaxWidth, 800) }}>
                <div className="flex items-center justify-between mb-3 pr-0">
                    <span className="text-sm font-medium text-gray-600">Thuật ngữ</span>
                    <span className="text-sm text-gray-500">
                        {currentCardIndex + 1}/{totalCards}
                    </span>
                </div>

                <div
                    className="w-full h-96 md:h-[28rem] overflow-hidden"
                    style={{ perspective: '1000px' }}
                >
                    <CardFlipContainer
                        currentCard={currentCard}
                        isFlipped={isFlipped}
                        slideDirection={slideDirection}
                        isSliding={isSliding}
                        bookmarkedCards={bookmarkedCards}
                        fillBlankInput={fillBlankInput}
                        fillBlankChecked={fillBlankChecked}
                        fillBlankIsCorrect={fillBlankIsCorrect}
                        fillBlankHint={fillBlankHint}
                        showCorrectAnswer={showCorrectAnswer}
                        correctAnswer={correctAnswer}
                        selectedOptionIndex={selectedOptionIndex}
                        multipleChoiceChecked={multipleChoiceChecked}
                        multipleChoiceIsCorrect={multipleChoiceIsCorrect}
                        onFlip={onFlip}
                        onToggleBookmark={onToggleBookmark}
                        onShowFillBlankHint={onShowFillBlankHint}
                        onSetFillBlankInput={onSetFillBlankInput}
                        onCheckFillBlankAnswer={onCheckFillBlankAnswer}
                        onShowCorrectAnswer={onShowCorrectAnswer}
                        onSetSelectedOptionIndex={onSetSelectedOptionIndex}
                        onCheckMultipleChoiceAnswer={onCheckMultipleChoiceAnswer}
                    />
                </div>

                <CardNavigation
                    currentIndex={currentCardIndex}
                    totalCards={totalCards}
                    onPrev={onPrev}
                    onNext={onNext}
                    isSliding={isSliding}
                />
            </div>
        </div>
    );
};

