/**
 * ChatBot.tsx - Component Chatbot nổi góc dưới-phải.
 * Hướng dẫn người dùng sử dụng ứng dụng Quiz IOE.
 */

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Trash2, Loader2, Bot, User } from 'lucide-react';
import { useChatStore } from '../../stores/useChatStore';
import { motion, AnimatePresence } from 'framer-motion';

const ChatBot: React.FC = () => {
    const {
        isOpen,
        messages,
        isLoading,
        toggleChat,
        sendMessage,
        clearHistory,
    } = useChatStore();

    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        setInput('');
        await sendMessage(trimmed);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleChat}
                        className="chatbot-fab"
                        aria-label="Mở trợ lý AI"
                    >
                        <MessageCircle size={28} />
                        <span className="chatbot-fab-badge">?</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="chatbot-window"
                    >
                        {/* Header */}
                        <div className="chatbot-header">
                            <div className="chatbot-header-info">
                                <Bot size={24} className="chatbot-header-icon" />
                                <div>
                                    <h3 className="chatbot-header-title">Trợ Lý AI</h3>
                                    <span className="chatbot-header-subtitle">Hướng dẫn sử dụng</span>
                                </div>
                            </div>
                            <div className="chatbot-header-actions">
                                <button
                                    onClick={clearHistory}
                                    className="chatbot-action-btn"
                                    title="Xóa lịch sử"
                                    disabled={messages.length === 0}
                                >
                                    <Trash2 size={18} />
                                </button>
                                <button
                                    onClick={toggleChat}
                                    className="chatbot-action-btn chatbot-close-btn"
                                    title="Đóng"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="chatbot-messages">
                            {messages.length === 0 && (
                                <div className="chatbot-welcome">
                                    <Bot size={48} className="chatbot-welcome-icon" />
                                    <h4>Xin chào! 👋</h4>
                                    <p>Tôi là trợ lý AI, sẵn sàng giúp bạn sử dụng ứng dụng Quiz IOE.</p>
                                    <div className="chatbot-suggestions">
                                        <span className="chatbot-suggestion-label">Gợi ý:</span>
                                        {[
                                            'Cách tạo đề IOE?',
                                            'Hướng dẫn làm bài quiz',
                                            'Giáo viên Dashboard',
                                        ].map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                onClick={() => sendMessage(suggestion)}
                                                className="chatbot-suggestion-btn"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`chatbot-message ${msg.role === 'user' ? 'user' : 'assistant'}`}
                                >
                                    <div className="chatbot-message-avatar">
                                        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                    </div>
                                    <div className="chatbot-message-content">
                                        {msg.content}
                                    </div>
                                </motion.div>
                            ))}

                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="chatbot-message assistant"
                                >
                                    <div className="chatbot-message-avatar">
                                        <Bot size={16} />
                                    </div>
                                    <div className="chatbot-message-content chatbot-typing">
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Đang suy nghĩ...</span>
                                    </div>
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSubmit} className="chatbot-input-form">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Nhập câu hỏi của bạn..."
                                className="chatbot-input"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                className="chatbot-send-btn"
                                disabled={!input.trim() || isLoading}
                            >
                                <Send size={20} />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ChatBot;
