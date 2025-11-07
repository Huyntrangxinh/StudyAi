export interface Card {
    id: string;
    term: string;
    definition: string;
    termImage?: string;
    definitionImage?: string;
    reverseEnabled?: boolean;
    audioEnabled?: boolean;
    saved?: boolean;
    dbId?: number;
    type?: string;
    fillBlankAnswers?: string[];
    multipleChoiceOptions?: string[];
    correctAnswerIndex?: number;
}

export interface CreateFlashcardSetProps {
    onBack: () => void;
    studySetId: string;
    studySetName: string;
    isCollapsed?: boolean;
}

export interface Material {
    id: string;
    name: string;
    created_at?: string;
    size?: number;
    file_path?: string;
}

export interface TypeCounts {
    termDef: number;
    fillBlank: number;
    multipleChoice: number;
}

export type FlashcardType = 'pair' | 'fillblank' | 'multiplechoice';
export type ImageModalType = 'term' | 'definition' | null;
export type SelectedType = 'termDef' | 'fillBlank' | 'multipleChoice';
export type ImageSourceType = 'search' | 'upload' | 'url' | null;

