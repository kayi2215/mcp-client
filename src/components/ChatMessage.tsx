import React from 'react';
import { Message } from '../types/mcp.types';

interface ChatMessageProps {
    message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    const messageClass = message.role === 'user' ? 'user-message' : 'assistant-message';

    return (
        <div className={`message ${messageClass}`}>
            <div className="message-content">
                {message.content}
            </div>
            <div className="message-timestamp">
                {message.timestamp.toLocaleTimeString()}
            </div>
        </div>
    );
};

export default ChatMessage;
