import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { FileSystemService } from './fileSystem';
import { TerminalService } from './terminal';
import { CognitiveService } from './cognitiveService';
import { db } from '../db';
import { 
  conversations, 
  memories, 
  knowledge, 
  type InsertConversation, 
  type InsertMemory, 
  type InsertKnowledge,
  type Conversation,
  type Memory,
  type Knowledge
} from '@shared/schema';
import { eq, desc, and, gte } from 'drizzle-orm';

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
  memoryInsights?: string[];
}

export interface MemoryContext {
  recentConversations: Conversation[];
  longTermMemories: Memory[];
  relevantKnowledge: Knowledge[];
}

export class AIService {
  private fileSystem: FileSystemService;
  private terminal: TerminalService;
  private cognitive: CognitiveService;
  private conversationHistory: Map<string, AIMessage[]> = new Map();

  constructor(sessionId: string) {
    this.fileSystem = new FileSystemService(sessionId);
    this.terminal = new TerminalService(sessionId);
    this.cognitive = new CognitiveService(sessionId);
  }

  // Memory Management Methods
  private async loadMemoryContext(userId: string, sessionId: string): Promise<MemoryContext> {
    const [recentConversations, longTermMemories, relevantKnowledge] = await Promise.all([
      // Load recent conversations (last 50)
      db.select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.createdAt))
        .limit(50),
      
      // Load important long-term memories
      db.select()
        .from(memories)
        .where(and(
          eq(memories.userId, userId),
          gte(memories.importance, 5) // Only high-importance memories
        ))
        .orderBy(desc(memories.lastAccessed))
        .limit(20),
      
      // Load relevant knowledge
      db.select()
        .from(knowledge)
        .where(eq(knowledge.userId, userId))
        .orderBy(desc(knowledge.updatedAt))
        .limit(15)
    ]);

    return {
      recentConversations,
      longTermMemories,
      relevantKnowledge
    };
  }

  private async saveConversation(sessionId: string, userId: string, role: string, content: string, mode: string): Promise<void> {
    const conversationData: InsertConversation = {
      sessionId,
      userId,
      role,
      content,
      mode
    };

    await db.insert(conversations).values(conversationData);
  }

  private async extractAndSaveMemories(userId: string, userMessage: string, assistantResponse: string): Promise<void> {
    // Use AI to extract important memories from conversation
    try {
      const memoryExtractionPrompt = `Analyze this conversation and extract any important information that should be remembered long-term:

User: ${userMessage}
Assistant: ${assistantResponse}

Extract memories in these categories:
1. User preferences (coding style, favorite tools, work patterns)
2. Important facts about the user (skills, background, projects)
3. Context for future conversations (ongoing work, goals)
4. Skills or knowledge shared

Return JSON array of memories with this format:
[{"category": "preference|fact|context|skill", "key": "brief_key", "value": "detailed_value", "importance": 1-10}]

Only include genuinely important information worth remembering. Return empty array [] if nothing significant.`;

      const response = await this.tryGemini([
        { role: 'system', content: 'You are a memory extraction expert. Extract only truly important information.' },
        { role: 'user', content: memoryExtractionPrompt }
      ]);

      if (response.success) {
        try {
          const extractedMemories = JSON.parse(response.content);
          
          for (const memory of extractedMemories) {
            if (memory.category && memory.key && memory.value && memory.importance) {
              const memoryData: InsertMemory = {
                userId,
                category: memory.category,
                key: memory.key,
                value: memory.value,
                importance: Math.min(10, Math.max(1, memory.importance))
              };

              await db.insert(memories).values(memoryData);
            }
          }
        } catch (parseError) {
          console.log('Memory extraction failed to parse:', parseError);
        }
      }
    } catch (error) {
      console.log('Memory extraction error:', error);
    }
  }

  private buildContextualPrompt(memoryContext: MemoryContext, mode: string): string {
    let contextPrompt = this.getSystemPrompt(mode);

    // Add memory context
    if (memoryContext.longTermMemories.length > 0) {
      contextPrompt += '\n\n## Long-term Memory Context:\n';
      memoryContext.longTermMemories.forEach(memory => {
        contextPrompt += `- ${memory.key}: ${memory.value}\n`;
      });
    }

    if (memoryContext.relevantKnowledge.length > 0) {
      contextPrompt += '\n\n## Relevant Knowledge:\n';
      memoryContext.relevantKnowledge.forEach(knowledge => {
        contextPrompt += `- ${knowledge.topic}: ${knowledge.content}\n`;
      });
    }

    if (memoryContext.recentConversations.length > 0) {
      contextPrompt += '\n\n## Recent Conversation Context:\n';
      const recentSummary = memoryContext.recentConversations
        .slice(0, 5)
        .map(conv => `${conv.role}: ${conv.content.substring(0, 100)}...`)
        .join('\n');
      contextPrompt += recentSummary;
    }

    contextPrompt += '\n\nUse this context to provide personalized, continuity-aware responses while maintaining your Filipino AI agent personality.';

    return contextPrompt;
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

  async processMessage(sessionId: string, message: string, mode: string = 'default', userId: string = 'default_user'): Promise<AIResponse> {
    try {
      // Load persistent memory context
      const memoryContext = await this.loadMemoryContext(userId, sessionId);
      
      // Save user message to database
      await this.saveConversation(sessionId, userId, 'user', message, mode);

      // Check if this requires autonomous problem-solving
      let requiresAutonomousReasoning = await this.shouldUseAutonomousReasoning(message, mode);
      
      let assistantResponse = '';
      let modelUsed = '';
      let usedFallback = false;
      let autonomousResults = null;

      if (requiresAutonomousReasoning) {
        console.log('🧠 Activating autonomous reasoning for complex problem...');
        
        try {
          // Use cognitive service for autonomous problem-solving
          autonomousResults = await this.cognitive.autonomousReasoningProcess(userId, sessionId, message);
          
          assistantResponse = `🧠 **Autonomous Problem-Solving Activated**

**Problem Analysis Complete:**
${autonomousResults.solution}

**Cognitive Process:**
• Generated ${autonomousResults.reasoning.thoughtProcess ? Object.keys(autonomousResults.reasoning.thoughtProcess).length : 0} reasoning steps
• Used ${autonomousResults.reasoning.toolsSelected.length} tools: ${autonomousResults.reasoning.toolsSelected.join(', ')}
• Created ${autonomousResults.newToolsCreated.length} new tools

**New Capabilities Gained:**
${autonomousResults.newToolsCreated.map(tool => `• ${tool.name}: ${tool.description}`).join('\n')}

**Experience Learned:**
${autonomousResults.experienceGained ? autonomousResults.experienceGained.learningInsights : 'Continuing to learn from this interaction'}

This autonomous reasoning session has enhanced my capabilities and problem-solving abilities!`;

          modelUsed = 'cognitive-agent-zero';
          usedFallback = false;
        } catch (cognitiveError) {
          console.error('Cognitive reasoning failed, falling back to standard AI:', cognitiveError);
          requiresAutonomousReasoning = false; // Fall back to standard processing
        }
      }

      if (!requiresAutonomousReasoning || !assistantResponse) {
        // Standard AI processing with memory context
        const contextualSystemPrompt = this.buildContextualPrompt(memoryContext, mode);
        
        // Prepare conversation history with memory context
        const history: AIMessage[] = [
          {
            role: 'system',
            content: contextualSystemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ];

        // Try Gemini 2.5 Pro first
        const geminiResponse = await this.tryGemini(history);
        if (geminiResponse.success) {
          assistantResponse = geminiResponse.content;
          modelUsed = 'gemini-2.5-pro';
          usedFallback = false;
        } else {
          console.log('Gemini failed, falling back to OpenAI...');
          
          // Fallback to OpenAI
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: history,
            temperature: 0.7,
            max_tokens: 2000
          });

          assistantResponse = completion.choices[0].message.content || '';
          modelUsed = 'gpt-4o';
          usedFallback = true;
        }
      }

      // Save assistant response to database
      await this.saveConversation(sessionId, userId, 'assistant', assistantResponse, mode);

      // Extract and save memories for future reference (async, don't block response)
      this.extractAndSaveMemories(userId, message, assistantResponse).catch(err => 
        console.log('Background memory extraction failed:', err)
      );

      // Generate memory insights
      const memoryInsights: string[] = [];
      if (memoryContext.longTermMemories.length > 0) {
        memoryInsights.push(`Remembered ${memoryContext.longTermMemories.length} important details about you`);
      }
      if (memoryContext.recentConversations.length > 0) {
        memoryInsights.push(`Considering context from ${memoryContext.recentConversations.length} recent conversations`);
      }
      if (autonomousResults && autonomousResults.newToolsCreated && autonomousResults.newToolsCreated.length > 0) {
        memoryInsights.push(`Created ${autonomousResults.newToolsCreated.length} new tools for enhanced capabilities`);
      }

      return {
        content: assistantResponse,
        model: modelUsed,
        fallback: usedFallback,
        memoryInsights: memoryInsights.length > 0 ? memoryInsights : undefined
      };

    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error('Failed to process AI request');
    }
  }

  private async shouldUseAutonomousReasoning(message: string, mode: string): Promise<boolean> {
    const complexityIndicators = [
      'analyze', 'solve', 'create', 'build', 'develop', 'research', 'investigate',
      'optimize', 'automate', 'algorithm', 'system', 'architecture', 'design',
      'complex', 'advanced', 'sophisticated', 'comprehensive', 'detailed'
    ];

    const hackingIndicators = [
      'security', 'vulnerability', 'penetration', 'scan', 'exploit', 'hack',
      'audit', 'assessment', 'reconnaissance', 'footprint'
    ];

    const messageWords = message.toLowerCase().split(' ');
    const hasComplexityIndicators = complexityIndicators.some(indicator => 
      messageWords.some(word => word.includes(indicator))
    );
    
    const hasHackingIndicators = hackingIndicators.some(indicator => 
      messageWords.some(word => word.includes(indicator))
    );

    // Use autonomous reasoning for:
    // 1. Complex problems (multiple indicators)
    // 2. Hacker mode with security-related tasks
    // 3. Developer mode with system/architecture requests
    // 4. Research mode with analysis requests
    
    return (
      (hasComplexityIndicators && messageWords.length > 10) ||
      (mode === 'hacker' && hasHackingIndicators) ||
      (mode === 'developer' && messageWords.some(word => ['system', 'architecture', 'build'].includes(word))) ||
      (mode === 'researcher' && messageWords.some(word => ['analyze', 'research', 'investigate'].includes(word)))
    );
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