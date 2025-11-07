import React from 'react';

export const ScrollbarStyles: React.FC = () => {
    return (
        <style>{`
            .scrollbar-thin::-webkit-scrollbar {
                width: 6px;
                height: 6px;
            }
            .scrollbar-thin::-webkit-scrollbar-track {
                background: transparent;
            }
            .scrollbar-thin::-webkit-scrollbar-thumb {
                background: rgba(156, 163, 175, 0.3);
                border-radius: 3px;
            }
            .scrollbar-thin::-webkit-scrollbar-thumb:hover {
                background: rgba(156, 163, 175, 0.5);
            }
            /* Firefox */
            .scrollbar-thin {
                scrollbar-width: thin;
                scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
            }
        `}</style>
    );
};

