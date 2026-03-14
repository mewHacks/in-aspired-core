import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useChatbot } from '../../contexts/ChatbotContext';

// Main chatbot widget component
const ChatbotWidget: React.FC = () => {

    // Consume global chatbot context
    const { isOpen, setIsOpen, messages, isLoading, sendMessage } = useChatbot();

    // Local UI state for input field only
    const [inputText, setInputText] = useState('');

    // Ref to the invisible div at bottom of messages (used for auto-scroll)
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat window for user to see latest messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Auto-scroll whenever messages change (user asks/bot replies) or likely loading state change
    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, isOpen]); // Also scroll when opened

    // Handle sending a message via context
    const handleSendMessage = async () => {
        if (!inputText.trim() || isLoading) return;

        const textToSend = inputText;
        setInputText(''); // Clear input immediately

        await sendMessage(textToSend);
    };

    // Handles keyboard events for input field
    // Enter sends one line message, Shift+Enter sends multi-line message
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();  // Prevent default newline insertion
            handleSendMessage();
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-[500px]"
                    >
                        {/* Header Section */}
                        <div className="bg-primary-600 p-4 flex justify-between items-center text-white shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="font-medium">AI Assistant</span>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="hover:bg-primary-700 p-1 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Chat Messages Area */}
                        <div className="flex-1 bg-gray-50 p-4 overflow-y-auto">
                            <div className="flex flex-col gap-4">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-primary-100 text-primary-600' : 'bg-white border border-gray-200 text-gray-600'}`}>
                                            {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                        </div>
                                        <div
                                            className={`p-3 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-sm ${msg.sender === 'user'
                                                ? 'bg-primary-600 text-white rounded-tr-none'
                                                : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                                                }`}
                                        >
                                            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                                        </div>
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className="flex gap-2">
                                        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                                            <Bot className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-1">
                                            <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                            <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                            <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                            <div className="flex gap-2 items-end">

                                {/* Input Field */}
                                <textarea
                                    placeholder={isLoading ? "Thinking..." : "Type a message..."}
                                    className="flex-1 px-4 py-2 bg-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50 resize-none max-h-32 min-h-[40px]"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    disabled={isLoading}
                                    rows={1}
                                    autoFocus
                                />

                                {/* Send Button */}
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isLoading || !inputText.trim()}
                                    className="w-9 h-9 flex items-center justify-center bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-full transition-colors shadow-md"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chatbot Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    // Just toggle open/close
                    setIsOpen(!isOpen);
                }}
                className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors duration-300 ${isOpen ? 'bg-gray-800 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
            >
                {/* Chatbot Button Icon (X for close, Bot for open) */}
                {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-7 h-7" />}
            </motion.button>
        </div>
    );
};

export default ChatbotWidget;
