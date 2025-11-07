import React from 'react';
import { ImageModalType } from '../../types/flashcard';

interface ImageModalProps {
    show: boolean;
    imageModalType: ImageModalType;
    showImageSearch: boolean;
    imageSearchTerm: string;
    imageSearchResults: any[];
    isSearchingImages: boolean;
    showUrlInput: boolean;
    imageUrl: string;
    onClose: () => void;
    onSetImageSearchTerm: (term: string) => void;
    onSetShowImageSearch: (show: boolean) => void;
    onSetShowUrlInput: (show: boolean) => void;
    onSetImageUrl: (url: string) => void;
    onImageSearch: (query: string) => void;
    onSelectImage: (url: string, type: 'search' | 'upload' | 'url') => void;
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onUrlSubmit: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({
    show,
    imageModalType,
    showImageSearch,
    imageSearchTerm,
    imageSearchResults,
    isSearchingImages,
    showUrlInput,
    imageUrl,
    onClose,
    onSetImageSearchTerm,
    onSetShowImageSearch,
    onSetShowUrlInput,
    onSetImageUrl,
    onImageSearch,
    onSelectImage,
    onFileUpload,
    onUrlSubmit
}) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">
                        Thêm hình ảnh cho {imageModalType === 'term' ? 'Thuật ngữ' : 'Định nghĩa'}
                    </h4>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <div>
                                <h5 className="font-medium text-gray-900">Tìm kiếm từ internet</h5>
                                <p className="text-sm text-gray-500">Tìm hình ảnh từ Pixabay</p>
                            </div>
                        </div>
                        <button
                            onClick={() => onSetShowImageSearch(!showImageSearch)}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Tìm kiếm hình ảnh
                        </button>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            </div>
                            <div>
                                <h5 className="font-medium text-gray-900">Dán URL</h5>
                                <p className="text-sm text-gray-500">Nhập link hình ảnh trực tiếp</p>
                            </div>
                        </div>
                        <button
                            onClick={() => onSetShowUrlInput(!showUrlInput)}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            Dán URL hình ảnh
                        </button>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <div>
                                <h5 className="font-medium text-gray-900">Tải lên từ máy</h5>
                                <p className="text-sm text-gray-500">Chọn file từ thiết bị của bạn</p>
                            </div>
                        </div>
                        <label className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer flex items-center justify-center">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={onFileUpload}
                                className="hidden"
                            />
                            Tải lên hình ảnh
                        </label>
                    </div>
                </div>

                {showImageSearch && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-3">Tìm kiếm hình ảnh</h5>
                        <div className="flex items-center space-x-2 mb-4">
                            <input
                                type="text"
                                value={imageSearchTerm}
                                onChange={(e) => onSetImageSearchTerm(e.target.value)}
                                placeholder="Tìm kiếm hình ảnh..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        onImageSearch(imageSearchTerm);
                                    }
                                }}
                            />
                            <button
                                onClick={() => onImageSearch(imageSearchTerm)}
                                disabled={isSearchingImages}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSearchingImages ? 'Đang tìm...' : 'Tìm kiếm'}
                            </button>
                        </div>

                        {imageSearchResults.length > 0 && (
                            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                                {imageSearchResults.map((image) => (
                                    <div
                                        key={image.id}
                                        className="relative group cursor-pointer bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
                                        onClick={() => onSelectImage(image.url, 'search')}
                                    >
                                        <img
                                            src={image.thumbnail}
                                            alt={image.title}
                                            className="w-full h-20 object-cover group-hover:scale-105 transition-transform duration-200"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                                            <div className="opacity-0 group-hover:opacity-100 bg-white rounded-full p-1 shadow-lg">
                                                <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {imageSearchResults.length === 0 && imageSearchTerm && !isSearchingImages && (
                            <div className="text-center py-4 text-gray-500">
                                <p className="text-sm">Không tìm thấy hình ảnh nào</p>
                            </div>
                        )}
                    </div>
                )}

                {showUrlInput && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-3">Dán URL hình ảnh</h5>
                        <div className="flex space-x-2">
                            <input
                                type="url"
                                value={imageUrl}
                                onChange={(e) => onSetImageUrl(e.target.value)}
                                placeholder="https://example.com/image.jpg"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <button
                                onClick={onUrlSubmit}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Thêm
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Hỗ trợ: JPG, PNG, GIF, WebP</p>
                    </div>
                )}

                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

