import React from 'react';

interface GenerationProgressProps {
    genDone: number;
    genTotal: number;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({ genDone, genTotal }) => {
    return (
        <div className="mb-4 border border-blue-200 rounded-lg p-3 bg-blue-50 text-sm text-blue-800">
            <div className="flex items-center gap-2">
                <img src="/Tapta.gif" alt="loading" className="w-6 h-6 rounded-full" />
                <span>Đang tạo thêm thẻ ghi nhớ… Tiến độ {genDone} / {genTotal} thẻ</span>
            </div>
            <div className="mt-2 h-2 bg-blue-100 rounded">
                <div
                    className="h-2 bg-blue-500 rounded transition-all"
                    style={{ width: `${genTotal ? Math.min(100, Math.round((genDone / genTotal) * 100)) : 0}%` }}
                />
            </div>
        </div>
    );
};

