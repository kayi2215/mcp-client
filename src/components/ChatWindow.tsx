import React, { useState, useEffect, useRef } from 'react';
import { Message, MCPTool } from '../types/mcp.types';
import './ChatWindow.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_URL = 'ws://localhost:8000';
const RECONNECT_DELAY = 3000;

export const ChatWindow: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [availableTools, setAvailableTools] = useState<MCPTool[]>([]);
    const [isConnecting, setIsConnecting] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const hasInitialized = useRef(false);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 3;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const initializeMCP = async () => {
        if (isConnecting) return;
        
        setIsConnecting(true);
        try {
            const clientId = 'client-' + Math.random().toString(36).substr(2, 9);
            console.log('Attempting to connect WebSocket...');
            
            const ws = new WebSocket(`${API_URL}/ws/${clientId}`);
            
            ws.onopen = () => {
                console.log('WebSocket connected successfully');
                reconnectAttempts.current = 0;
                setIsConnecting(false);
                
                // Liste des serveurs à connecter
                const servers = ['github', 'mcp-server-git', 'brave-search', 'puppeteer'];
                
                // Se connecter à chaque serveur
                servers.forEach(server => {
                    console.log(`Connecting to server: ${server}`);
                    ws.send(JSON.stringify({
                        type: 'connect',
                        server: server
                    }));
                });
            };

            ws.onmessage = (event: MessageEvent) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Received message:', data);
                    
                    if (data.type === 'connection_established') {
                        console.log('Connection established:', data);
                    } else if (data.type === 'tools' && Array.isArray(data.tools)) {
                        // Vérifier et convertir les outils en MCPTool
                        const tools = data.tools.filter((tool: any): tool is MCPTool => {
                            return (
                                typeof tool === 'object' &&
                                tool !== null &&
                                typeof tool.name === 'string' &&
                                typeof tool.description === 'string' &&
                                typeof tool.serverName === 'string'
                            );
                        });

                        // Dédupliquer les outils par nom
                        const uniqueTools = Array.from(
                            new Map(tools.map((tool: MCPTool) => [tool.name, tool])).values()
                        ) as MCPTool[];
                        
                        setAvailableTools(uniqueTools);
                        
                        // Grouper les outils par catégorie
                        const toolsByCategory: { [key: string]: MCPTool[] } = {};
                        uniqueTools.forEach((tool: MCPTool) => {
                            const category = tool.name.split('.')[0] || 'Other';
                            if (!toolsByCategory[category]) {
                                toolsByCategory[category] = [];
                            }
                            toolsByCategory[category].push(tool);
                        });
                        
                        toast.info(
                            <div>
                                <h4>Available Tools:</h4>
                                {Object.entries(toolsByCategory).map(([category, categoryTools]) => (
                                    <div key={category}>
                                        <h5>{category}</h5>
                                        <ul>
                                            {categoryTools.map((tool) => (
                                                <li key={`${category}-${tool.name}`}>{tool.name}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>,
                            {
                                position: "top-right",
                                autoClose: 10000,
                                hideProgressBar: false,
                                closeOnClick: true,
                                pauseOnHover: true,
                                draggable: true,
                            }
                        );
                    } else if (data.type === 'response') {
                        // Ajouter le message de l'assistant
                        const assistantMessage: Message = {
                            id: Date.now().toString(),
                            role: 'assistant',
                            content: data.content,
                            timestamp: new Date()
                        };
                        setMessages(prev => [...prev, assistantMessage]);
                    } else if (data.type === 'error') {
                        console.error('Server error:', data.message);
                        toast.error(data.message, {
                            position: "top-right",
                            autoClose: 5000,
                        });
                    }
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            };

            ws.onerror = (error: Event) => {
                console.error('WebSocket error:', error);
                setIsConnecting(false);
            };

            ws.onclose = (event: CloseEvent) => {
                console.log('WebSocket closed:', event);
                setIsConnecting(false);
                wsRef.current = null;

                // Attempt to reconnect if not closed cleanly
                if (!event.wasClean && reconnectAttempts.current < maxReconnectAttempts) {
                    console.log(`Attempting to reconnect (${reconnectAttempts.current + 1}/${maxReconnectAttempts})...`);
                    reconnectAttempts.current++;
                    setTimeout(initializeMCP, RECONNECT_DELAY);
                } else if (reconnectAttempts.current >= maxReconnectAttempts) {
                    toast.error('Failed to connect to server after multiple attempts. Please try again later.', {
                        position: "top-right",
                        autoClose: 5000,
                    });
                }
            };

            wsRef.current = ws;
        } catch (error) {
            console.error('Failed to initialize MCP:', error);
            setIsConnecting(false);
            wsRef.current = null;
        }
    };

    useEffect(() => {
        if (!hasInitialized.current) {
            hasInitialized.current = true;
            initializeMCP();
        }
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !wsRef.current) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputMessage,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');

        try {
            // Envoyer le message à l'agent
            wsRef.current.send(JSON.stringify({
                type: 'agent_message',
                content: inputMessage,
                tools: availableTools
            }));

            // Ajouter un message de "thinking" temporaire
            const thinkingMessage: Message = {
                id: 'thinking',
                role: 'assistant',
                content: '...',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, thinkingMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Sorry, there was an error sending your message.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    return (
        <div className="chat-window">
            <ToastContainer />
            <div className="messages">
                {messages.map((message) => (
                    <div key={message.id} className={`message ${message.role}`}>
                        <div className="content">{message.content}</div>
                        <div className="timestamp">
                            {message.timestamp.toLocaleTimeString()}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="input-form">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isConnecting || !wsRef.current}
                />
                <button type="submit" disabled={isConnecting || !wsRef.current || !inputMessage.trim()}>
                    Send
                </button>
            </form>
        </div>
    );
};
