import { useState, useEffect, useRef } from 'react';
import { Card } from '../types/flashcard';

export const useDragAndDrop = (
    flashcards: Card[],
    setFlashcards: React.Dispatch<React.SetStateAction<Card[]>>
) => {
    const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
    const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
    const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const startAutoScroll = (direction: 'up' | 'down') => {
        if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
        }

        const scrollSpeed = 10;
        const scrollInterval = 16;

        scrollIntervalRef.current = setInterval(() => {
            const scrollAmount = direction === 'up' ? -scrollSpeed : scrollSpeed;
            window.scrollBy({
                top: scrollAmount,
                behavior: 'auto'
            });
        }, scrollInterval);
    };

    const stopAutoScroll = () => {
        if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
        }
    };

    const handleDragStart = (e: React.DragEvent, cardId: string) => {
        setDraggedCardId(cardId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', cardId);
    };

    const handleDragOver = (e: React.DragEvent, cardId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (draggedCardId && draggedCardId !== cardId) {
            setDragOverCardId(cardId);
        }
    };

    const handleDragLeave = () => {
        setDragOverCardId(null);
        stopAutoScroll();
    };

    const handleDrop = (e: React.DragEvent, targetCardId: string) => {
        e.preventDefault();
        stopAutoScroll();

        if (!draggedCardId || draggedCardId === targetCardId) {
            setDraggedCardId(null);
            setDragOverCardId(null);
            return;
        }

        const draggedIndex = flashcards.findIndex(c => c.id === draggedCardId);
        const targetIndex = flashcards.findIndex(c => c.id === targetCardId);

        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedCardId(null);
            setDragOverCardId(null);
            return;
        }

        const newFlashcards = [...flashcards];
        const [removed] = newFlashcards.splice(draggedIndex, 1);
        newFlashcards.splice(targetIndex, 0, removed);

        setFlashcards(newFlashcards);
        setDraggedCardId(null);
        setDragOverCardId(null);
    };

    const handleDragEnd = () => {
        stopAutoScroll();
        setDraggedCardId(null);
        setDragOverCardId(null);
    };

    useEffect(() => {
        if (!draggedCardId) {
            stopAutoScroll();
            return;
        }

        const handleGlobalDragOver = (e: DragEvent) => {
            const scrollThreshold = 100;
            const mouseY = e.clientY;
            const viewportHeight = window.innerHeight;

            if (mouseY < scrollThreshold) {
                startAutoScroll('up');
            } else if (mouseY > viewportHeight - scrollThreshold) {
                startAutoScroll('down');
            } else {
                stopAutoScroll();
            }
        };

        const handleGlobalDragEnd = () => {
            stopAutoScroll();
        };

        document.addEventListener('dragover', handleGlobalDragOver);
        document.addEventListener('dragend', handleGlobalDragEnd);

        return () => {
            document.removeEventListener('dragover', handleGlobalDragOver);
            document.removeEventListener('dragend', handleGlobalDragEnd);
            stopAutoScroll();
        };
    }, [draggedCardId]);

    return {
        draggedCardId,
        dragOverCardId,
        handleDragStart,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleDragEnd
    };
};

