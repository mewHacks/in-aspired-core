import React, { createContext, useContext, useState, ReactNode } from 'react';
import { httpClient } from '@/services/httpClient';
import { useTranslation } from 'react-i18next';

// Interface for a single message in the conversation
export interface ChatMessage {
    id: string; // Unique identifier (timestamp-based)
    text: string; // Message content
    sender: 'user' | 'bot'; // Who sent the message
    timestamp: Date; // Timestamp of when the message was created
}

// Interface for the Chatbot context value
interface ChatbotContextType {
    isOpen: boolean; // Is the chat window open/visible?
    setIsOpen: (isOpen: boolean) => void; // Toggle visibility
    messages: ChatMessage[]; // Full conversation history
    isLoading: boolean; // Is the bot currently "thinking" (awaiting response)?
    sendMessage: (text: string) => Promise<void>; // Function to send a message to the AI
    clearConversation: () => void; // Reset the conversation history
}

// Create the context with undefined default value
const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

// ChatbotProvider Component to ensure state persistence across route changes
export const ChatbotProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { t } = useTranslation();

    // Controls visibility of the chat widget
    const [isOpen, setIsOpen] = useState(false);

    // Stores conversation history
    const [messages, setMessages] = useState<ChatMessage[]>(() => [
        {
            id: 'welcome',
            text: t('chatbot.welcome'),
            sender: 'bot',
            timestamp: new Date()
        }
    ]);

    // Loading state
    const [isLoading, setIsLoading] = useState(false);

    // Tracks backend conversation ID for thread continuity
    const [conversationId, setConversationId] = useState<string | null>(null);

    // Sends message to AI backend and updates conversation state
    const sendMessage = async (text: string) => {

        // Don't send empty messages or if already loading
        if (!text.trim() || isLoading) return;

        // Add User Message (Optimistic UI update)
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            text,
            sender: 'user',
            timestamp: new Date()
        };

        // Update messages state and start loading state
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            // Send request to backend API
            const response = await httpClient('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    conversationId // Pass existing conversation ID to maintain context
                })
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();

            // Update Conversation ID if backend returns one (for new threads)
            if (data.conversationId) {
                setConversationId(data.conversationId);
            }

            // Add bot response
            const botMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                text: data.response || "I'm not sure how to answer that.",
                sender: 'bot',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);

        } catch (error) { // Error handling
            console.error('Chatbot Error:', error);

            // Build error message for user UI
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                text: "I'm having trouble connecting right now. Please try again later.",
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally { // Stop loading state regardless of outcome
            setIsLoading(false);
        }
    };

    // Clear conversation history and reset to welcome message
    const clearConversation = () => {
        setConversationId(null);
        setMessages([{
            id: 'welcome',
            text: t('chatbot.welcome'),
            sender: 'bot',
            timestamp: new Date()
        }]);
    };

    return (
        <ChatbotContext.Provider value={{ isOpen, setIsOpen, messages, isLoading, sendMessage, clearConversation }}>
            {children}
        </ChatbotContext.Provider>
    );
};

// Custom hook for easy access to the ChatbotContext values
export const useChatbot = () => {
    const context = useContext(ChatbotContext);

    // Throws an error if used outside of <ChatbotProvider>
    if (!context) {
        throw new Error('useChatbot must be used within a ChatbotProvider');
    }
    return context;
};
