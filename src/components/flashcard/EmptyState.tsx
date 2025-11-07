import React from 'react';

interface EmptyStateProps {
    isGenerating: boolean;
    isEmpty: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ isGenerating, isEmpty }) => {
    if (isGenerating) {
        return (
            <div className="text-center py-16">
                <div className="w-28 h-28 mx-auto mb-6">
                    <img src="/Tapta.gif" alt="Generating" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-3">Đang tạo thẻ ghi nhớ</h3>
                <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
                    Hệ thống đang tạo thẻ ghi nhớ cho bạn. Chúng sẽ xuất hiện tại đây ngay khi sẵn sàng. Bạn có thể ở lại trang này hoặc quay lại sau.
                </p>
            </div>
        );
    }

    if (isEmpty) {
        return (
            <div className="text-center py-4">
                <div className="w-32 h-32 mx-auto mb-4">
                    <img src="/18.gif" alt="Flashcard" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Thêm thẻ ghi nhớ đầu tiên</h3>
                <p className="text-gray-600">Thẻ ghi nhớ là cách tuyệt vời để ghi nhớ thông tin.</p>
            </div>
        );
    }

    return null;
};

