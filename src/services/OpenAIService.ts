import OpenAI from 'openai';
import { Message } from '../types/mcp.types';

class OpenAIService {
    private openai: OpenAI;
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
        this.openai = new OpenAI({
            apiKey: this.apiKey,
            dangerouslyAllowBrowser: true // Note: In production, calls should go through a backend
        });
    }

    async generateResponse(messages: Message[]): Promise<string> {
        try {
            const formattedMessages = messages.map(msg => ({
                role: msg.role as 'user' | 'assistant' | 'system',
                content: msg.content
            }));

            const completion = await this.openai.chat.completions.create({
                messages: formattedMessages,
                model: "gpt-3.5-turbo",
            });

            return completion.choices[0]?.message?.content || 'No response generated';
        } catch (error) {
            console.error('Error generating response:', error);
            throw error;
        }
    }

    getAvailableModels(): string[] {
        return [
            'gpt-4',
            'gpt-4-32k',
            'gpt-3.5-turbo',
            'gpt-3.5-turbo-16k'
        ];
    }
}

export const openAIService = new OpenAIService();
