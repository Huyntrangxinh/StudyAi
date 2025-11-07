import React, { useState } from 'react';
import { X, Clock, Star } from 'lucide-react';

interface VideoOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (options: VideoOptions) => void;
}

export interface VideoOptions {
    title?: string;
    // style removed
    // length removed
    language: 'vi' | 'en';
}

const VideoOptionsModal: React.FC<VideoOptionsModalProps> = ({ isOpen, onClose, onStart }) => {
    const [title, setTitle] = useState('');
    // removed: style, length
    const [language, setLanguage] = useState<'vi' | 'en'>('vi');
    const [isStarting, setIsStarting] = useState(false);

    if (!isOpen) return null;

    const handleStart = () => {
        if (isStarting) return;
        setIsStarting(true);
        try {
            onStart({
                title: title.trim() || undefined,
                language
            });
        } finally {
            // Reset form
            setTitle('');
            setLanguage('vi');
            setTimeout(() => setIsStarting(false), 500);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-900">Tùy chọn Video</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Description */}
                    <p className="text-gray-600">
                        Chọn ngôn ngữ và đặt tiêu đề (tùy chọn) cho video giải thích của bạn.
                    </p>

                    {/* Video Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tiêu đề Video (Tùy chọn)
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Nhập tiêu đề cho video"
                            maxLength={100}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="text-xs text-gray-500 mt-1 text-right">{title.length}/100</div>
                    </div>

                    {/* Removed Style of Video and Video Length sections */}

                    {/* Language */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bạn muốn video của mình bằng ngôn ngữ nào?
                        </label>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as 'vi' | 'en')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="vi">🇻🇳 Tiếng Việt</option>
                            <option value="en">🇺🇸 English</option>
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-4 p-6 border-t bg-gray-50">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <X className="w-4 h-4" />
                        <span>Hủy</span>
                    </button>
                    <button
                        onClick={handleStart}
                        disabled={isStarting}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${isStarting ? 'bg-blue-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        <Star className="w-4 h-4" />
                        <span>{isStarting ? 'Đang bắt đầu...' : 'Bắt đầu tạo'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VideoOptionsModal;

