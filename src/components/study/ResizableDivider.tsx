import React from 'react';

interface ResizableDividerProps {
    showAiSidebar: boolean;
    onMouseDown: () => void;
}

export const ResizableDivider: React.FC<ResizableDividerProps> = ({ showAiSidebar, onMouseDown }) => {
    if (!showAiSidebar) return null;

    return (
        <div
            className="w-px h-[calc(100vh-64px)] cursor-col-resize bg-gray-100 hover:bg-blue-200 active:bg-blue-300 transition-colors relative group"
            onMouseDown={onMouseDown}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            title="Kéo để thay đổi kích thước chat"
        >
            <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-px bg-gray-200 group-hover:bg-blue-400 transition-colors"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col space-y-1 opacity-0 group-hover:opacity-60 transition-opacity">
                <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
                <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
                <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
            </div>
        </div>
    );
};

