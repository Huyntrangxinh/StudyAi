import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, FileText, Maximize2, Users, MessageSquare, Bold, Italic, PenTool, Palette, AlignLeft, AlignCenter, AlignRight, AlignJustify, Undo, Redo, Plus, Printer, History } from 'lucide-react';
import ChatHistoryModal from './ChatHistoryModal';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerFixedProps {
    studySetId: string;
    studySetName: string;
    onBack: () => void;
    isCollapsed?: boolean;
}

const PDFViewerFixed: React.FC<PDFViewerFixedProps> = ({ studySetId, studySetName, onBack, isCollapsed = false }) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [showAllPages, setShowAllPages] = useState(true);
    const [leftWidth, setLeftWidth] = useState(35); // PDF viewer width percentage
    const [isResizing, setIsResizing] = useState(false);
    const [middleWidth, setMiddleWidth] = useState(30); // Note-taking width percentage
    const [resizeType, setResizeType] = useState<'left' | 'middle' | null>(null);
    const [selectedFont, setSelectedFont] = useState('Arial');
    const [selectedFontSize, setSelectedFontSize] = useState('11');
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isPenMode, setIsPenMode] = useState(false);
    const [selectedColor, setSelectedColor] = useState('#000000');
    const [textAlign, setTextAlign] = useState('left');
    const [isNoteExpanded, setIsNoteExpanded] = useState(false);
    const [materialsCount, setMaterialsCount] = useState(0);
    const [chatMessage, setChatMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<Array<{ type: 'user' | 'ai', message: string }>>([]);
    const [isLoadingChat, setIsLoadingChat] = useState(false);
    const [showChatHistory, setShowChatHistory] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [refreshChatHistory, setRefreshChatHistory] = useState(0);
    const [noteContent, setNoteContent] = useState('');
    const [currentMaterial, setCurrentMaterial] = useState<{ name: string; totalPages: number } | null>(null);

    const applyFormatting = (command: string, value?: string) => {
        document.execCommand(command, false, value);
    };

    // Save note content to localStorage
    const saveNoteContent = (content: string) => {
        const noteKey = `note_${studySetId}`;
        localStorage.setItem(noteKey, content);
    };

    // Load note content from localStorage
    const loadNoteContent = () => {
        const noteKey = `note_${studySetId}`;
        const savedContent = localStorage.getItem(noteKey);
        if (savedContent) {
            setNoteContent(savedContent);
            return savedContent;
        }
        return '';
    };

    // Handle note content change
    const handleNoteChange = (content: string) => {
        setNoteContent(content);
        saveNoteContent(content);
    };

    // Load note content when component mounts
    useEffect(() => {
        const content = loadNoteContent();
        // Set content to the contentEditable div
        const noteEditor = document.querySelector('[contenteditable="true"]') as HTMLElement;
        if (noteEditor && content) {
            noteEditor.innerHTML = content;
        }
    }, [studySetId]);

    // Load current material info
    useEffect(() => {
        const loadCurrentMaterial = async () => {
            try {
                const response = await fetch(`http://localhost:3001/api/materials/${studySetId}`);
                const materials = await response.json();
                if (materials.length > 0) {
                    const latestMaterial = materials[0]; // Get the latest material
                    setCurrentMaterial({
                        name: latestMaterial.name,
                        totalPages: numPages || 0
                    });
                }
            } catch (error) {
                console.error('Error loading material info:', error);
            }
        };

        loadCurrentMaterial();
    }, [studySetId]);

    // Update totalPages when numPages changes
    useEffect(() => {
        if (currentMaterial && numPages) {
            setCurrentMaterial(prev => prev ? { ...prev, totalPages: numPages } : null);
        }
    }, [numPages, currentMaterial]);

    const handleFontChange = (font: string) => {
        setSelectedFont(font);
        applyFormatting('fontName', font);
    };

    const handleFontSizeChange = (size: string) => {
        setSelectedFontSize(size);
        applyFormatting('fontSize', size);
    };

    const handleColorChange = (color: string) => {
        setSelectedColor(color);
        applyFormatting('foreColor', color);
    };

    const handleAlignmentChange = (align: string) => {
        setTextAlign(align);
        applyFormatting('justify' + align.charAt(0).toUpperCase() + align.slice(1));
    };

    const checkFormattingState = () => {
        // Check if bold is active
        const isBoldActive = document.queryCommandState('bold');
        setIsBold(isBoldActive);

        // Check if italic is active
        const isItalicActive = document.queryCommandState('italic');
        setIsItalic(isItalicActive);

    };

    const handleUndo = () => {
        // Focus on the contentEditable div first
        const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
        if (editor) {
            editor.focus();
            document.execCommand('undo', false);
            // Update formatting state after undo
            setTimeout(checkFormattingState, 10);
        }
    };

    const handleRedo = () => {
        // Focus on the contentEditable div first
        const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
        if (editor) {
            editor.focus();
            document.execCommand('redo', false);
            // Update formatting state after redo
            setTimeout(checkFormattingState, 10);
        }
    };

    const handleInsertContent = () => {
        // Insert content functionality
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const textNode = document.createTextNode('New content');
            range.insertNode(textNode);
        }
    };


    const handlePrint = () => {
        window.print();
    };

    const handleNoteExpand = () => {
        setIsNoteExpanded(!isNoteExpanded);
    };

    const handleSendMessage = async () => {
        if (!chatMessage.trim()) return;

        const userMessage = chatMessage.trim();
        setChatMessage('');
        setIsLoadingChat(true);

        console.log('🚀 Starting chat with studySetId:', studySetId);
        console.log('🚀 Current sessionId:', currentSessionId);

        // Add user message to history
        setChatHistory(prev => [...prev, { type: 'user', message: userMessage }]);

        // Create new session if we don't have one
        let sessionId = currentSessionId;
        if (!sessionId) {
            console.log('🚀 Creating new session...');
            try {
                const response = await fetch('http://localhost:3001/api/chat-history/sessions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        studySetId: parseInt(studySetId),
                        title: `Chat ${new Date().toLocaleDateString()}`
                    }),
                });

                if (response.ok) {
                    const newSession = await response.json();
                    sessionId = newSession.id;
                    setCurrentSessionId(sessionId);
                    setRefreshChatHistory(prev => prev + 1); // Trigger refresh
                    console.log('✅ New session created:', sessionId);
                } else {
                    console.error('❌ Failed to create session:', response.status);
                }
            } catch (error) {
                console.error('❌ Error creating new session:', error);
            }
        } else {
            console.log('✅ Using existing session:', sessionId);
        }

        // Save user message to database if we have a session
        if (sessionId) {
            await saveMessageToSession(sessionId, 'user', userMessage);
        }

        try {
            const response = await fetch('http://localhost:3001/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage,
                    studySetId: studySetId
                })
            });

            if (response.ok) {
                const data = await response.json();
                setChatHistory(prev => [...prev, { type: 'ai', message: data.response }]);

                // Save AI response to database if we have a session
                if (sessionId) {
                    await saveMessageToSession(sessionId, 'assistant', data.response);
                }
            } else {
                const errorMessage = 'Xin lỗi, tôi không thể trả lời câu hỏi này lúc này.';
                setChatHistory(prev => [...prev, { type: 'ai', message: errorMessage }]);

                if (sessionId) {
                    await saveMessageToSession(sessionId, 'assistant', errorMessage);
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = 'Xin lỗi, có lỗi xảy ra khi gửi tin nhắn.';
            setChatHistory(prev => [...prev, { type: 'ai', message: errorMessage }]);

            if (sessionId) {
                await saveMessageToSession(sessionId, 'assistant', errorMessage);
            }
        } finally {
            setIsLoadingChat(false);
        }
    };

    // Save message to database
    const saveMessageToSession = async (sessionId: number, role: 'user' | 'assistant', content: string) => {
        console.log('💾 Saving message to session:', { sessionId, role, content: content.substring(0, 50) + '...' });
        try {
            const response = await fetch('http://localhost:3001/api/chat-history/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId,
                    role,
                    content
                })
            });

            if (response.ok) {
                console.log('✅ Message saved successfully');
            } else {
                console.error('❌ Failed to save message:', response.status);
            }
        } catch (error) {
            console.error('❌ Error saving message to session:', error);
        }
    };

    // Create new chat session
    const createNewSession = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/chat-history/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studySetId: parseInt(studySetId),
                    title: `Chat ${new Date().toLocaleDateString()}`
                })
            });

            if (response.ok) {
                const newSession = await response.json();
                setCurrentSessionId(newSession.id);
                setChatHistory([]);
            }
        } catch (error) {
            console.error('Error creating new session:', error);
        }
    };

    // Load chat session
    const handleLoadSession = (sessionId: number, messages: Array<{ role: 'user' | 'assistant', content: string }>) => {
        setCurrentSessionId(sessionId);
        setChatHistory(messages.map(msg => ({
            type: msg.role === 'user' ? 'user' : 'ai',
            message: msg.content
        })));
    };



    useEffect(() => {
        const loadMaterials = async () => {
            try {
                console.log('Loading materials for studySetId:', studySetId);
                const response = await fetch(`http://localhost:3001/api/materials/${studySetId}`);
                if (response.ok) {
                    const data = await response.json();
                    console.log('Materials loaded:', data);

                    // Set materials count
                    setMaterialsCount(data ? data.length : 0);

                    if (data.length > 0) {
                        // Get the latest material (most recent)
                        const material = data[0];
                        console.log('Latest material:', material);
                        if (material.file_path) {
                            const testUrl = `http://localhost:3001/api/materials/file/${material.file_path}`;
                            console.log('Testing URL:', testUrl);
                            try {
                                const testResponse = await fetch(testUrl, { method: 'HEAD' });
                                if (testResponse.ok) {
                                    console.log('File exists, using:', testUrl);
                                    setPdfUrl(testUrl);
                                } else {
                                    console.log('File not found, using sample PDF');
                                    setPdfUrl('http://localhost:3001/api/materials/file/sample-software-maintenance.pdf');
                                }
                            } catch (error) {
                                console.log('Error testing file, using sample PDF:', error);
                                setPdfUrl('http://localhost:3001/api/materials/file/sample-software-maintenance.pdf');
                            }
                        } else {
                            console.log('No file_path, using sample PDF');
                            setPdfUrl('http://localhost:3001/api/materials/file/sample-software-maintenance.pdf');
                        }
                    } else {
                        console.log('No materials found, using sample PDF');
                        setPdfUrl('http://localhost:3001/api/materials/file/sample-software-maintenance.pdf');
                    }
                } else {
                    console.log('Failed to load materials, using sample PDF');
                    setPdfUrl('http://localhost:3001/api/materials/file/sample-software-maintenance.pdf');
                }
            } catch (error) {
                console.log('Error loading materials, using sample PDF:', error);
                setPdfUrl('http://localhost:3001/api/materials/file/sample-software-maintenance.pdf');
            }
        };
        loadMaterials();
    }, [studySetId]);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        console.log('PDF loaded successfully, pages:', numPages);
        setNumPages(numPages);
        setError(null);
        setLoading(false);
    };

    const onDocumentLoadError = (error: Error) => {
        console.error('PDF load error:', error);
        console.error('PDF URL that failed:', pdfUrl);

        // If current PDF fails and it's not the sample PDF, try sample PDF
        if (pdfUrl && !pdfUrl.includes('sample-software-maintenance.pdf')) {
            console.log('Trying sample PDF as fallback...');
            setPdfUrl('http://localhost:3001/api/materials/file/sample-software-maintenance.pdf');
            setError(null);
        } else {
            setError(`Failed to load PDF: ${error.message}`);
        }
        setLoading(false);
    };

    const renderPages = () => {
        if (!numPages) return null;

        if (showAllPages) {
            return (
                <div className="space-y-6">
                    {Array.from({ length: numPages }, (_, i) => (
                        <div key={i + 1} className="flex justify-center">
                            <div className="pdf-page-container relative">
                                <Page
                                    pageNumber={i + 1}
                                    width={500}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                />
                                {/* Page number overlay */}
                                <div className="absolute top-2 left-2 bg-gray-500 bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                                    {i + 1} of {numPages}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        } else {
            return (
                <div className="flex justify-center">
                    <div className="pdf-page-container relative">
                        <Page
                            pageNumber={pageNumber}
                            width={500}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                        />
                        {/* Page number overlay */}
                        <div className="absolute top-2 left-2 bg-gray-500 bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                            {pageNumber} of {numPages}
                        </div>
                    </div>
                </div>
            );
        }
    };

    const handleMouseDown = (type: 'left' | 'middle') => (e: React.MouseEvent) => {
        setIsResizing(true);
        setResizeType(type);
        e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing || !resizeType) return;

        const containerWidth = window.innerWidth;
        const mouseX = (e.clientX / containerWidth) * 100;

        if (resizeType === 'left') {
            const newLeftWidth = Math.max(25, Math.min(50, mouseX)); // 25-50% range
            setLeftWidth(newLeftWidth);
            // Adjust middle width to maintain total 100%
            const remainingWidth = 100 - newLeftWidth;
            const newMiddleWidth = Math.max(20, Math.min(remainingWidth - 25, middleWidth)); // 25% minimum for chat
            setMiddleWidth(newMiddleWidth);
        } else if (resizeType === 'middle') {
            const newMiddleWidth = Math.max(20, Math.min(40, mouseX - leftWidth)); // 20-40% range
            setMiddleWidth(newMiddleWidth);
            // Ensure total doesn't exceed 100%
            const totalWidth = leftWidth + newMiddleWidth;
            if (totalWidth > 100) {
                const adjustedMiddleWidth = 100 - leftWidth - 25; // 25% minimum for chat
                setMiddleWidth(Math.max(20, adjustedMiddleWidth));
            }
        }
    };

    const handleMouseUp = () => {
        setIsResizing(false);
        setResizeType(null);
    };

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    return (
        <>
            <div className={`pdf-viewer-container flex h-screen bg-gray-50 overflow-hidden overflow-x-hidden transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-48'} ${isResizing ? 'select-none' : ''}`}>
                {/* Left: PDF Viewer */}
                <div
                    className="flex flex-col border-r border-gray-200 min-w-0 overflow-hidden"
                    style={{ width: `${leftWidth}%` }}
                >
                    {/* Header */}
                    <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between min-w-0">
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                            >
                                ←
                            </button>
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <span className="text-sm font-medium text-gray-800 flex-shrink-0 truncate max-w-xs">
                                    {currentMaterial ? currentMaterial.name : 'Document'}
                                </span>
                                <div className="flex items-center space-x-2 min-w-0">
                                    <span className="text-sm text-gray-500 whitespace-nowrap">
                                        {currentMaterial ? (
                                            showAllPages ?
                                                `All ${currentMaterial.totalPages} pages` :
                                                `Page ${pageNumber} of ${currentMaterial.totalPages}`
                                        ) : (
                                            showAllPages ? `All ${numPages} pages` : `Page ${pageNumber} of ${numPages}`
                                        )}
                                    </span>
                                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <span className="text-lg flex-shrink-0">⚖️</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                            <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors">
                                Notifications
                            </button>
                        </div>
                    </div>

                    {/* PDF Content */}
                    <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
                        <div className="max-w-full mx-auto">
                            {pdfUrl ? (
                                <Document
                                    file={pdfUrl}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    onLoadError={onDocumentLoadError}
                                    loading={
                                        <div className="flex items-center justify-center h-96">
                                            <div className="text-center">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                                                <p className="text-gray-500">Loading PDF...</p>
                                            </div>
                                        </div>
                                    }
                                >
                                    {renderPages()}
                                </Document>
                            ) : (
                                <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                                    <div className="text-center">
                                        <p className="text-gray-500">No PDF available</p>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
                                    <div className="text-center">
                                        <p className="text-red-500">{error}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Navigation - Only show in single page mode */}
                    {!showAllPages && numPages && (
                        <div className="bg-white border-t border-gray-200 p-4 flex items-center justify-between">
                            <button
                                onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                                disabled={pageNumber === 1}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-gray-500">
                                {currentMaterial ? (
                                    `${currentMaterial.name} - Page ${pageNumber} of ${currentMaterial.totalPages}`
                                ) : (
                                    `Page ${pageNumber} of ${numPages}`
                                )}
                            </span>
                            <button
                                onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                                disabled={pageNumber === numPages}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

                {/* Resize Handle */}
                <div
                    className={`w-1 ${isResizing && resizeType === 'left' ? 'bg-blue-400' : 'bg-transparent hover:bg-blue-200'} cursor-col-resize flex items-center justify-center transition-colors duration-200`}
                    onMouseDown={handleMouseDown('left')}
                >
                    <div className="w-0.5 h-8 bg-gray-300 hover:bg-blue-400 transition-colors duration-200"></div>
                </div>

                {/* Middle: Note-taking */}
                <div
                    className="flex flex-col border-r border-gray-200 min-w-0"
                    style={{ width: isNoteExpanded ? `${100 - leftWidth}%` : `${middleWidth}%`, minWidth: '300px' }}
                >
                    {/* Note Header */}
                    <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between max-w-full overflow-hidden note-header flex-shrink-0" style={{ minHeight: '60px' }}>
                        <h2 className="text-lg font-semibold flex-shrink-0">Notes & Collaboration</h2>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                            <button className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0">
                                <Users className="w-4 h-4 text-gray-600" />
                            </button>
                            <button className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0">
                                <MessageSquare className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>
                    </div>

                    {/* Note Content */}
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Toolbar */}
                        <div className="bg-white border-b border-gray-200 p-3 flex-shrink-0" style={{ minHeight: '60px' }}>
                            <div
                                className="flex items-center space-x-2 mb-2 toolbar-scroll"
                                style={{
                                    minHeight: '40px',
                                    width: '100%',
                                    maxWidth: '100%',
                                    overflowX: 'auto',
                                    overflowY: 'hidden',
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: '#cbd5e0 #f7fafc',
                                    WebkitOverflowScrolling: 'touch',
                                    whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={(e) => {
                                    // Force scrollbar to be visible
                                    const target = e.target as HTMLElement;
                                    target.style.setProperty('scrollbar-width', 'thin');
                                }}
                                onWheel={(e) => {
                                    // Allow horizontal scrolling with mouse wheel
                                    if (e.deltaY !== 0) {
                                        e.preventDefault();
                                        const target = e.target as HTMLElement;
                                        target.scrollLeft += e.deltaY;
                                    }
                                }}
                            >
                                <select
                                    className="text-sm border border-gray-300 rounded px-2 py-1 flex-shrink-0"
                                    value={selectedFont}
                                    onChange={(e) => handleFontChange(e.target.value)}
                                >
                                    <option>Arial</option>
                                    <option>Times New Roman</option>
                                    <option>Helvetica</option>
                                    <option>Georgia</option>
                                    <option>Verdana</option>
                                    <option>Calibri</option>
                                    <option>Cambria</option>
                                    <option>Trebuchet MS</option>
                                    <option>Courier New</option>
                                    <option>Comic Sans MS</option>
                                    <option>Impact</option>
                                    <option>Lucida Console</option>
                                    <option>Palatino</option>
                                    <option>Garamond</option>
                                    <option>Book Antiqua</option>
                                    <option>Century Gothic</option>
                                    <option>Franklin Gothic Medium</option>
                                    <option>MS Sans Serif</option>
                                    <option>MS Serif</option>
                                    <option>Symbol</option>
                                    <option>Wingdings</option>
                                </select>
                                <select
                                    className="text-sm border border-gray-300 rounded px-2 py-1 flex-shrink-0"
                                    value={selectedFontSize}
                                    onChange={(e) => handleFontSizeChange(e.target.value)}
                                >
                                    <option>8</option>
                                    <option>9</option>
                                    <option>10</option>
                                    <option>11</option>
                                    <option>12</option>
                                    <option>14</option>
                                    <option>16</option>
                                    <option>18</option>
                                    <option>20</option>
                                    <option>24</option>
                                    <option>28</option>
                                    <option>32</option>
                                    <option>36</option>
                                    <option>48</option>
                                    <option>72</option>
                                </select>
                                <button
                                    className={`p-2 rounded transition-all duration-200 flex-shrink-0 ${isBold
                                        ? 'bg-gray-200 text-gray-800'
                                        : 'bg-white hover:bg-gray-100 text-gray-700'
                                        }`}
                                    onClick={() => {
                                        document.execCommand('bold', false);
                                        setTimeout(checkFormattingState, 10);
                                    }}
                                >
                                    <Bold className="w-4 h-4" />
                                </button>
                                <button
                                    className={`p-2 rounded transition-all duration-200 flex-shrink-0 ${isItalic
                                        ? 'bg-gray-200 text-gray-800'
                                        : 'bg-white hover:bg-gray-100 text-gray-700'
                                        }`}
                                    onClick={() => {
                                        document.execCommand('italic', false);
                                        setTimeout(checkFormattingState, 10);
                                    }}
                                >
                                    <Italic className="w-4 h-4" />
                                </button>
                                <button
                                    className={`p-2 rounded transition-all duration-200 flex-shrink-0 ${isPenMode
                                        ? 'bg-gray-200 text-gray-800'
                                        : 'bg-white hover:bg-gray-100 text-gray-700'
                                        }`}
                                    onClick={() => setIsPenMode(!isPenMode)}
                                >
                                    <PenTool className="w-4 h-4" />
                                </button>
                                <div className="relative">
                                    <button className="p-2 bg-white hover:bg-gray-100 text-gray-700 rounded transition-all duration-200 flex-shrink-0">
                                        <Palette className="w-4 h-4" />
                                    </button>
                                    <input
                                        type="color"
                                        value={selectedColor}
                                        onChange={(e) => handleColorChange(e.target.value)}
                                        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </div>
                                <button
                                    className={`p-2 rounded transition-all duration-200 flex-shrink-0 ${textAlign === 'left'
                                        ? 'bg-gray-200 text-gray-800'
                                        : 'bg-white hover:bg-gray-100 text-gray-700'
                                        }`}
                                    onClick={() => handleAlignmentChange('left')}
                                >
                                    <AlignLeft className="w-4 h-4" />
                                </button>
                                <button
                                    className={`p-2 rounded transition-all duration-200 flex-shrink-0 ${textAlign === 'center'
                                        ? 'bg-gray-200 text-gray-800'
                                        : 'bg-white hover:bg-gray-100 text-gray-700'
                                        }`}
                                    onClick={() => handleAlignmentChange('center')}
                                >
                                    <AlignCenter className="w-4 h-4" />
                                </button>
                                <button
                                    className={`p-2 rounded transition-all duration-200 flex-shrink-0 ${textAlign === 'right'
                                        ? 'bg-gray-200 text-gray-800'
                                        : 'bg-white hover:bg-gray-100 text-gray-700'
                                        }`}
                                    onClick={() => handleAlignmentChange('right')}
                                >
                                    <AlignRight className="w-4 h-4" />
                                </button>
                                <button
                                    className={`p-2 rounded transition-all duration-200 flex-shrink-0 ${textAlign === 'justify'
                                        ? 'bg-gray-200 text-gray-800'
                                        : 'bg-white hover:bg-gray-100 text-gray-700'
                                        }`}
                                    onClick={() => handleAlignmentChange('justify')}
                                >
                                    <AlignJustify className="w-4 h-4" />
                                </button>
                                <button
                                    className="p-2 bg-white hover:bg-gray-100 text-gray-700 rounded transition-all duration-200 flex-shrink-0"
                                    onClick={handleUndo}
                                >
                                    <Undo className="w-4 h-4" />
                                </button>
                                <button
                                    className="p-2 bg-white hover:bg-gray-100 text-gray-700 rounded transition-all duration-200 flex-shrink-0"
                                    onClick={handleRedo}
                                >
                                    <Redo className="w-4 h-4" />
                                </button>
                                <button
                                    className="p-2 bg-white hover:bg-gray-100 text-gray-700 rounded transition-all duration-200 flex-shrink-0"
                                    onClick={handleInsertContent}
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                                <button
                                    className="p-2 bg-white hover:bg-gray-100 text-gray-700 rounded transition-all duration-200 flex-shrink-0"
                                    onClick={handlePrint}
                                >
                                    <Printer className="w-4 h-4" />
                                </button>
                                <button
                                    className={`p-2 rounded transition-all duration-200 flex-shrink-0 ${isNoteExpanded
                                        ? 'bg-gray-200 text-gray-800'
                                        : 'bg-white hover:bg-gray-100 text-gray-700'
                                        }`}
                                    onClick={handleNoteExpand}
                                >
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="text-sm text-gray-500">
                                Accidentally cleared notes? <span className="text-blue-600 cursor-pointer">View version history</span>
                            </div>
                        </div>

                        {/* Note Editor */}
                        <div className="flex-1 p-4 overflow-y-auto hide-scrollbar">
                            <div
                                className="w-full border-none resize-none focus:outline-none"
                                contentEditable
                                suppressContentEditableWarning
                                style={{
                                    fontFamily: selectedFont,
                                    fontSize: `${selectedFontSize}px`,
                                    color: selectedColor,
                                    textAlign: textAlign as any,
                                    minHeight: '200px'
                                }}
                                onInput={(e) => {
                                    const content = e.currentTarget.innerHTML;
                                    handleNoteChange(content);

                                    // Apply formatting to selected text
                                    if (isBold) {
                                        document.execCommand('bold', false);
                                    }
                                    if (isItalic) {
                                        document.execCommand('italic', false);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    // Handle formatting shortcuts
                                    if (e.ctrlKey || e.metaKey) {
                                        if (e.key === 'b') {
                                            e.preventDefault();
                                            document.execCommand('bold', false);
                                            setTimeout(checkFormattingState, 10);
                                        }
                                        if (e.key === 'i') {
                                            e.preventDefault();
                                            document.execCommand('italic', false);
                                            setTimeout(checkFormattingState, 10);
                                        }
                                    }
                                }}
                                onMouseUp={checkFormattingState}
                                onKeyUp={checkFormattingState}
                            >
                                <p>Start taking notes...</p>
                            </div>
                        </div>

                        {/* Bottom Tabs */}
                        <div className="bg-white border-t border-gray-200 p-2">
                            <div className="flex space-x-1">
                                <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Notes</button>
                                <button className="px-3 py-1 text-gray-600 rounded text-sm">Transcript</button>
                                <button className="px-3 py-1 text-gray-600 rounded text-sm">View PDF</button>
                                <button className="px-3 py-1 text-gray-600 rounded text-sm">Split Screen</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Resize Handle */}
                {!isNoteExpanded && (
                    <div
                        className={`w-1 ${isResizing && resizeType === 'middle' ? 'bg-blue-400' : 'bg-transparent hover:bg-blue-200'} cursor-col-resize flex items-center justify-center transition-colors duration-200`}
                        onMouseDown={handleMouseDown('middle')}
                    >
                        <div className="w-0.5 h-8 bg-gray-300 hover:bg-blue-400 transition-colors duration-200"></div>
                    </div>
                )}

                {/* Right: AI Chat */}
                {!isNoteExpanded && (
                    <div
                        className="flex flex-col min-w-0 overflow-hidden"
                        style={{
                            width: `${100 - leftWidth - middleWidth}%`,
                            minWidth: '250px'
                        }}
                    >
                        {/* Chat Header */}
                        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <button className="p-2 hover:bg-gray-100 rounded-lg">
                                    <span className="text-xl">×</span>
                                </button>
                            </div>
                            <button
                                onClick={() => setShowChatHistory(true)}
                                className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors flex items-center space-x-2"
                            >
                                <History size={16} />
                                <span>Chat History</span>
                            </button>
                        </div>

                        {/* Chat Content */}
                        <div className="flex-1 flex flex-col overflow-y-auto hide-scrollbar bg-white">
                            {/* AI Assistant */}
                            <div className="flex-1 flex flex-col p-4">
                                {chatHistory.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center">
                                        {/* Spark.E Avatar */}
                                        <div className="mb-6">
                                            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
                                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                                                    <img src="/SPARKE.gif" alt="Spark.E" className="w-16 h-16 object-contain" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Greeting */}
                                        <h2 className="text-xl font-bold text-gray-800 mb-8">Hello, I'm Spark.E</h2>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {chatHistory.map((msg, index) => (
                                            <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] p-3 rounded-lg ${msg.type === 'user'
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {msg.type === 'ai' ? (
                                                        <div className="text-sm prose prose-sm max-w-none">
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkGfm]}
                                                                components={{
                                                                    h3: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-2 text-gray-800">{children}</h3>,
                                                                    h4: ({ children }) => <h4 className="text-sm font-medium mt-2 mb-1 text-gray-700">{children}</h4>,
                                                                    p: ({ children }) => <p className="mb-2 text-gray-800">{children}</p>,
                                                                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                                                    li: ({ children }) => <li className="text-gray-800">{children}</li>,
                                                                    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                                                    em: ({ children }) => <em className="italic text-gray-700">{children}</em>
                                                                }}
                                                            >
                                                                {msg.message}
                                                            </ReactMarkdown>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm">{msg.message}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {isLoadingChat && (
                                            <div className="flex justify-start">
                                                <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                                                        <span className="text-sm">Spark.E đang suy nghĩ...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Bottom Input Area */}
                            <div className="p-4 border-t border-gray-200 bg-white max-w-full overflow-hidden">
                                {/* Top Row - Icons */}
                                <div className="flex items-center justify-center space-x-3 mb-4 max-w-full overflow-hidden">
                                    <button className="w-8 h-8 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 border border-gray-200">
                                        <span className="text-gray-600 text-sm">🌐</span>
                                    </button>
                                    <button className="w-8 h-8 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 border border-gray-200">
                                        <span className="text-gray-600 text-sm">🎓</span>
                                    </button>
                                    <button
                                        onClick={createNewSession}
                                        className="w-8 h-8 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 border border-gray-200"
                                        title="Create New Chat"
                                    >
                                        <Plus size={14} className="text-gray-600" />
                                    </button>
                                </div>

                                {/* Input Field */}
                                <div className="flex items-center space-x-3 max-w-full overflow-hidden">
                                    <button className="w-8 h-8 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 border border-gray-200">
                                        <span className="text-gray-600 text-sm">🖼️</span>
                                    </button>
                                    <button className="w-8 h-8 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 border border-gray-200">
                                        <span className="text-gray-600 text-sm">🎤</span>
                                    </button>
                                    <input
                                        type="text"
                                        value={chatMessage}
                                        onChange={(e) => setChatMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Ask your AI tutor anything..."
                                        className="flex-1 min-w-0 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors max-w-full border border-gray-200"
                                        disabled={isLoadingChat}
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={isLoadingChat || !chatMessage.trim()}
                                        className="w-10 h-10 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors flex-shrink-0"
                                    >
                                        <span className="text-sm">↑</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Chat History Modal */}
            <ChatHistoryModal
                isOpen={showChatHistory}
                onClose={() => setShowChatHistory(false)}
                studySetId={studySetId}
                onLoadSession={handleLoadSession}
                refreshTrigger={refreshChatHistory}
            />
        </>
    );
};

export default PDFViewerFixed;
