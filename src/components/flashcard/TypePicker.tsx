import React from 'react';
import { ArrowLeft, BookOpen, PenTool, ListChecks } from 'lucide-react';
import { FlashcardHeader } from './FlashcardHeader';
import { TypeCounts, SelectedType, Material } from '../../types/flashcard';
import { clampCount } from '../../utils/flashcardHelpers';

interface TypePickerProps {
    isCollapsed: boolean;
    flashcardName: string;
    selectedMaterialIds: Set<string>;
    materialsInSet: Material[];
    typeCounts: TypeCounts;
    selectedType: SelectedType;
    onBack: () => void;
    onSetTypeCounts: (counts: TypeCounts) => void;
    onSetSelectedType: (type: SelectedType) => void;
    onGenerate: () => Promise<void>;
}

export const TypePicker: React.FC<TypePickerProps> = ({
    isCollapsed,
    flashcardName,
    selectedMaterialIds,
    materialsInSet,
    typeCounts,
    selectedType,
    onBack,
    onSetTypeCounts,
    onSetSelectedType,
    onGenerate
}) => {
    const totalSelected = typeCounts.termDef + typeCounts.fillBlank + typeCounts.multipleChoice;

    return (
        <div className={`relative min-h-screen transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-48'}`}>
            <div className="fixed inset-0 bg-white z-0"></div>
            <div className="relative z-10">
                <FlashcardHeader
                    isCollapsed={isCollapsed}
                    flashcardName={flashcardName}
                    onBack={onBack}
                />

                <div className="px-8 pt-16">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Chọn loại Flashcard</h1>
                            <p className="text-gray-500 mt-2">Chọn loại và số lượng thẻ bạn muốn tạo</p>
                        </div>
                        <button
                            className={`px-5 py-2 rounded-lg transition-colors ${totalSelected > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-200 text-white cursor-not-allowed'}`}
                            disabled={totalSelected === 0}
                            onClick={onGenerate}
                        >
                            Tạo
                        </button>
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div
                            onClick={() => onSetSelectedType('termDef')}
                            className={`bg-white border rounded-xl p-4 flex items-center justify-between cursor-pointer ${selectedType === 'termDef' ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200'}`}
                        >
                            <div className="flex items-center space-x-3 text-gray-800">
                                <BookOpen className="w-6 h-6" />
                                <div className="font-medium">Thuật ngữ và Định nghĩa</div>
                            </div>
                            <input
                                type="number"
                                min={0}
                                max={50}
                                className="w-20 px-3 py-2 border rounded-lg text-right"
                                value={typeCounts.termDef}
                                onChange={(e) => onSetTypeCounts({ ...typeCounts, termDef: clampCount(Number(e.target.value)) })}
                                onBlur={(e) => onSetTypeCounts({ ...typeCounts, termDef: clampCount(Number(e.target.value)) })}
                                onFocus={() => onSetSelectedType('termDef')}
                            />
                        </div>

                        <div
                            onClick={() => onSetSelectedType('fillBlank')}
                            className={`bg-white border rounded-xl p-4 flex items-center justify-between cursor-pointer ${selectedType === 'fillBlank' ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200'}`}
                        >
                            <div className="flex items-center space-x-3 text-gray-800">
                                <PenTool className="w-6 h-6" />
                                <div className="font-medium">Điền vào chỗ trống</div>
                            </div>
                            <input
                                type="number"
                                min={0}
                                max={50}
                                className="w-20 px-3 py-2 border rounded-lg text-right"
                                value={typeCounts.fillBlank}
                                onChange={(e) => onSetTypeCounts({ ...typeCounts, fillBlank: clampCount(Number(e.target.value)) })}
                                onBlur={(e) => onSetTypeCounts({ ...typeCounts, fillBlank: clampCount(Number(e.target.value)) })}
                                onFocus={() => onSetSelectedType('fillBlank')}
                            />
                        </div>

                        <div
                            onClick={() => onSetSelectedType('multipleChoice')}
                            className={`bg-white border rounded-xl p-4 flex items-center justify-between cursor-pointer ${selectedType === 'multipleChoice' ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200'}`}
                        >
                            <div className="flex items-center space-x-3 text-gray-800">
                                <ListChecks className="w-6 h-6" />
                                <div className="font-medium">Trắc nghiệm</div>
                            </div>
                            <input
                                type="number"
                                min={0}
                                max={50}
                                className="w-20 px-3 py-2 border rounded-lg text-right"
                                value={typeCounts.multipleChoice}
                                onChange={(e) => onSetTypeCounts({ ...typeCounts, multipleChoice: clampCount(Number(e.target.value)) })}
                                onBlur={(e) => onSetTypeCounts({ ...typeCounts, multipleChoice: clampCount(Number(e.target.value)) })}
                                onFocus={() => onSetSelectedType('multipleChoice')}
                            />
                        </div>
                    </div>

                    <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-6">
                        <div className="text-sm font-semibold text-gray-700 mb-3">Xem trước ví dụ:</div>
                        {selectedType === 'termDef' && (
                            <div className="bg-white border rounded-lg p-4">
                                <div className="text-sm text-gray-800"><strong>Mặt trước:</strong> Photosynthesis là gì?</div>
                                <div className="mt-2 text-sm text-gray-600"><strong>Mặt sau:</strong> Quá trình cây xanh chuyển đổi ánh sáng thành năng lượng hóa học.</div>
                            </div>
                        )}
                        {selectedType === 'fillBlank' && (
                            <div className="bg-white border rounded-lg p-4">
                                <div className="text-sm text-gray-800">Điền từ còn thiếu: Water boils at <strong>_____</strong> °C.</div>
                                <div className="mt-2 text-xs text-gray-500">Đáp án: 100</div>
                            </div>
                        )}
                        {selectedType === 'multipleChoice' && (
                            <div className="bg-white border rounded-lg p-4">
                                <div className="text-sm font-medium text-gray-800 mb-3">Cơ quan nào là "nhà máy năng lượng" của tế bào?</div>
                                <div className="space-y-2">
                                    {[
                                        { key: 'A', label: 'Nhân tế bào' },
                                        { key: 'B', label: 'Ty thể' },
                                        { key: 'C', label: 'Ribosome' },
                                        { key: 'D', label: 'Lục lạp' },
                                    ].map((opt) => (
                                        <label key={opt.key} className="flex items-center justify-between border rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50">
                                            <div className="flex items-center space-x-3">
                                                <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full border text-gray-700">{opt.key}</span>
                                                <span className="text-sm text-gray-800">{opt.label}</span>
                                            </div>
                                            <span className="w-4 h-4 rounded-full border border-gray-300"></span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 text-xs text-gray-500">Mỗi loại tối đa 50 câu hỏi. Bạn có thể chọn nhiều loại cùng lúc.</div>
                </div>
            </div>
        </div>
    );
};

