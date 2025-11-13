import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, FileText, Maximize2, Users, MessageSquare, Bold, Italic, PenTool, Palette, AlignLeft, AlignCenter, AlignRight, AlignJustify, Undo, Redo, Plus, Printer, History, ChevronUp, MicOff, Image as ImageIcon, Minimize2, Menu } from 'lucide-react';
import ChatHistoryModal from './ChatHistoryModal';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerFixedProps {
    studySetId: string;
    studySetName: string;
    onBack: () => void;
    isCollapsed?: boolean;
    initialPage?: number;
    targetMaterialId?: string;
}

const PDFViewerFixed: React.FC<PDFViewerFixedProps> = ({ studySetId, studySetName, onBack, isCollapsed = false, initialPage, targetMaterialId }) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(initialPage || 1);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [showAllPages, setShowAllPages] = useState(true);
    const [leftWidth, setLeftWidth] = useState(35); // PDF viewer width percentage
    const [isResizing, setIsResizing] = useState(false);
    const [middleWidth, setMiddleWidth] = useState(30); // Note-taking width percentage
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [resizeType, setResizeType] = useState<'left' | 'middle' | null>(null);
    const [selectedFont, setSelectedFont] = useState('Arial');
    const [selectedFontSize, setSelectedFontSize] = useState('11');
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isPenMode, setIsPenMode] = useState(false);
    const [isHighlightMode, setIsHighlightMode] = useState(false);
    const [selectedColor, setSelectedColor] = useState('#000000');
    const [textAlign, setTextAlign] = useState('left');
    const [isNoteExpanded, setIsNoteExpanded] = useState(false);
    const [materialsCount, setMaterialsCount] = useState(0);
    const [chatMessage, setChatMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<Array<{ type: 'user' | 'ai', message: string; webSearchResults?: Array<{ title: string; link: string; snippet: string; displayLink: string }> }>>([]);
    const [isLoadingChat, setIsLoadingChat] = useState(false);
    const [isWebSearchMode, setIsWebSearchMode] = useState(false); // ✅ Web search mode toggle
    const [showChatHistory, setShowChatHistory] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [refreshChatHistory, setRefreshChatHistory] = useState(0);
    const [noteContent, setNoteContent] = useState('');
    const [currentMaterial, setCurrentMaterial] = useState<{ id: number; name: string; totalPages: number } | null>(null);
    const messageRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Floating Bottom Tabs states (minimize + drag)
    const [isTabsMinimized, setIsTabsMinimized] = useState(false);
    const [tabsJustOpened, setTabsJustOpened] = useState(false);
    const [isPdfOnly, setIsPdfOnly] = useState(false); // PDF expands, Notes hidden
    const [isTranscript, setIsTranscript] = useState(false);
    const [transcriptText, setTranscriptText] = useState<string>('');
    const [transcriptLoading, setTranscriptLoading] = useState<boolean>(false);
    const [transcriptError, setTranscriptError] = useState<string | null>(null);
    const [tabsPosition, setTabsPosition] = useState<{ x: number; y: number } | null>(null);
    const [isDraggingTabs, setIsDraggingTabs] = useState(false);
    const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
    const dragMovedRef = useRef(false);

    useEffect(() => {
        if (!tabsPosition) {
            // initial: near bottom center of the middle panel
            const initialX = (window.innerWidth / 2);
            const initialY = window.innerHeight - 100;
            setTabsPosition({ x: initialX, y: initialY });
        }
    }, [tabsPosition]);

    const startDragTabs = (e: React.MouseEvent) => {
        // Do not start dragging when clicking on inner buttons marked as non-draggable
        const target = e.target as HTMLElement;
        if (target && target.closest('[data-no-drag]')) {
            return;
        }
        if (!tabsPosition) return;
        setIsDraggingTabs(true);
        dragOffsetRef.current = { dx: e.clientX - tabsPosition.x, dy: e.clientY - tabsPosition.y };
        dragMovedRef.current = false;
        e.preventDefault();
    };

    useEffect(() => {
        if (!isDraggingTabs) return;
        const onMove = (e: MouseEvent) => {
            setTabsPosition({ x: e.clientX - dragOffsetRef.current.dx, y: e.clientY - dragOffsetRef.current.dy });
            dragMovedRef.current = true;
        };
        const onUp = () => setIsDraggingTabs(false);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
    }, [isDraggingTabs]);

    const copySelectedOrMessage = (index: number) => {
        try {
            const selection = window.getSelection();
            const selectedText = selection ? selection.toString() : '';
            if (selectedText && selectedText.trim().length > 0) {
                navigator.clipboard.writeText(selectedText);
                return;
            }
            const node = messageRefs.current[index];
            if (node) {
                const text = node.innerText || '';
                if (text.trim().length > 0) {
                    navigator.clipboard.writeText(text);
                }
            }
        } catch (e) {
            console.error('Copy failed:', e);
        }
    };

    // Helper functions to find text nodes
    const getFirstTextNode = (element: Node): Text | null => {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null
        );
        return walker.nextNode() as Text | null;
    };

    const getLastTextNode = (element: Node): Text | null => {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null
        );
        let lastNode: Text | null = null;
        let node;
        while ((node = walker.nextNode())) {
            lastNode = node as Text;
        }
        return lastNode;
    };

    const applyFormatting = (command: string, value?: string) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            // No selection, use default execCommand
            if (command === 'foreColor' || command === 'fontSize') {
                // For color and fontSize, we need special handling
                return;
            }
            document.execCommand(command, false, value);
            return;
        }

        const range = selection.getRangeAt(0);

        if (command === 'fontSize') {
            // fontSize command only accepts 1-7, so we need to apply inline style directly
            if (!range.collapsed) {
                // There's a selection, wrap it in a span with fontSize style
                const span = document.createElement('span');
                span.style.fontSize = `${value}px`;
                try {
                    range.surroundContents(span);
                } catch (e) {
                    // If surroundContents fails, extract contents and wrap
                    const contents = range.extractContents();
                    span.appendChild(contents);
                    range.insertNode(span);
                }
                // Restore selection
                selection.removeAllRanges();
                const newRange = document.createRange();
                newRange.selectNodeContents(span);
                selection.addRange(newRange);

                // Save content after fontSize change
                saveNoteAfterFormatting();
            } else {
                // No selection, create a span for future typing
                // This will apply fontSize to text typed after this point
                const span = document.createElement('span');
                span.style.fontSize = `${value}px`;
                try {
                    range.insertNode(span);
                    // Move cursor inside the span
                    const newRange = document.createRange();
                    newRange.setStart(span, 0);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                } catch (e) {
                    // Fallback: use insertHTML
                    document.execCommand('insertHTML', false, `<span style="font-size: ${value}px;"></span>`);
                }

                // Save content after fontSize change
                saveNoteAfterFormatting();
            }
        } else if (command === 'foreColor') {
            // foreColor - apply color to selected text or create span for future typing
            if (!range.collapsed) {
                // Ensure the range is within the editor
                const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
                if (!editor || !editor.contains(range.commonAncestorContainer)) {
                    return; // Selection is not in the editor
                }

                // Get the selected text to verify it's not the entire editor content
                const selectedText = range.toString();
                const editorText = editor ? editor.textContent || '' : '';

                // If selected text is the same as editor text, don't proceed
                if (selectedText.trim() === editorText.trim() && selectedText.length > 0) {
                    return; // User selected all text, skip color change
                }

                // Use execCommand but ensure it only affects the selection
                // First, save the current selection
                const clonedRange = range.cloneRange();

                // Focus the editor to ensure selection is active
                editor.focus();

                // Restore the selection
                selection.removeAllRanges();
                selection.addRange(clonedRange);

                // Verify selection is correct
                if (selection.toString() !== selectedText) {
                    // Selection doesn't match, try to restore it
                    selection.removeAllRanges();
                    selection.addRange(range);
                }

                // Use execCommand to apply color - this should only affect the selection
                const success = document.execCommand('foreColor', false, value || '#000000');

                if (!success) {
                    // If execCommand fails, fall back to manual wrapping
                    const manualRange = range.cloneRange();
                    const contents = manualRange.extractContents();

                    // Create a temporary container
                    const tempDiv = document.createElement('div');
                    tempDiv.appendChild(contents);

                    // Remove all color styles from extracted contents
                    const colorSpans = tempDiv.querySelectorAll('span[style*="color"]');
                    colorSpans.forEach((spanEl) => {
                        const htmlSpan = spanEl as HTMLElement;
                        if (htmlSpan.style.color) {
                            const styleWithoutColor = htmlSpan.style.cssText.replace(/color\s*:\s*[^;]+;?\s*/gi, '').trim();
                            if (!styleWithoutColor && htmlSpan.tagName.toLowerCase() === 'span') {
                                // Unwrap color-only spans
                                const parent = htmlSpan.parentNode;
                                if (parent) {
                                    while (htmlSpan.firstChild) {
                                        parent.insertBefore(htmlSpan.firstChild, htmlSpan);
                                    }
                                    parent.removeChild(htmlSpan);
                                }
                            } else {
                                htmlSpan.style.removeProperty('color');
                            }
                        }
                    });

                    // Create new span with the color
                    const span = document.createElement('span');
                    span.style.color = value || '#000000';

                    // Move all children from tempDiv to span
                    while (tempDiv.firstChild) {
                        span.appendChild(tempDiv.firstChild);
                    }

                    // Insert the span
                    manualRange.insertNode(span);

                    // Restore selection
                    selection.removeAllRanges();
                    const newRange = document.createRange();
                    newRange.selectNodeContents(span);
                    selection.addRange(newRange);
                }

                // Save content after color change
                saveNoteAfterFormatting();
            } else {
                // No selection, create a span for future typing
                // This will apply color to text typed after this point
                const span = document.createElement('span');
                span.style.color = value || '#000000';
                try {
                    range.insertNode(span);
                    // Move cursor inside the span
                    const newRange = document.createRange();
                    newRange.setStart(span, 0);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                } catch (e) {
                    // Fallback: use insertHTML
                    document.execCommand('insertHTML', false, `<span style="color: ${value || '#000000'};"></span>`);
                }

                // Save content after color change
                saveNoteAfterFormatting();
            }
        } else {
            document.execCommand(command, false, value);
        }
    };

    // Handle highlight/unhighlight
    const handleHighlight = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        if (range.collapsed) return; // No text selected

        // Check if selected text is already highlighted
        let isAlreadyHighlighted = false;
        let highlightToRemove: HTMLElement | null = null;

        // Find all mark elements that intersect with the selection
        const allMarks = document.querySelectorAll('mark');
        allMarks.forEach((mark) => {
            try {
                if (range.intersectsNode(mark)) {
                    isAlreadyHighlighted = true;
                    highlightToRemove = mark as HTMLElement;
                }
            } catch (e) {
                // Try alternative method - check if mark contains selection
                const markRange = document.createRange();
                markRange.selectNodeContents(mark);
                const start = range.startOffset;
                const end = range.endOffset;
                const markStart = markRange.startOffset;
                const markEnd = markRange.endOffset;

                // Check if ranges overlap
                if (!(end < markStart || start > markEnd)) {
                    isAlreadyHighlighted = true;
                    highlightToRemove = mark as HTMLElement;
                }
            }
        });

        if (isAlreadyHighlighted && highlightToRemove) {
            // Remove highlight - unwrap the mark element
            const elementToRemove: HTMLElement = highlightToRemove;
            const parent = elementToRemove.parentNode;
            if (parent) {
                while (elementToRemove.firstChild) {
                    parent.insertBefore(elementToRemove.firstChild, elementToRemove);
                }
                parent.removeChild(elementToRemove);
                if (parent.nodeType === Node.ELEMENT_NODE) {
                    (parent as Element).normalize(); // Merge adjacent text nodes
                }
            }
            // Clear selection after removing highlight
            selection.removeAllRanges();

            // Save content after removing highlight
            saveNoteAfterFormatting();
        } else {
            // Add highlight with yellow color
            const mark = document.createElement('mark');
            mark.style.backgroundColor = '#FFFF00'; // Yellow
            mark.style.color = 'inherit'; // Keep text color
            try {
                range.surroundContents(mark);
            } catch (e) {
                // If surroundContents fails, extract and wrap
                const contents = range.extractContents();
                mark.appendChild(contents);
                range.insertNode(mark);
            }
            // Restore selection
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(mark);
            selection.addRange(newRange);

            // Save content after adding highlight
            saveNoteAfterFormatting();
        }
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

    // Helper function to save note content after formatting changes
    const saveNoteAfterFormatting = () => {
        const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
        if (editor) {
            const content = editor.innerHTML;
            handleNoteChange(content);
        }
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
                    // If targetMaterialId is provided, find that material, otherwise use latest
                    const material = targetMaterialId
                        ? materials.find((m: any) => String(m.id) === String(targetMaterialId))
                        : materials[0];

                    if (material) {
                        setCurrentMaterial({
                            id: material.id,
                            name: material.name,
                            totalPages: numPages || 0
                        });

                        // Load the PDF for the target material
                        if (targetMaterialId && material.file_path) {
                            const fileResp = await fetch(`http://localhost:3001/api/materials/file/${material.file_path}`);
                            if (fileResp.ok) {
                                const blob = await fileResp.blob();
                                const url = URL.createObjectURL(blob);
                                setPdfUrl(url);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading material info:', error);
            }
        };

        loadCurrentMaterial();
    }, [studySetId, targetMaterialId]);

    // Update totalPages when numPages changes
    useEffect(() => {
        if (currentMaterial && numPages) {
            setCurrentMaterial(prev => prev ? { ...prev, totalPages: numPages } : null);
        }
    }, [numPages, currentMaterial]);

    // Update page number when initialPage changes
    useEffect(() => {
        if (initialPage && initialPage > 0) {
            setPageNumber(initialPage);
        }
    }, [initialPage]);

    // Handle highlight mode - listen for text selection
    useEffect(() => {
        if (!isHighlightMode) return;

        const handleMouseUp = () => {
            setTimeout(() => {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    if (!range.collapsed) {
                        // Check if selection is within the note editor
                        const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
                        if (editor && editor.contains(range.commonAncestorContainer)) {
                            handleHighlight();
                        }
                    }
                }
            }, 10);
        };

        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHighlightMode]);

    const handleFontChange = (font: string) => {
        setSelectedFont(font);
        applyFormatting('fontName', font);
    };

    const handleFontSizeChange = (size: string) => {
        setSelectedFontSize(size);
        // Ensure editor is focused before applying formatting
        const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
        if (editor) {
            editor.focus();
            applyFormatting('fontSize', size);
        }
    };

    const handleColorChange = (color: string) => {
        setSelectedColor(color);
        // Save current selection before focusing
        const selection = window.getSelection();
        let savedRange: Range | null = null;

        if (selection && selection.rangeCount > 0) {
            savedRange = selection.getRangeAt(0).cloneRange();
        }

        // Ensure editor is focused before applying formatting
        const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
        if (editor) {
            editor.focus();

            // Restore selection if it was saved
            if (savedRange && !savedRange.collapsed && selection) {
                try {
                    selection.removeAllRanges();
                    selection.addRange(savedRange);
                } catch (e) {
                    // If restoring fails, try to find the text in the editor
                    const selectedText = savedRange.toString();
                    if (selectedText && selection) {
                        const editorText = editor.textContent || '';
                        const index = editorText.indexOf(selectedText);
                        if (index !== -1) {
                            const newRange = document.createRange();
                            const textNode = editor.childNodes[0] || editor;
                            if (textNode.nodeType === Node.TEXT_NODE) {
                                newRange.setStart(textNode, index);
                                newRange.setEnd(textNode, index + selectedText.length);
                                selection.removeAllRanges();
                                selection.addRange(newRange);
                            }
                        }
                    }
                }
            }

            applyFormatting('foreColor', color);
        }
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
                    studySetId: studySetId,
                    materialId: targetMaterialId || currentMaterial?.id || undefined, // ✅ Send materialId to ensure correct document
                    forceWebSearch: isWebSearchMode // ✅ Force web search if mode is enabled
                })
            });

            if (response.ok) {
                const data = await response.json();
                setChatHistory(prev => [...prev, {
                    type: 'ai',
                    message: data.response,
                    webSearchResults: data.webSearchResults || [] // ✅ Lưu web search results
                }]);

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
                        // If targetMaterialId is provided, find that material, otherwise use latest
                        const material = targetMaterialId
                            ? data.find((m: any) => String(m.id) === String(targetMaterialId))
                            : data[0];

                        if (!material && targetMaterialId) {
                            console.log('Target material not found, using latest');
                            const fallbackMaterial = data[0];
                            if (fallbackMaterial && fallbackMaterial.file_path) {
                                setPdfUrl(`http://localhost:3001/api/materials/file/${fallbackMaterial.file_path}`);
                            } else {
                                setPdfUrl('http://localhost:3001/api/materials/file/sample-software-maintenance.pdf');
                            }
                            return;
                        }

                        console.log('Selected material:', material);
                        if (material && material.file_path) {
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
    }, [studySetId, targetMaterialId]);

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
        if (isTranscript) {
            return (
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-center text-xl font-semibold text-gray-800 mb-6">Material Text Transcript</h2>
                    {transcriptLoading ? (
                        <div className="text-center text-gray-500 py-10">Đang trích xuất văn bản...</div>
                    ) : transcriptError ? (
                        <div className="text-center text-red-500 py-10">{transcriptError}</div>
                    ) : (
                        <div className="prose max-w-none whitespace-pre-wrap leading-7 text-gray-800 text-[15px]">
                            {transcriptText || 'Không có nội dung để hiển thị.'}
                        </div>
                    )}
                </div>
            );
        }
        if (!numPages) return null;

        if (showAllPages) {
            return (
                <div className="space-y-6">
                    {Array.from({ length: numPages }, (_, i) => (
                        <div key={i + 1} className="flex justify-center">
                            <div className="pdf-page-container relative">
                                <Page
                                    pageNumber={i + 1}
                                    width={isPdfOnly ? pdfAvailableWidthPx : 500}
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
                            width={isPdfOnly ? pdfAvailableWidthPx : 500}
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

        // Disabled left resize - PDF viewer width is fixed
        if (resizeType === 'left') {
            return; // Do nothing - left width is fixed
        } else if (resizeType === 'middle') {
            const maxMiddleWidth = 35; // Maximum width for Notes & Collaboration panel
            const newMiddleWidth = Math.max(20, Math.min(maxMiddleWidth, mouseX - leftWidth)); // 20-35% range
            setMiddleWidth(newMiddleWidth);
            // Ensure total doesn't exceed 100%
            const totalWidth = leftWidth + newMiddleWidth;
            if (totalWidth > 100) {
                const adjustedMiddleWidth = 100 - leftWidth - 25; // 25% minimum for chat
                setMiddleWidth(Math.max(20, Math.min(maxMiddleWidth, adjustedMiddleWidth)));
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

    // Update window width on resize and when sidebar state changes
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);
        // Also update when isCollapsed changes
        setWindowWidth(window.innerWidth);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [isCollapsed]);

    // Web Search Results Component
    const WebSearchResults: React.FC<{ results: Array<{ title: string; link: string; snippet: string; displayLink: string }> }> = ({ results }) => {
        const [isExpanded, setIsExpanded] = useState(true);

        if (!results || results.length === 0) return null;

        // ✅ Chỉ hiển thị 3 kết quả đầu tiên
        const displayedResults = results.slice(0, 3);

        return (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {/* Header */}
                <div
                    className="flex items-center justify-between mb-3 cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center space-x-2">
                        <span className="text-xl">🌐</span>
                        <h3 className="font-semibold text-gray-800">Web Search</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">{displayedResults.length} results</span>
                        <ChevronUp
                            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                    </div>
                </div>

                {/* Results - Bỏ scrollbar, chỉ hiển thị 3 kết quả */}
                {isExpanded && (
                    <div className="space-y-3">
                        {displayedResults.map((result, index) => {
                            const raw = result.link || '';
                            const href = raw && /^https?:\/\//i.test(raw) ? raw : (raw ? `https://${raw}` : (result.displayLink ? `https://${result.displayLink}` : '#'));
                            // derive hostname for favicon
                            let host = '';
                            try { host = new URL(href).hostname; } catch { host = result.displayLink || ''; }
                            const faviconUrl = host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32` : '';
                            return (
                                <a
                                    key={index}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
                                    onMouseDown={(e) => {
                                        // Open as early as possible, and prevent default to avoid duplicate opens
                                        e.preventDefault();
                                        try {
                                            if (!href || href === '#') return;
                                            const win = window.open(href, '_blank', 'noopener');
                                            if (win) win.opener = null;
                                        } catch (_) {
                                            // Do nothing: avoid taking over current tab
                                        }
                                    }}
                                    onClick={(e) => {
                                        // Also prevent default to avoid second open; rely on programmatic open above
                                        e.preventDefault();
                                    }}
                                >
                                    <div className="flex items-start space-x-2">
                                        {faviconUrl ? (
                                            <img src={faviconUrl} alt={host} className="w-4 h-4 rounded flex-shrink-0 mt-1" />
                                        ) : (
                                            <div className="w-4 h-4 bg-blue-500 rounded flex-shrink-0 mt-1"></div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                                                {result.title}
                                            </h4>
                                            <p className="text-xs text-gray-600 mb-1 line-clamp-2">
                                                {result.snippet}
                                            </p>
                                            <p className="text-xs text-blue-600 truncate">
                                                {result.displayLink || result.link}
                                            </p>
                                        </div>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // Calculate chatbot position and width using pixels
    const sidebarWidth = isCollapsed ? 64 : 192; // 4rem = 64px, 12rem = 192px
    const mainContentWidth = Math.max(0, windowWidth - sidebarWidth);
    // When PDF-only: borrow middle width to left panel
    const effectiveLeftPercent = isPdfOnly ? leftWidth + middleWidth : leftWidth;
    const effectiveMiddlePercent = isPdfOnly ? 0 : middleWidth;
    const leftPanelWidthPx = (effectiveLeftPercent / 100) * mainContentWidth;
    const middlePanelWidthPx = (effectiveMiddlePercent / 100) * mainContentWidth;
    const chatbotWidthPx = mainContentWidth - leftPanelWidthPx - middlePanelWidthPx;
    const chatbotLeftPx = sidebarWidth + leftPanelWidthPx + middlePanelWidthPx;

    // Ensure minimum width for chatbot
    const minChatbotWidth = 250;

    // Calculate final positions - ensure chatbot never overlaps Notes panel
    // If chatbot would be too narrow, reduce middle panel width instead
    let finalChatbotWidthPx = chatbotWidthPx;
    let finalChatbotLeftPx = chatbotLeftPx;

    if (finalChatbotWidthPx < minChatbotWidth) {
        // Chatbot too narrow, need to reduce middle panel
        const requiredChatbotWidth = minChatbotWidth;
        const adjustedMiddleWidthPx = mainContentWidth - leftPanelWidthPx - requiredChatbotWidth;
        // Recalculate chatbot position based on adjusted middle width
        finalChatbotLeftPx = sidebarWidth + leftPanelWidthPx + Math.max(0, adjustedMiddleWidthPx);
        finalChatbotWidthPx = requiredChatbotWidth;
    }

    // Ensure chatbot doesn't go off screen
    // But never move it left of chatbotLeftPx to avoid overlapping Notes panel
    if (finalChatbotLeftPx + finalChatbotWidthPx > windowWidth) {
        // Reduce width instead of moving left
        finalChatbotWidthPx = Math.max(minChatbotWidth, windowWidth - finalChatbotLeftPx);
    }

    // Resize handle position (2px to the left of chatbot)
    const resizeHandleLeftPx = finalChatbotLeftPx - 2;

    // Calculate max width for Notes panel to ensure it doesn't get covered by chatbot
    const notesPanelMaxWidthPx = finalChatbotLeftPx - sidebarWidth - leftPanelWidthPx - 4; // 4px for border/margin
    const notesPanelMaxWidthPercent = mainContentWidth > 0 ? (notesPanelMaxWidthPx / mainContentWidth) * 100 : middleWidth;

    // Calculate position for fixed icons (Users and MessageSquare)
    // Position them at the right edge of Notes panel header, just before chatbot
    const actualMiddlePanelWidthPx = (Math.min(middleWidth, notesPanelMaxWidthPercent) / 100) * mainContentWidth;
    const notesPanelRightEdgePx = sidebarWidth + leftPanelWidthPx + actualMiddlePanelWidthPx;
    const iconsLeftPx = Math.max(sidebarWidth + leftPanelWidthPx + 16, notesPanelRightEdgePx - 80); // 80px for 2 icons + spacing, min 16px from left edge of Notes panel

    const pdfAvailableWidthPx = Math.max(320, Math.floor(leftPanelWidthPx - 80));

    // Extract transcript text when entering Transcript mode
    useEffect(() => {
        const extract = async () => {
            if (!isTranscript || !pdfUrl) return;
            try {
                setTranscriptLoading(true);
                setTranscriptError(null);
                const loadingTask = pdfjs.getDocument(pdfUrl);
                const pdfDoc = await loadingTask.promise;
                const total = pdfDoc.numPages;
                let all = '';
                for (let i = 1; i <= total; i++) {
                    const page = await pdfDoc.getPage(i);
                    const tc: any = await page.getTextContent();
                    type Item = { str: string; transform: number[] };
                    const items: Item[] = tc.items as Item[];

                    if (!items || items.length === 0) {
                        all += `\n\nPage ${i}\n\n`;
                        continue;
                    }

                    // Group by y coordinate (line by line)
                    const lines: { y: number; parts: { x: number; text: string }[] }[] = [];
                    const Y_THRESHOLD = 3; // px
                    for (const it of items) {
                        const y = it.transform ? it.transform[5] : 0;
                        const x = it.transform ? it.transform[4] : 0;
                        // find existing line with similar y
                        let line = lines.find(l => Math.abs(l.y - y) < Y_THRESHOLD);
                        if (!line) { line = { y, parts: [] }; lines.push(line); }
                        line.parts.push({ x, text: it.str });
                    }
                    // Sort lines from top to bottom (pdfjs y increases upward; adjust)
                    lines.sort((a, b) => b.y - a.y);
                    const pageLines = lines.map(l => {
                        l.parts.sort((a, b) => a.x - b.x);
                        // join with space; remove excessive spaces
                        return l.parts.map(p => p.text).join(' ').replace(/\s{2,}/g, ' ').trim();
                    });

                    const pageText = pageLines.join('\n');
                    all += `\n\nPage ${i}\n\n${pageText}`;
                }
                setTranscriptText(all.trim());
            } catch (e: any) {
                console.error('Transcript extraction error:', e);
                setTranscriptError('Không thể trích xuất văn bản từ PDF.');
            } finally {
                setTranscriptLoading(false);
            }
        };
        extract();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTranscript, pdfUrl]);

    return (
        <>
            <div className={`pdf-viewer-container flex h-screen bg-white transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-48'} ${isResizing ? 'select-none' : ''}`} style={{ overflowX: 'hidden', overflowY: 'visible', width: isCollapsed ? 'calc(100% - 4rem)' : 'calc(100% - 12rem)' }}>
                {/* Left: PDF Viewer */}
                <div
                    className={`flex flex-col ${isPdfOnly ? '' : 'border-r border-gray-200'} min-w-0 overflow-hidden`}
                    style={{ width: `${isPdfOnly ? leftWidth + middleWidth : leftWidth}%` }}
                >
                    {/* Header */}
                    {!isPdfOnly && (
                        <div className="bg-white p-5 flex items-center justify-between min-w-0">
                            <div className="flex items-center space-x-4 min-w-0 flex-1">
                                <button
                                    onClick={onBack}
                                    className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                                >
                                    <span className="text-lg">←</span>
                                </button>
                                <div className="flex items-center space-x-3 min-w-0 flex-1">
                                    <span className="text-base font-medium text-gray-800 flex-shrink-0 truncate max-w-xs">
                                        {currentMaterial ? currentMaterial.name : 'Document'}
                                    </span>
                                    <div className="flex items-center space-x-2 min-w-0">
                                        <span className="text-base text-gray-500 whitespace-nowrap">
                                            {currentMaterial ? (
                                                showAllPages ?
                                                    `All ${currentMaterial.totalPages} pages` :
                                                    `Page ${pageNumber} of ${currentMaterial.totalPages}`
                                            ) : (
                                                showAllPages ? `All ${numPages} pages` : `Page ${pageNumber} of ${numPages}`
                                            )}
                                        </span>
                                        <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PDF Content (or Transcript) */}
                    <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
                        <div className="max-w-full mx-auto">
                            {isTranscript ? (
                                renderPages()
                            ) : pdfUrl ? (
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
                                <div className="flex items-center justify-center h-96 bg-white rounded-lg">
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

                {/* Middle: Note-taking (always mounted; hidden in View PDF) */}
                <div
                    className="flex flex-col border-r border-gray-200 min-w-0 relative z-30 overflow-hidden transition-all"
                    style={
                        isPdfOnly
                            ? { width: 0, visibility: 'hidden', pointerEvents: 'none' }
                            : {
                                width: isNoteExpanded ? `${100 - leftWidth}%` : `${middleWidth}%`,
                                minWidth: '300px',
                                maxWidth: isNoteExpanded
                                    ? `${100 - leftWidth}%`
                                    : `${Math.min(middleWidth, notesPanelMaxWidthPercent)}%`,
                                visibility: 'visible',
                                pointerEvents: 'auto'
                            }
                    }
                >
                    {/* Note Header */}
                    <div
                        className="bg-white note-header flex-shrink-0 relative"
                        style={{
                            minHeight: '60px',
                            width: '100%',
                            overflow: 'visible'
                        }}
                    >
                        <div className="flex items-center justify-between px-4 pt-3 pb-2 min-w-0">
                            <h2 className="text-lg font-semibold flex-shrink-0 truncate pr-20">Notes & Collaboration</h2>
                        </div>
                    </div>

                    {/* Note Content */}
                    <div className="flex-1 flex flex-col min-h-0 relative">
                        {/* Toolbar */}
                        <div className="bg-white border-b border-gray-200 flex-shrink-0" style={{ minHeight: '48px' }}>
                            <div
                                className="toolbar-scroll"
                                style={{
                                    width: '100%',
                                    overflowX: 'auto',
                                    overflowY: 'hidden',
                                    WebkitOverflowScrolling: 'touch'
                                }}
                                onWheel={(e) => {
                                    // Allow horizontal scrolling with mouse wheel (Shift + wheel)
                                    if (e.shiftKey || e.deltaY !== 0) {
                                        e.preventDefault();
                                        const target = e.target as HTMLElement;
                                        target.scrollLeft += e.deltaY || e.deltaX;
                                    }
                                }}
                            >
                                <div className="flex items-center space-x-2 px-3 py-2 mb-1" style={{ minWidth: 'max-content', minHeight: '36px' }}>
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
                                        className={`p-2 rounded transition-all duration-200 flex-shrink-0 ${isHighlightMode
                                            ? 'bg-gray-200 text-gray-800'
                                            : 'bg-white hover:bg-gray-100 text-gray-700'
                                            }`}
                                        onClick={() => setIsHighlightMode(!isHighlightMode)}
                                        title="Highlight"
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
                            </div>
                            <div className="text-sm text-gray-500 px-3 py-1">
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

                        {/* Bottom Tabs overlay is rendered globally (not tied to Notes visibility) */}
                    </div>
                </div>
            </div>

            {/* Global Bottom Tabs - Floating pill overlay (draggable + minimizable) */}
            {tabsPosition && (
                <>
                    {!isTabsMinimized ? (
                        <div
                            className="pointer-events-none fixed z-50"
                            style={{ left: tabsPosition.x, top: tabsPosition.y, transform: 'translate(-50%, -50%)' }}
                        >
                            <div
                                className={`pointer-events-auto inline-flex items-center space-x-3 rounded-2xl border border-gray-200/80 bg-white/90 backdrop-blur-sm px-5 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.10)] transition-all duration-300 ease-out ${tabsJustOpened ? '' : ''}`}
                                style={{
                                    transform: tabsJustOpened ? 'translateY(12px) scale(0.98)' : undefined,
                                    opacity: tabsJustOpened ? 0 : 1
                                }}
                                onMouseDown={startDragTabs}
                            >
                                <button
                                    className={`px-4 py-1.5 rounded-full text-[13px] whitespace-nowrap ${(!isPdfOnly && isNoteExpanded) ? 'bg-indigo-100 text-indigo-800' : 'text-gray-800 hover:bg-gray-100'}`}
                                    onClick={(e) => { e.stopPropagation(); try { window.dispatchEvent(new Event(`save-notes-${studySetId}`)); } catch { } setIsPdfOnly(false); setIsNoteExpanded(true); }}
                                    data-no-drag
                                >
                                    Notes
                                </button>
                                <button
                                    className={`px-4 py-1.5 rounded-full text-[13px] whitespace-nowrap ${isTranscript ? 'bg-indigo-100 text-indigo-800' : 'text-gray-700 hover:bg-gray-100'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        try { window.dispatchEvent(new Event(`save-notes-${studySetId}`)); } catch { }
                                        setIsPdfOnly(true); // mở rộng vùng trái
                                        setIsNoteExpanded(false);
                                        setIsTranscript(true);
                                    }}
                                    data-no-drag
                                >
                                    Transcript
                                </button>
                                <button
                                    className={`px-4 py-1.5 rounded-full text-[13px] whitespace-nowrap ${isPdfOnly ? 'bg-indigo-100 text-indigo-800' : 'text-gray-700 hover:bg-gray-100'}`}
                                    onClick={(e) => { e.stopPropagation(); try { window.dispatchEvent(new Event(`save-notes-${studySetId}`)); } catch { } setIsPdfOnly(true); setIsNoteExpanded(false); setIsTranscript(false); }}
                                    data-no-drag
                                >
                                    View PDF
                                </button>
                                <button
                                    className={`px-4 py-1.5 rounded-full text-[13px] whitespace-nowrap ${(!isNoteExpanded && !isPdfOnly) ? 'bg-indigo-100 text-indigo-800' : 'text-gray-700 hover:bg-gray-100'}`}
                                    onClick={(e) => { e.stopPropagation(); try { window.dispatchEvent(new Event(`save-notes-${studySetId}`)); } catch { } setIsPdfOnly(false); setIsTranscript(false); setIsNoteExpanded(false); }}
                                    data-no-drag
                                >
                                    Split Screen
                                </button>
                                {/* Minimize button */}
                                <button
                                    className="ml-1 p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                                    onClick={() => setIsTabsMinimized(true)}
                                    title="Thu nhỏ"
                                    data-no-drag
                                >
                                    <Minimize2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            className="fixed z-50 w-12 h-12 rounded-2xl bg-white/95 backdrop-blur-sm border border-gray-200 shadow-[0_8px_20px_rgba(0,0,0,0.10)] flex items-center justify-center text-gray-700"
                            style={{ left: tabsPosition.x, top: tabsPosition.y, transform: 'translate(-50%, -50%)' }}
                            onClick={(e) => {
                                // Only expand if it was a click without dragging
                                if (dragMovedRef.current) {
                                    e.preventDefault();
                                    return;
                                }
                                setTabsJustOpened(true);
                                setIsTabsMinimized(false);
                                // allow next paint then animate to visible
                                setTimeout(() => setTabsJustOpened(false), 20);
                            }}
                            onMouseDown={(e) => {
                                dragMovedRef.current = false;
                                startDragTabs(e);
                            }}
                            title="Mở Bottom Tabs"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    )}
                </>
            )}

            {/* Resize Handle - Fixed position to align with chatbot */}
            {!isNoteExpanded && (
                <div
                    className={`fixed top-0 z-40 cursor-col-resize flex items-center justify-center transition-colors duration-200 ${isResizing && resizeType === 'middle' ? 'bg-blue-400' : 'bg-transparent hover:bg-blue-200'}`}
                    style={{
                        left: `${resizeHandleLeftPx}px`,
                        width: '4px',
                        height: '100vh'
                    }}
                    onMouseDown={handleMouseDown('middle')}
                >
                    <div className="w-0.5 h-8 bg-gray-300 hover:bg-blue-400 transition-colors duration-200"></div>
                </div>
            )}

            {/* Fixed Icons (Users and MessageSquare) - Always visible */}
            {!isNoteExpanded && (
                <div
                    className="fixed z-50 flex items-center space-x-1"
                    style={{
                        left: `${iconsLeftPx}px`,
                        top: '20px'
                    }}
                >
                    <button className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0 bg-white shadow-sm border border-gray-200">
                        <Users className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0 bg-white shadow-sm border border-gray-200">
                        <MessageSquare className="w-4 h-4 text-gray-600" />
                    </button>
                </div>
            )}

            {/* Right: AI Chat - Fixed position outside main container */}
            {!isNoteExpanded && (
                <div
                    className="flex flex-col fixed top-0 z-50 bg-white"
                    style={{
                        left: `${finalChatbotLeftPx}px`,
                        width: `${finalChatbotWidthPx}px`,
                        minWidth: '250px',
                        height: '100vh'
                    }}
                >
                    {/* Chat Header */}
                    <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0">
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
                    <div className="flex-1 flex flex-col overflow-y-auto hide-scrollbar bg-white min-h-0">
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
                                        <div key={index}>
                                            {/* Message Row */}
                                            <div className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                {/* AI avatar */}
                                                {msg.type === 'ai' && (
                                                    <div className="mr-2 mt-1 flex-shrink-0">
                                                        <img
                                                            src="/chatbot.gif"
                                                            alt="AI Avatar"
                                                            className="w-8 h-8 rounded-full object-contain bg-white border border-gray-200"
                                                        />
                                                    </div>
                                                )}

                                                {/* Bubble */}
                                                <div className={`relative max-w-[80%] p-3 rounded-2xl ${msg.type === 'user'
                                                    ? 'bg-blue-500 text-white rounded-br-sm'
                                                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                                                    }`}>
                                                    {msg.type === 'ai' ? (
                                                        <div
                                                            ref={(el) => { messageRefs.current[index] = el; }}
                                                            className="text-sm prose prose-sm max-w-none ai-markdown"
                                                        >
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

                                                {/* Optional user avatar in future */}
                                            </div>

                                            {/* Web Search Results */}
                                            {msg.type === 'ai' && msg.webSearchResults && msg.webSearchResults.length > 0 && (
                                                <div className="mt-3 ml-10 max-w-[80%]">
                                                    <WebSearchResults results={msg.webSearchResults} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {isLoadingChat && (
                                        <div className="flex justify-start">
                                            <div className="bg-white text-gray-800 p-3 rounded-lg border border-gray-200">
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
                        <div className="p-4 bg-white max-w-full overflow-hidden flex-shrink-0">
                            {/* Input Field + Chips inside */}
                            <div className="max-w-full overflow-hidden rounded-2xl border border-gray-200 px-4 py-3 bg-white">
                                <div className="flex items-center">
                                    <ImageIcon className="w-5 h-5 text-gray-500 mr-3" />
                                    <input
                                        type="text"
                                        value={chatMessage}
                                        onChange={(e) => setChatMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Ask your AI tutor anything..."
                                        className="flex-1 min-w-0 text-sm focus:outline-none"
                                        disabled={isLoadingChat}
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={isLoadingChat || !chatMessage.trim()}
                                        className="w-10 h-10 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors ml-3"
                                    >
                                        <span className="text-base">↑</span>
                                    </button>
                                    <MicOff className="w-5 h-5 text-gray-400 ml-3" />
                                </div>

                                {/* Chips Row (inside the box) */}
                                <div className="flex items-center gap-2 mt-3 flex-wrap">
                                    {/* Web mode toggle chip */}
                                    <button
                                        onClick={() => setIsWebSearchMode(!isWebSearchMode)}
                                        className={`px-3 py-1.5 rounded-full text-sm border transition-all inline-flex items-center gap-2 ${isWebSearchMode ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                                            }`}
                                    >
                                        <span className="text-base">🌐</span>
                                        <span>Web</span>
                                    </button>

                                    {/* Tutor chip (placeholder for future mode) */}
                                    <div className="px-3 py-1.5 rounded-full text-sm bg-gray-50 text-gray-700 border border-gray-200 inline-flex items-center gap-2">
                                        <span className="text-base">🎓</span>
                                        <span>Tutor</span>
                                    </div>

                                    {/* Using materials chip */}
                                    <div className="px-3 py-1.5 rounded-full text-sm bg-gray-50 text-gray-700 border border-gray-200 inline-flex items-center gap-2">
                                        <span className="text-base">📝</span>
                                        <span>Using {Math.max(1, materialsCount)} material(s)</span>
                                    </div>

                                    {/* New chat shortcut */}
                                    <button
                                        onClick={createNewSession}
                                        className="ml-auto px-3 py-1.5 rounded-full text-sm bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 inline-flex items-center gap-2"
                                        title="Create New Chat"
                                    >
                                        <Plus size={14} className="text-gray-600" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

