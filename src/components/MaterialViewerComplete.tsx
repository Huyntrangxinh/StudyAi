import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
    ArrowLeft,
    Share2,
    MessageSquare,
    FileText,
    Maximize2,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Highlighter,
    Link,
    Image,
    AlignLeft,
    AlignCenter,
    AlignRight,
    List,
    ListOrdered,
    Undo,
    Redo,
    Plus,
    Send,
    Mic,
    Paperclip,
    Sparkles
} from 'lucide-react';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface MaterialViewerProps {
    studySetId: string;
    studySetName: string;
    onBack: () => void;
}

const MaterialViewerComplete: React.FC<MaterialViewerProps> = ({ studySetId, studySetName, onBack }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(56);
    const [activeTab, setActiveTab] = useState<'notes' | 'transcript' | 'pdf' | 'split'>('split');
    const [chatMessage, setChatMessage] = useState('');
    const [materials, setMaterials] = useState<Array<{ id: string, name: string, type: string, size: number }>>([]);
    const [selectedMaterial, setSelectedMaterial] = useState<{ id: string, name: string, type: string, size: number } | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<Array<{
        id: number;
        type: 'ai' | 'user';
        message: string;
        avatar?: string;
        followUp?: string;
    }>>([
        { id: 1, type: 'ai', message: "Hello, I'm Spark.E", avatar: "🐶" },
        { id: 2, type: 'user', message: "Explain DevOps tools", followUp: "x2" }
    ]);

    // Load materials from database
    React.useEffect(() => {
        const loadMaterials = async () => {
            try {
                console.log('Loading materials for studySetId:', studySetId);
                const response = await fetch(`http://localhost:3001/api/materials/${studySetId}`);
                if (response.ok) {
                    const data = await response.json();
                    console.log('Materials loaded:', data);
                    setMaterials(data);
                    if (data.length > 0) {
                        setSelectedMaterial(data[0]);
                        // Use the actual uploaded file URL from API
                        const material = data[0];
                        console.log('Selected material:', material);
                        if (material.file_path) {
                            // Use the stored file path from database
                            const pdfUrl = `http://localhost:3001/api/materials/file/${material.file_path}`;
                            console.log('Setting PDF URL:', pdfUrl);
                            setPdfUrl(pdfUrl);
                        } else {
                            // Fallback to sample PDF if no file path
                            console.log('No file_path, using fallback PDF');
                            setPdfUrl('/sample-software-maintenance.pdf');
                        }
                    }
                } else {
                    console.error('Failed to load materials:', response.status);
                }
            } catch (error) {
                console.error('Error loading materials:', error);
                // Fallback to sample PDF if no materials found
                setPdfUrl('/sample-software-maintenance.pdf');
            }
        };
        loadMaterials();
    }, [studySetId]);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        console.log('PDF loaded successfully, pages:', numPages);
        setTotalPages(numPages);
        setPdfError(null);
    };

    const onDocumentLoadError = (error: Error) => {
        console.error('PDF load error:', error);
        setPdfError('Failed to load PDF document');
    };

    const handleSendMessage = () => {
        if (chatMessage.trim()) {
            const newMessage = {
                id: chatHistory.length + 1,
                type: 'user' as const,
                message: chatMessage.trim()
            };
            setChatHistory(prev => [...prev, newMessage]);
            setChatMessage('');
        }
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Left Sidebar Navigation */}
            <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-4">
                <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-gray-600" />
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {/* Document Header */}
                <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={onBack}
                            className="flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-lg font-semibold text-gray-900">
                            {selectedMaterial?.name || 'Bài 1_Tổng quan về vận hành và bảo trì phần mềm SUA (1) (1).pdf'}
                        </h1>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">{currentPage} of {totalPages}</span>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <Maximize2 className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Document Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-4xl mx-auto">
                        {pdfUrl ? (
                            <div className="flex justify-center">
                                <Document
                                    file={pdfUrl}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    onLoadError={onDocumentLoadError}
                                    className="pdf-document"
                                >
                                    <Page
                                        pageNumber={currentPage}
                                        width={800}
                                        className="pdf-page shadow-lg"
                                    />
                                </Document>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                                <div className="text-center">
                                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500">No document available</p>
                                </div>
                            </div>
                        )}

                        {pdfError && (
                            <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
                                <div className="text-center">
                                    <FileText className="w-16 h-16 text-red-400 mx-auto mb-4" />
                                    <p className="text-red-500">{pdfError}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Page Navigation */}
                <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                    <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <span>Previous</span>
                    </button>
                    <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                    <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <span>Next</span>
                    </button>
                </div>
            </div>

            {/* Right Sidebar - Notes & Collaboration */}
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
                {/* Notes & Collaboration Header */}
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Notes & Collaboration</h2>
                </div>

                {/* Text Editor Toolbar */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-2 mb-4">
                        <select className="text-sm border border-gray-300 rounded px-2 py-1">
                            <option>Arial</option>
                        </select>
                        <select className="text-sm border border-gray-300 rounded px-2 py-1">
                            <option>11</option>
                        </select>
                        <button className="p-1 hover:bg-gray-100 rounded">
                            <Bold className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                            <Italic className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                            <Underline className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                            <Strikethrough className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                            <Highlighter className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                            <Link className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                            <Image className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                            <AlignLeft className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                            <AlignCenter className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                            <AlignRight className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                            <List className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                            <ListOrdered className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                            <Undo className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                            <Redo className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Collaboration Section */}
                <div className="p-4 border-b border-gray-200">
                    <div className="bg-blue-50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-blue-800 mb-2">Share your studyset with your friends to collaborate in real time.</p>
                        <div className="flex space-x-2">
                            <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                                Share
                            </button>
                            <button className="px-3 py-1 text-blue-600 text-sm hover:underline">
                                Show demo
                            </button>
                        </div>
                    </div>
                    <button className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Notes</span>
                    </button>
                </div>

                {/* Notes Text Area */}
                <div className="flex-1 p-4">
                    <textarea
                        className="w-full h-full border border-gray-300 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Start taking notes..."
                    />
                </div>

                {/* Bottom Tabs */}
                <div className="p-4 border-t border-gray-200">
                    <div className="flex space-x-1">
                        <button className={`px-3 py-1 text-sm rounded ${activeTab === 'notes' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}>
                            Notes
                        </button>
                        <button className={`px-3 py-1 text-sm rounded ${activeTab === 'transcript' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}>
                            Transcript
                        </button>
                        <button className={`px-3 py-1 text-sm rounded ${activeTab === 'pdf' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}>
                            View PDF
                        </button>
                        <button className={`px-3 py-1 text-sm rounded ${activeTab === 'split' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}>
                            Split Screen
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Sidebar - Chat History */}
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatHistory.map((message) => (
                        <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs px-3 py-2 rounded-lg ${message.type === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}>
                                {message.avatar && <span className="mr-2">{message.avatar}</span>}
                                <p className="text-sm">{message.message}</p>
                                {message.followUp && (
                                    <span className="text-xs opacity-75 ml-2">{message.followUp}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Personalities & Skillsets */}
                <div className="p-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Personalities & Skillsets</h3>
                    <div className="text-xs text-gray-500">
                        Using 1 material(s)
                    </div>
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                            <Image className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                            <Mic className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                            <Paperclip className="w-4 h-4 text-gray-600" />
                        </button>
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                placeholder="Ask your AI tutor anything..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                        </div>
                        <button
                            onClick={handleSendMessage}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaterialViewerComplete;
