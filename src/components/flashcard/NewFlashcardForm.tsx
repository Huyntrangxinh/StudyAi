import React, { useEffect } from 'react';
import { Plus } from 'lucide-react';
import { extractAnswersFromText } from '../../utils/flashcardHelpers';
import { ImageModal } from './ImageModal';

interface NewFlashcardFormProps {
    showScratchEditor: boolean;
    flashcardType: string;
    isReverseEnabled: boolean;
    isAudioEnabled: boolean;
    termText: string;
    definitionText: string;
    fillBlankText: string;
    fillBlankAnswers: string[];
    multipleChoiceTerm: string;
    multipleChoiceOptions: string[];
    correctAnswerIndex: number;
    termImage: string;
    definitionImage: string;
    isSaving: boolean;
    showImageModal: boolean;
    imageModalType: 'term' | 'definition' | null;
    showImageSearch: boolean;
    imageSearchTerm: string;
    imageSearchResults: string[];
    isSearchingImages: boolean;
    showUrlInput: boolean;
    imageUrl: string;
    onSetFlashcardType: (type: string) => void;
    onSetIsReverseEnabled: (enabled: boolean) => void;
    onSetIsAudioEnabled: (enabled: boolean) => void;
    onSetTermText: (text: string) => void;
    onSetDefinitionText: (text: string) => void;
    onSetFillBlankText: (text: string) => void;
    onSetFillBlankAnswers: (answers: string[]) => void;
    onSetMultipleChoiceTerm: (term: string) => void;
    onSetMultipleChoiceOptions: (options: string[]) => void;
    onSetCorrectAnswerIndex: (index: number) => void;
    onSetTermImage: (image: string) => void;
    onSetDefinitionImage: (image: string) => void;
    onHandleFillBlankTextChange: (text: string) => void;
    onAddBlankToText: () => void;
    onHandleFillBlankAnswerChange: (index: number, value: string) => void;
    onRemoveFillBlankAnswer: (index: number) => void;
    onAddFillBlankAnswer: () => void;
    onHandleCorrectAnswerChange: (index: number) => void;
    onHandleMultipleChoiceOptionChange: (index: number, value: string) => void;
    onRemoveMultipleChoiceOption: (index: number) => void;
    onAddMultipleChoiceOption: () => void;
    onOpenImageModal: (type: 'term' | 'definition') => void;
    onCloseImageModal: () => void;
    onSetImageSearchTerm: (term: string) => void;
    onSetShowImageSearch: (show: boolean) => void;
    onSetShowUrlInput: (show: boolean) => void;
    onSetImageUrl: (url: string) => void;
    onImageSearch: (query: string) => void;
    onSelectImage: (url: string, type: 'search' | 'upload' | 'url') => void;
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onUrlSubmit: () => void;
    onSaveFlashcard: () => void;
}

export const NewFlashcardForm: React.FC<NewFlashcardFormProps> = ({
    showScratchEditor,
    flashcardType,
    isReverseEnabled,
    isAudioEnabled,
    termText,
    definitionText,
    fillBlankText,
    fillBlankAnswers,
    multipleChoiceTerm,
    multipleChoiceOptions,
    correctAnswerIndex,
    termImage,
    definitionImage,
    isSaving,
    showImageModal,
    imageModalType,
    showImageSearch,
    imageSearchTerm,
    imageSearchResults,
    isSearchingImages,
    showUrlInput,
    imageUrl,
    onSetFlashcardType,
    onSetIsReverseEnabled,
    onSetIsAudioEnabled,
    onSetTermText,
    onSetDefinitionText,
    onSetFillBlankText,
    onSetFillBlankAnswers,
    onSetMultipleChoiceTerm,
    onSetMultipleChoiceOptions,
    onSetCorrectAnswerIndex,
    onSetTermImage,
    onSetDefinitionImage,
    onHandleFillBlankTextChange,
    onAddBlankToText,
    onHandleFillBlankAnswerChange,
    onRemoveFillBlankAnswer,
    onAddFillBlankAnswer,
    onHandleCorrectAnswerChange,
    onHandleMultipleChoiceOptionChange,
    onRemoveMultipleChoiceOption,
    onAddMultipleChoiceOption,
    onOpenImageModal,
    onCloseImageModal,
    onSetImageSearchTerm,
    onSetShowImageSearch,
    onSetShowUrlInput,
    onSetImageUrl,
    onImageSearch,
    onSelectImage,
    onFileUpload,
    onUrlSubmit,
    onSaveFlashcard
}) => {
    // Debug: Log when termImage or definitionImage changes
    // Hooks must be called before any conditional returns
    useEffect(() => {
        console.log('🟢 NewFlashcardForm - termImage changed:', termImage);
    }, [termImage]);

    useEffect(() => {
        console.log('🟢 NewFlashcardForm - definitionImage changed:', definitionImage);
    }, [definitionImage]);

    if (!showScratchEditor) return null;

    return (
        <div className="bg-gray-50 rounded-xl shadow-lg border border-gray-200 p-4 w-full" data-new-flashcard-form>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Thẻ ghi nhớ mới</h3>

            {/* Options Row */}
            <div className="flex flex-wrap items-center gap-6 mb-4">
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Loại</span>
                    <select
                        value={flashcardType === 'pair' ? 'pair' : flashcardType === 'fillblank' ? 'fillblank' : flashcardType === 'multiplechoice' ? 'multiplechoice' : 'pair'}
                        onChange={(e) => {
                            const value = e.target.value;
                            onSetFlashcardType(value);
                            if (value !== 'fillblank') {
                                onSetFillBlankText('');
                                onSetFillBlankAnswers(['']);
                            }
                            if (value !== 'multiplechoice') {
                                onSetMultipleChoiceTerm('');
                                onSetMultipleChoiceOptions(['', '']);
                                onSetCorrectAnswerIndex(1);
                            }
                            if (value !== 'pair') {
                                onSetTermText('');
                                onSetDefinitionText('');
                            }
                        }}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-2 min-w-48"
                    >
                        <option value="pair">Thuật ngữ và Định nghĩa</option>
                        <option value="fillblank">Điền vào chỗ trống</option>
                        <option value="multiplechoice">Trắc nghiệm</option>
                    </select>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                {flashcardType !== 'fillblank' && flashcardType !== 'multiplechoice' && (
                    <>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">Tạo ngược</span>
                            <button
                                onClick={() => onSetIsReverseEnabled(!isReverseEnabled)}
                                className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${isReverseEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${isReverseEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                            </button>
                            <span className={`text-xs ${isReverseEnabled ? 'text-green-500' : 'text-red-500'}`}>
                                {isReverseEnabled ? 'BẬT' : 'TẮT'}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">Thuật ngữ dạng âm thanh</span>
                            <button
                                onClick={() => onSetIsAudioEnabled(!isAudioEnabled)}
                                className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${isAudioEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${isAudioEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                            </button>
                            <span className={`text-xs ${isAudioEnabled ? 'text-green-500' : 'text-red-500'}`}>
                                {isAudioEnabled ? 'BẬT' : 'TẮT'}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Input Fields */}
            {flashcardType === 'fillblank' ? (
                // Fill in the blank UI
                <div className="mb-4">
                    <div className="mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                            <label className="block text-sm font-medium text-gray-700">Thuật ngữ</label>
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-xs text-gray-600 mb-3">
                            Nhấp vào nút +Trống để tạo khoảng trống. Chọn văn bản trước để xóa các từ cụ thể.
                        </p>
                        <div className="flex items-start space-x-2">
                            <textarea
                                id="fillBlankTextarea"
                                value={fillBlankText}
                                onChange={(e) => onHandleFillBlankTextChange(e.target.value)}
                                className="flex-1 h-32 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 p-4 bg-purple-50 resize-none text-sm"
                                placeholder="Nhập văn bản và sử dụng nút {{...}} để thêm khoảng trống..."
                            />
                            <button
                                onClick={onAddBlankToText}
                                className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center space-x-2 whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Trống</span>
                            </button>
                        </div>
                        {/* Answer inputs */}
                        <div className="mt-4 space-y-2">
                            {fillBlankAnswers.map((answer, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={answer}
                                        onChange={(e) => onHandleFillBlankAnswerChange(index, e.target.value)}
                                        placeholder={`Đáp án ${index + 1}`}
                                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    {fillBlankAnswers.length > 1 && (
                                        <button
                                            onClick={() => onRemoveFillBlankAnswer(index)}
                                            className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Xóa đáp án"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={onAddFillBlankAnswer}
                                className="mt-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors flex items-center space-x-2"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Thêm đáp án</span>
                            </button>
                        </div>
                        {/* Warning box */}
                        {(extractAnswersFromText(fillBlankText).length === 0 && fillBlankAnswers.every(a => !a.trim())) && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-xs text-red-700">
                                    Vui lòng điền ít nhất 1 đáp án vào chỗ trống, bạn có thể thực hiện bằng cách thêm {'{{CORRECT_ANSWER}}'}.
                                </p>
                            </div>
                        )}
                        <button
                            onClick={() => onOpenImageModal('term')}
                            className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg flex items-center space-x-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Thêm hình ảnh</span>
                        </button>
                        {termImage && (
                            <div className="mt-3 relative group">
                                <img
                                    src={termImage}
                                    alt="Term image"
                                    className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                    onLoad={() => {
                                        console.log('✅ FillBlank term image loaded successfully:', termImage);
                                    }}
                                    onError={(e) => {
                                        console.error('❌ FillBlank term image failed to load:', termImage);
                                        console.error('Error event:', e);
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                                <button
                                    onClick={() => onSetTermImage('')}
                                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : flashcardType === 'multiplechoice' ? (
                // Multiple Choice UI
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                    {/* Left: Term */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Term</label>
                        <textarea
                            value={multipleChoiceTerm}
                            onChange={(e) => onSetMultipleChoiceTerm(e.target.value)}
                            className="w-full h-32 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 p-4 bg-gray-50 resize-none text-sm"
                            placeholder="Enter content here..."
                        />
                        <button
                            onClick={() => onOpenImageModal('term')}
                            className="mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg flex items-center space-x-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Add Image</span>
                        </button>
                        {termImage && (
                            <div className="mt-3 relative group">
                                <img
                                    src={termImage}
                                    alt="Term image"
                                    className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                    onLoad={() => {
                                        console.log('✅ MultipleChoice term image loaded successfully:', termImage);
                                    }}
                                    onError={(e) => {
                                        console.error('❌ MultipleChoice term image failed to load:', termImage);
                                        console.error('Error event:', e);
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                                <button
                                    onClick={() => onSetTermImage('')}
                                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                    {/* Right: Choices */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Choices</label>
                        <div className="space-y-3">
                            {multipleChoiceOptions.map((option, index) => (
                                <div
                                    key={index}
                                    className={`flex items-center space-x-2 p-3 rounded-lg border ${correctAnswerIndex === index
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 bg-white'
                                        }`}
                                >
                                    {/* Correct/Incorrect Indicator */}
                                    <button
                                        onClick={() => onHandleCorrectAnswerChange(index)}
                                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${correctAnswerIndex === index
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                            }`}
                                    >
                                        {correctAnswerIndex === index ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        )}
                                    </button>
                                    {/* Option Input */}
                                    <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => onHandleMultipleChoiceOptionChange(index, e.target.value)}
                                        placeholder={index === correctAnswerIndex ? `Option ${index + 1} (Correct)` : `Option ${index + 1}`}
                                        className={`flex-1 px-3 py-2 rounded-lg border ${correctAnswerIndex === index
                                            ? 'border-blue-300 bg-white'
                                            : 'border-gray-300 bg-gray-50'
                                            } focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                                    />
                                    {/* Delete Button */}
                                    <button
                                        onClick={() => onRemoveMultipleChoiceOption(index)}
                                        className="flex-shrink-0 w-8 h-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors"
                                        disabled={multipleChoiceOptions.length <= 2}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={onAddMultipleChoiceOption}
                            className="mt-3 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors flex items-center space-x-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add option</span>
                        </button>
                    </div>
                </div>
            ) : (
                // Default Term and Definition UI
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Thuật ngữ</label>
                        <textarea
                            value={termText}
                            onChange={(e) => onSetTermText(e.target.value)}
                            className="w-full h-24 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 p-4 bg-purple-50 resize-none text-sm"
                            placeholder="Nhập nội dung ở đây..."
                        />
                        <button
                            onClick={() => onOpenImageModal('term')}
                            className="mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg flex items-center space-x-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Thêm hình ảnh</span>
                        </button>
                        {termImage && (
                            <div className="mt-3 relative group">
                                <img
                                    src={termImage}
                                    alt="Term image"
                                    className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                    onLoad={() => {
                                        console.log('✅ Pair term image loaded successfully:', termImage);
                                    }}
                                    onError={(e) => {
                                        console.error('❌ Pair term image failed to load:', termImage);
                                        console.error('Error event:', e);
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                                <button
                                    onClick={() => onSetTermImage('')}
                                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Định nghĩa</label>
                        <textarea
                            value={definitionText}
                            onChange={(e) => onSetDefinitionText(e.target.value)}
                            className="w-full h-24 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 p-4 bg-purple-50 resize-none text-sm"
                            placeholder="Nhập nội dung ở đây..."
                        />
                        <button
                            onClick={() => onOpenImageModal('definition')}
                            className="mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg flex items-center space-x-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Thêm hình ảnh</span>
                        </button>
                        {definitionImage && (
                            <div className="mt-3 relative group">
                                <img
                                    src={definitionImage}
                                    alt="Definition image"
                                    className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                    onLoad={() => {
                                        console.log('✅ Definition image loaded successfully:', definitionImage);
                                    }}
                                    onError={(e) => {
                                        console.error('❌ Definition image failed to load:', definitionImage);
                                        console.error('Error event:', e);
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                                <button
                                    onClick={() => onSetDefinitionImage('')}
                                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <ImageModal
                show={showImageModal}
                imageModalType={imageModalType}
                showImageSearch={showImageSearch}
                imageSearchTerm={imageSearchTerm}
                imageSearchResults={imageSearchResults}
                isSearchingImages={isSearchingImages}
                showUrlInput={showUrlInput}
                imageUrl={imageUrl}
                onClose={onCloseImageModal}
                onSetImageSearchTerm={onSetImageSearchTerm}
                onSetShowImageSearch={onSetShowImageSearch}
                onSetShowUrlInput={onSetShowUrlInput}
                onSetImageUrl={onSetImageUrl}
                onImageSearch={onImageSearch}
                onSelectImage={onSelectImage}
                onFileUpload={onFileUpload}
                onUrlSubmit={onUrlSubmit}
            />

            {/* Add Flashcard Button - Right aligned */}
            <div className="flex justify-end mt-4">
                <button
                    onClick={onSaveFlashcard}
                    disabled={
                        isSaving ||
                        (flashcardType === 'fillblank'
                            ? !fillBlankText.trim() || (extractAnswersFromText(fillBlankText).length === 0 && fillBlankAnswers.every(a => !a.trim()))
                            : flashcardType === 'multiplechoice'
                                ? !multipleChoiceTerm.trim() || multipleChoiceOptions.length < 2 || multipleChoiceOptions.some(opt => !opt.trim()) || correctAnswerIndex < 0 || correctAnswerIndex >= multipleChoiceOptions.length
                                : !termText.trim() || !definitionText.trim())
                    }
                    className={`px-4 py-2 rounded-full flex items-center space-x-2 disabled:opacity-50 transition-colors duration-200 ${(flashcardType === 'fillblank'
                        ? fillBlankText.trim() && (extractAnswersFromText(fillBlankText).length > 0 || fillBlankAnswers.some(a => a.trim()))
                        : flashcardType === 'multiplechoice'
                            ? multipleChoiceTerm.trim() && multipleChoiceOptions.length >= 2 && multipleChoiceOptions.every(opt => opt.trim()) && correctAnswerIndex >= 0 && correctAnswerIndex < multipleChoiceOptions.length
                            : termText.trim() && definitionText.trim())
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-400 text-white hover:bg-gray-500'
                        }`}
                >
                    <Plus className="w-4 h-4" />
                    <span>Thêm thẻ ghi nhớ</span>
                </button>
            </div>
        </div>
    );
};

