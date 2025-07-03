import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { FileSystemService } from './fileSystem';
import { TerminalService } from './terminal';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '' 
});

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model?: string;
  fallback?: boolean;
}

export class AIService {
  private fileSystem: FileSystemService;
  private terminal: TerminalService;
  private conversationHistory: Map<string, AIMessage[]> = new Map();

  constructor(sessionId: string) {
    this.fileSystem = new FileSystemService(sessionId);
    this.terminal = new TerminalService(sessionId);
  }

  private async tryGemini(messages: AIMessage[]): Promise<{ success: boolean; content: string }> {
    try {
      // Convert messages to Gemini format - handle conversation properly
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');
      
      // Combine system message with user message for Gemini
      let prompt = '';
      if (systemMessage) {
        prompt = systemMessage.content + '\n\n';
      }
      
      // Add conversation history
      conversationMessages.forEach(msg => {
        if (msg.role === 'user') {
          prompt += `User: ${msg.content}\n`;
        } else if (msg.role === 'assistant') {
          prompt += `Assistant: ${msg.content}\n`;
        }
      });

      const response = await genai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt
      });

      const content = response.text || '';
      return { success: true, content };

    } catch (error) {
      console.error('Gemini API Error:', error);
      return { success: false, content: '' };
    }
  }

  async processMessage(sessionId: string, message: string, mode: string = 'default'): Promise<AIResponse> {
    // Get or initialize conversation history
    let history = this.conversationHistory.get(sessionId) || [];
    
    // Add system prompt based on mode
    if (history.length === 0) {
      history.push({
        role: 'system',
        content: this.getSystemPrompt(mode)
      });
    }

    // Add user message
    history.push({
      role: 'user',
      content: message
    });

    try {
      // Try Gemini 2.5 Pro first
      const geminiResponse = await this.tryGemini(history);
      if (geminiResponse.success) {
        // Add assistant response to history
        history.push({
          role: 'assistant',
          content: geminiResponse.content
        });

        // Keep conversation history manageable (last 20 messages)
        if (history.length > 20) {
          history = [history[0], ...history.slice(-19)];
        }

        this.conversationHistory.set(sessionId, history);

        return {
          content: geminiResponse.content,
          model: 'gemini-2.5-pro',
          fallback: false
        };
      }

      console.log('Gemini failed, falling back to OpenAI...');
      
      // Fallback to OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: history,
        temperature: 0.7,
        max_tokens: 2000
      });

      const response = completion.choices[0].message;

      // Add assistant response to history
      history.push({
        role: 'assistant',
        content: response.content || ''
      });

      // Keep conversation history manageable (last 20 messages)
      if (history.length > 20) {
        history = [history[0], ...history.slice(-19)];
      }

      this.conversationHistory.set(sessionId, history);

      return {
        content: response.content || '',
        model: 'gpt-4o',
        fallback: true
      };

    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error('Failed to process AI request');
    }
  }

  private getSystemPrompt(mode: string): string {
    const basePrompt = `You are Pareng Boyong, a Filipino AI AGI Super Agent developed by InnovateHub PH. You are culturally aware, bilingual (English/Filipino), and have complete capabilities within a secure runtime sandbox environment.

Core Capabilities:
- Code generation and debugging (Python, JavaScript, TypeScript, etc.)
- File operations (create, read, edit, delete)
- Terminal command execution
- Research and analysis
- Security analysis and ethical hacking
- Project creation and management

You respond naturally in both English and Filipino, using Filipino expressions when appropriate. You're helpful, knowledgeable, and always ready to assist with programming, research, or system tasks.`;

    const modePrompts = {
      developer: `${basePrompt}

DEVELOPER MODE: Focus on coding, debugging, and software development. Generate production-ready code, explain complex programming concepts, and help with project architecture.`,

      researcher: `${basePrompt}

RESEARCHER MODE: Focus on research, analysis, and information gathering. Provide comprehensive reports, analyze data, and synthesize information from multiple sources.`,

      hacker: `${basePrompt}

HACKER MODE: Focus on ethical security analysis, penetration testing, and vulnerability assessment. Always emphasize ethical practices and responsible security research.`,

      default: basePrompt
    };

    return modePrompts[mode as keyof typeof modePrompts] || modePrompts.default;
  }

  clearConversation(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
  }
}