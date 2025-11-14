import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash2, Plus, FileText, BookOpen, Layers, Cloud, GraduationCap } from 'lucide-react';
import UploadFinishedModal from './UploadFinishedModal';

interface FileInfo {
    name: string;
    size: number;
    type: string;
    file?: File;
}

interface UploadFilesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (files: FileInfo[], generateNotes: boolean, noteType?: 'summarized' | 'indepth' | 'comprehensive') => Promise<void>;
    selectedFiles: FileInfo[];
    studySetId?: string;
    studySetName?: string;
    onViewMaterial?: () => void;
    onViewStudyPlan?: () => void;
}

const UploadFilesModal: React.FC<UploadFilesModalProps> = ({
    isOpen,
    onClose,
    onUpload,
    selectedFiles,
    studySetId,
    studySetName,
    onViewMaterial,
    onViewStudyPlan
}) => {
    const [generateNotes, setGenerateNotes] = useState(false);
    const [files, setFiles] = useState<FileInfo[]>([]);
    const [noteType, setNoteType] = useState<'summarized' | 'indepth' | 'comprehensive'>('summarized');

    // Progress states
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'study_plan'>('upload');
    const [showUploadFinished, setShowUploadFinished] = useState(false);

    const uploadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const processingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const processingCompletedRef = useRef(false);

    const clearIntervals = () => {
        if (uploadIntervalRef.current) {
            clearInterval(uploadIntervalRef.current);
            uploadIntervalRef.current = null;
        }
        if (processingIntervalRef.current) {
            clearInterval(processingIntervalRef.current);
            processingIntervalRef.current = null;
        }
        processingCompletedRef.current = false;
    };

    useEffect(() => {
        return () => {
            clearIntervals();
        };
    }, []);

    // Update files when selectedFiles prop changes
    useEffect(() => {
        console.log('Modal opened, selectedFiles:', selectedFiles);
        if (isOpen && selectedFiles.length > 0) {
            setFiles(selectedFiles);
        }
    }, [isOpen, selectedFiles]);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const addMoreFiles = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = (e) => {
            const newFiles = Array.from((e.target as HTMLInputElement).files || []);
            const newFileInfos: FileInfo[] = newFiles.map(file => ({
                name: file.name,
                size: file.size,
                type: file.type,
                file
            }));
            setFiles([...files, ...newFileInfos]);
        };
        input.click();
    };

    const handleUpload = () => {
        if (!files.length) {
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setProcessingProgress(0);
        setCurrentStep('upload');
        setShowUploadFinished(false);
        processingCompletedRef.current = false;

        if (uploadIntervalRef.current) {
            clearInterval(uploadIntervalRef.current);
        }
        if (processingIntervalRef.current) {
            clearInterval(processingIntervalRef.current);
            processingIntervalRef.current = null;
        }

        const beginProcessingPhase = async () => {
            setCurrentStep('processing');
            setProcessingProgress(20); // Bắt đầu từ 20%

            if (processingIntervalRef.current) {
                clearInterval(processingIntervalRef.current);
            }

            // Progress bar tăng dần từ 20% -> 30% -> ... -> 95% trong khi đợi
            processingIntervalRef.current = setInterval(() => {
                setProcessingProgress(prev => {
                    if (processingCompletedRef.current) {
                        return prev;
                    }
                    // Tăng dần: 20% -> 30% -> ... -> 95%
                    const increment = Math.max(1, Math.floor(Math.random() * 3));
                    const cappedValue = Math.min(prev + increment, 95);
                    return cappedValue;
                });
            }, 800); // Mỗi 800ms tăng một chút

            try {
                await onUpload(files, generateNotes, noteType);
                // Chỉ khi roadmap thực sự xong mới lên 100%
                processingCompletedRef.current = true;
                if (processingIntervalRef.current) {
                    clearInterval(processingIntervalRef.current);
                    processingIntervalRef.current = null;
                }
                setProcessingProgress(100);
                setCurrentStep('study_plan');
                setTimeout(() => {
                    clearIntervals();
                    setIsUploading(false);
                    setShowUploadFinished(true);
                }, 800);
            } catch (error) {
                console.error('Error processing upload:', error);
                // Nếu có lỗi, tiếp tục đợi thay vì hiển thị lỗi
                // Progress bar sẽ tiếp tục tăng đến 95% và đợi
                // Không set processingCompletedRef để progress tiếp tục chạy
            }
        };

        uploadIntervalRef.current = setInterval(() => {
            setUploadProgress(prev => {
                const next = Math.min(prev + 5, 100);
                if (next >= 100) {
                    if (uploadIntervalRef.current) {
                        clearInterval(uploadIntervalRef.current);
                        uploadIntervalRef.current = null;
                    }
                    setCurrentStep('processing');
                    beginProcessingPhase();
                }
                return next;
            });
        }, 150);
    };

    const handleClose = () => {
        setFiles([]);
        setGenerateNotes(false);
        setNoteType('summarized');
        setIsUploading(false);
        setUploadProgress(0);
        setProcessingProgress(0);
        setCurrentStep('upload');
        setShowUploadFinished(false);
        clearIntervals();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            {isUploading ? (
                // Progress Screen
                <div className="bg-white rounded-xl p-8 w-full max-w-2xl mx-4 shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Upload className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Upload Files</h3>
                                <p className="text-sm text-gray-600">Add PDFs, documents, images, and more</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Loading Animation */}
                    <div className="flex justify-center mb-6">
                        <div className="w-24 h-24 flex items-center justify-center">
                            <img
                                src="/truotvan.gif"
                                alt="Loading animation"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>

                    {/* Main Title */}
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Preparing Your Materials</h2>
                        <p className="text-gray-600">We're analyzing your content and creating smart study materials.</p>
                    </div>

                    {/* Status Cards */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        {/* Upload Card */}
                        <div className={`p-4 rounded-lg border-2 ${currentStep === 'upload' ? 'border-blue-500 bg-blue-50' :
                            currentStep === 'processing' || currentStep === 'study_plan' ? 'border-green-500 bg-green-50' :
                                'border-gray-200'
                            }`}>
                            <div className="flex flex-col items-center space-y-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'upload' ? 'bg-blue-100' :
                                    currentStep === 'processing' || currentStep === 'study_plan' ? 'bg-green-100' :
                                        'bg-gray-100'
                                    }`}>
                                    <Cloud className={`w-4 h-4 ${currentStep === 'upload' ? 'text-blue-600' :
                                        currentStep === 'processing' || currentStep === 'study_plan' ? 'text-green-600' :
                                            'text-gray-600'
                                        }`} />
                                </div>
                                <span className="text-sm font-medium text-gray-700">Upload</span>
                                <span className="text-xs text-gray-500">
                                    {currentStep === 'upload' ? 'In Progress' :
                                        currentStep === 'processing' || currentStep === 'study_plan' ? 'Complete' :
                                            'Pending...'}
                                </span>
                            </div>
                        </div>

                        {/* Processing Card */}
                        <div className={`p-4 rounded-lg border-2 ${currentStep === 'processing' ? 'border-blue-500 bg-blue-50' :
                            currentStep === 'study_plan' ? 'border-green-500 bg-green-50' :
                                'border-gray-200'
                            }`}>
                            <div className="flex flex-col items-center space-y-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'processing' ? 'bg-blue-100' :
                                    currentStep === 'study_plan' ? 'bg-green-100' :
                                        'bg-gray-100'
                                    }`}>
                                    <BookOpen className={`w-4 h-4 ${currentStep === 'processing' ? 'text-blue-600' :
                                        currentStep === 'study_plan' ? 'text-green-600' :
                                            'text-gray-600'
                                        }`} />
                                </div>
                                <span className="text-sm font-medium text-gray-700">Processing</span>
                                <span className="text-xs text-gray-500">
                                    {currentStep === 'processing' ? 'In Progress' :
                                        currentStep === 'study_plan' ? 'Complete' :
                                            'Pending...'}
                                </span>
                            </div>
                        </div>

                        {/* Study Plan Card */}
                        <div className={`p-4 rounded-lg border-2 ${currentStep === 'study_plan' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}>
                            <div className="flex flex-col items-center space-y-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'study_plan' ? 'bg-blue-100' : 'bg-gray-100'
                                    }`}>
                                    <GraduationCap className={`w-4 h-4 ${currentStep === 'study_plan' ? 'text-blue-600' : 'text-gray-600'
                                        }`} />
                                </div>
                                <span className="text-sm font-medium text-gray-700">Study Plan</span>
                                <span className="text-xs text-gray-500">
                                    {currentStep === 'study_plan' ? 'In Progress' : 'Pending...'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bars */}
                    <div className="space-y-4 mb-8">
                        {/* Upload Progress */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700">Uploading</span>
                                <span className="text-sm font-medium text-blue-600">
                                    {uploadProgress === 100 ? 'Complete!' : `${uploadProgress}%`}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Processing Progress */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700">Processing Progress</span>
                                <span className="text-sm font-medium text-blue-600">{processingProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${processingProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Info Text */}
                    <div className="text-center">
                        <p className="text-gray-500 text-sm leading-relaxed">
                            We're processing your materials with AI to create the best study experience<br />
                            This includes generating notes, flashcards, practice tests, and more<br />
                            You'll be redirected automatically when ready
                        </p>
                    </div>
                </div>
            ) : (
                // File Selection Screen
                <div className="bg-white rounded-xl p-8 w-full max-w-lg mx-4 shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Upload className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Upload Files</h3>
                                <p className="text-sm text-gray-600">Add PDFs, documents, images, and more</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Selected Files Section */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-medium text-gray-700">
                                Selected Files ({files.length})
                            </h4>
                            <button
                                onClick={addMoreFiles}
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add more files</span>
                            </button>
                        </div>

                        {/* File List */}
                        <div className="space-y-3">
                            {files.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatFileSize(file.size)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="text-gray-400 hover:text-red-500 transition-colors ml-3"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Generate Study Notes Toggle */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h4 className="text-sm font-medium text-gray-700">Generate Study Notes</h4>
                            <p className="text-xs text-gray-500">Transform your documents into digestible study materials</p>
                        </div>
                        <button
                            onClick={() => setGenerateNotes(!generateNotes)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${generateNotes ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${generateNotes ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Note Type Selection */}
                    {generateNotes && (
                        <div className="mb-6">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">What type of notes would you like to generate?</h4>
                            <div className="grid grid-cols-3 gap-3">
                                {/* Summarized Notes */}
                                <button
                                    onClick={() => setNoteType('summarized')}
                                    className={`p-3 rounded-lg border-2 transition-colors ${noteType === 'summarized'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex flex-col items-center space-y-2">
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <div className="flex flex-col space-y-1">
                                                <div className="w-4 h-0.5 bg-blue-600"></div>
                                                <div className="w-3 h-0.5 bg-blue-600"></div>
                                                <div className="w-2 h-0.5 bg-blue-600"></div>
                                            </div>
                                        </div>
                                        <span className="text-xs font-medium text-gray-700">Summarized Notes</span>
                                    </div>
                                </button>

                                {/* In Depth Notes */}
                                <button
                                    onClick={() => setNoteType('indepth')}
                                    className={`p-3 rounded-lg border-2 transition-colors ${noteType === 'indepth'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex flex-col items-center space-y-2">
                                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                            <div className="flex flex-col space-y-1">
                                                <div className="w-4 h-0.5 bg-gray-600"></div>
                                                <div className="w-4 h-0.5 bg-gray-600"></div>
                                                <div className="w-3 h-0.5 bg-gray-600"></div>
                                                <div className="w-2 h-0.5 bg-gray-600"></div>
                                            </div>
                                        </div>
                                        <span className="text-xs font-medium text-gray-700">In Depth Notes</span>
                                    </div>
                                </button>

                                {/* Comprehensive Notes */}
                                <button
                                    onClick={() => setNoteType('comprehensive')}
                                    className={`p-3 rounded-lg border-2 transition-colors ${noteType === 'comprehensive'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex flex-col items-center space-y-2">
                                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                            <div className="flex flex-col space-y-1">
                                                <div className="w-4 h-0.5 bg-gray-600"></div>
                                                <div className="w-4 h-0.5 bg-gray-600"></div>
                                                <div className="w-4 h-0.5 bg-gray-600"></div>
                                                <div className="w-4 h-0.5 bg-gray-600"></div>
                                            </div>
                                        </div>
                                        <span className="text-xs font-medium text-gray-700">Comprehensive Notes</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end space-x-3">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpload}
                            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                            <span>Upload {files.length} File{files.length !== 1 ? 's' : ''}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Upload Finished Modal */}
            <UploadFinishedModal
                isOpen={showUploadFinished}
                onClose={handleClose}
                onViewStudyPlan={() => {
                    console.log('View Study Plan clicked - navigating to roadmap');
                    handleClose();
                    if (onViewStudyPlan) {
                        onViewStudyPlan();
                    }
                }}
                onViewMaterial={() => {
                    console.log('View Material clicked - navigating to PDF viewer');
                    handleClose();
                    if (onViewMaterial) {
                        onViewMaterial();
                    }
                }}
                studySetId={studySetId}
                studySetName={studySetName}
            />
        </div>
    );
};

export default UploadFilesModal;
