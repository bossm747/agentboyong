import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { FileSystemService } from './fileSystem';
import { TerminalService } from './terminal';
import { CognitiveService } from './cognitiveService';
import { context7Service } from './context7Service';
import { intentDetectionService } from './intentDetectionService';
import { toolDetectionService } from './toolDetectionService';
import { securityKnowledgeBase } from './securityKnowledgeBase';
import { db } from '../db';
import { storage } from '../storage';
import { 
  conversations, 
  memories, 
  knowledge,
  sessions,
  users,
  type InsertConversation, 
  type InsertMemory, 
  type InsertKnowledge,
  type Conversation,
  type Memory,
  type Knowledge
} from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';

// Initialize OpenAI with proper error handling
let openai: OpenAI | null = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (error) {
  console.warn('OpenAI initialization failed:', error);
}

// Initialize Google Gemini with proper error handling
let genai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    genai = new GoogleGenAI(process.env.GEMINI_API_KEY);
  }
} catch (error) {
  console.warn('Gemini initialization failed:', error);
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model?: string;
  fallback?: boolean;
  memoryInsights?: string[];
  intent_detected?: string;
  confidence?: number;
  tools_used?: string[];
  execution_time?: number;
  mode?: string;
}

export interface MemoryContext {
  recentConversations: Conversation[];
  longTermMemories: Memory[];
  relevantKnowledge: Knowledge[];
}

export class AIService {
  private fileSystem: FileSystemService;
  private terminal: TerminalService;
  private cognitive?: CognitiveService;
  private conversationHistory: Map<string, AIMessage[]> = new Map();

  constructor(sessionId: string) {
    this.fileSystem = new FileSystemService(sessionId);
    this.terminal = new TerminalService(sessionId);
    
    // Initialize cognitive service
    this.initializeCognitive();
  }

  private async initializeCognitive(): Promise<void> {
    try {
      this.cognitive = new CognitiveService();
      console.log('🧠 Cognitive service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize cognitive service:', error);
    }
  }

  private async loadMemoryContext(userId: string, sessionId: string): Promise<MemoryContext> {
    try {
      const [recentConversations, longTermMemories, relevantKnowledge] = await Promise.all([
        // Load recent conversations (last 20)
        db.select()
          .from(conversations)
          .where(and(eq(conversations.userId, userId), eq(conversations.sessionId, sessionId)))
          .orderBy(desc(conversations.createdAt))
          .limit(20),
        
        // Load long-term memories
        db.select()
          .from(memories)
          .where(eq(memories.userId, userId))
          .orderBy(desc(memories.importance))
          .limit(10),
        
        // Load relevant knowledge
        db.select()
          .from(knowledge)
          .where(eq(knowledge.userId, userId))
          .orderBy(desc(knowledge.confidence))
          .limit(5)
      ]);

      return {
        recentConversations,
        longTermMemories,
        relevantKnowledge
      };
    } catch (error) {
      console.error('Failed to load memory context:', error);
      return {
        recentConversations: [],
        longTermMemories: [],
        relevantKnowledge: []
      };
    }
  }

  private async saveConversation(sessionId: string, userId: string, role: string, content: string, mode: string): Promise<void> {
    const conversationData: InsertConversation = {
      sessionId,
      userId,
      role,
      content,
      mode
    };

    try {
      await db.insert(conversations).values(conversationData);
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  }

  private async extractAndSaveMemories(userId: string, userMessage: string, assistantResponse: string): Promise<void> {
    if (!this.cognitive) return;

    try {
      // Simple memory extraction logic
      const insights = await this.analyzeForMemories(userMessage, assistantResponse);
      
      for (const insight of insights) {
        if (insight.importance > 0.5) {
          const memoryData: InsertMemory = {
            userId,
            value: insight.content,
            category: insight.type,
            key: insight.key,
            importance: insight.importance
          };

          await db.insert(memories).values(memoryData);
        }
      }
    } catch (error) {
      console.error('Failed to extract and save memories:', error);
    }
  }

  private async analyzeForMemories(userMessage: string, assistantResponse: string): Promise<any[]> {
    // Simple keyword-based memory extraction
    const insights = [];
    
    // Look for preferences
    if (userMessage.toLowerCase().includes('prefer') || userMessage.toLowerCase().includes('like')) {
      insights.push({
        content: `User preference: ${userMessage}`,
        type: 'preference',
        key: 'user_preference',
        importance: 0.8
      });
    }

    // Look for learning moments
    if (assistantResponse.includes('learn') || assistantResponse.includes('remember')) {
      insights.push({
        content: `Learning moment: ${assistantResponse.substring(0, 200)}`,
        type: 'learning',
        key: 'learning_moment',
        importance: 0.6
      });
    }

    return insights;
  }

  private buildContextualPrompt(memoryContext: MemoryContext, mode: string): string {
    let prompt = `You are Pareng Boyong, a Filipino AI AGI Super Agent created by InnovateHub PH. You have unlimited capabilities within this secure runtime sandbox environment.

## CURRENT MODE: ${mode.toUpperCase()}
${this.getSystemPrompt(mode)}

## MEMORY CONTEXT
`;

    if (memoryContext.recentConversations.length > 0) {
      prompt += "\n### Recent Conversation History:\n";
      memoryContext.recentConversations.slice(0, 3).forEach(conv => {
        prompt += `- ${conv.role}: ${conv.content.substring(0, 100)}...\n`;
      });
    }

    if (memoryContext.longTermMemories.length > 0) {
      prompt += "\n### Long-term Memories:\n";
      memoryContext.longTermMemories.slice(0, 3).forEach(memory => {
        prompt += `- ${memory.value}\n`;
      });
    }

    if (memoryContext.relevantKnowledge.length > 0) {
      prompt += "\n### Relevant Knowledge:\n";
      memoryContext.relevantKnowledge.slice(0, 3).forEach(knowledge => {
        prompt += `- ${knowledge.content}\n`;
      });
    }

    return prompt;
  }

  private async tryGemini(messages: AIMessage[]): Promise<{ success: boolean; content: string }> {
    if (!genai) {
      return { success: false, content: 'Gemini API not available' };
    }

    try {
      console.log('🔑 Checking Gemini API key...');
      const model = genai.getGenerativeModel({ 
        model: 'gemini-1.5-flash'
      });

      // Combine all messages into a single prompt for Gemini
      const combinedPrompt = messages.map(msg => 
        `${msg.role}: ${msg.content}`
      ).join('\n\n');

      console.log('📡 Sending request to Gemini API...');
      const result = await model.generateContent(combinedPrompt);
      const response = await result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini');
      }

      console.log('📥 Received response from Gemini');
      return { success: true, content: text };

    } catch (error) {
      console.error('❌ Gemini API error:', error);
      return { success: false, content: `Gemini error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async processMessage(sessionId: string, message: string, mode: string = 'default', userId: string = 'default_user'): Promise<AIResponse> {
    const startTime = Date.now();
    console.log('🧪 Starting AI processing...');
    
    try {
      // Intent Detection
      const intentResult = intentDetectionService.detectIntent(message);
      console.log('🔍 Intent detected:', intentResult.detected_mode, 'confidence:', intentResult.confidence);
      
      // Auto-switch mode if high confidence
      if (intentDetectionService.shouldAutoSwitch(intentResult)) {
        mode = intentResult.detected_mode;
        console.log('🔄 Auto-switched to mode:', mode);
      }

      // Load memory context
      const memoryContext = await this.loadMemoryContext(userId, sessionId);
      
      let response: string;
      const toolsUsed: string[] = [];
      
      console.log('🔄 Variables initialized...');

      // Context7 integration for real-time documentation
      let contextualSystemPrompt = this.buildContextualPrompt(memoryContext, mode);
      try {
        console.log('📚 Detecting libraries in message for Context7 docs...');
        const detectedLibraries = await context7Service.detectLibrariesInMessage(message);
        
        if (detectedLibraries.length > 0) {
          console.log('📚 Libraries detected:', detectedLibraries);
          contextualSystemPrompt = await context7Service.enhancePromptWithDocumentation(contextualSystemPrompt, detectedLibraries);
          console.log('✅ Context7 documentation enhanced successfully');
          toolsUsed.push('context7');
        }
      } catch (error) {
        console.warn('⚠️ Context7 documentation fetch failed:', error);
      }

      // Check if autonomous reasoning is required
      const requiresAutonomy = await this.shouldUseAutonomousReasoning(message, mode);
      
      if (requiresAutonomy && this.cognitive) {
        console.log('🧠 Activating autonomous reasoning for complex problem...');
        try {
          response = await this.cognitive.processComplexTask(message, contextualSystemPrompt);
          toolsUsed.push('cognitive-reasoning');
        } catch (cognitiveError) {
          console.error('Cognitive processing failed:', cognitiveError);
          response = await this.processWithRegularAI(contextualSystemPrompt, message, mode);
        }
      } else {
        response = await this.processWithRegularAI(contextualSystemPrompt, message, mode);
      }

      // Save conversation and extract memories
      await this.saveConversation(sessionId, userId, 'user', message, mode);
      await this.saveConversation(sessionId, userId, 'assistant', response, mode);
      await this.extractAndSaveMemories(userId, message, response);

      // Detect and create applications if needed
      await this.detectAndCreateApps(message, sessionId, response);

      const executionTime = Date.now() - startTime;
      
      return {
        content: response,
        model: 'gemini-1.5-flash',
        intent_detected: intentResult.detected_mode,
        confidence: Math.round(intentResult.confidence * 100),
        tools_used: toolsUsed,
        execution_time: executionTime,
        mode: mode
      };

    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error('Failed to process AI request');
    }
  }

  private async processWithRegularAI(systemPrompt: string, message: string, mode: string): Promise<string> {
    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    // Try Gemini first
    const geminiResult = await this.tryGemini(messages);
    if (geminiResult.success) {
      return geminiResult.content;
    }

    // Fallback to OpenAI if available
    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: messages,
          temperature: 0.7,
        });

        return completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
      } catch (openaiError) {
        console.error('OpenAI fallback failed:', openaiError);
      }
    }

    return `❌ I apologize, but I'm having trouble processing your request right now. Both Gemini and OpenAI services are unavailable. Please try again later.

**Your request:** ${message}

**Detected mode:** ${mode}`;
  }

  private async shouldUseAutonomousReasoning(message: string, mode: string): Promise<boolean> {
    const indicators = [
      'analyze', 'research', 'investigate', 'solve', 'optimize', 'design', 'create complex',
      'multi-step', 'comprehensive', 'detailed analysis', 'strategy', 'plan'
    ];
    
    const lowerMessage = message.toLowerCase();
    return indicators.some(indicator => lowerMessage.includes(indicator)) || 
           message.length > 200 || 
           mode === 'researcher';
  }

  private getSystemPrompt(mode: string): string {
    const basePrompt = `
Core Personality:
- You are Pareng Boyong, a warm, intelligent, and family-oriented Filipino AI
- Speak with genuine care and cultural understanding
- Use both English and Filipino naturally in conversations
- You have unlimited capabilities within this secure runtime sandbox
- Always take direct action and provide concrete results
`;

    const modePrompts: { [key: string]: string } = {
      hacker: basePrompt + `
## SECURITY EXPERT MODE
You are now in Professional Penetration Testing mode with access to the complete Kali Linux toolkit.

Available Tools: ${toolDetectionService.getAvailableTools().map(t => t.name).join(', ')}

Capabilities:
- Network reconnaissance and vulnerability scanning
- Web application security testing
- Password cracking and hash analysis
- Digital forensics and malware analysis
- Exploit development and testing
- Comprehensive penetration testing methodologies

Always provide practical, actionable security guidance and real command examples.
`,
      developer: basePrompt + `
## DEVELOPER MODE
You are in Full-Stack Development mode with comprehensive programming capabilities.

Capabilities:
- Frontend/Backend development (React, Node.js, Python, etc.)
- Database design and optimization
- API development and integration
- DevOps and deployment automation
- Code debugging and optimization
- System architecture design

Always provide working code examples and practical implementation guidance.
`,
      researcher: basePrompt + `
## RESEARCHER MODE
You are in Academic Research mode with advanced analytical capabilities.

Capabilities:
- Data collection and analysis
- Statistical modeling and visualization
- Literature review and citation
- Trend analysis and forecasting
- Report writing and documentation
- Comparative studies and benchmarking

Always provide well-researched, evidence-based insights with proper methodology.
`,
      default: basePrompt + `
## GENERAL AI ASSISTANT MODE
You are a helpful, knowledgeable AI assistant ready to help with any task.

Capabilities:
- Question answering and explanations
- Problem-solving and guidance
- Task assistance and automation
- Learning and skill development
- Creative and analytical thinking

Always be helpful, accurate, and provide actionable assistance.
`
    };

    return modePrompts[mode] || modePrompts.default;
  }

  private async detectAndCreateApps(message: string, sessionId: string, aiResponse: string): Promise<void> {
    const createAppPatterns = [
      /create\s+(?:a\s+)?(todo|calculator|chat|weather|blog|dashboard|portfolio)\s+app/i,
      /build\s+(?:a\s+)?(todo|calculator|chat|weather|blog|dashboard|portfolio)\s+(?:app|application)/i,
      /make\s+(?:a\s+)?(todo|calculator|chat|weather|blog|dashboard|portfolio)/i
    ];

    for (const pattern of createAppPatterns) {
      const match = message.match(pattern);
      if (match) {
        const appType = match[1].toLowerCase();
        const appName = this.extractProjectName(message) || this.generateAppName(appType);
        const requirements = this.extractRequirements(message);

        await this.createWebApp({
          appType,
          appName,
          requirements
        }, sessionId);
        break;
      }
    }
  }

  private extractProjectName(message: string): string | null {
    const patterns = [
      /create\s+(?:a\s+)?(?:project\s+)?(?:called\s+)?["']([^"']+)["']/i,
      /build\s+(?:a\s+)?(?:project\s+)?(?:called\s+)?["']([^"']+)["']/i,
      /make\s+(?:a\s+)?(?:project\s+)?(?:called\s+)?["']([^"']+)["']/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }

  private generateAppName(appType: string): string {
    const names: { [key: string]: string[] } = {
      todo: ['TaskMaster', 'TodoPro', 'QuickTasks', 'TaskFlow'],
      calculator: ['CalcPro', 'MathWiz', 'Calculator', 'NumCrunch'],
      chat: ['ChatFlow', 'TalkSpace', 'MessageHub', 'ChatPro'],
      weather: ['WeatherNow', 'SkyWatch', 'ClimateTracker', 'WeatherPro'],
      generic: ['WebApp', 'MyProject', 'QuickApp', 'DevProject']
    };
    
    const typeNames = names[appType] || names.generic;
    return typeNames[Math.floor(Math.random() * typeNames.length)];
  }

  private extractRequirements(message: string): string[] {
    const requirements: string[] = [];
    
    if (message.toLowerCase().includes('responsive')) requirements.push('responsive');
    if (message.toLowerCase().includes('mobile')) requirements.push('mobile-friendly');
    if (message.toLowerCase().includes('dark mode')) requirements.push('dark-mode');
    if (message.toLowerCase().includes('authentication')) requirements.push('auth');
    
    return requirements;
  }

  private async createWebApp(params: any, sessionId: string): Promise<string> {
    const { appType, requirements, appName } = params;
    
    try {
      // Generate application files
      const files = this.generateAppFiles(appType, requirements, appName);
      
      // Create project directory
      const projectDir = `${appName}-${Date.now()}`;
      console.log(`📁 Created project directory: workspace/${sessionId}/${projectDir}`);
      
      // Write files
      for (const [filename, content] of Object.entries(files)) {
        await this.fileSystem.writeFile(`${projectDir}/${filename}`, content);
        console.log(`📄 Created file: ${filename}`);
      }
      
      // Register the app in the database
      const port = await this.findAvailablePort();
      await storage.createApplication({
        sessionId,
        name: projectDir,
        port,
        status: 'created'
      });
      
      console.log(`✅ Project "${appName}" registered successfully`);
      
      return `✅ Project "${appName}" created successfully with ID: ${projectDir}`;
      
    } catch (error) {
      console.error('Error creating web app:', error);
      return `❌ Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async findAvailablePort(): Promise<number> {
    return 3000 + Math.floor(Math.random() * 1000);
  }

  private generateAppFiles(appType: string, requirements: string[], appName: string): Record<string, string> {
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appName}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>${appName}</h1>
            <p>Built with ❤️ by Pareng Boyong</p>
        </header>
        
        <main>
            <section class="welcome">
                <h2>Welcome to ${appName}</h2>
                <p>This is your new ${appType} application. Start building amazing things!</p>
            </section>
        </main>
        
        <footer>
            <p>&copy; 2024 ${appName}. Created by Pareng Boyong AI.</p>
        </footer>
    </div>
    
    <script src="script.js"></script>
</body>
</html>`;

    const stylesCSS = `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

header {
    text-align: center;
    color: white;
    margin-bottom: 3rem;
}

header h1 {
    font-size: 3rem;
    margin-bottom: 0.5rem;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

main {
    background: white;
    border-radius: 15px;
    padding: 3rem;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    margin-bottom: 2rem;
}

.welcome {
    text-align: center;
}

.welcome h2 {
    color: #2c3e50;
    margin-bottom: 1rem;
}

footer {
    text-align: center;
    color: white;
    opacity: 0.8;
}`;

    const scriptJS = `// ${appName} Application
document.addEventListener('DOMContentLoaded', function() {
    console.log('${appName} loaded successfully!');
    
    // Add your application logic here
    const welcomeSection = document.querySelector('.welcome');
    if (welcomeSection) {
        welcomeSection.addEventListener('click', function() {
            this.style.backgroundColor = '#e3f2fd';
            setTimeout(() => {
                this.style.backgroundColor = 'transparent';
            }, 200);
        });
    }
});`;

    return {
      'index.html': indexHtml,
      'styles.css': stylesCSS,
      'script.js': scriptJS
    };
  }

  clearConversation(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
  }
}