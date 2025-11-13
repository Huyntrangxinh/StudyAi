import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Film, FlaskConical, Music, Wand2, Lightbulb, CreditCard, Globe, X, Share2, MessageSquare, Download, Copy, Mic, GraduationCap, ListChecks, ChevronUp, Search, Edit2, Trash2, Plus, Clock, ChevronDown, ThumbsUp, ThumbsDown, RefreshCw, Volume2, Check } from 'lucide-react';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

interface ChatViewProps {
    studySetId?: string;
    studySetName?: string;
    onBack?: () => void;
    isCollapsed?: boolean;
}

interface ChatMessage {
    type: 'user' | 'ai';
    message: string;
    webSearchResults?: Array<{ title: string; link: string; snippet: string; displayLink: string }>;
    isTyping?: boolean; // ✅ Đánh dấu tin nhắn đang được type
    displayedLength?: number; // ✅ Độ dài đã hiển thị
    liked?: boolean; // ✅ Đánh dấu đã like
    disliked?: boolean; // ✅ Đánh dấu đã dislike
    userQuestion?: string; // ✅ Lưu câu hỏi của user để retry
}

interface ChatSession {
    id: number;
    title: string;
    created_at: string;
    updated_at: string;
    firstUserMessage?: string; // Tin nhắn đầu tiên của user
}

const ChatView: React.FC<ChatViewProps> = ({ studySetId, studySetName, onBack, isCollapsed = false }) => {
    const [chatMessage, setChatMessage] = useState<string>('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);
    const [selectedMaterials, setSelectedMaterials] = useState<number[]>([]);
    const [showMaterialPicker, setShowMaterialPicker] = useState(false);
    const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
    const [isAcademicSearchEnabled, setIsAcademicSearchEnabled] = useState(false);

    // Chat History dropdown states
    const [showChatHistory, setShowChatHistory] = useState(false);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingSession, setEditingSession] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null); // ✅ Ref cho scroll container
    const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null); // ✅ Track message đã copy
    const [retryingMessageIndex, setRetryingMessageIndex] = useState<number | null>(null); // ✅ Track message đang retry
    const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null); // ✅ Track message đang được đọc
    const { speakText, unlockTTS } = useTextToSpeech(); // ✅ TTS hook
    const currentAudioRef = useRef<HTMLAudioElement | null>(null); // ✅ Track audio đang phát

    // Process AI response: keep greeting, convert markdown to HTML, remove unwanted parts
    const processAIResponse = (raw: string): string => {
        if (!raw) return '';
        let answer = String(raw);

        // Remove BOM or odd invisible characters
        answer = answer.replace(/\uFEFF/g, '');

        // Replace specific names with "bạn"
        answer = answer.replace(/Huyền\s+Trang/gi, 'bạn');

        // Keep full greeting - don't shorten it, just normalize names
        // The greeting will be kept as is, just replace names

        // Remove sentences that mention pulling from documents
        answer = answer.replace(/Dựa\s+trên\s+nội\s+dung\s+tài\s+liệu[^.]*\.?/gi, '');

        // Convert markdown to HTML - keep bold formatting
        answer = answer.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong>$1</strong>'); // ***text*** -> <strong>text</strong>
        answer = answer.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); // **text** -> <strong>text</strong>
        answer = answer.replace(/\*([^*\n]+)\*/g, '<em>$1</em>'); // *text* -> <em>text</em> (only if not part of **)
        answer = answer.replace(/__([^_]+)__/g, '<strong>$1</strong>'); // __text__ -> <strong>text</strong>
        answer = answer.replace(/_([^_\n]+)_/g, '<em>$1</em>'); // _text_ -> <em>text</em>
        answer = answer.replace(/`([^`]+)`/g, '<code class="bg-gray-200 px-1 rounded">$1</code>'); // `text` -> <code>text</code>
        answer = answer.replace(/\[([^\]]+)]\([^\)]+\)/g, '$1'); // [text](url) -> text

        // Convert numbered lists and bullet points
        answer = answer.replace(/^\s*(\d+)\.\s+(.+)$/gm, '<strong>$1.</strong> $2'); // Numbered lists
        answer = answer.replace(/^-\s+(.+)$/gm, '• $1'); // Bullet points

        // Remove heading markers but keep the text (make it bold)
        answer = answer.replace(/^\s*###\s+(.+)$/gm, '<strong class="text-base">$1</strong>'); // ### heading
        answer = answer.replace(/^\s*##\s+(.+)$/gm, '<strong class="text-lg">$1</strong>'); // ## heading

        // Keep friendly closing messages - only remove overly repetitive questions
        // Keep messages like "Hy vọng giải thích này giúp bạn hiểu rõ hơn về HTTP nhé!"
        // Only remove if it's just a simple question without context
        answer = answer.replace(/Bạn\s+(có\s+)?muốn\s+mình\s+giải\s+thích\s+kỹ\s+hơn[^\n]*\s*$/gi, '');

        // Convert line breaks to <br> for HTML rendering
        answer = answer.replace(/\n\n/g, '</p><p>');
        answer = answer.replace(/\n/g, '<br>');

        // Wrap in paragraph tags
        answer = `<p>${answer}</p>`;

        // Collapse multiple blank lines
        answer = answer.replace(/<\/p><p><\/p><p>/g, '</p><p>');

        return answer.trim();
    };

    const suggestionCards = [
        { id: 1, text: "Explain atoms like I'm 8", icon: Film, color: "bg-blue-50 hover:bg-blue-100 border-blue-200" },
        { id: 2, text: "Difference between acids and bases", icon: FlaskConical, color: "bg-white hover:bg-gray-50 border-gray-200" },
        { id: 3, text: "Write a song about the water cycle", icon: Music, color: "bg-pink-50 hover:bg-pink-100 border-pink-200" },
        { id: 4, text: "", icon: null, color: "bg-white hover:bg-gray-50 border-gray-200" },
        { id: 5, text: "", icon: Lightbulb, color: "bg-white hover:bg-gray-50 border-gray-200" },
        { id: 6, text: "Make vocabulary flashcards", icon: CreditCard, color: "bg-green-50 hover:bg-green-100 border-green-200" }
    ];

    const handleSuggestionClick = (text: string) => {
        if (text) {
            setChatMessage(text);
        }
    };

    const handleSendMessage = async () => {
        if (!chatMessage.trim() || isLoadingChat) return;

        const userMessage = chatMessage.trim();
        setChatMessage('');
        setChatHistory(prev => [...prev, { type: 'user', message: userMessage }]);
        setIsLoadingChat(true);

        // Create or get session (riêng cho màn chat, không dùng studySetId)
        let sessionId = currentSessionId;
        if (!sessionId) {
            try {
                const sessionResponse = await fetch('http://localhost:3001/api/chat-history/sessions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        studySetId: null, // ✅ Không dùng studySetId, để null cho màn chat riêng
                        title: userMessage.substring(0, 50) // Use first message as title
                    }),
                });

                if (sessionResponse.ok) {
                    const newSession = await sessionResponse.json();
                    sessionId = newSession.id;
                    setCurrentSessionId(sessionId);
                    // ✅ Refresh chat sessions để có thông tin session mới
                    fetchChatSessions();
                }
            } catch (error) {
                console.error('Error creating session:', error);
            }
        }

        // Save user message to session
        if (sessionId) {
            try {
                await fetch('http://localhost:3001/api/chat-history/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId,
                        role: 'user',
                        content: userMessage
                    }),
                });
            } catch (error) {
                console.error('Error saving user message:', error);
            }
        }

        try {
            const response = await fetch('http://localhost:3001/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage,
                    studySetId: studySetId || '',
                    forceWebSearch: isWebSearchEnabled,
                    materialId: selectedMaterials.length > 0 ? selectedMaterials[0] : undefined
                })
            });

            if (response.ok) {
                const data = await response.json();
                const processedResponse = processAIResponse(data.response);
                console.log('✅ AI response received, webSearchResults:', data.webSearchResults?.length || 0);
                // ✅ Thêm tin nhắn AI với typing animation
                const aiMessageIndex = chatHistory.length; // Index của tin nhắn AI mới
                setChatHistory(prev => [...prev, {
                    type: 'ai',
                    message: processedResponse,
                    webSearchResults: data.webSearchResults || [], // ✅ Lưu web search results
                    isTyping: true, // ✅ Bắt đầu typing animation
                    displayedLength: 0, // ✅ Chưa hiển thị ký tự nào
                    userQuestion: userMessage // ✅ Lưu câu hỏi của user để retry
                }]);

                // Save AI response to session (lưu raw response, không phải processed)
                if (sessionId) {
                    try {
                        const saveResponse = await fetch('http://localhost:3001/api/chat-history/messages', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                sessionId,
                                role: 'assistant',
                                content: data.response // Lưu raw response từ AI
                            }),
                        });
                        if (saveResponse.ok) {
                            console.log('✅ AI message saved to session:', sessionId);
                        }
                    } catch (error) {
                        console.error('Error saving AI message:', error);
                    }
                }
            } else {
                setChatHistory(prev => [...prev, { type: 'ai', message: 'Xin lỗi, có lỗi xảy ra khi gửi tin nhắn.' }]);
            }
        } catch (error) {
            console.error('Error sending chat message:', error);
            setChatHistory(prev => [...prev, { type: 'ai', message: 'Xin lỗi, không thể kết nối với AI tutor. Vui lòng thử lại sau.' }]);
        } finally {
            setIsLoadingChat(false);
        }
    };

    // ✅ Retry AI message function
    const retryAIMessage = async (messageIndex: number, userQuestion: string) => {
        setRetryingMessageIndex(messageIndex);
        setIsLoadingChat(true);

        try {
            const response = await fetch('http://localhost:3001/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userQuestion,
                    studySetId: studySetId || '',
                    forceWebSearch: isWebSearchEnabled,
                    materialId: selectedMaterials.length > 0 ? selectedMaterials[0] : undefined
                })
            });

            if (response.ok) {
                const data = await response.json();
                const processedResponse = processAIResponse(data.response);

                // ✅ Thay thế tin nhắn AI cũ bằng tin nhắn mới
                setChatHistory(prev => prev.map((m, i) =>
                    i === messageIndex
                        ? {
                            ...m,
                            type: 'ai',
                            message: processedResponse,
                            webSearchResults: data.webSearchResults || [],
                            isTyping: true,
                            displayedLength: 0,
                            userQuestion: userQuestion,
                            liked: false, // Reset like/dislike
                            disliked: false
                        }
                        : m
                ));
            } else {
                console.error('Failed to retry AI message');
            }
        } catch (error) {
            console.error('Error retrying AI message:', error);
        } finally {
            setIsLoadingChat(false);
            setRetryingMessageIndex(null);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Fetch chat sessions with first user message (riêng cho màn chat, không dùng studySetId)
    const fetchChatSessions = async () => {
        // ✅ Sử dụng studySetId = null hoặc 'chat' để tách riêng lịch sử
        const chatStudySetId = null; // Không dùng studySetId từ props

        try {
            // ✅ Gọi API với studySetId = null để lấy tất cả chat sessions của user (không phụ thuộc study set)
            const response = await fetch(`http://localhost:3001/api/chat-history/sessions/chat`);
            if (response.ok) {
                const sessions = await response.json();

                // Fetch first user message for each session
                const sessionsWithFirstMessage = await Promise.all(
                    sessions.map(async (session: ChatSession) => {
                        try {
                            const msgResponse = await fetch(`http://localhost:3001/api/chat-history/messages/${session.id}`);
                            if (msgResponse.ok) {
                                const messages = await msgResponse.json();
                                const firstUserMessage = messages.find((m: any) => m.role === 'user');
                                return {
                                    ...session,
                                    firstUserMessage: firstUserMessage?.content || session.title
                                };
                            }
                        } catch (error) {
                            console.error('Error fetching first message:', error);
                        }
                        return { ...session, firstUserMessage: session.title };
                    })
                );

                setChatSessions(sessionsWithFirstMessage);
            }
        } catch (error) {
            console.error('Error fetching chat sessions:', error);
        }
    };

    // Load chat session
    const loadChatSession = async (sessionId: number) => {
        try {
            const response = await fetch(`http://localhost:3001/api/chat-history/messages/${sessionId}`);
            if (response.ok) {
                const messages = await response.json();
                console.log('📥 Loaded messages from session:', sessionId, messages.length);
                // Convert messages to chat history format
                const formattedHistory: ChatMessage[] = messages.map((msg: any) => ({
                    type: msg.role === 'user' ? 'user' : 'ai',
                    message: msg.role === 'user' ? msg.content : processAIResponse(msg.content),
                    // Note: webSearchResults không được lưu trong DB, chỉ có content
                    isTyping: false, // ✅ Tin nhắn từ DB đã type xong
                    displayedLength: undefined // ✅ Hiển thị toàn bộ
                }));
                setChatHistory(formattedHistory);
                setCurrentSessionId(sessionId);
                setShowChatHistory(false);
                // ✅ Refresh chat sessions để có thông tin session mới nhất
                await fetchChatSessions();
            }
        } catch (error) {
            console.error('Error loading session:', error);
        }
    };

    // ✅ Load chat history when component mounts if there's a current session
    useEffect(() => {
        // Try to load the most recent session on mount
        const loadMostRecentSession = async () => {
            try {
                const response = await fetch(`http://localhost:3001/api/chat-history/sessions/chat`);
                if (response.ok) {
                    const sessions = await response.json();
                    if (sessions.length > 0) {
                        // Load the most recent session
                        const mostRecentSession = sessions[0];
                        console.log('📥 Auto-loading most recent session:', mostRecentSession.id);
                        await loadChatSession(mostRecentSession.id);
                    }
                }
            } catch (error) {
                console.error('Error loading most recent session:', error);
            }
        };

        // Only load if we don't have a current session and chat history is empty
        if (!currentSessionId && chatHistory.length === 0) {
            loadMostRecentSession();
        }
    }, []); // Only run on mount

    // Update session title
    const updateSessionTitle = async (sessionId: number, newTitle: string) => {
        try {
            const response = await fetch(`http://localhost:3001/api/chat-history/sessions/${sessionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title: newTitle }),
            });

            if (response.ok) {
                setChatSessions(prev =>
                    prev.map(session =>
                        session.id === sessionId
                            ? { ...session, title: newTitle }
                            : session
                    )
                );
                setEditingSession(null);
                setEditTitle('');
            }
        } catch (error) {
            console.error('Error updating session title:', error);
        }
    };

    // Delete session
    const deleteSession = async (sessionId: number) => {
        if (!window.confirm('Bạn có chắc muốn xóa cuộc trò chuyện này?')) return;

        try {
            const response = await fetch(`http://localhost:3001/api/chat-history/sessions/${sessionId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setChatSessions(prev => prev.filter(session => session.id !== sessionId));
                if (chatHistory.length > 0) {
                    setChatHistory([]);
                }
            }
        } catch (error) {
            console.error('Error deleting session:', error);
        }
    };

    // Create new chat session (riêng cho màn chat)
    const createNewChat = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/chat-history/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studySetId: null, // ✅ Không dùng studySetId, để null cho màn chat riêng
                    title: `Chat ${new Date().toLocaleDateString()}`
                }),
            });

            if (response.ok) {
                const newSession = await response.json();
                setChatHistory([]);
                setCurrentSessionId(newSession.id);
                // ✅ Refresh chat sessions để có thông tin session mới
                await fetchChatSessions();
                setShowChatHistory(false);
            }
        } catch (error) {
            console.error('Error creating new session:', error);
        }
    };

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowChatHistory(false);
            }
        };

        if (showChatHistory) {
            document.addEventListener('mousedown', handleClickOutside);
            fetchChatSessions();
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showChatHistory]); // ✅ Không phụ thuộc vào studySetId

    // Filter sessions based on search term
    const filteredSessions = chatSessions.filter(session =>
        (session.firstUserMessage || session.title).toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ✅ Get current session name for display
    const currentSession = currentSessionId
        ? chatSessions.find(s => s.id === currentSessionId)
        : null;
    const currentSessionName = currentSession
        ? (currentSession.firstUserMessage || currentSession.title)
        : 'New Chat Session';

    // ✅ Helper function: Tìm vị trí cắt an toàn (không cắt giữa HTML tags)
    const findSafeCutPosition = (html: string, targetLength: number): number => {
        if (targetLength >= html.length) return html.length;

        // ✅ Nếu không có HTML tags, cắt bình thường
        if (!html.includes('<')) return targetLength;

        // ✅ Tìm vị trí cắt an toàn
        let safePos = targetLength;
        const beforePos = html.substring(0, targetLength);

        // ✅ Đếm số tag mở và đóng
        const openTags = (beforePos.match(/<[^/][^>]*>/g) || []).length;
        const closeTags = (beforePos.match(/<\/[^>]+>/g) || []).length;

        // ✅ Nếu có tag mở chưa đóng, tìm tag đóng tiếp theo
        if (openTags > closeTags) {
            const remaining = html.substring(targetLength);
            const nextCloseTag = remaining.search(/<\/[^>]+>/);
            if (nextCloseTag !== -1) {
                // ✅ Tìm vị trí sau tag đóng
                const tagEnd = remaining.indexOf('>', nextCloseTag);
                if (tagEnd !== -1) {
                    safePos = targetLength + tagEnd + 1;
                }
            }
        }

        return Math.min(safePos, html.length);
    };

    // ✅ Typing animation effect cho tin nhắn AI
    useEffect(() => {
        const typingMessages = chatHistory.filter((msg, idx) =>
            msg.type === 'ai' && msg.isTyping && (msg.displayedLength ?? 0) < msg.message.length
        );

        if (typingMessages.length === 0) return;

        const typingInterval = setInterval(() => {
            setChatHistory(prev => prev.map((msg, idx) => {
                if (msg.type === 'ai' && msg.isTyping && (msg.displayedLength ?? 0) < msg.message.length) {
                    const currentLength = msg.displayedLength ?? 0;
                    // ✅ Type 1-2 ký tự mỗi lần để chậm hơn, tự nhiên hơn
                    const charsPerTick = msg.message.length > 100 ? 2 : 1;
                    const targetLength = currentLength + charsPerTick;

                    // ✅ Tìm vị trí cắt an toàn (không cắt giữa HTML tags)
                    const safeLength = findSafeCutPosition(msg.message, targetLength);
                    const newLength = Math.min(safeLength, msg.message.length);

                    // ✅ Nếu đã type xong, tắt isTyping
                    if (newLength >= msg.message.length) {
                        return {
                            ...msg,
                            displayedLength: msg.message.length,
                            isTyping: false
                        };
                    }

                    return {
                        ...msg,
                        displayedLength: newLength
                    };
                }
                return msg;
            }));
        }, 50); // ✅ 50ms mỗi tick (khoảng 10-20 ký tự/giây, chậm hơn và tự nhiên hơn)

        return () => clearInterval(typingInterval);
    }, [chatHistory]);

    // ✅ Auto scroll khi typing animation đang chạy hoặc có tin nhắn mới
    useEffect(() => {
        if (chatScrollRef.current && chatHistory.length > 0) {
            // ✅ Scroll xuống bottom với smooth behavior
            // Sử dụng setTimeout nhỏ để đảm bảo DOM đã cập nhật
            setTimeout(() => {
                if (chatScrollRef.current) {
                    chatScrollRef.current.scrollTo({
                        top: chatScrollRef.current.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 10);
        }
    }, [chatHistory]);

    // Web Search Results Component (giống PDFViewerFixed nhưng có scrollbar cho chat)
    const WebSearchResults: React.FC<{ results: Array<{ title: string; link: string; snippet: string; displayLink: string }> }> = ({ results }) => {
        const [isExpanded, setIsExpanded] = useState(true);

        if (!results || results.length === 0) return null;

        // ✅ Hiển thị 5 kết quả đầu tiên
        const displayedResults = results.slice(0, 5);

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

                {/* Results - Có scrollbar, hiển thị 5 kết quả */}
                {isExpanded && (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2" style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#cbd5e0 #f7fafc'
                    }}>
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

    return (
        <div className="flex-1 flex flex-col bg-white h-screen overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-200 bg-white px-6 py-3.5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                        <img
                            src={`${process.env.PUBLIC_URL || ''}/chat.png`}
                            alt="Chat"
                            className="w-5 h-5 object-contain"
                        />
                        <h1 className="text-base font-semibold text-gray-900 truncate max-w-md" title={currentSessionName}>
                            {currentSessionName}
                        </h1>
                    </div>
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowChatHistory(!showChatHistory)}
                            className="flex items-center space-x-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors bg-blue-50 text-blue-700 border-blue-200"
                        >
                            <Clock className="w-4 h-4" />
                            <span>Chat History</span>
                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showChatHistory ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {showChatHistory && (
                            <div className="absolute top-full left-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
                                {/* Header */}
                                <div className="p-4 border-b">
                                    <h2 className="text-lg font-semibold text-gray-800">Chat History</h2>
                                </div>

                                {/* Search Bar */}
                                <div className="p-4 border-b">
                                    <div className="relative">
                                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Sessions List */}
                                <div className="flex-1 overflow-y-auto p-2">
                                    {filteredSessions.length === 0 ? (
                                        <div className="text-center text-gray-500 py-8 text-sm">
                                            {searchTerm ? 'No sessions found' : 'No chat sessions yet'}
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {filteredSessions.map((session) => (
                                                <div
                                                    key={session.id}
                                                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                                                >
                                                    {/* Chat Icon */}
                                                    <img
                                                        src={`${process.env.PUBLIC_URL || ''}/chat.png`}
                                                        alt="Chat"
                                                        className="w-4 h-4 mr-3 flex-shrink-0 object-contain opacity-60"
                                                    />

                                                    {/* Session Info */}
                                                    <div className="flex-1 min-w-0" onClick={() => loadChatSession(session.id)}>
                                                        {editingSession === session.id ? (
                                                            <input
                                                                type="text"
                                                                value={editTitle}
                                                                onChange={(e) => setEditTitle(e.target.value)}
                                                                onBlur={() => {
                                                                    if (editTitle.trim()) {
                                                                        updateSessionTitle(session.id, editTitle.trim());
                                                                    } else {
                                                                        setEditingSession(null);
                                                                        setEditTitle('');
                                                                    }
                                                                }}
                                                                onKeyPress={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        if (editTitle.trim()) {
                                                                            updateSessionTitle(session.id, editTitle.trim());
                                                                        } else {
                                                                            setEditingSession(null);
                                                                            setEditTitle('');
                                                                        }
                                                                    }
                                                                }}
                                                                className="w-full text-sm font-medium text-gray-800 bg-transparent border-none outline-none"
                                                                autoFocus
                                                            />
                                                        ) : (
                                                            <>
                                                                <div className="text-sm font-medium text-gray-800 cursor-pointer truncate">
                                                                    {session.firstUserMessage || session.title}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {formatDate(session.updated_at)}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingSession(session.id);
                                                                setEditTitle(session.firstUserMessage || session.title);
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteSession(session.id);
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Create New Chat Button */}
                                <div className="p-4 border-t">
                                    <button
                                        onClick={createNewChat}
                                        className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 text-sm font-medium"
                                    >
                                        <Plus size={16} />
                                        <span>New Chat</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center space-x-1.5">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Share">
                        <Share2 className="w-4.5 h-4.5 text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Feedback">
                        <MessageSquare className="w-4.5 h-4.5 text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Copy link">
                        <Copy className="w-4.5 h-4.5 text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Download">
                        <Download className="w-4.5 h-4.5 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Main Content - Scrollable */}
            <div
                ref={chatScrollRef}
                className={`flex-1 flex flex-col px-6 overflow-y-auto min-h-0 ${chatHistory.length === 0 ? 'items-center justify-center' : 'items-start'} py-6`}
                style={{ paddingBottom: '160px', marginRight: '0' }}
            >
                {chatHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center max-w-4xl w-full">
                        {/* Spark.E Avatar */}
                        <div className="mb-5">
                            <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                                <img
                                    src={`${process.env.PUBLIC_URL || ''}/SPARKE.gif`}
                                    alt="Spark.E"
                                    className="w-24 h-24 object-contain"
                                />
                            </div>
                        </div>

                        {/* Greeting */}
                        <h2 className="text-2xl font-bold text-gray-900 mb-8">Hello, I'm Spark.E</h2>

                        {/* Suggestion Cards */}
                        <div className="grid grid-cols-3 gap-3 w-full max-w-3xl mb-6">
                            {suggestionCards.map((card) => (
                                <button
                                    key={card.id}
                                    onClick={() => handleSuggestionClick(card.text)}
                                    className={`${card.color} rounded-2xl border-2 p-5 flex flex-col items-center justify-center min-h-[120px] transition-all duration-200 transform hover:scale-[1.02] hover:shadow-md active:scale-[0.98] ${!card.text && !card.icon ? 'border-dashed border-gray-300' : ''
                                        }`}
                                >
                                    {card.icon && (
                                        <card.icon className={`w-8 h-8 mb-3 ${card.text ? 'text-gray-700' : 'text-gray-400'}`} />
                                    )}
                                    {card.text && (
                                        <span className="text-sm font-medium text-gray-800 text-center leading-snug">{card.text}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* View More / Previous Sessions */}
                        <div className="flex items-center space-x-4 mb-6">
                            <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium">
                                View More
                            </button>
                            <span className="text-gray-300">•</span>
                            <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium">
                                View Previous Chat Sessions
                            </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-3">
                            <button className="flex items-center space-x-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-medium transition-colors border border-gray-200 shadow-sm">
                                <span className="text-lg">[ ]</span>
                                <span>Personalities & Skillsets</span>
                            </button>
                            <button className="flex items-center space-x-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-medium transition-colors border border-gray-200 shadow-sm">
                                <Sparkles className="w-4 h-4 text-purple-500" />
                                <span>Scenarios</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Chat History */
                    <div className="w-full max-w-3xl mx-auto space-y-4 py-6">
                        {chatHistory.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}
                            >
                                <div className={`flex items-start gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                                    {/* Avatar cho AI */}
                                    {msg.type === 'ai' && (
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden">
                                            <img
                                                src={`${process.env.PUBLIC_URL || ''}/SPARKE.gif`}
                                                alt="Spark.E"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.type === 'user'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-gray-50 text-gray-900 border border-gray-200'
                                            }`}
                                    >
                                        {msg.type === 'ai' ? (
                                            <>
                                                <div
                                                    className="text-sm leading-relaxed prose prose-sm max-w-none [&_strong]:font-semibold [&_strong]:text-gray-900 [&_em]:italic [&_code]:text-xs [&_p]:mb-2"
                                                    dangerouslySetInnerHTML={{
                                                        __html: msg.isTyping && msg.displayedLength !== undefined
                                                            ? msg.message.substring(0, msg.displayedLength)
                                                            : msg.message
                                                    }}
                                                />
                                                {/* ✅ Hiển thị cursor khi đang type */}
                                                {msg.isTyping && (
                                                    <span className="inline-block w-0.5 h-4 bg-gray-600 ml-1 animate-pulse"></span>
                                                )}
                                                {/* Web Search Results - chỉ hiển thị khi đã type xong */}
                                                {msg.webSearchResults && msg.webSearchResults.length > 0 && !msg.isTyping && (
                                                    <WebSearchResults results={msg.webSearchResults} />
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                                        )}
                                    </div>
                                </div>
                                {/* ✅ Action buttons cho tin nhắn AI - chỉ hiển thị khi đã type xong */}
                                {msg.type === 'ai' && !msg.isTyping && (
                                    <div className="flex items-center gap-2 mt-2 ml-11 relative">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    // ✅ Copy toàn bộ nội dung với format (giữ line breaks, paragraphs)
                                                    // Tạo một DOM element tạm thời để extract text có format
                                                    const tempDiv = document.createElement('div');
                                                    tempDiv.style.position = 'absolute';
                                                    tempDiv.style.left = '-9999px';
                                                    tempDiv.style.whiteSpace = 'pre-wrap'; // ✅ Giữ line breaks
                                                    document.body.appendChild(tempDiv);
                                                    tempDiv.innerHTML = msg.message;

                                                    // ✅ Parse HTML để giữ format chính xác
                                                    // Thay thế các HTML tags bằng line breaks trước khi extract text
                                                    let htmlForParsing = msg.message;

                                                    // Xử lý các thẻ block-level trước
                                                    htmlForParsing = htmlForParsing
                                                        .replace(/<\/p>/gi, '\n\n') // Paragraphs -> double line break
                                                        .replace(/<p[^>]*>/gi, '') // Remove opening <p> tags
                                                        .replace(/<\/div>/gi, '\n') // </div> -> line break
                                                        .replace(/<div[^>]*>/gi, '') // Remove opening <div> tags
                                                        .replace(/<br\s*\/?>/gi, '\n') // <br> -> single line break
                                                        .replace(/<\/h[1-6]>/gi, '\n\n') // Headings -> double line break
                                                        .replace(/<h[1-6][^>]*>/gi, '') // Remove heading tags
                                                        .replace(/<\/li>/gi, '\n') // List items -> line break
                                                        .replace(/<li[^>]*>/gi, '• ') // List items -> bullet
                                                        .replace(/<\/ul>/gi, '\n') // </ul> -> line break
                                                        .replace(/<ul[^>]*>/gi, '') // Remove <ul> tags
                                                        .replace(/<\/ol>/gi, '\n') // </ol> -> line break
                                                        .replace(/<ol[^>]*>/gi, '') // Remove <ol> tags
                                                        .replace(/<\/strong>/gi, '') // Remove closing </strong>
                                                        .replace(/<strong[^>]*>/gi, '') // Remove opening <strong>
                                                        .replace(/<\/em>/gi, '') // Remove closing </em>
                                                        .replace(/<em[^>]*>/gi, '') // Remove opening <em>
                                                        .replace(/<\/code>/gi, '') // Remove closing </code>
                                                        .replace(/<code[^>]*>/gi, '') // Remove opening <code>
                                                        .replace(/<[^>]+>/g, '') // Remove all other HTML tags
                                                        .replace(/&nbsp;/g, ' ') // HTML entities
                                                        .replace(/&amp;/g, '&')
                                                        .replace(/&lt;/g, '<')
                                                        .replace(/&gt;/g, '>')
                                                        .replace(/&quot;/g, '"')
                                                        .replace(/&apos;/g, "'");

                                                    // Clean up line breaks
                                                    htmlForParsing = htmlForParsing
                                                        .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive line breaks
                                                        .replace(/[ \t]+/g, ' ') // Multiple spaces -> single space
                                                        .trim();

                                                    // ✅ Sử dụng innerText từ tempDiv đã được parse
                                                    tempDiv.innerHTML = htmlForParsing;
                                                    let textContent = tempDiv.innerText || tempDiv.textContent || htmlForParsing;

                                                    // ✅ Clean up
                                                    document.body.removeChild(tempDiv);

                                                    await navigator.clipboard.writeText(textContent);

                                                    // ✅ Hiển thị toast "Copied!" và đổi icon
                                                    setCopiedMessageIndex(idx);

                                                    // ✅ Tự động ẩn sau 2 giây và đổi lại icon
                                                    setTimeout(() => {
                                                        setCopiedMessageIndex(null);
                                                    }, 2000);
                                                } catch (error) {
                                                    console.error('Failed to copy:', error);
                                                }
                                            }}
                                            className={`p-1.5 hover:bg-gray-100 rounded-lg transition-colors relative ${copiedMessageIndex === idx
                                                ? 'text-green-600 hover:text-green-700'
                                                : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            title={copiedMessageIndex === idx ? "Copied!" : "Copy"}
                                        >
                                            {/* ✅ Đổi icon từ Copy sang Check khi đã copy */}
                                            {copiedMessageIndex === idx ? (
                                                <Check size={16} className="text-green-600" strokeWidth={3} />
                                            ) : (
                                                <Copy size={16} />
                                            )}

                                            {/* ✅ Toast "Copied!" */}
                                            {copiedMessageIndex === idx && (
                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                                                    {/* Speech bubble */}
                                                    <div className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap relative shadow-lg">
                                                        Copied!
                                                        {/* Tail của speech bubble */}
                                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                                            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                // ✅ Toggle like - nếu đã dislike thì bỏ dislike
                                                setChatHistory(prev => prev.map((m, i) =>
                                                    i === idx
                                                        ? { ...m, liked: !m.liked, disliked: m.liked ? false : m.disliked }
                                                        : m
                                                ));
                                            }}
                                            className={`p-1.5 hover:bg-gray-100 rounded-lg transition-colors ${msg.liked
                                                ? 'text-green-600 hover:text-green-700'
                                                : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            title="Thumbs Up"
                                        >
                                            <ThumbsUp size={16} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                // ✅ Toggle dislike - nếu đã like thì bỏ like
                                                setChatHistory(prev => prev.map((m, i) =>
                                                    i === idx
                                                        ? { ...m, disliked: !m.disliked, liked: m.disliked ? false : m.liked }
                                                        : m
                                                ));
                                            }}
                                            className={`p-1.5 hover:bg-gray-100 rounded-lg transition-colors ${msg.disliked
                                                ? 'text-red-600 hover:text-red-700'
                                                : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            title="Thumbs Down"
                                        >
                                            <ThumbsDown size={16} />
                                        </button>
                                        <button
                                            onClick={async () => {
                                                // ✅ Retry logic - tạo lại câu trả lời với cùng câu hỏi
                                                if (!msg.userQuestion) {
                                                    // Tìm câu hỏi user trước đó
                                                    let userQuestion = '';
                                                    for (let i = idx - 1; i >= 0; i--) {
                                                        if (chatHistory[i].type === 'user') {
                                                            userQuestion = chatHistory[i].message;
                                                            break;
                                                        }
                                                    }

                                                    if (!userQuestion) {
                                                        console.error('Cannot find user question for retry');
                                                        return;
                                                    }

                                                    // Update message với userQuestion
                                                    setChatHistory(prev => prev.map((m, i) =>
                                                        i === idx ? { ...m, userQuestion } : m
                                                    ));

                                                    // Retry với userQuestion
                                                    await retryAIMessage(idx, userQuestion);
                                                } else {
                                                    await retryAIMessage(idx, msg.userQuestion);
                                                }
                                            }}
                                            className={`p-1.5 hover:bg-gray-100 rounded-lg transition-colors ${retryingMessageIndex === idx
                                                ? 'text-blue-600 hover:text-blue-700 animate-spin'
                                                : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            title="Regenerate"
                                            disabled={retryingMessageIndex === idx}
                                        >
                                            <RefreshCw size={16} />
                                        </button>
                                        <button
                                            onClick={async () => {
                                                // ✅ Text-to-speech logic - đọc tin nhắn AI
                                                try {
                                                    // Unlock TTS nếu chưa
                                                    unlockTTS();

                                                    // Extract text từ HTML message (loại bỏ HTML tags)
                                                    const tempDiv = document.createElement('div');
                                                    tempDiv.innerHTML = msg.message;
                                                    const textToSpeak = tempDiv.innerText || tempDiv.textContent || msg.message.replace(/<[^>]*>/g, '').trim();

                                                    if (!textToSpeak || textToSpeak.trim() === '') {
                                                        console.warn('No text to speak');
                                                        return;
                                                    }

                                                    // ✅ Set speaking state
                                                    setSpeakingMessageIndex(idx);

                                                    // ✅ Đọc text (speakText không return audio, nó tự quản lý)
                                                    await speakText(textToSpeak, 'auto');

                                                    // ✅ Estimate duration và reset state sau khi đọc xong
                                                    // Trung bình đọc 150-200 từ/phút, ước tính thời gian
                                                    const wordCount = textToSpeak.split(/\s+/).length;
                                                    const estimatedDuration = Math.max(3000, (wordCount / 150) * 60 * 1000); // Tối thiểu 3 giây

                                                    setTimeout(() => {
                                                        setSpeakingMessageIndex(null);
                                                    }, estimatedDuration);
                                                } catch (error) {
                                                    console.error('Error reading message:', error);
                                                    setSpeakingMessageIndex(null);
                                                }
                                            }}
                                            className={`p-1.5 hover:bg-gray-100 rounded-lg transition-colors ${speakingMessageIndex === idx
                                                    ? 'text-blue-600 hover:text-blue-700'
                                                    : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            title="Read Aloud"
                                        >
                                            <Volume2 size={16} className={speakingMessageIndex === idx ? 'animate-pulse' : ''} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoadingChat && (
                            <div className="flex justify-start">
                                <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                                    <div className="flex space-x-1.5">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Input Area - Fixed at Bottom */}
            <div
                className="fixed bottom-0 bg-transparent flex-shrink-0 z-10 flex justify-center"
                style={{
                    left: isCollapsed ? '4rem' : '12rem',
                    right: '17px', // Leave space for scrollbar
                    width: isCollapsed ? 'calc(100% - 4rem - 17px)' : 'calc(100% - 12rem - 17px)',
                    padding: '16px'
                }}
            >
                {/* Input Container */}
                <div className="bg-white rounded-2xl border border-gray-300 shadow-sm max-w-3xl w-full">
                    {/* Input Field Row */}
                    <div className="flex items-center px-4 py-3 space-x-3">
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </button>
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Ask your AI tutor anything..."
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={isLoadingChat}
                                className="w-full px-0 py-0 bg-transparent border-none focus:outline-none focus:ring-0 disabled:bg-transparent text-sm text-gray-900 placeholder-gray-400"
                            />
                        </div>
                        <button
                            onClick={handleSendMessage}
                            disabled={isLoadingChat || !chatMessage.trim()}
                            className="w-9 h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                        </button>
                    </div>

                    {/* Chips Row */}
                    <div className="flex items-center justify-between px-4 pb-3 pt-1">
                        <div className="flex items-center space-x-2 flex-wrap">
                            <button
                                onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isWebSearchEnabled
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                    }`}
                            >
                                <Globe className="w-3.5 h-3.5" />
                                <span>Web Browsing</span>
                            </button>
                            <button
                                onClick={() => setIsAcademicSearchEnabled(!isAcademicSearchEnabled)}
                                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isAcademicSearchEnabled
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                    }`}
                            >
                                <GraduationCap className="w-3.5 h-3.5" />
                                <span>Search Academic Papers</span>
                            </button>
                            <button
                                onClick={() => setShowMaterialPicker(!showMaterialPicker)}
                                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-gray-50 transition-all border border-gray-200"
                            >
                                <ListChecks className="w-3.5 h-3.5 text-gray-600" />
                                <span className="text-orange-600">Using {selectedMaterials.length} material(s)</span>
                                <span className="text-blue-600 font-semibold">Select Materials</span>
                            </button>
                        </div>
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                            <Mic className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatView;