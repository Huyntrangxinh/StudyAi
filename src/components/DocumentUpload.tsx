import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle, Brain, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface FileData {
    id: string;
    name: string;
    bytes: number;
    createdAt: string;
    hasSummary: boolean;
}

interface SummaryData {
    bullets: string[];
    structured: {
        overview?: string;
        key_points?: string[];
        definitions?: string[];
        methods_or_arguments?: string[];
        conclusion?: string;
        study_tips?: string[];
    };
    summaryId: string;
}

const DocumentUpload: React.FC = () => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [fileData, setFileData] = useState<FileData | null>(null);
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [history, setHistory] = useState<FileData[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    // Debug useEffect
    React.useEffect(() => {
        console.log('fileData state changed:', fileData);
    }, [fileData]);

    // Load user history
    const loadHistory = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/history`, {
                headers: {
                    'x-user-id': 'demo-user' // Replace with actual user ID
                }
            });
            const data = await response.json();
            setHistory(data.files || []);
        } catch (error) {
            console.error('Error loading history:', error);
        }
    };

    // Handle file selection
    const handleFileSelect = (file: File) => {
        if (file.type !== 'application/pdf') {
            toast.error('Chỉ hỗ trợ file PDF!');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB
            toast.error('File quá lớn! Vui lòng chọn file nhỏ hơn 10MB.');
            return;
        }

        setUploadedFile(file);
        toast.success(`Đã chọn file: ${file.name}`);
    };

    // Handle drag and drop
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    // Upload file
    const handleUpload = async () => {
        if (!uploadedFile) {
            toast.error('Vui lòng chọn file để upload!');
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', uploadedFile);

            console.log('Uploading file:', uploadedFile.name, 'Size:', uploadedFile.size);
            console.log('API Base:', API_BASE);

            const response = await fetch(`${API_BASE}/api/upload`, {
                method: 'POST',
                headers: {
                    'x-user-id': 'demo-user' // Replace with actual user ID
                },
                body: formData
            });

            console.log('Upload response status:', response.status);
            const data = await response.json();
            console.log('Upload response data:', data);

            if (response.ok) {
                const newFileData = {
                    id: data.fileId,
                    name: data.name,
                    bytes: data.bytes,
                    createdAt: new Date().toISOString(),
                    hasSummary: false
                };
                console.log('Setting fileData to:', newFileData);
                setFileData(newFileData);
                toast.success('Upload thành công!');

                // Force re-render by updating state
                setTimeout(() => {
                    console.log('fileData after setState:', newFileData);
                }, 100);
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(`Upload thất bại: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    // Generate summary
    const handleSummarize = async () => {
        if (!fileData) {
            toast.error('Không có file để tóm tắt!');
            return;
        }

        setIsSummarizing(true);
        try {
            const response = await fetch(`${API_BASE}/api/summarize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': 'demo-user' // Replace with actual user ID
                },
                body: JSON.stringify({ fileId: fileData.id })
            });

            const data = await response.json();

            if (response.ok) {
                setSummary(data);
                toast.success('Tóm tắt AI hoàn thành!');
            } else {
                throw new Error(data.error || 'Summarize failed');
            }
        } catch (error: any) {
            console.error('Summarize error:', error);
            toast.error(`Tóm tắt thất bại: ${error.message}`);
        } finally {
            setIsSummarizing(false);
        }
    };

    // Remove file
    const handleRemoveFile = () => {
        setUploadedFile(null);
        setFileData(null);
        setSummary(null);
        toast('Đã xóa file.', { icon: '🗑️' });
    };

    // Format file size
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Import tài liệu & Tóm tắt thông minh
                    </h1>
                    <p className="text-gray-600">
                        Upload file PDF và sử dụng AI để tóm tắt nội dung một cách thông minh
                    </p>
                </div>

                {/* Upload Section */}
                <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Upload tài liệu
                    </h2>

                    {!uploadedFile ? (
                        <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
                                }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-lg text-gray-600 mb-2">
                                Kéo và thả file PDF vào đây
                            </p>
                            <p className="text-sm text-gray-500 mb-4">
                                hoặc <span className="font-medium text-blue-600">chọn file</span>
                            </p>
                            <p className="text-xs text-gray-400">
                                Hỗ trợ PDF (tối đa 10MB)
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Chọn file
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <FileText className="h-8 w-8 text-red-500" />
                                    <div>
                                        <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {formatFileSize(uploadedFile.size)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleRemoveFile}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={handleUpload}
                                    disabled={isUploading}
                                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Upload className="h-4 w-4 mr-2" />
                                    )}
                                    {isUploading ? 'Đang upload...' : 'Upload'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Debug Info */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <h3 className="font-medium text-yellow-800 mb-2">Debug Info:</h3>
                    <p className="text-sm text-yellow-700">fileData: {fileData ? 'EXISTS' : 'NULL'}</p>
                    <p className="text-sm text-yellow-700">uploadedFile: {uploadedFile ? 'EXISTS' : 'NULL'}</p>
                    <p className="text-sm text-yellow-700">isUploading: {isUploading ? 'TRUE' : 'FALSE'}</p>
                    {fileData && (
                        <p className="text-sm text-yellow-700">File ID: {fileData.id}</p>
                    )}
                </div>

                {/* File Status & Summary Section */}
                {fileData && (
                    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Trạng thái file
                            </h2>
                            <div className="flex items-center space-x-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span className="text-sm text-green-600">Upload thành công</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tên file
                                </label>
                                <p className="text-sm text-gray-900">{fileData.name}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Kích thước
                                </label>
                                <p className="text-sm text-gray-900">{formatFileSize(fileData.bytes)}</p>
                            </div>
                        </div>

                        <button
                            onClick={handleSummarize}
                            disabled={isSummarizing}
                            className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSummarizing ? (
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            ) : (
                                <Brain className="h-5 w-5 mr-2" />
                            )}
                            {isSummarizing ? 'Đang tóm tắt...' : 'Tóm tắt thông minh'}
                        </button>
                    </div>
                )}

                {/* Summary Results */}
                {summary && (
                    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Kết quả tóm tắt AI
                        </h2>

                        {/* Overview */}
                        {summary.structured.overview && (
                            <div className="mb-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Tổng quan
                                </h3>
                                <p className="text-gray-700 bg-blue-50 p-4 rounded-lg">
                                    {summary.structured.overview}
                                </p>
                            </div>
                        )}

                        {/* Key Points */}
                        {summary.structured.key_points && summary.structured.key_points.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Điểm quan trọng
                                </h3>
                                <ul className="space-y-2">
                                    {summary.structured.key_points.map((point, index) => (
                                        <li key={index} className="flex items-start">
                                            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                                                {index + 1}
                                            </span>
                                            <span className="text-gray-700">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Definitions */}
                        {summary.structured.definitions && summary.structured.definitions.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Định nghĩa quan trọng
                                </h3>
                                <div className="space-y-3">
                                    {summary.structured.definitions.map((definition, index) => (
                                        <div key={index} className="bg-yellow-50 p-3 rounded-lg">
                                            <p className="text-gray-700">{definition}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Study Tips */}
                        {summary.structured.study_tips && summary.structured.study_tips.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Mẹo học tập
                                </h3>
                                <ul className="space-y-2">
                                    {summary.structured.study_tips.map((tip, index) => (
                                        <li key={index} className="flex items-start">
                                            <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                                                💡
                                            </span>
                                            <span className="text-gray-700">{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Conclusion */}
                        {summary.structured.conclusion && (
                            <div className="mb-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Kết luận
                                </h3>
                                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                                    {summary.structured.conclusion}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* History Section */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Lịch sử tài liệu
                        </h2>
                        <button
                            onClick={() => {
                                setShowHistory(!showHistory);
                                if (!showHistory) loadHistory();
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                            {showHistory ? 'Ẩn lịch sử' : 'Xem lịch sử'}
                        </button>
                    </div>

                    {showHistory && (
                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">
                                    Chưa có tài liệu nào được upload
                                </p>
                            ) : (
                                history.map((file) => (
                                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <FileText className="h-5 w-5 text-red-500" />
                                            <div>
                                                <p className="font-medium text-gray-900">{file.name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {formatFileSize(file.bytes)} • {new Date(file.createdAt).toLocaleDateString('vi-VN')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {file.hasSummary && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <Brain className="h-3 w-3 mr-1" />
                                                    Đã tóm tắt
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentUpload;
