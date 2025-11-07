import { useState, useEffect } from 'react';

interface UseSidebarResizeProps {
    isCollapsed: boolean;
    showAiSidebar: boolean;
}

export const useSidebarResize = ({ isCollapsed, showAiSidebar }: UseSidebarResizeProps) => {
    const [sidebarWidth, setSidebarWidth] = useState<number>(300);
    const [isResizing, setIsResizing] = useState<boolean>(false);
    const [cardMaxWidth, setCardMaxWidth] = useState<number>(1200);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const viewportWidth = window.innerWidth;
            const newWidth = Math.max(250, Math.min(600, viewportWidth - e.clientX));
            setSidebarWidth(newWidth);
        };
        const onMouseUp = () => setIsResizing(false);
        if (isResizing) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isResizing]);

    useEffect(() => {
        const compute = () => {
            const viewportWidth = window.innerWidth;
            const leftNavWidth = isCollapsed ? 64 : 192;
            const gutter = 0;
            const effectiveSidebar = showAiSidebar ? sidebarWidth : 0;
            const available = Math.max(600, viewportWidth - leftNavWidth - effectiveSidebar - gutter);
            setCardMaxWidth(Math.min(1000, available));
        };
        compute();
        window.addEventListener('resize', compute);
        return () => window.removeEventListener('resize', compute);
    }, [sidebarWidth, isCollapsed, showAiSidebar]);

    return {
        sidebarWidth,
        setSidebarWidth,
        isResizing,
        setIsResizing,
        cardMaxWidth
    };
};

