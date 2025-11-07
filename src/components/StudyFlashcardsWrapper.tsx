import React from 'react';
import StudyFlashcardsComponent from './StudyFlashcards';

interface StudyFlashcardsWrapperProps {
    flashcards: Array<{
        id: string;
        term: string;
        definition: string;
        termImage?: string;
        definitionImage?: string;
        type?: string; // 'pair', 'fillblank', 'multiplechoice'
        fillBlankAnswers?: string[]; // Correct answers for fill in the blank
        multipleChoiceOptions?: string[]; // Options for multiple choice
        correctAnswerIndex?: number; // Correct answer index for multiple choice
    }>;
    onBack: () => void;
    isCollapsed: boolean;
    flashcardName?: string;
    studySetId?: string;
}

const StudyFlashcardsWrapper: React.FC<StudyFlashcardsWrapperProps> = (props) => {
    if (!StudyFlashcardsComponent) {
        console.error('StudyFlashcards component is undefined');
        return <div>Error loading flashcards component</div>;
    }
    return <StudyFlashcardsComponent {...props} />;
};

export default StudyFlashcardsWrapper;
