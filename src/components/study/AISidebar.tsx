import React from 'react';
import { Lightbulb, Brain, Book, X } from 'lucide-react';
import { isFillBlankCard, isMultipleChoiceCard } from '../../utils/flashcardStudyHelpers';
import { renderMessage } from '../../utils/messageRenderer';

interface AISidebarProps {
    showAiSidebar: boolean;
    sidebarWidth: number;
    currentCard: any;
    chatHistory: Array<{ type: 'user' | 'ai', message: string }>;
    isLoadingChat: boolean;
    chatMessage: string;
    onClose: () => void;
    onSetSidebarWidth: (width: number) => void;
    onSetChatMessage: (message: string) => void;
    onSendChatMessage: () => void;
    onHandleAISubmit: (prompt: string) => void;
    onKeyPress: (e: React.KeyboardEvent) => void;
}

export const AISidebar: React.FC<AISidebarProps> = ({
    showAiSidebar,
    sidebarWidth,
    currentCard,
    chatHistory,
    isLoadingChat,
    chatMessage,
    onClose,
    onSetSidebarWidth,
    onSetChatMessage,
    onSendChatMessage,
    onHandleAISubmit,
    onKeyPress
}) => {
    if (!showAiSidebar) return null;

    return (
        <div className="flex flex-col min-w-0 overflow-hidden h-[calc(100vh-64px)] rounded-l-xl shadow-xl bg-white/80 backdrop-blur"
            style={{ width: `${sidebarWidth}px`, minWidth: 350 }}>
            <div className="bg-white/70 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 font-medium">AI Tutor</span>
                </div>
                <button
                    onClick={onClose}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
                    title="Đóng cửa sổ"
                >
                    <X className="w-4 h-4 text-gray-600" />
                </button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col overflow-y-auto bg-white/50">
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

                        {currentCard && (
                            <div className="w-full max-w-md mb-5 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <h3 className="text-sm font-semibold text-blue-800 mb-2">📚 Flashcard hiện tại:</h3>
                                <div className="text-sm text-blue-700">
                                    <p><strong>Term:</strong> {
                                        isFillBlankCard(currentCard)
                                            ? (currentCard.term || '').replace(/\{\{[^}]+\}\}/g, '____')
                                            : currentCard.term
                                    }</p>
                                    {!isMultipleChoiceCard(currentCard) && !isFillBlankCard(currentCard) && (
                                        <p><strong>Definition:</strong> {currentCard.definition}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="w-full max-w-md space-y-3">
                            <button
                                onClick={() => onHandleAISubmit('Giải thích chi tiết hơn về từ này')}
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
                                onClick={() => onHandleAISubmit('Từ này liên quan đến chủ đề gì khác?')}
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
                                onClick={() => onHandleAISubmit('Cho tôi ví dụ thực tế về từ này')}
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

            <div className="p-3 md:p-4 bg-white/80 backdrop-blur w-full overflow-hidden sticky bottom-0">
                <div className="flex items-center w-full">
                    <div className="flex items-center w-full bg-white rounded-full px-4 py-3 shadow">
                        <button className="w-8 h-8 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                            <span className="text-gray-600 text-sm">🖼️</span>
                        </button>
                        <input
                            type="text"
                            placeholder="Ask your AI tutor anything..."
                            className="flex-1 min-w-0 bg-transparent outline-none text-sm md:text-base placeholder-gray-400"
                            value={chatMessage}
                            onChange={(e) => onSetChatMessage(e.target.value)}
                            onKeyPress={onKeyPress}
                            disabled={isLoadingChat}
                        />
                    </div>
                    <button
                        className="ml-2 w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors flex-shrink-0 shadow disabled:opacity-50"
                        onClick={onSendChatMessage}
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
    );
};

