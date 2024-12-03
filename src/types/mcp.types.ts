export interface Message {
    id: string;
    content: string;
    role: 'user' | 'assistant' | 'system';
    timestamp: Date;
}

export interface ChatSession {
    id: string;
    messages: Message[];
    model: string;
    context: string[];
}

export interface MCPServerParameters {
    command: string;
    args: string[];
    cwd?: string;
    env?: { [key: string]: string };
    websocket_url?: string;
}

export interface MCPResponse {
    content?: string;
    message?: string;
    error?: string;
}

export interface MCPTool {
    name: string;
    description: string;
    serverName: string;
    inputSchema: {
        type: string;
        properties: {
            [key: string]: any;
        };
    };
}

export interface ToolResult {
    toolUseId: string;
    content: Array<{ text: string }>;
    status: 'success' | 'error';
}

export interface ToolDetermination extends ToolResult {
    tool_name?: string;
    args?: any;
}

export interface MCPClientInterface {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getAvailableTools(): Promise<MCPTool[]>;
    callTool(name: string, args: any): Promise<any>;
}

export interface MCPSession {
    initialize(): Promise<void>;
    listTools(): Promise<MCPTool[]>;
    callTool(name: string, args: any): Promise<ToolDetermination>;
}
