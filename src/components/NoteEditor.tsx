import React, { useState, useEffect, useRef } from 'react';
import { Bold, Italic, PenTool, Palette, AlignLeft, AlignCenter, AlignRight, AlignJustify, Undo, Redo, Plus, Printer, Maximize2 } from 'lucide-react';

interface NoteEditorProps {
    studySetId: string;
    isNoteExpanded: boolean;
    onNoteExpand: () => void;
    middleWidth: number;
    leftWidth: number;
    notesPanelMaxWidthPercent: number;
}

const NoteEditor: React.FC<NoteEditorProps> = ({
    studySetId,
    isNoteExpanded,
    onNoteExpand,
    middleWidth,
    leftWidth,
    notesPanelMaxWidthPercent
}) => {
    const [selectedFont, setSelectedFont] = useState('Arial');
    const [selectedFontSize, setSelectedFontSize] = useState('11');
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isHighlightMode, setIsHighlightMode] = useState(false);
    const [selectedColor, setSelectedColor] = useState('#000000');
    const [textAlign, setTextAlign] = useState('left');
    const [noteContent, setNoteContent] = useState('');
    const editorRef = useRef<HTMLDivElement>(null);
    const initialHtmlRef = useRef<string>('');
    const [savedNotes, setSavedNotes] = useState<{ [key: string]: string }>({});

    // Save note content to state and localStorage
    const saveNoteContent = (content: string) => {
        setSavedNotes(prev => ({
            ...prev,
            [studySetId]: content
        }));
        try {
            localStorage.setItem(`notes_${studySetId}`, content);
        } catch { }
    };

    // Load note content from localStorage first, then state
    const loadNoteContent = () => {
        try {
            const fromStorage = localStorage.getItem(`notes_${studySetId}`);
            if (fromStorage !== null) return fromStorage;
        } catch { }
        return savedNotes[studySetId] || '';
    };

    // Initialize editor HTML immediately for first render
    if (initialHtmlRef.current === '') {
        try {
            initialHtmlRef.current = loadNoteContent();
        } catch {
            initialHtmlRef.current = '';
        }
    }

    // Handle note content change
    const handleNoteChange = (content: string) => {
        setNoteContent(content);
        saveNoteContent(content);
    };

    // Simplified formatting function
    const applyFormatting = (command: string, value?: string) => {
        if (!editorRef.current) return;

        editorRef.current.focus();

        if (command === 'fontSize' && value) {
            // Use px font size with inline style
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                if (!range.collapsed) {
                    const span = document.createElement('span');
                    span.style.fontSize = `${value}px`;
                    try {
                        range.surroundContents(span);
                    } catch (e) {
                        const contents = range.extractContents();
                        span.appendChild(contents);
                        range.insertNode(span);
                    }
                    // Save after formatting
                    setTimeout(() => {
                        if (editorRef.current) {
                            handleNoteChange(editorRef.current.innerHTML);
                        }
                    }, 10);
                }
            }
        } else if (command === 'foreColor' && value) {
            // Simplified color change
            document.execCommand('foreColor', false, value);
            setTimeout(() => {
                if (editorRef.current) {
                    handleNoteChange(editorRef.current.innerHTML);
                }
            }, 10);
        } else {
            document.execCommand(command, false, value);
        }
    };

    // Handle highlight/unhighlight
    const handleHighlight = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        if (range.collapsed) return;

        // Check if already highlighted
        let markToRemove: HTMLElement | null = null;

        const allMarks = document.querySelectorAll('mark');
        allMarks.forEach((mark) => {
            try {
                if (range.intersectsNode && range.intersectsNode(mark)) {
                    markToRemove = mark as HTMLElement;
                }
            } catch (e) {
                // Fallback check
                const markRange = document.createRange();
                markRange.selectNodeContents(mark);
                if (range.intersectsNode(mark)) {
                    markToRemove = mark as HTMLElement;
                }
            }
        });

        if (markToRemove !== null) {
            // Remove highlight
            const element = markToRemove as HTMLElement;
            const parent = element.parentNode;
            if (parent) {
                while (element.firstChild) {
                    parent.insertBefore(element.firstChild, element);
                }
                parent.removeChild(element);
            }
        } else {
            // Add highlight
            const mark = document.createElement('mark');
            mark.style.backgroundColor = '#FFFF00';
            mark.style.color = 'inherit';
            try {
                range.surroundContents(mark);
            } catch (e) {
                const contents = range.extractContents();
                mark.appendChild(contents);
                range.insertNode(mark);
            }
        }

        // Save after highlight change
        setTimeout(() => {
            if (editorRef.current) {
                handleNoteChange(editorRef.current.innerHTML);
            }
        }, 10);
    };

    // Load note content when studySetId changes
    useEffect(() => {
        const content = loadNoteContent();
        if (editorRef.current) {
            editorRef.current.innerHTML = content || '';
        }
        setNoteContent(content || '');
        return () => {
            if (editorRef.current) {
                const html = editorRef.current.innerHTML;
                if (html && html !== noteContent) {
                    saveNoteContent(html);
                }
            }
        };
    }, [studySetId]);

    // Handle external save requests (from parent before hiding this component)
    useEffect(() => {
        const handler = () => {
            if (editorRef.current) {
                const html = editorRef.current.innerHTML;
                saveNoteContent(html);
            }
        };
        const eventName = `save-notes-${studySetId}`;
        window.addEventListener(eventName, handler);
        return () => window.removeEventListener(eventName, handler);
    }, [studySetId]);

    // Handle highlight mode
    useEffect(() => {
        if (!isHighlightMode) return;

        const handleMouseUp = () => {
            setTimeout(() => {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    if (!range.collapsed && editorRef.current?.contains(range.commonAncestorContainer)) {
                        handleHighlight();
                    }
                }
            }, 10);
        };

        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, [isHighlightMode]);

    // Debounced auto-save using MutationObserver (saves even if state events are missed)
    useEffect(() => {
        if (!editorRef.current) return;
        const target = editorRef.current;
        let timer: number | undefined;
        const saver = () => {
            try {
                const html = target.innerHTML;
                saveNoteContent(html);
            } catch { }
        };
        const debounced = () => {
            if (timer) window.clearTimeout(timer);
            timer = window.setTimeout(saver, 300);
        };
        const observer = new MutationObserver(debounced);
        observer.observe(target, { childList: true, characterData: true, subtree: true });

        const onVisibility = () => { if (document.visibilityState !== 'visible') saver(); };
        const onBeforeUnload = () => saver();
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('beforeunload', onBeforeUnload);

        return () => {
            observer.disconnect();
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('beforeunload', onBeforeUnload);
            if (timer) window.clearTimeout(timer);
        };
    }, [studySetId]);

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
        const command = 'justify' + align.charAt(0).toUpperCase() + align.slice(1);
        applyFormatting(command);
    };

    const checkFormattingState = () => {
        setIsBold(document.queryCommandState('bold'));
        setIsItalic(document.queryCommandState('italic'));
    };

    const handleUndo = () => {
        editorRef.current?.focus();
        document.execCommand('undo', false);
        setTimeout(checkFormattingState, 10);
    };

    const handleRedo = () => {
        editorRef.current?.focus();
        document.execCommand('redo', false);
        setTimeout(checkFormattingState, 10);
    };

    const handleInsertContent = () => {
        editorRef.current?.focus();
        document.execCommand('insertHTML', false, '<br>');
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div
            className="flex flex-col border-r border-gray-200 min-w-0 relative z-30 overflow-hidden"
            style={{
                width: isNoteExpanded ? `${100 - leftWidth}%` : `${middleWidth}%`,
                minWidth: '300px',
                maxWidth: isNoteExpanded ? `${100 - leftWidth}%` : `${Math.min(middleWidth, notesPanelMaxWidthPercent)}%`
            }}
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
            <div className="flex-1 flex flex-col min-h-0">
                {/* Toolbar */}
                <div className="bg-white flex-shrink-0" style={{ minHeight: '48px' }}>
                    <div
                        className="toolbar-scroll"
                        style={{
                            width: '100%',
                            overflowX: 'auto',
                            overflowY: 'hidden',
                            WebkitOverflowScrolling: 'touch'
                        }}
                        onWheel={(e) => {
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
                                className={`p-2 rounded transition-all duration-200 flex-shrink-0 ${isBold ? 'bg-gray-200 text-gray-800' : 'bg-white hover:bg-gray-100 text-gray-700'
                                    }`}
                                onClick={() => {
                                    document.execCommand('bold', false);
                                    setTimeout(checkFormattingState, 10);
                                }}
                            >
                                <Bold className="w-4 h-4" />
                            </button>
                            <button
                                className={`p-2 rounded transition-all duration-200 flex-shrink-0 ${isItalic ? 'bg-gray-200 text-gray-800' : 'bg-white hover:bg-gray-100 text-gray-700'
                                    }`}
                                onClick={() => {
                                    document.execCommand('italic', false);
                                    setTimeout(checkFormattingState, 10);
                                }}
                            >
                                <Italic className="w-4 h-4" />
                            </button>
                            <button
                                className={`p-2 rounded transition-all duration-200 flex-shrink-0 ${isHighlightMode ? 'bg-yellow-200 text-gray-800' : 'bg-white hover:bg-gray-100 text-gray-700'
                                    }`}
                                onClick={() => setIsHighlightMode(!isHighlightMode)}
                                title="Highlight Mode"
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
                                className={`p-2 rounded transition-all duration-200 flex-shrink-0 ${textAlign === 'left' ? 'bg-gray-200 text-gray-800' : 'bg-white hover:bg-gray-100 text-gray-700'
                                    }`}
                                onClick={() => handleAlignmentChange('left')}
                            >
                                <AlignLeft className="w-4 h-4" />
                            </button>
                            <button
                                className={`p-2 rounded transition-all duration-200 flex-shrink-0 ${textAlign === 'center' ? 'bg-gray-200 text-gray-800' : 'bg-white hover:bg-gray-100 text-gray-700'
                                    }`}
                                onClick={() => handleAlignmentChange('center')}
                            >
                                <AlignCenter className="w-4 h-4" />
                            </button>
                            <button
                                className={`p-2 rounded transition-all duration-200 flex-shrink-0 ${textAlign === 'right' ? 'bg-gray-200 text-gray-800' : 'bg-white hover:bg-gray-100 text-gray-700'
                                    }`}
                                onClick={() => handleAlignmentChange('right')}
                            >
                                <AlignRight className="w-4 h-4" />
                            </button>
                            <button
                                className={`p-2 rounded transition-all duration-200 flex-shrink-0 ${textAlign === 'justify' ? 'bg-gray-200 text-gray-800' : 'bg-white hover:bg-gray-100 text-gray-700'
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
                                className={`p-2 rounded transition-all duration-200 flex-shrink-0 ${isNoteExpanded ? 'bg-blue-200 text-gray-800' : 'bg-white hover:bg-gray-100 text-gray-700'
                                    }`}
                                onClick={onNoteExpand}
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
                <div className="flex-1 p-4 overflow-y-auto">
                    <div
                        ref={editorRef}
                        className="w-full border-none resize-none focus:outline-none"
                        contentEditable
                        suppressContentEditableWarning
                        data-placeholder="Start taking notes..."
                        style={{
                            fontFamily: selectedFont,
                            fontSize: `${selectedFontSize}px`,
                            color: selectedColor,
                            textAlign: textAlign as any,
                            minHeight: '200px'
                        }}
                        dangerouslySetInnerHTML={{ __html: initialHtmlRef.current || '' }}
                        onInput={(e) => {
                            handleNoteChange(e.currentTarget.innerHTML);
                        }}
                        onKeyDown={(e) => {
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
                    />
                </div>

                {/* Bottom Tabs removed: handled in PDFViewerFixed */}
            </div>
        </div>
    );
};

export default NoteEditor;
