import React, { useState, useEffect } from 'react';
import { X, Search, MessageCircle, Edit2, Trash2, Plus } from 'lucide-react';

interface ChatSession {
    id: number;
    title: string;
    created_at: string;
    updated_at: string;
    message_count: number;
}

interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

interface ChatHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    studySetId: string;
    onLoadSession: (sessionId: number, messages: ChatMessage[]) => void;
    refreshTrigger?: number;
}

const ChatHistoryModal: React.FC<ChatHistoryModalProps> = ({
    isOpen,
    onClose,
    studySetId,
    onLoadSession,
    refreshTrigger
}) => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [editingSession, setEditingSession] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState('');

    // Fetch chat sessions
    const fetchSessions = async () => {
        if (!studySetId) return;

        setLoading(true);
        try {
            const response = await fetch(`http://localhost:3001/api/chat-history/sessions/${studySetId}`);
            if (response.ok) {
                const data = await response.json();
                setSessions(data);
            }
        } catch (error) {
            console.error('Error fetching chat sessions:', error);
        } finally {
            setLoading(false);
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
                }),
            });

            if (response.ok) {
                const newSession = await response.json();
                setSessions(prev => [newSession, ...prev]);
            }
        } catch (error) {
            console.error('Error creating new session:', error);
        }
    };

    // Load chat session
    const loadSession = async (sessionId: number) => {
        try {
            const response = await fetch(`http://localhost:3001/api/chat-history/messages/${sessionId}`);
            if (response.ok) {
                const messages = await response.json();
                onLoadSession(sessionId, messages);
                onClose();
            }
        } catch (error) {
            console.error('Error loading session:', error);
        }
    };

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
                setSessions(prev =>
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
                setSessions(prev => prev.filter(session => session.id !== sessionId));
            }
        } catch (error) {
            console.error('Error deleting session:', error);
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

    // Filter sessions based on search term
    const filteredSessions = sessions.filter(session =>
        session.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        if (isOpen && studySetId) {
            fetchSessions();
        }
    }, [isOpen, studySetId]);

    // Refresh sessions when refreshTrigger changes
    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            fetchSessions();
        }
    }, [refreshTrigger]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-96 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-800">Chat History</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search Chat Sessions"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Sessions List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="text-center text-gray-500 py-8">Loading...</div>
                    ) : filteredSessions.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            {searchTerm ? 'No sessions found' : 'No chat sessions yet'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredSessions.map((session) => (
                                <div
                                    key={session.id}
                                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                                >
                                    {/* Chat Icon */}
                                    <MessageCircle className="text-gray-400 mr-3 flex-shrink-0" size={16} />

                                    {/* Session Info */}
                                    <div className="flex-1 min-w-0">
                                        {editingSession === session.id ? (
                                            <input
                                                type="text"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onBlur={() => updateSessionTitle(session.id, editTitle)}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        updateSessionTitle(session.id, editTitle);
                                                    }
                                                }}
                                                className="w-full text-sm font-medium text-gray-800 bg-transparent border-none outline-none"
                                                autoFocus
                                            />
                                        ) : (
                                            <div
                                                className="text-sm font-medium text-gray-800 cursor-pointer truncate"
                                                onClick={() => loadSession(session.id)}
                                            >
                                                {session.title}
                                            </div>
                                        )}
                                        <div className="text-xs text-gray-500">
                                            {formatDate(session.updated_at)}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => {
                                                setEditingSession(session.id);
                                                setEditTitle(session.title);
                                            }}
                                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => deleteSession(session.id)}
                                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
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
                        onClick={createNewSession}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                    >
                        <Plus size={16} />
                        <span>Create New Chat</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatHistoryModal;
