import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Material } from '../../types/flashcard';

interface MaterialPickerProps {
    isCollapsed: boolean;
    flashcardName: string;
    materialsInSet: Material[];
    isLoadingMaterials: boolean;
    selectedMaterialIds: Set<string>;
    searchTerm: string;
    onBack: () => void;
    onSetSearchTerm: (term: string) => void;
    onToggleMaterial: (id: string) => void;
    onContinue: () => void;
}

export const MaterialPicker: React.FC<MaterialPickerProps> = ({
    isCollapsed,
    flashcardName,
    materialsInSet,
    isLoadingMaterials,
    selectedMaterialIds,
    searchTerm,
    onBack,
    onSetSearchTerm,
    onToggleMaterial,
    onContinue
}) => {
    return (
        <div className={`relative min-h-screen transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-48'}`}>
            <div className="fixed inset-0 bg-white z-0"></div>
            <div className="relative z-10">
                <div className={`bg-white fixed top-0 right-0 z-10 transition-all duration-300 ${isCollapsed ? 'left-16' : 'left-40'}`}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center h-16">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={onBack}
                                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                    <span>Quay lại</span>
                                </button>
                                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-yellow-400 rounded-lg flex items-center justify-center">
                                    <img src="/18.gif" alt="Flashcard" className="w-6 h-6 object-contain" />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <h1 className="text-xl font-bold text-gray-900">{flashcardName || 'Flashcard'}</h1>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-8 pt-16">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Tạo từ tài liệu</h1>
                            <p className="text-gray-500 mt-2">Chọn tài liệu bạn muốn tạo bộ thẻ ghi nhớ từ đó</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={onBack}
                                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={onContinue}
                                className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                disabled={selectedMaterialIds.size === 0}
                            >
                                Tiếp tục
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => onSetSearchTerm(e.target.value)}
                            placeholder="Tìm kiếm tài liệu"
                            className="w-full md:w-96 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="px-8 mt-6">
                    {isLoadingMaterials ? (
                        <div className="py-16 text-center text-gray-500">Đang tải tài liệu...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            <div className="border-2 border-dashed border-gray-200 rounded-xl bg-white p-4 hover:border-gray-300 cursor-pointer flex items-center">
                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mr-3">+</div>
                                <div className="font-medium text-gray-800">Tải lên tài liệu mới</div>
                            </div>

                            {materialsInSet
                                .filter(m => !searchTerm.trim() || m.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map((m) => {
                                    const selected = selectedMaterialIds.has(String(m.id));
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => onToggleMaterial(String(m.id))}
                                            className={`text-left border rounded-xl bg-white p-4 shadow-sm hover:shadow transition flex items-center justify-between ${selected ? 'ring-2 ring-blue-500 border-blue-200' : 'border-gray-200'}`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                                    <img src={(process.env.PUBLIC_URL || '') + '/card.png'} alt="" className="w-5 h-5 object-contain" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 truncate max-w-[260px]" title={m.name}>{m.name}</div>
                                                    <div className="text-xs text-gray-500">{m.size ? `${(m.size / 1024 / 1024).toFixed(2)} MB` : ''}</div>
                                                </div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border ${selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}></div>
                                        </button>
                                    );
                                })}

                            {materialsInSet.length === 0 && (
                                <div className="col-span-full text-center text-gray-500 py-16">Không có tài liệu trong bộ học này.</div>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-8 py-8">
                    <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                        <span className="text-lg">›</span>
                        <span className="font-medium">Nâng cao</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

