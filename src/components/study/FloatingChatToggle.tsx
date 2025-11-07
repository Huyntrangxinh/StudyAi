import React from 'react';

interface FloatingChatToggleProps {
    showAiSidebar: boolean;
    showHint: boolean;
    onOpenChat: () => void;
    onHideHint: () => void;
}

export const FloatingChatToggle: React.FC<FloatingChatToggleProps> = ({
    showAiSidebar,
    showHint,
    onOpenChat,
    onHideHint
}) => {
    if (showAiSidebar) return null;

    return (
        <div className="fixed right-2 md:right-4 bottom-8 md:bottom-10 z-20 flex items-center space-x-3">
            {showHint && (
                <div className="px-3 py-2 bg-black/70 text-white text-sm rounded-lg shadow-md whitespace-nowrap select-none">
                    Cần trợ giúp? Nhấn vào tôi nhé!
                </div>
            )}
            <button
                onClick={onOpenChat}
                onMouseEnter={onHideHint}
                className="w-[160px] h-[180px] rounded-3xl bg-transparent flex items-center justify-center"
                title="Open chat"
            >
                <img
                    src={(process.env.PUBLIC_URL || '') + '/chatbot.gif?v=2'}
                    alt="Chatbot"
                    className="w-[140px] h-[140px] object-contain"
                />
            </button>
        </div>
    );
};

