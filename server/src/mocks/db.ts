// Mock database for files and summaries
export type FileRow = {
    id: string;
    owner: string;          // userId
    name: string;
    path: string;         // ./uploads/xxx.pdf
    bytes: number;
    pages?: number | null;
    createdAt: string;
};

export type SummaryRow = {
    id: string;
    fileId: string;
    bullets: string[];
    structured: {
        overview?: string;
        key_points?: string[];
        definitions?: string[];
        methods_or_arguments?: string[];
        conclusion?: string;
        study_tips?: string[];
    };
    createdAt: string;
};

export const mockDB = {
    files: new Map<string, FileRow>(),
    summaries: new Map<string, SummaryRow>(),
};

// Helper functions
export const getFilesByOwner = (owner: string): FileRow[] => {
    return Array.from(mockDB.files.values()).filter(file => file.owner === owner);
};

export const getSummaryByFileId = (fileId: string): SummaryRow | undefined => {
    return Array.from(mockDB.summaries.values()).find(summary => summary.fileId === fileId);
};

export const deleteFile = (fileId: string): boolean => {
    const file = mockDB.files.get(fileId);
    if (file) {
        mockDB.files.delete(fileId);
        // Also delete associated summary
        const summary = getSummaryByFileId(fileId);
        if (summary) {
            mockDB.summaries.delete(summary.id);
        }
        return true;
    }
    return false;
};


