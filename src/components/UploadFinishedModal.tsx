import React from 'react';
import { X, Map, FileText } from 'lucide-react';

interface UploadFinishedModalProps {
    isOpen: boolean;
    onClose: () => void;
    onViewStudyPlan: () => void;
    onViewMaterial: () => void;
    studySetId?: string;
    studySetName?: string;
}

const UploadFinishedModal: React.FC<UploadFinishedModalProps> = ({
    isOpen,
    onClose,
    onViewStudyPlan,
    onViewMaterial,
    studySetId,
    studySetName
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 w-full max-w-2xl mx-4 shadow-2xl">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Tải lên hoàn tất! 🎉
                    </h2>
                    <p className="text-lg text-gray-600">
                        Bạn muốn đi đâu tiếp theo?
                    </p>
                </div>

                {/* Options */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                    {/* View Study Plan */}
                    <button
                        onClick={onViewStudyPlan}
                        className="p-6 rounded-xl border-2 border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 transition-colors text-left"
                    >
                        <div className="flex flex-col items-center space-y-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                <Map className="w-6 h-6 text-gray-600" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Xem Kế hoạch học tập</h3>
                                <p className="text-sm text-gray-600">
                                    Khám phá lộ trình học tập cá nhân hóa do AI tạo ra cho tài liệu này
                                </p>
                            </div>
                        </div>
                    </button>

                    {/* View Material - Recommended */}
                    <button
                        onClick={onViewMaterial}
                        className="p-6 rounded-xl border-2 border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 transition-colors text-left relative"
                    >
                        {/* Recommended Badge */}
                        <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                            Được đề xuất
                        </div>

                        <div className="flex flex-col items-center space-y-4">
                            <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                                <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Xem Tài liệu</h3>
                                <p className="text-sm text-gray-600">
                                    Xem lại tài liệu hoặc tệp bạn vừa tải lên
                                </p>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Footer Message */}
                <div className="text-center">
                    <p className="text-sm text-gray-500">
                        Bạn luôn có thể chuyển đổi giữa các tùy chọn này sau
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UploadFinishedModal;
