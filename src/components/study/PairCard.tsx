import React from 'react';

interface PairCardProps {
    card: any;
    isFlipped: boolean;
}

export const PairCard: React.FC<PairCardProps> = ({ card, isFlipped }) => {
    if (!isFlipped) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <p className="text-2xl text-gray-800 mb-4 cursor-pointer text-center px-4">
                    {card.term}
                </p>
                {card.termImage && (
                    <div className="flex-shrink-0 mb-4">
                        <img
                            src={card.termImage}
                            alt="Term"
                            className="max-w-xs max-h-64 w-auto h-auto rounded-lg object-contain cursor-pointer"
                        />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full">
            <p className="text-2xl text-gray-800 mb-4 text-center px-4">
                {card.definition}
            </p>
            {card.definitionImage && (
                <div className="flex-shrink-0 mb-4">
                    <img
                        src={card.definitionImage}
                        alt="Definition"
                        className="max-w-xs max-h-64 w-auto h-auto rounded-lg object-contain"
                    />
                </div>
            )}
        </div>
    );
};

