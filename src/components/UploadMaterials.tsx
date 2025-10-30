import React, { useState } from 'react';
import {
    Upload,
    FileText,
    Video,
    Music,
    Image,
    Link,
    Copy,
    Mic,
    ChevronDown,
    Plus,
    BookOpen,
    Target,
    Users,
    ArrowLeft
} from 'lucide-react';
import YouTubeModal from './YouTubeModal';
import UploadFilesModal from './UploadFilesModal';

interface UploadMaterialsProps {
    studySetId: string;
    studySetName: string;
    onBack: () => void;
    onViewMaterial?: () => void;
    isCollapsed?: boolean;
}

const UploadMaterials: React.FC<UploadMaterialsProps> = ({ studySetId, studySetName, onBack, onViewMaterial, isCollapsed = false }) => {
    const [dragActive, setDragActive] = useState(false);
    const [showMoreTypes, setShowMoreTypes] = useState(false);
    const [showYouTubeModal, setShowYouTubeModal] = useState(false);
    const [showUploadFilesModal, setShowUploadFilesModal] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<Array<{ name: string, size: number, type: string, file?: File }>>([]);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleFiles = (files: FileList) => {
        const fileInfos = Array.from(files).map(file => ({
            name: file.name,
            size: file.size,
            type: file.type,
            file: file // Store the actual File object
        }));
        setSelectedFiles(fileInfos);
        setShowUploadFilesModal(true);
    };

    const uploadTypes = [
        { name: 'Powerpoints', icon: FileText, color: 'bg-gray-500' },
        { name: 'PDF Documents', icon: FileText, color: 'bg-gray-500' },
        { name: 'Audio Files', icon: Music, color: 'bg-gray-500' },
        { name: 'Video Files', icon: Video, color: 'bg-gray-500' },
        { name: 'Import Quizlet', icon: BookOpen, color: 'bg-gray-500' },
        { name: 'Youtube Video', icon: Video, color: 'bg-gray-500' },
        { name: 'From Canvas', icon: Link, color: 'bg-red-500' }
    ];

    const copyLink = () => {
        const link = `${window.location.origin}/studyset/${studySetId}/collaborate`;
        navigator.clipboard.writeText(link);
        // TODO: Show success toast
    };

    const handleFileTypeClick = (typeName: string) => {
        if (typeName === 'Youtube Video') {
            setShowYouTubeModal(true);
        } else {
            // For other file types, trigger file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = getFileAccept(typeName);
            input.onchange = (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (files && files.length > 0) {
                    handleFiles(files);
                }
            };
            input.click();
        }
    };

    const getFileAccept = (typeName: string) => {
        switch (typeName) {
            case 'Powerpoints':
                return '.ppt,.pptx';
            case 'PDF Documents':
                return '.pdf';
            case 'Audio Files':
                return '.mp3,.wav,.m4a';
            case 'Video Files':
                return '.mp4,.avi,.mov';
            default:
                return '*';
        }
    };

    const handleYouTubeImport = (url: string, generateNotes: boolean) => {
        console.log('Importing YouTube video:', url, 'Generate notes:', generateNotes);
        // TODO: Implement YouTube import logic
    };

    const handleFileUpload = async (files: Array<{ name: string, size: number, type: string, file?: File }>, generateNotes: boolean, noteType?: 'summarized' | 'indepth' | 'comprehensive') => {
        console.log('Uploading files:', files, 'Generate notes:', generateNotes, 'Note type:', noteType);

        try {
            // Create FormData for file upload
            for (const file of files) {
                const formData = new FormData();

                // Use actual file if available, otherwise create a proper file
                if (file.file) {
                    formData.append('file', file.file);
                } else {
                    // Create a proper file with content
                    const actualFile = new File(['Sample PDF content'], file.name, { type: file.type });
                    formData.append('file', actualFile);
                }

                formData.append('name', file.name);
                formData.append('type', file.type);
                formData.append('size', file.size.toString());
                formData.append('studySetId', studySetId);
                formData.append('generateNotes', generateNotes.toString());
                formData.append('noteType', noteType || 'summarized');

                const response = await fetch('http://localhost:3001/api/materials/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Failed to upload file');
                }

                const savedMaterial = await response.json();
                console.log('Material uploaded:', savedMaterial);
            }

            console.log('All materials uploaded successfully');
        } catch (error) {
            console.error('Error uploading materials:', error);
        }
    };

    return (
        <div className={`flex-1 p-8 bg-gray-50 min-h-screen transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-48'}`}>
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center space-x-3 mb-4">
                    <button
                        onClick={onBack}
                        className="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Tải lên tài liệu</h1>
                        <p className="text-gray-600 mt-2">Thêm tài liệu vào "{studySetName}"</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                    {/* Upload Section */}
                    <div className="bg-white rounded-xl p-8 shadow-sm border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Tải lên bất kỳ tài liệu nào từ lớp học</h2>
                        <p className="text-gray-600 mb-6">Nhấp để tải lên hoặc kéo thả tệp</p>

                        <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                                }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            {/* Illustration Icons */}
                            <div className="flex items-center justify-center space-x-2 mb-6">
                                <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center relative z-10">
                                    <Music className="w-4 h-4 text-purple-600" />
                                </div>
                                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center relative z-20 -ml-2">
                                    <Users className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center relative z-30 -ml-2">
                                    <FileText className="w-4 h-4 text-red-600" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {uploadTypes.slice(0, 6).map((type, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleFileTypeClick(type.name)}
                                        className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                                    >
                                        <div className={`w-6 h-6 ${type.color} rounded flex items-center justify-center`}>
                                            <type.icon className="w-3 h-3 text-white" />
                                        </div>
                                        <span className="text-xs font-medium">{type.name}</span>
                                    </button>
                                ))}
                            </div>

                            {showMoreTypes && (
                                <div className="grid grid-cols-1 gap-2 mb-4">
                                    {uploadTypes.slice(6).map((type, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleFileTypeClick(type.name)}
                                            className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                                        >
                                            <div className={`w-6 h-6 ${type.color} rounded flex items-center justify-center`}>
                                                <type.icon className="w-3 h-3 text-white" />
                                            </div>
                                            <span className="text-xs font-medium">{type.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => setShowMoreTypes(!showMoreTypes)}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1 mx-auto"
                            >
                                <span>Xem thêm loại tải lên</span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${showMoreTypes ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Collaboration Section */}
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Users className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900">Mời bạn bè giúp tải lên tài liệu</h3>
                                    <p className="text-gray-600 text-xs">
                                        Chia sẻ liên kết này với bạn cùng lớp để cộng tác xây dựng tài liệu học tập
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={copyLink}
                                className="flex items-center space-x-1 bg-white border border-blue-600 text-blue-600 px-2 py-1 rounded text-xs"
                            >
                                <Copy className="w-3 h-3" />
                                <span>Sao chép liên kết</span>
                            </button>
                        </div>
                    </div>

                    {/* Live Lecture Section */}
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-pink-200">
                        <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                                <Mic className="w-5 h-5 text-pink-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-base font-semibold text-gray-900 mb-1">Bạn đang ở trong lớp? Bắt đầu bài giảng trực tiếp</h3>
                                <div className="flex items-start justify-between">
                                    <p className="text-gray-600 text-xs flex-1">
                                        Ghi lại bài giảng của bạn theo thời gian thực và nhận ghi chú, tóm tắt và tài liệu học tập được hỗ trợ bởi AI
                                    </p>
                                    <button className="flex items-center space-x-1 bg-white border border-pink-600 text-pink-600 px-2 py-1 rounded text-xs ml-4 flex-shrink-0">
                                        <Mic className="w-3 h-3" />
                                        <span>Bắt đầu ghi âm</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Study Materials Preview */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Chúng tôi sẽ biến nó thành tài liệu học tập dễ tiêu hóa</h3>

                        <div className="space-y-3">
                            <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-md">
                                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center flex-shrink-0">
                                    <BookOpen className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-1 text-sm">Tài liệu học tập</h4>
                                    <p className="text-gray-600 text-xs">Thẻ ghi nhớ, câu đố, trò chơi và nhiều hơn nữa.</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-md">
                                <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center flex-shrink-0">
                                    <Target className="w-4 h-4 text-purple-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-1 text-sm">Kế hoạch & Theo dõi tiến độ</h4>
                                    <p className="text-gray-600 text-xs">Một kế hoạch học tập dựa trên lớp học chính xác của bạn</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* YouTube Modal */}
            <YouTubeModal
                isOpen={showYouTubeModal}
                onClose={() => setShowYouTubeModal(false)}
                onImport={handleYouTubeImport}
            />

            {/* Upload Files Modal */}
            <UploadFilesModal
                isOpen={showUploadFilesModal}
                onClose={() => setShowUploadFilesModal(false)}
                onUpload={handleFileUpload}
                selectedFiles={selectedFiles}
                studySetId={studySetId}
                studySetName={studySetName}
                onViewMaterial={onViewMaterial}
            />
        </div>
    );
};

export default UploadMaterials;
