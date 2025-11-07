import { useState, useEffect } from 'react';

interface UseCardNavigationProps {
    flashcardsLength: number;
    isSliding: boolean;
    setIsSliding: (value: boolean) => void;
    slideDirection: 'left' | 'right' | null;
    setSlideDirection: (value: 'left' | 'right' | null) => void;
    setIsFlipped: (value: boolean) => void;
}

export const useCardNavigation = ({
    flashcardsLength,
    isSliding,
    setIsSliding,
    slideDirection,
    setSlideDirection,
    setIsFlipped
}: UseCardNavigationProps) => {
    const [currentCardIndex, setCurrentCardIndex] = useState(0);

    useEffect(() => {
        if (flashcardsLength > 0 && currentCardIndex >= flashcardsLength) {
            setCurrentCardIndex(0);
        }
    }, [flashcardsLength, currentCardIndex]);

    const nextCard = () => {
        console.log('Next button clicked');
        console.log('Current index:', currentCardIndex);
        console.log('Total cards:', flashcardsLength);
        console.log('Can go next?', currentCardIndex < flashcardsLength - 1);
        console.log('Is sliding?', isSliding);

        if (currentCardIndex < flashcardsLength - 1 && !isSliding) {
            console.log('Moving to next card');
            setIsSliding(true);
            setSlideDirection('left');
            setIsFlipped(false);

            setTimeout(() => {
                setCurrentCardIndex(prev => {
                    console.log('Updating index from', prev, 'to', prev + 1);
                    return prev + 1;
                });
                setSlideDirection(null);
                setTimeout(() => {
                    setIsSliding(false);
                }, 100);
            }, 300);
        } else {
            console.log('Cannot go next - either at end or sliding');
        }
    };

    const prevCard = () => {
        if (currentCardIndex > 0 && !isSliding) {
            setIsSliding(true);
            setSlideDirection('right');
            setIsFlipped(false);

            setTimeout(() => {
                setCurrentCardIndex(prev => prev - 1);
                setSlideDirection(null);
                setTimeout(() => {
                    setIsSliding(false);
                }, 100);
            }, 300);
        }
    };

    return {
        currentCardIndex,
        setCurrentCardIndex,
        nextCard,
        prevCard
    };
};

