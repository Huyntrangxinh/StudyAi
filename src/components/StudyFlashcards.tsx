import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Star, Shuffle, RotateCcw, GraduationCap, Share, Upload, User, Lightbulb, Brain, Book, Send, Plus, Link, History } from 'lucide-react';

interface StudyFlashcardsProps {
    flashcards: Array<{
        id: string;
        term: string;
        definition: string;
        termImage?: string;
        definitionImage?: string;
    }>;
    onBack: () => void;
    isCollapsed: boolean;
    flashcardName?: string;
}

const StudyFlashcards: React.FC<StudyFlashcardsProps> = ({ flashcards, onBack, isCollapsed, flashcardName }) => {
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isShuffled, setIsShuffled] = useState(false);
    const [bookmarkedCards, setBookmarkedCards] = useState<Set<string>>(new Set());
    const [aiMessage, setAiMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [chatMessage, setChatMessage] = useState<string>('');
    const [chatHistory, setChatHistory] = useState<Array<{ type: 'user' | 'ai', message: string }>>([]);
    const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
    const [isSliding, setIsSliding] = useState(false);

    // Debug log
    console.log('StudyFlashcards received flashcards:', flashcards);
    console.log('Current card index:', currentCardIndex);
    console.log('Total flashcards:', flashcards.length);

    // Debug each flashcard
    flashcards.forEach((card, index) => {
        console.log(`Flashcard ${index}:`, {
            id: card.id,
            term: card.term,
            definition: card.definition,
            fullObject: card
        });
    });

    // Reset currentCardIndex when flashcards change
    useEffect(() => {
        if (flashcards.length > 0 && currentCardIndex >= flashcards.length) {
            setCurrentCardIndex(0);
        }
    }, [flashcards, currentCardIndex]);
    // Resizable divider state
    const [sidebarWidth, setSidebarWidth] = useState<number>(300); // compact default
    const [showAiSidebar, setShowAiSidebar] = useState<boolean>(true);
    const [isResizing, setIsResizing] = useState<boolean>(false);
    const [showHint, setShowHint] = useState<boolean>(false);
    // Dynamic card max width to fit between left nav and AI sidebar
    const [cardMaxWidth, setCardMaxWidth] = useState<number>(1200);

    const currentCard = flashcards[currentCardIndex];

    // Debug current card
    console.log('Current card:', currentCard);
    console.log('Is currentCard undefined?', currentCard === undefined);
    console.log('Current card term:', currentCard?.term);
    console.log('Current card definition:', currentCard?.definition);

    const nextCard = () => {
        console.log('Next button clicked');
        console.log('Current index:', currentCardIndex);
        console.log('Total cards:', flashcards.length);
        console.log('Can go next?', currentCardIndex < flashcards.length - 1);
        console.log('Is sliding?', isSliding);

        if (currentCardIndex < flashcards.length - 1 && !isSliding) {
            console.log('Moving to next card');
            setIsSliding(true);
            setSlideDirection('left');
            setIsFlipped(false);

            setTimeout(() => {
                setCurrentCardIndex(prev => {
                    console.log('Updating index from', prev, 'to', prev + 1);
                    return prev + 1;
                });
                setSlideDirection(null);
                setTimeout(() => {
                    setIsSliding(false);
                }, 100);
            }, 300);
        } else {
            console.log('Cannot go next - either at end or sliding');
        }
    };

    const prevCard = () => {
        if (currentCardIndex > 0 && !isSliding) {
            setIsSliding(true);
            setSlideDirection('right');
            setIsFlipped(false);

            setTimeout(() => {
                setCurrentCardIndex(prev => prev - 1);
                setSlideDirection(null);
                setTimeout(() => {
                    setIsSliding(false);
                }, 100);
            }, 300);
        }
    };

    const flipCard = () => {
        setIsFlipped(!isFlipped);
    };

    const shuffleCards = () => {
        setIsShuffled(!isShuffled);
    };

    const sendChatMessage = async () => {
        if (!chatMessage.trim() || isLoadingChat) return;

        const userMessage = chatMessage.trim();
        setChatMessage('');
        setChatHistory(prev => [...prev, { type: 'user', message: userMessage }]);
        setIsLoadingChat(true);

        try {
            // Tạo prompt riêng cho flashcard với thông tin thẻ hiện tại
            const currentTerm = currentCard?.term || '';
            const currentDefinition = currentCard?.definition || '';

            const flashcardPrompt = `Bạn là AI tutor chuyên giúp học flashcard tên Huyền Trang. 
            
Thông tin flashcard hiện tại:
- Term (Thuật ngữ): ${currentTerm}
- Definition (Định nghĩa): ${currentDefinition}

Câu hỏi của Huyền Trang: ${userMessage}

Hãy trả lời theo format sau:
1. Bắt đầu với "Chào Huyền Trang! 🎉 Rất vui khi được giúp bạn hiểu rõ hơn về từ này! 😊"
2. Hiển thị thông tin flashcard: "Flashcard của chúng ta hôm nay là: **Thuật ngữ:** [term] **Định nghĩa:** [definition]"
3. Nếu có lỗi chính tả, nhắc nhở nhẹ nhàng như "Có lẽ có một chút nhầm lẫn ở đây về từ [từ đúng] đó Huyền Trang ơi! 😉"
4. **Giải thích chi tiết** với:
   - Định nghĩa rõ ràng và dễ hiểu
   - **Ví dụ câu tiếng Anh** sử dụng từ đó
   - **Ví dụ câu tiếng Việt** tương ứng
   - Các từ liên quan hoặc từ đồng nghĩa
   - Lưu ý về cách sử dụng trong ngữ cảnh
5. Kết thúc bằng "Huyền Trang có muốn mình giải thích kỹ hơn phần nào không? Mình luôn sẵn sàng giúp bạn học tập vui vẻ! 🎉😊"
6. Sử dụng nhiều emoji, tone giáo dục thân thiện, và gọi tên "Huyền Trang" trong câu trả lời.`;

            const response = await fetch('http://localhost:3001/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: flashcardPrompt,
                    studySetId: '13'
                })
            });

            if (response.ok) {
                const data = await response.json();
                setChatHistory(prev => [...prev, { type: 'ai', message: data.response }]);
            } else {
                setChatHistory(prev => [...prev, { type: 'ai', message: 'Xin lỗi, có lỗi xảy ra khi gửi tin nhắn.' }]);
            }
        } catch (error) {
            console.error('Error sending chat message:', error);
            setChatHistory(prev => [...prev, { type: 'ai', message: 'Xin lỗi, có lỗi xảy ra khi gửi tin nhắn.' }]);
        } finally {
            setIsLoadingChat(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    };

    // Function to render markdown-like formatting
    const renderMessage = (message: string) => {
        let html = message;

        // 1. Replace bold and italic
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em class="italic text-gray-700">$1</em>');

        // 2. Replace headings
        html = html.replace(/### (.*?)(?=\n|$)/g, '<h3 class="text-lg font-semibold text-gray-800 mt-4 mb-2">$1</h3>');
        html = html.replace(/## (.*?)(?=\n|$)/g, '<h2 class="text-xl font-bold text-gray-900 mt-4 mb-3">$1</h2>');

        // 3. Handle list items: convert lines starting with `• `, `- ` or `* ` into `<li>`
        // We remove the leading bullet/hyphen/asterisk and let CSS handle the bullet point.
        html = html.replace(/^(\s*)([•\-*])\s(.*?)(?=\n|$)/gm, '$1<li class="ml-4">$3</li>');

        // 4. Wrap consecutive list items in <ul> tags
        // Added list-disc and pl-5 to the ul for CSS bullets and indentation
        html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/g, '<ul class="list-disc pl-5">$&</ul>');
        html = html.replace(/<ul>\s*<\/ul>/g, ''); // Remove empty ul tags

        // 5. Handle paragraphs and line breaks
        // Replace double newlines with paragraph breaks (removed mb-3 from p, will rely on space-y-2)
        html = html.replace(/\n\n/g, '</p><p>');
        // Replace single newlines with <br> for soft breaks within paragraphs, 
        // but not inside <li> or other block elements
        html = html.replace(/(?<!<\/p>)\n(?!<p>|<li>|<h)/g, '<br>');

        // The outer div with space-y-2 will handle spacing between block elements.
        // Removed the conditional wrapping in <p> as it can interfere with lists/headings.
        return `<div class="space-y-2">${html}</div>`;
    };

    const toggleBookmark = () => {
        const newBookmarked = new Set(bookmarkedCards);
        if (newBookmarked.has(currentCard.id)) {
            newBookmarked.delete(currentCard.id);
        } else {
            newBookmarked.add(currentCard.id);
        }
        setBookmarkedCards(newBookmarked);
    };

    const handleAISubmit = async (prompt: string) => {
        setIsLoading(true);
        try {
            // Tạo prompt riêng cho flashcard với thông tin thẻ hiện tại
            const currentTerm = currentCard?.term || '';
            const currentDefinition = currentCard?.definition || '';

            const flashcardPrompt = `Bạn là AI tutor chuyên giúp học flashcard tên Huyền Trang. 
            
Thông tin flashcard hiện tại:
- Term (Thuật ngữ): ${currentTerm}
- Definition (Định nghĩa): ${currentDefinition}

Yêu cầu của Huyền Trang: ${prompt}

Hãy trả lời theo format sau:
1. Bắt đầu với "Chào Huyền Trang! 🎉 Rất vui khi được giúp bạn hiểu rõ hơn về từ này! 😊"
2. Hiển thị thông tin flashcard: "Flashcard của chúng ta hôm nay là: **Thuật ngữ:** [term] **Định nghĩa:** [definition]"
3. Nếu có lỗi chính tả, nhắc nhở nhẹ nhàng như "Có lẽ có một chút nhầm lẫn ở đây về từ [từ đúng] đó Huyền Trang ơi! 😉"
4. **Giải thích chi tiết** với:
   - Định nghĩa rõ ràng và dễ hiểu
   - **Ví dụ câu tiếng Anh** sử dụng từ đó
   - **Ví dụ câu tiếng Việt** tương ứng
   - Các từ liên quan hoặc từ đồng nghĩa
   - Lưu ý về cách sử dụng trong ngữ cảnh
5. Kết thúc bằng "Huyền Trang có muốn mình giải thích kỹ hơn phần nào không? Mình luôn sẵn sàng giúp bạn học tập vui vẻ! 🎉😊"
6. Sử dụng nhiều emoji, tone giáo dục thân thiện, và gọi tên "Huyền Trang" trong câu trả lời.`;

            const response = await fetch('http://localhost:3001/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: flashcardPrompt,
                    studySetId: '13'
                })
            });

            if (response.ok) {
                const data = await response.json();
                setAiMessage(data.response);
            } else {
                setAiMessage('Xin lỗi, có lỗi xảy ra khi gửi tin nhắn.');
            }
        } catch (error) {
            console.error('Error calling AI:', error);
            setAiMessage('Xin lỗi, có lỗi xảy ra khi gửi tin nhắn.');
        } finally {
            setIsLoading(false);
        }
    };

    // Divider drag handlers
    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            // Calculate new width from the right edge of left pane
            const viewportWidth = window.innerWidth;
            // Sidebar is the right pane; width = viewport - cursorX - left sidebar (if any margin). Our content has no fixed left sidebar here, so compute relative to right edge.
            const newWidth = Math.max(250, Math.min(600, viewportWidth - e.clientX));
            setSidebarWidth(newWidth);
        };
        const onMouseUp = () => setIsResizing(false);
        if (isResizing) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isResizing]);

    // Recalculate available width for the card when window/sidebar changes
    useEffect(() => {
        const compute = () => {
            const viewportWidth = window.innerWidth;
            // Left navigation in app is 64px when collapsed and 192px when expanded
            const leftNavWidth = isCollapsed ? 64 : 192;
            // Small gutter to keep a tiny breathing space
            const gutter = 0;
            const effectiveSidebar = showAiSidebar ? sidebarWidth : 0;
            const available = Math.max(600, viewportWidth - leftNavWidth - effectiveSidebar - gutter);
            // Cap to a reasonable maximum to keep card readable and leave margins on both sides
            setCardMaxWidth(Math.min(1000, available));
        };
        compute();
        window.addEventListener('resize', compute);
        return () => window.removeEventListener('resize', compute);
    }, [sidebarWidth, isCollapsed, showAiSidebar]);

    // Show hint bubble after 3s when chatbot is hidden
    useEffect(() => {
        if (!showAiSidebar) {
            const t = setTimeout(() => setShowHint(true), 3000);
            const autoHide = setTimeout(() => setShowHint(false), 9000);
            return () => {
                clearTimeout(t);
                clearTimeout(autoHide);
            };
        }
        setShowHint(false);
    }, [showAiSidebar]);

    if (!currentCard || flashcards.length === 0) {
        return (
            <div className={`min-h-screen bg-gray-50 transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-48'}`}>
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Không có thẻ ghi nhớ nào</h2>
                        <p className="text-gray-600 mb-6">Hãy tạo thẻ ghi nhớ trước khi bắt đầu học</p>
                        <p className="text-sm text-gray-500 mb-4">Debug: {flashcards.length} flashcards loaded</p>
                        <button
                            onClick={onBack}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Quay lại
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-gray-50 transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-48'}`}>
            {/* Top Header (copied from CreateFlashcardSet) */}
            <div className={`bg-white fixed top-0 right-0 z-10 transition-all duration-300 ${isCollapsed ? 'left-16' : 'left-40'}`}>
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={onBack}
                                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span>Quay lại</span>
                            </button>
                            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-yellow-400 rounded-lg flex items-center justify-center">
                                <img src="/18.gif" alt="Flashcard" className="w-6 h-6 object-contain" />
                            </div>
                            <div className="flex items-center space-x-2">
                                <h1 className="text-xl font-bold text-gray-900">{flashcardName || 'Flashcard'}</h1>
                                <button className="p-1 text-gray-400 hover:text-gray-600" aria-label="More">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                            <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 rounded-lg flex items-center space-x-1">
                                <Plus className="w-4 h-4" />
                                <span>New</span>
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600" aria-label="Upload">
                                <Upload className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600" aria-label="Apps">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                                <span className="text-sm">Share</span>
                            </button>
                            <button className="px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg flex items-center space-x-2">
                                <span className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">i</span>
                                <span className="text-sm">Feedback</span>
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600" aria-label="Link">
                                <Link className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600" aria-label="Upload 2">
                                <Upload className="w-4 h-4" />
                            </button>
                            <div className="relative">
                                <button className="p-2 text-gray-400 hover:text-gray-600" aria-label="Profile">
                                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">H</div>
                                </button>
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">1</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`relative flex h-[calc(100vh-64px)] pt-16 ${isResizing ? 'select-none' : ''}`}
            >
                {/* Main Flashcard Area */}
                <div
                    className={`flex-1 flex flex-col ${isCollapsed ? 'pl-0 pr-1 md:pl-0 md:pr-2 -ml-3 md:-ml-4' : 'pl-0 pr-1 md:pl-0 md:pr-2 -ml-16 md:-ml-20'}`}
                    style={{ minWidth: 0 }}
                >
                    {/* Flashcard Display */}
                    <div className="flex-1 flex items-start md:items-center justify-center pl-0 pr-2 md:pl-0 md:pr-4 py-4 md:py-8">
                        <div className="w-full mx-auto" style={{ maxWidth: cardMaxWidth }}>
                            {/* Header row above card */}
                            <div className="flex items-center justify-between mb-4 pr-0">
                                <span className="text-sm font-medium text-gray-600">Thuật ngữ</span>
                                <span className="text-sm text-gray-500">
                                    {currentCardIndex + 1}/{flashcards.length}
                                    <span className="ml-2 text-xs text-red-500">
                                    </span>
                                </span>
                            </div>

                            {/* Flashcard (3D flip) */}
                            <div
                                className="w-full h-96 md:h-[28rem] overflow-hidden"
                                style={{ perspective: '1000px' }}
                            >
                                <div
                                    className={`relative w-full h-full cursor-pointer transition-all duration-300 ease-in-out`}
                                    style={{
                                        transformStyle: 'preserve-3d',
                                        transform: `
                                            ${isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)'}
                                            ${slideDirection === 'left' ? 'translateX(-100%)' : ''}
                                            ${slideDirection === 'right' ? 'translateX(100%)' : ''}
                                        `,
                                        opacity: isSliding ? 0.7 : 1
                                    }}
                                    onClick={flipCard}
                                >
                                    {/* Front */}
                                    <div
                                        className="absolute inset-0 bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center justify-center text-center"
                                        style={{ backfaceVisibility: 'hidden' }}
                                    >
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleBookmark(); }}
                                            className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${bookmarkedCards.has(currentCard.id) ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-yellow-500'}`}
                                            aria-label="bookmark"
                                        >
                                            <Star className="w-5 h-5" />
                                        </button>
                                        <p className="text-2xl text-gray-800 mb-4">
                                            {currentCard.term}
                                            <span className="ml-2 text-xs text-red-500">
                                            </span>
                                        </p>
                                        {currentCard.termImage && (
                                            <img
                                                src={currentCard.termImage}
                                                alt="Term"
                                                className="w-full max-w-md mx-auto rounded-lg object-contain"
                                            />
                                        )}
                                    </div>

                                    {/* Back */}
                                    <div
                                        className="absolute inset-0 bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center justify-center text-center"
                                        style={{
                                            backfaceVisibility: 'hidden',
                                            transform: 'rotateX(180deg)'
                                        }}
                                    >
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleBookmark(); }}
                                            className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${bookmarkedCards.has(currentCard.id) ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-yellow-500'}`}
                                            aria-label="bookmark"
                                        >
                                            <Star className="w-5 h-5" />
                                        </button>
                                        <p className="text-2xl text-gray-800 mb-4">{currentCard.definition}</p>
                                        {currentCard.definitionImage && (
                                            <img
                                                src={currentCard.definitionImage}
                                                alt="Definition"
                                                className="w-full max-w-md mx-auto rounded-lg object-contain"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Navigation Controls */}
                            <div className="flex items-center justify-center space-x-4 mt-8">
                                <button
                                    onClick={prevCard}
                                    disabled={currentCardIndex === 0 || isSliding}
                                    className="p-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors"
                                >
                                    <ArrowLeft className="w-6 h-6 text-gray-600" />
                                </button>
                                <button
                                    onClick={() => {
                                        console.log('Next button clicked');
                                        console.log('Current index:', currentCardIndex);
                                        console.log('Total cards:', flashcards.length);
                                        console.log('Can go next?', currentCardIndex < flashcards.length - 1);
                                        nextCard();
                                    }}
                                    disabled={currentCardIndex === flashcards.length - 1 || isSliding}
                                    className="p-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors"
                                >
                                    <ArrowRight className="w-6 h-6 text-gray-600" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action Bar - centered fixed like reference */}
                    <div
                        className="fixed bottom-4 left-0 z-10 pointer-events-none"
                        style={{ right: showAiSidebar ? sidebarWidth + 24 : 0 }}
                    >
                        <div className="flex items-center gap-3 justify-center pointer-events-auto">
                            <button
                                onClick={shuffleCards}
                                className={`pointer-events-auto px-4 py-2 rounded-full border ${isShuffled ? 'border-emerald-400 text-emerald-600' : 'border-emerald-300 text-emerald-600'} bg-white shadow-sm hover:bg-emerald-50 transition-colors flex items-center gap-2`}
                            >
                                <Shuffle className="w-4 h-4" />
                                <span className="text-sm">Shuffle Flashcards</span>
                            </button>
                            <button
                                onClick={() => toggleBookmark()}
                                className="pointer-events-auto px-4 py-2 rounded-full text-gray-700 bg-white shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <Star className="w-4 h-4" />
                                <span className="text-sm">Bookmarked</span>
                            </button>
                            <button
                                onClick={flipCard}
                                className="pointer-events-auto px-4 py-2 rounded-full text-gray-700 bg-white shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span className="text-sm">Click to Flip</span>
                            </button>
                            <button
                                className="pointer-events-auto px-4 py-2 rounded-full border border-blue-400 text-blue-600 bg-white shadow-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
                            >
                                <GraduationCap className="w-4 h-4" />
                                <span className="text-sm">Track Stats with Spaced Repetition</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Vertical Divider (draggable) */}
                {showAiSidebar && (
                    <div
                        className="w-1 cursor-col-resize bg-gray-100 hover:bg-blue-200 active:bg-blue-300 transition-colors relative group"
                        onMouseDown={() => setIsResizing(true)}
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Resize sidebar"
                        title="Kéo để thay đổi kích thước chat"
                    >
                        {/* Visual indicator */}
                        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-0.5 bg-gray-200 group-hover:bg-blue-400 transition-colors"></div>
                        {/* Dots indicator */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col space-y-1 opacity-0 group-hover:opacity-60 transition-opacity">
                            <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
                            <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
                            <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
                        </div>
                    </div>
                )}

                {/* AI Tutor Sidebar - compact modern */}
                {showAiSidebar && (
                    <div className="flex flex-col min-w-0 overflow-hidden h-[calc(100vh-64px)] rounded-l-xl shadow-xl bg-white/80 backdrop-blur"
                        style={{ width: `${sidebarWidth}px`, minWidth: 250, maxWidth: 600 }}>
                        {/* Chat Header */}
                        <div className="bg-white/70 px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <button onClick={() => setShowAiSidebar(false)} className="p-2 hover:bg-gray-100 rounded-lg active:scale-95 transition"><span className="text-2xl leading-none">×</span></button>
                                <span className="text-sm text-gray-600">AI Tutor</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <button
                                    onClick={() => setSidebarWidth(250)}
                                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                    title="Kích thước nhỏ"
                                >
                                    S
                                </button>
                                <button
                                    onClick={() => setSidebarWidth(350)}
                                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                    title="Kích thước vừa"
                                >
                                    M
                                </button>
                                <button
                                    onClick={() => setSidebarWidth(500)}
                                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                    title="Kích thước lớn"
                                >
                                    L
                                </button>
                            </div>
                        </div>

                        {/* Chat Content */}
                        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto bg-white/50">
                            {/* Chat Messages */}
                            {chatHistory.length > 0 ? (
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {chatHistory.map((msg, index) => (
                                        <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.type === 'user'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-white text-gray-800'
                                                }`}>
                                                <div
                                                    className={`text-sm prose prose-sm max-w-none ${msg.type === 'user' ? 'prose-invert [&_*]:!text-white' : ''}`}
                                                    dangerouslySetInnerHTML={{ __html: renderMessage(msg.message) }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {/* AI đang trả lời */}
                                    {isLoadingChat && (
                                        <div className="flex justify-start">
                                            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-white text-gray-800">
                                                <div className="flex items-center space-x-2">
                                                    <div className="flex space-x-1">
                                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                    </div>
                                                    <span className="text-sm text-gray-600">AI đang suy nghĩ...</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col px-4 pt-6 items-center justify-start">
                                    <div className="mb-4">
                                        <div className="w-28 h-28 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mx-auto mb-3 flex items-center justify-center shadow">
                                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                                                <img
                                                    src={(process.env.PUBLIC_URL || '') + '/quizzes_icon.webp'}
                                                    alt="Spark.E"
                                                    className="w-20 h-20 object-contain"
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLImageElement).src = (process.env.PUBLIC_URL || '') + '/quizzes-icon.webp';
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <h2 className="text-lg font-semibold text-gray-800 mb-3">Hello, I'm Spark.E</h2>

                                    {/* Current Flashcard Info */}
                                    {currentCard && (
                                        <div className="w-full max-w-md mb-5 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                            <h3 className="text-sm font-semibold text-blue-800 mb-2">📚 Flashcard hiện tại:</h3>
                                            <div className="text-sm text-blue-700">
                                                <p><strong>Term:</strong> {currentCard.term}</p>
                                                <p><strong>Definition:</strong> {currentCard.definition}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Suggested prompt tiles */}
                                    <div className="w-full max-w-md space-y-3">
                                        <button
                                            onClick={() => handleAISubmit('Giải thích chi tiết hơn về từ này')}
                                            className="w-full flex items-stretch rounded-2xl overflow-hidden bg-white text-left hover:shadow transition-shadow"
                                        >
                                            <div className="flex-1 px-5 py-4">
                                                <div className="text-gray-800 font-medium leading-snug">Giải thích chi tiết<br />hơn về từ này</div>
                                            </div>
                                            <div className="w-24 bg-indigo-50 flex items-center justify-center">
                                                <Lightbulb className="w-6 h-6 text-indigo-400" />
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handleAISubmit('Từ này liên quan đến chủ đề gì khác?')}
                                            className="w-full flex items-stretch rounded-2xl overflow-hidden bg-white text-left hover:shadow transition-shadow"
                                        >
                                            <div className="flex-1 px-5 py-4">
                                                <div className="text-gray-800 font-medium leading-snug">Từ này liên quan đến<br />chủ đề gì khác?</div>
                                            </div>
                                            <div className="w-24 bg-blue-50 flex items-center justify-center">
                                                <Brain className="w-6 h-6 text-blue-400" />
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handleAISubmit('Cho tôi ví dụ thực tế về từ này')}
                                            className="w-full flex items-stretch rounded-2xl overflow-hidden bg-white text-left hover:shadow transition-shadow"
                                        >
                                            <div className="flex-1 px-5 py-4">
                                                <div className="text-gray-800 font-medium leading-snug">Cho tôi ví dụ thực tế<br />về từ này</div>
                                            </div>
                                            <div className="w-24 bg-emerald-50 flex items-center justify-center">
                                                <Book className="w-6 h-6 text-emerald-500" />
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Input Area */}
                        <div className="p-3 md:p-4 bg-white/80 backdrop-blur w-full overflow-hidden sticky bottom-0">
                            {/* Removed top icons and divider for cleaner look */}
                            <div className="flex items-center w-full">
                                <div className="flex items-center w-full bg-white rounded-full px-4 py-3 shadow">
                                    <button className="w-8 h-8 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3"><span className="text-gray-600 text-sm">🖼️</span></button>
                                    <input
                                        type="text"
                                        placeholder="Ask your AI tutor anything..."
                                        className="flex-1 min-w-0 bg-transparent outline-none text-sm md:text-base placeholder-gray-400"
                                        value={chatMessage}
                                        onChange={(e) => setChatMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        disabled={isLoadingChat}
                                    />
                                </div>
                                <button
                                    className="ml-2 w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors flex-shrink-0 shadow disabled:opacity-50"
                                    onClick={sendChatMessage}
                                    disabled={isLoadingChat || !chatMessage.trim()}
                                >
                                    {isLoadingChat ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <span className="text-sm">↑</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Floating chat toggle + hint when sidebar hidden */}
            {!showAiSidebar && (
                <div className="fixed right-2 md:right-4 bottom-8 md:bottom-10 z-20 flex items-center space-x-3">
                    {showHint && (
                        <div className="px-3 py-2 bg-black/70 text-white text-sm rounded-lg shadow-md whitespace-nowrap select-none">
                            Cần trợ giúp? Nhấn vào tôi nhé!
                        </div>
                    )}
                    <button
                        onClick={() => { setShowAiSidebar(true); setShowHint(false); }}
                        onMouseEnter={() => setShowHint(false)}
                        className="w-[160px] h-[180px] rounded-3xl bg-transparent flex items-center justify-center"
                        title="Open chat"
                    >
                        <img
                            src={(process.env.PUBLIC_URL || '') + '/chatbot.gif?v=2'}
                            alt="Chatbot"
                            className="w-[140px] h-[140px] object-contain"
                        />
                    </button>
                </div>
            )}
        </div>
    );
};

export default StudyFlashcards;
