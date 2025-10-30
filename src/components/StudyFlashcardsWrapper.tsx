import React from 'react';
// Use require to avoid TS path resolution hiccups in dev
// eslint-disable-next-line @typescript-eslint/no-var-requires
const StudyFlashcards = require('./StudyFlashcards').default as React.ComponentType<StudyFlashcardsWrapperProps>;

interface StudyFlashcardsWrapperProps {
    flashcards: Array<{
        id: string;
        term: string;
        definition: string;
        termImage?: string;
        definitionImage?: string;
    }>;
    onBack: () => void;
    isCollapsed: boolean;
    flashcardName?: string;
}

const StudyFlashcardsWrapper: React.FC<StudyFlashcardsWrapperProps> = (props) => {
    return <StudyFlashcards {...props} />;
};

export default StudyFlashcardsWrapper;
