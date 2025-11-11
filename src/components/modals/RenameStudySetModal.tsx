import React from 'react';

interface RenameStudySetModalProps {
    isOpen: boolean;
    currentName?: string;
    value: string;
    error?: string;
    isSubmitting?: boolean;
    onChange: (value: string) => void;
    onCancel: () => void;
    onSubmit: () => void;
}

const RenameStudySetModal: React.FC<RenameStudySetModalProps> = ({
    isOpen,
    currentName,
    value,
    error,
    isSubmitting = false,
    onChange,
    onCancel,
    onSubmit
}) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <div className="mb-5">
                    <h2 className="text-xl font-semibold text-gray-900">Đổi tên bộ học</h2>
                    {currentName && (
                        <p className="mt-1 text-sm text-gray-500">
                            Tên hiện tại: <span className="font-medium text-gray-700">{currentName}</span>
                        </p>
                    )}
                </div>

                <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="rename-study-set-input">
                    Tên mới
                </label>
                <input
                    id="rename-study-set-input"
                    type="text"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="Nhập tên mới..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    disabled={isSubmitting}
                    autoFocus
                />

                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        disabled={isSubmitting}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={onSubmit}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RenameStudySetModal;


