import React from 'react';

interface PairCardProps {
    card: any;
    isFlipped: boolean;
}

export const PairCard: React.FC<PairCardProps> = ({ card, isFlipped }) => {
    if (!isFlipped) {
        return (
            <>
                <p className="text-2xl text-gray-800 mb-4 cursor-pointer">
                    {card.term}
                </p>
                {card.termImage && (
                    <img
                        src={card.termImage}
                        alt="Term"
                        className="w-full max-w-md mx-auto rounded-lg object-contain cursor-pointer"
                    />
                )}
            </>
        );
    }

    return (
        <>
            <p className="text-2xl text-gray-800 mb-4">{card.definition}</p>
            {card.definitionImage && (
                <img
                    src={card.definitionImage}
                    alt="Definition"
                    className="w-full max-w-md mx-auto rounded-lg object-contain"
                />
            )}
        </>
    );
};

