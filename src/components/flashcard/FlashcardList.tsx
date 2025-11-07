import React from 'react';
import { GripVertical, Trash2, Pencil, Plus, GraduationCap, ChevronUp, ChevronDown } from 'lucide-react';
import { Card } from '../../types/flashcard';
import { extractAnswersFromText } from '../../utils/flashcardHelpers';
import { GenerationProgress } from './GenerationProgress';
import { EmptyState } from './EmptyState';

interface FlashcardListProps {
    showScratchEditor: boolean;
    flashcards: Card[];
    isGenerating: boolean;
    genDone: number;
    genTotal: number;
    draggedCardId: string | null;
    dragOverCardId: string | null;
    editingCardId: string | null;
    editTerm: string;
    editDefinition: string;
    expandedPreviews: Set<string>;
    isSaving: boolean;
    onDragStart: (e: React.DragEvent, cardId: string) => void;
    onDragOver: (e: React.DragEvent, cardId: string) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent, cardId: string) => void;
    onDragEnd: () => void;
    onDeleteFlashcard: (cardId: string) => void;
    onStartEdit: (card: Card) => void;
    onCancelEdit: () => void;
    onSaveEdit: (cardId: string, term: string, definition: string) => Promise<void>;
    onSetEditTerm: (term: string) => void;
    onSetEditDefinition: (definition: string) => void;
    onSetFlashcards: React.Dispatch<React.SetStateAction<Card[]>>;
    onSetExpandedPreviews: React.Dispatch<React.SetStateAction<Set<string>>>;
    onOpenImageModal: (type: 'term' | 'definition') => void;
}

export const FlashcardList: React.FC<FlashcardListProps> = ({
    showScratchEditor,
    flashcards,
    isGenerating,
    genDone,
    genTotal,
    draggedCardId,
    dragOverCardId,
    editingCardId,
    editTerm,
    editDefinition,
    expandedPreviews,
    isSaving,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
    onDeleteFlashcard,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onSetEditTerm,
    onSetEditDefinition,
    onSetFlashcards,
    onSetExpandedPreviews,
    onOpenImageModal
}) => {
    if (!showScratchEditor) return null;

    return (
        <div className="mb-4">
            {isGenerating && <GenerationProgress genDone={genDone} genTotal={genTotal} />}
            <EmptyState isGenerating={isGenerating} isEmpty={flashcards.length === 0} />
            {flashcards.map((flashcard, index) => (
                <div
                    key={`${flashcard.dbId ?? flashcard.id}`}
                    draggable
                    onDragStart={(e) => onDragStart(e, flashcard.id)}
                    onDragOver={(e) => onDragOver(e, flashcard.id)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, flashcard.id)}
                    onDragEnd={onDragEnd}
                    className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 w-full mb-4 transition-all ${draggedCardId === flashcard.id ? 'opacity-50' : ''
                        } ${dragOverCardId === flashcard.id ? 'border-blue-500 border-2' : ''
                        }`}
                >
                    {flashcard.type === 'fillblank' ? (
                        // Fill in the blank UI
                        <>
                            {/* Header với badge, dropdown, icons */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                        <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                                    </div>
                                    <select
                                        value="fillblank"
                                        onChange={(e) => {
                                            // Có thể thêm logic đổi type ở đây nếu cần
                                        }}
                                        className="text-sm border border-gray-300 rounded-lg px-3 py-2"
                                    >
                                        <option value="fillblank">Điền vào chỗ trống</option>
                                        <option value="pair">Thuật ngữ và Định nghĩa</option>
                                        <option value="multiplechoice">Trắc nghiệm</option>
                                    </select>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => onStartEdit(flashcard)}
                                        className="p-1 text-blue-400 hover:text-blue-600"
                                        title="Sửa"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <GripVertical
                                        className="w-5 h-5 text-gray-400 cursor-move hover:text-gray-600"
                                        onMouseDown={(e) => e.stopPropagation()}
                                    />
                                    <button
                                        onClick={() => onDeleteFlashcard(flashcard.id)}
                                        className="p-1 text-red-400 hover:text-red-600"
                                        title="Xóa"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Term Input với + Blank button */}
                            {editingCardId === flashcard.id ? (
                                // Edit Mode for Fill Blank
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
                                            id={`fillBlankEditTextarea-${flashcard.id}`}
                                            value={editTerm}
                                            onChange={(e) => {
                                                onSetEditTerm(e.target.value);
                                                const answers = extractAnswersFromText(e.target.value);
                                            }}
                                            className="flex-1 h-32 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 p-4 bg-purple-50 resize-none text-sm"
                                            placeholder="Nhập văn bản và sử dụng nút {{...}} để thêm khoảng trống..."
                                        />
                                        <button
                                            onClick={() => {
                                                const textarea = document.getElementById(`fillBlankEditTextarea-${flashcard.id}`) as HTMLTextAreaElement;
                                                if (!textarea) return;
                                                const start = textarea.selectionStart;
                                                const end = textarea.selectionEnd;
                                                const selectedText = editTerm.substring(start, end);
                                                const before = editTerm.substring(0, start);
                                                const after = editTerm.substring(end);
                                                if (selectedText) {
                                                    onSetEditTerm(before + `{{${selectedText}}}` + after);
                                                } else {
                                                    onSetEditTerm(before + `{{}}` + after);
                                                }
                                                setTimeout(() => {
                                                    textarea.focus();
                                                    const newPos = before.length + (selectedText ? 2 + selectedText.length + 3 : 2);
                                                    textarea.setSelectionRange(newPos, newPos);
                                                }, 0);
                                            }}
                                            className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center space-x-2 whitespace-nowrap"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>Trống</span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => onOpenImageModal('term')}
                                        className="mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg flex items-center space-x-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span>Thêm hình ảnh</span>
                                    </button>
                                    <div className="flex justify-end space-x-2 mt-4">
                                        <button
                                            onClick={onCancelEdit}
                                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const answers = extractAnswersFromText(editTerm);
                                                if (answers.length === 0) {
                                                    alert('Vui lòng điền ít nhất 1 đáp án vào chỗ trống.');
                                                    return;
                                                }
                                                // Update state trước
                                                onSetFlashcards(prev => prev.map(card =>
                                                    card.id === editingCardId
                                                        ? {
                                                            ...card,
                                                            term: editTerm.trim(),
                                                            fillBlankAnswers: answers,
                                                            definition: JSON.stringify(answers)
                                                        }
                                                        : card
                                                ));
                                                // Gọi API để lưu vào DB
                                                await onSaveEdit(editingCardId, editTerm.trim(), JSON.stringify(answers));
                                            }}
                                            disabled={!editTerm.trim() || isSaving}
                                            className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50"
                                        >
                                            {isSaving ? 'Đang lưu...' : 'Lưu'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // View Mode
                                <>
                                    <div className="flex items-center space-x-2 mb-2">
                                        <label className="block text-sm font-medium text-gray-700">Thuật ngữ</label>
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex items-start space-x-2">
                                        <textarea
                                            value={flashcard.term}
                                            readOnly
                                            className="flex-1 h-24 rounded-lg border border-gray-200 p-4 bg-purple-50 resize-none text-sm"
                                        />
                                        <button
                                            onClick={() => onStartEdit(flashcard)}
                                            className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center space-x-2 whitespace-nowrap"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>Trống</span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => onOpenImageModal('term')}
                                        className="mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg flex items-center space-x-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span>Thêm hình ảnh</span>
                                    </button>
                                </>
                            )}

                            {/* Preview Section */}
                            {editingCardId !== flashcard.id && (
                                <div className="mb-4">
                                    <button
                                        onClick={() => {
                                            const newSet = new Set(expandedPreviews);
                                            if (newSet.has(flashcard.id)) {
                                                newSet.delete(flashcard.id);
                                            } else {
                                                newSet.add(flashcard.id);
                                            }
                                            onSetExpandedPreviews(newSet);
                                        }}
                                        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <GraduationCap className="w-4 h-4" />
                                            <span>Preview</span>
                                        </div>
                                        {expandedPreviews.has(flashcard.id) ? (
                                            <ChevronUp className="w-4 h-4" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4" />
                                        )}
                                    </button>
                                    {expandedPreviews.has(flashcard.id) && (
                                        <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <p className="text-sm text-gray-600 mb-2">Văn bản:</p>
                                            <p className="text-sm text-gray-900">{flashcard.term}</p>
                                            {flashcard.fillBlankAnswers && flashcard.fillBlankAnswers.length > 0 && (
                                                <>
                                                    <p className="text-sm text-gray-600 mt-4 mb-2">Đáp án đúng:</p>
                                                    <ul className="list-disc list-inside text-sm text-gray-900">
                                                        {flashcard.fillBlankAnswers.map((ans, i) => (
                                                            <li key={i}>{ans}</li>
                                                        ))}
                                                    </ul>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : flashcard.type === 'multiplechoice' ? (
                        // Multiple Choice UI
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                        <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                                    </div>
                                    <select
                                        value="multiplechoice"
                                        onChange={(e) => {
                                            // Có thể thêm logic đổi type ở đây nếu cần
                                        }}
                                        className="text-sm border border-gray-300 rounded-lg px-3 py-2"
                                    >
                                        <option value="fillblank">Điền vào chỗ trống</option>
                                        <option value="pair">Thuật ngữ và Định nghĩa</option>
                                        <option value="multiplechoice">Trắc nghiệm</option>
                                    </select>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => onStartEdit(flashcard)}
                                        className="p-1 text-blue-400 hover:text-blue-600"
                                        title="Sửa"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <GripVertical
                                        className="w-5 h-5 text-gray-400 cursor-move hover:text-gray-600"
                                        onMouseDown={(e) => e.stopPropagation()}
                                    />
                                    <button
                                        onClick={() => onDeleteFlashcard(flashcard.id)}
                                        className="p-1 text-red-400 hover:text-red-600"
                                        title="Xóa"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Term</label>
                                    <div className="w-full h-32 rounded-lg border border-gray-200 p-4 bg-gray-50 text-sm">
                                        {flashcard.term}
                                    </div>
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
                                    {flashcard.termImage && (
                                        <div className="mt-3 relative group">
                                            <img
                                                src={flashcard.termImage}
                                                alt="Term image"
                                                className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    onSetFlashcards(prev => prev.map(f =>
                                                        f.id === flashcard.id
                                                            ? { ...f, termImage: '' }
                                                            : f
                                                    ));
                                                }}
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
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Choices</label>
                                    <div className="space-y-3">
                                        {flashcard.multipleChoiceOptions && flashcard.multipleChoiceOptions.length > 0 ? (
                                            flashcard.multipleChoiceOptions.map((option, optIndex) => {
                                                const isCorrect = flashcard.correctAnswerIndex === optIndex;
                                                return (
                                                    <div
                                                        key={optIndex}
                                                        className={`flex items-center space-x-2 p-3 rounded-lg border ${isCorrect
                                                            ? 'border-blue-500 bg-blue-50'
                                                            : 'border-gray-200 bg-white'
                                                            }`}
                                                    >
                                                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isCorrect
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-gray-200 text-gray-500'
                                                            }`}>
                                                            {isCorrect ? (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <div className={`flex-1 px-3 py-2 rounded-lg border ${isCorrect
                                                            ? 'border-blue-300 bg-white'
                                                            : 'border-gray-300 bg-gray-50'
                                                            } text-sm`}>
                                                            {option || `Option ${optIndex + 1}${isCorrect ? ' (Correct)' : ''}`}
                                                        </div>
                                                        <div className="flex-shrink-0 w-8 h-8 text-gray-400 rounded-lg flex items-center justify-center">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-sm text-gray-500">No options available</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        // Default UI (Term and Definition)
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                        <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                                    </div>
                                    <select
                                        value={flashcard.type || 'pair'}
                                        onChange={(e) => {
                                            const newType = e.target.value;
                                            onSetFlashcards(prev => prev.map(c => {
                                                if (c.id === flashcard.id) {
                                                    if (newType === 'fillblank') {
                                                        const answers = extractAnswersFromText(c.term || '');
                                                        return {
                                                            ...c,
                                                            type: newType,
                                                            fillBlankAnswers: answers.length > 0 ? answers : ['']
                                                        };
                                                    } else {
                                                        return {
                                                            ...c,
                                                            type: newType,
                                                            fillBlankAnswers: undefined
                                                        };
                                                    }
                                                }
                                                return c;
                                            }));
                                        }}
                                        className="text-sm border border-gray-300 rounded-lg px-3 py-2"
                                    >
                                        <option value="pair">Thuật ngữ và Định nghĩa</option>
                                        <option value="fillblank">Điền vào chỗ trống</option>
                                        <option value="multiplechoice">Trắc nghiệm</option>
                                    </select>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => onStartEdit(flashcard)}
                                        className="p-1 text-blue-400 hover:text-blue-600"
                                        title="Sửa"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <GripVertical
                                        className="w-5 h-5 text-gray-400 cursor-move hover:text-gray-600"
                                        onMouseDown={(e) => e.stopPropagation()}
                                    />
                                    <button
                                        onClick={() => onDeleteFlashcard(flashcard.id)}
                                        className="p-1 text-red-400 hover:text-red-600"
                                        title="Xóa"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {editingCardId === flashcard.id ? (
                                // Edit Mode
                                <>
                                    <div className="flex flex-wrap items-center gap-6 mb-4">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-medium text-gray-700">Loại</span>
                                            <select className="text-sm border border-gray-300 rounded-lg px-3 py-2 min-w-48" defaultValue="pair">
                                                <option value="pair">Thuật ngữ và Định nghĩa</option>
                                                <option value="fillblank">Điền vào chỗ trống</option>
                                                <option value="multiplechoice">Trắc nghiệm</option>
                                            </select>
                                        </div>
                                        {flashcard.type !== 'fillblank' && (
                                            <>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm font-medium text-gray-700">Tạo ngược</span>
                                                    <button
                                                        onClick={() => onSetFlashcards(prev => prev.map(c => c.id === flashcard.id ? { ...c, reverseEnabled: !c.reverseEnabled } : c))}
                                                        className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${flashcard.reverseEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${flashcard.reverseEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                                                    </button>
                                                    <span className={`text-xs ${flashcard.reverseEnabled ? 'text-green-500' : 'text-red-500'}`}>{flashcard.reverseEnabled ? 'BẬT' : 'TẮT'}</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm font-medium text-gray-700">Thuật ngữ dạng âm thanh</span>
                                                    <button
                                                        onClick={() => onSetFlashcards(prev => prev.map(c => c.id === flashcard.id ? { ...c, audioEnabled: !c.audioEnabled } : c))}
                                                        className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${flashcard.audioEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${flashcard.audioEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                                                    </button>
                                                    <span className={`text-xs ${flashcard.audioEnabled ? 'text-green-500' : 'text-red-500'}`}>{flashcard.audioEnabled ? 'BẬT' : 'TẮT'}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-3">Thuật ngữ</label>
                                            <textarea
                                                value={editTerm}
                                                onChange={(e) => onSetEditTerm(e.target.value)}
                                                className="w-full h-24 rounded-lg border border-gray-200 p-4 bg-purple-50 text-sm resize-none"
                                                placeholder="Nhập thuật ngữ..."
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
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-3">Định nghĩa</label>
                                            <textarea
                                                value={editDefinition}
                                                onChange={(e) => onSetEditDefinition(e.target.value)}
                                                className="w-full h-24 rounded-lg border border-gray-200 p-4 bg-purple-50 text-sm resize-none"
                                                placeholder="Nhập định nghĩa..."
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
                                        </div>
                                    </div>
                                </>
                            ) : (
                                // View Mode
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-3">Thuật ngữ</label>
                                        <div className="w-full min-h-24 rounded-lg border border-gray-200 p-4 bg-purple-50 text-sm">
                                            {flashcard.term}
                                        </div>
                                        {flashcard.termImage && (
                                            <div className="mt-3 relative group">
                                                <img
                                                    src={flashcard.termImage}
                                                    alt="Term image"
                                                    className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                                <button
                                                    onClick={() => {
                                                        onSetFlashcards(prev => prev.map(f =>
                                                            f.id === flashcard.id
                                                                ? { ...f, termImage: '' }
                                                                : f
                                                        ));
                                                    }}
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
                                        <div className="w-full min-h-24 rounded-lg border border-gray-200 p-4 bg-purple-50 text-sm">
                                            {flashcard.definition}
                                        </div>
                                        {flashcard.definitionImage && (
                                            <div className="mt-3 relative group">
                                                <img
                                                    src={flashcard.definitionImage}
                                                    alt="Definition image"
                                                    className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                                <button
                                                    onClick={() => {
                                                        onSetFlashcards(prev => prev.map(f =>
                                                            f.id === flashcard.id
                                                                ? { ...f, definitionImage: '' }
                                                                : f
                                                        ));
                                                    }}
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

                            {editingCardId === flashcard.id && (
                                <div className="flex justify-end space-x-2 mt-4">
                                    <button
                                        onClick={onCancelEdit}
                                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={async () => {
                                            await onSaveEdit(editingCardId, editTerm.trim(), editDefinition.trim());
                                        }}
                                        disabled={!editTerm.trim() || !editDefinition.trim() || isSaving}
                                        className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50"
                                    >
                                        {isSaving ? 'Đang lưu...' : 'Lưu'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            ))}
        </div>
    );
};

