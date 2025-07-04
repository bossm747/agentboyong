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
  type InsertSession,
  type InsertUser,
  type Conversation,
  type Memory,
  type Knowledge,
  type Session,
  type User
} from '@shared/schema';
import { eq, desc, and, gte } from 'drizzle-orm';

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
    genai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY
    });
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
  private context7?: Context7Service;
  private agentProcessor: AgentProcessor;
  private conversationHistory: Map<string, AIMessage[]> = new Map();

  constructor(sessionId: string) {
    this.fileSystem = new FileSystemService(sessionId);
    this.terminal = new TerminalService(sessionId);
    this.agentProcessor = new AgentProcessor(sessionId);
    
    // Initialize cognitive service
    this.initializeCognitive();
    
    // Initialize Context7 service for real-time documentation
    this.initializeContext7();
  }

  private async initializeCognitive(): Promise<void> {
    try {
      this.cognitive = new CognitiveService();
      console.log('🧠 Cognitive service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize cognitive service:', error);
    }
  }

  private async initializeContext7(): Promise<void> {
    try {
      // Import and use real Context7Service singleton instance
      const { context7Service } = await import('./context7Service');
      this.context7 = context7Service;
      const status = await this.context7.getServiceStatus();
      console.log('Context7 service status:', status);
      
      if (status.status === 'healthy') {
        console.log('Context7 service initialized successfully');
      } else {
        console.warn('Context7 service degraded, using fallback:', status.lastError);
      }
    } catch (error) {
      console.error('Failed to initialize Context7:', error);
      this.context7 = undefined;
    }
  }

  // Memory Management Methods
  private async loadMemoryContext(userId: string, sessionId: string): Promise<MemoryContext> {
    const [recentConversations, longTermMemories, relevantKnowledge] = await Promise.all([
      // Load recent conversations (last 50)
      db.select()
        .from(conversations)
        .where(and(eq(conversations.userId, userId), eq(conversations.sessionId, sessionId)))
        .orderBy(desc(conversations.createdAt))
        .limit(50),
      
      // Load long-term memories
      db.select()
        .from(memories)
        .where(eq(memories.userId, userId))
        .orderBy(desc(memories.importance))
        .limit(20),
      
      // Load relevant knowledge
      db.select()
        .from(knowledge)
        .where(eq(knowledge.userId, userId))
        .orderBy(desc(knowledge.confidence))
        .limit(10)
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
      mode,
      createdAt: new Date()
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
      const insights = await this.cognitive.extractMemories(userMessage, assistantResponse);
      
      for (const insight of insights) {
        if (insight.importance > 0.5) {
          const memoryData: InsertMemory = {
            userId,
            content: insight.content,
            type: insight.type,
            importance: insight.importance,
            tags: insight.tags,
            createdAt: new Date()
          };

          await db.insert(memories).values(memoryData);
        }
      }
    } catch (error) {
      console.error('Failed to extract and save memories:', error);
    }
  }

  private buildContextualPrompt(memoryContext: MemoryContext, mode: string): string {
    let prompt = `You are Pareng Boyong, a Filipino AI AGI Super Agent created by InnovateHub PH. You have unlimited capabilities within this secure runtime sandbox environment.

## CURRENT MODE: ${mode.toUpperCase()}
${this.getSystemPrompt(mode)}

## MEMORY CONTEXT
`;

    if (memoryContext.recentConversations.length > 0) {
      prompt += "\n### Recent Conversation History:\n";
      memoryContext.recentConversations.slice(0, 5).forEach(conv => {
        prompt += `- ${conv.role}: ${conv.content.substring(0, 100)}...\n`;
      });
    }

    if (memoryContext.longTermMemories.length > 0) {
      prompt += "\n### Long-term Memories:\n";
      memoryContext.longTermMemories.slice(0, 3).forEach(memory => {
        prompt += `- ${memory.content}\n`;
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
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 4096,
        }
      });

      // Convert messages to Gemini format
      console.log('📤 Converting messages to Gemini format...');
      const formattedMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

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
      
      // Check if autonomous reasoning is required
      const requiresAutonomy = await this.shouldUseAutonomousReasoning(message, mode);
      console.log('🔍 Autonomous reasoning required:', requiresAutonomy);
      
      let response: string;
      const toolsUsed: string[] = [];
      
      console.log('🔄 Variables initialized...');

      // Context7 integration for real-time documentation
      let contextualSystemPrompt = this.buildContextualPrompt(memoryContext, mode);
      if (this.context7) {
        try {
          console.log('📚 Detecting libraries in message for Context7 docs...');
          const detectedLibraries = await this.context7.detectLibrariesInMessage(message);
          
          if (detectedLibraries.length > 0) {
            console.log('📚 Libraries detected:', detectedLibraries);
            contextualSystemPrompt = await this.context7.enhancePromptWithDocumentation(contextualSystemPrompt, detectedLibraries);
            console.log('✅ Context7 documentation enhanced successfully');
          }
        } catch (error) {
          console.warn('⚠️ Context7 documentation fetch failed:', error);
        }
      }

      // Check if we should use Agent Zero for complex tasks
      if (await this.shouldUseAgentZero(message, mode)) {
        console.log('🎯 Activating Agent Zero for advanced processing...');
        try {
          response = await this.processWithAgentZero(message, sessionId, userId, mode);
          toolsUsed.push('agent-zero');
        } catch (agentError) {
          console.error('Agent Zero processing failed:', agentError);
          // Fallback to regular processing
          response = await this.processWithRegularAI(contextualSystemPrompt, message, mode);
        }
      } else if (requiresAutonomy && this.cognitive) {
        console.log('🧠 Activating autonomous reasoning for complex problem...');
        try {
          response = await this.cognitive.processAutonomousReasoning(message, contextualSystemPrompt);
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
        confidence: intentResult.confidence,
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

    return `❌ I apologize, but I'm having trouble processing your request right now. Both Gemini and OpenAI services are unavailable. Please try again later or contact support if the issue persists.

**Your request:** ${message}

**Detected mode:** ${mode}

**Suggested action:** Please check your API keys and network connection.`;
  }

  private async executeFileCreation(sessionId: string, userMessage: string, aiResponse: string): Promise<void> {
    // Extract file creation commands from AI response
    const fileOperation = await this.detectFileOperation(aiResponse);
    if (fileOperation) {
      await this.handleFileOperation(fileOperation, sessionId);
    }
  }

  private detectAppType(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('todo') || lowerMessage.includes('task')) return 'todo';
    if (lowerMessage.includes('calculator') || lowerMessage.includes('calc')) return 'calculator';
    if (lowerMessage.includes('chat') || lowerMessage.includes('messaging')) return 'chat';
    if (lowerMessage.includes('weather')) return 'weather';
    if (lowerMessage.includes('blog') || lowerMessage.includes('post')) return 'blog';
    if (lowerMessage.includes('dashboard') || lowerMessage.includes('admin')) return 'dashboard';
    if (lowerMessage.includes('portfolio') || lowerMessage.includes('resume')) return 'portfolio';
    if (lowerMessage.includes('e-commerce') || lowerMessage.includes('shop')) return 'ecommerce';
    
    return 'generic';
  }

  private extractProjectName(message: string): string | null {
    // Simple regex to extract project names
    const patterns = [
      /create\s+(?:a\s+)?(?:project\s+)?(?:called\s+)?["']([^"']+)["']/i,
      /build\s+(?:a\s+)?(?:project\s+)?(?:called\s+)?["']([^"']+)["']/i,
      /make\s+(?:a\s+)?(?:project\s+)?(?:called\s+)?["']([^"']+)["']/i,
      /(?:project|app)\s+(?:name|called)\s+["']([^"']+)["']/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }

  private generateNexusPayHTML(projectName: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName} - Digital Payment Solutions</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0a0a0a; color: white; overflow-x: hidden; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .hero { min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; position: relative; }
        .hero::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><polygon fill="%23ffffff05" points="0,0 1000,300 1000,1000 0,700"/></svg>'); }
        .hero-content { position: relative; z-index: 2; }
        h1 { font-size: 4rem; font-weight: 900; margin-bottom: 1rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
        .subtitle { font-size: 1.5rem; margin-bottom: 2rem; opacity: 0.9; }
        .cta-button { display: inline-block; padding: 15px 30px; background: linear-gradient(45deg, #ff6b6b, #ee5a24); color: white; text-decoration: none; border-radius: 50px; font-weight: bold; transition: transform 0.3s ease; }
        .cta-button:hover { transform: translateY(-3px) scale(1.05); }
        .features { padding: 100px 0; background: #111; }
        .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-top: 50px; }
        .feature-card { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 30px; border-radius: 15px; text-align: center; transition: transform 0.3s ease; }
        .feature-card:hover { transform: translateY(-10px); }
        .feature-icon { font-size: 3rem; margin-bottom: 20px; }
        .neon-text { text-shadow: 0 0 20px #00ffff, 0 0 40px #00ffff, 0 0 60px #00ffff; }
    </style>
</head>
<body>
    <section class="hero">
        <div class="container">
            <div class="hero-content">
                <h1 class="neon-text">${projectName}</h1>
                <p class="subtitle">Revolutionary Digital Payment Solutions for the Modern World</p>
                <a href="#features" class="cta-button">Explore Solutions</a>
            </div>
        </div>
    </section>
    
    <section class="features" id="features">
        <div class="container">
            <h2 style="text-align: center; font-size: 3rem; margin-bottom: 20px;">Our Features</h2>
            <div class="feature-grid">
                <div class="feature-card">
                    <div class="feature-icon">⚡</div>
                    <h3>Lightning Fast</h3>
                    <p>Process payments in milliseconds with our advanced infrastructure</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🔒</div>
                    <h3>Bank-Level Security</h3>
                    <p>Military-grade encryption protects every transaction</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🌐</div>
                    <h3>Global Reach</h3>
                    <p>Accept payments from anywhere in the world, any currency</p>
                </div>
            </div>
        </div>
    </section>
</body>
</html>`;
  }

  private getTaskType(message: string, mode: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (mode === 'hacker') {
      if (lowerMessage.includes('scan') || lowerMessage.includes('pentest')) return 'network_scan';
      if (lowerMessage.includes('exploit') || lowerMessage.includes('vulnerability')) return 'exploit_dev';
      if (lowerMessage.includes('password') || lowerMessage.includes('crack')) return 'password_attack';
    }
    
    if (mode === 'developer') {
      if (lowerMessage.includes('api') || lowerMessage.includes('backend')) return 'backend_dev';
      if (lowerMessage.includes('frontend') || lowerMessage.includes('ui')) return 'frontend_dev';
      if (lowerMessage.includes('database') || lowerMessage.includes('db')) return 'database_dev';
    }
    
    return 'general';
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

    const modePrompts = {
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

    return modePrompts[mode as keyof typeof modePrompts] || modePrompts.default;
  }

  clearConversation(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
  }

  private async detectFileOperation(message: string): Promise<{ type: string, params: any } | null> {
    const patterns = [
      { type: 'create_file', regex: /create\s+(?:a\s+)?file\s+(?:called\s+)?["']([^"']+)["']/i },
      { type: 'write_file', regex: /write\s+(?:to\s+)?(?:file\s+)?["']([^"']+)["']/i },
      { type: 'list_files', regex: /list\s+files|show\s+files|ls/i },
      { type: 'read_file', regex: /read\s+(?:file\s+)?["']([^"']+)["']/i }
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern.regex);
      if (match) {
        return {
          type: pattern.type,
          params: { filename: match[1] || null }
        };
      }
    }

    return null;
  }

  private async handleFileOperation(operation: { type: string, params: any }, sessionId: string): Promise<string> {
    try {
      switch (operation.type) {
        case 'list_files':
          const files = await this.fileSystem.listFiles('.');
          return this.formatFileTree(files);

        case 'create_file':
        case 'write_file':
          if (operation.params.filename) {
            await this.fileSystem.writeFile(operation.params.filename, '// File created by Pareng Boyong\n');
            return `✅ File "${operation.params.filename}" created successfully`;
          }
          break;

        case 'read_file':
          if (operation.params.filename) {
            const content = await this.fileSystem.readFile(operation.params.filename);
            return `📄 Content of "${operation.params.filename}":\n\n${content}`;
          }
          break;
      }
    } catch (error) {
      return `❌ Error performing file operation: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return '❌ Could not perform the requested file operation';
  }

  private formatFileTree(nodes: any[], indent = ''): string {
    let result = '';
    for (const node of nodes) {
      result += `${indent}${node.type === 'directory' ? '📁' : '📄'} ${node.name}\n`;
      if (node.children && node.children.length > 0) {
        result += this.formatFileTree(node.children, indent + '  ');
      }
    }
    return result;
  }

  private async shouldUseAgentZero(message: string, mode: string): Promise<boolean> {
    // Use Agent Zero for complex multi-step tasks
    const complexityIndicators = [
      'create project', 'build application', 'develop system', 'comprehensive analysis',
      'multi-step process', 'end-to-end', 'full implementation', 'complete solution'
    ];

    const lowerMessage = message.toLowerCase();
    return complexityIndicators.some(indicator => lowerMessage.includes(indicator)) ||
           (mode === 'hacker' && this.detectSecurityOperation(message)) ||
           message.length > 300;
  }

  private async processWithAgentZero(message: string, sessionId: string, userId: string, mode: string): Promise<string> {
    try {
      const result = await this.agentProcessor.processMessage(message, {
        mode,
        userId,
        sessionId,
        fileSystem: this.fileSystem,
        terminal: this.terminal
      });

      return result || "Agent Zero processing completed successfully";
    } catch (error) {
      throw new Error(`Agent Zero processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private detectSecurityOperation(message: string): boolean {
    const securityKeywords = [
      'scan', 'pentest', 'vulnerability', 'exploit', 'security audit',
      'penetration test', 'nmap', 'sqlmap', 'burp', 'metasploit'
    ];

    const lowerMessage = message.toLowerCase();
    return securityKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private extractRequirements(message: string): string[] {
    const requirements: string[] = [];
    
    // Extract common web app requirements
    if (message.toLowerCase().includes('responsive')) requirements.push('responsive');
    if (message.toLowerCase().includes('mobile')) requirements.push('mobile-friendly');
    if (message.toLowerCase().includes('dark mode')) requirements.push('dark-mode');
    if (message.toLowerCase().includes('authentication')) requirements.push('auth');
    if (message.toLowerCase().includes('database')) requirements.push('database');
    if (message.toLowerCase().includes('api')) requirements.push('api');
    
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
      await storage.registerApplication({
        sessionId,
        appName: projectDir,
        port,
        status: 'created',
        createdAt: new Date()
      });
      
      console.log(`✅ Project "${appName}" registered successfully`);
      
      return `✅ Project "${appName}" created successfully with ID: ${projectDir}`;
      
    } catch (error) {
      console.error('Error creating web app:', error);
      return `❌ Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private generateAppName(appType: string): string {
    const names = {
      todo: ['TaskMaster', 'TodoPro', 'QuickTasks', 'TaskFlow'],
      calculator: ['CalcPro', 'MathWiz', 'Calculator', 'NumCrunch'],
      chat: ['ChatFlow', 'TalkSpace', 'MessageHub', 'ChatPro'],
      weather: ['WeatherNow', 'SkyWatch', 'ClimateTracker', 'WeatherPro'],
      generic: ['WebApp', 'MyProject', 'QuickApp', 'DevProject']
    };
    
    const typeNames = names[appType as keyof typeof names] || names.generic;
    return typeNames[Math.floor(Math.random() * typeNames.length)];
  }

  private async findAvailablePort(): Promise<number> {
    const startPort = 3000;
    for (let port = startPort; port < startPort + 100; port++) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    return startPort; // Fallback
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    // Simple port availability check
    try {
      const { spawn } = await import('child_process');
      return new Promise((resolve) => {
        const checker = spawn('lsof', ['-i', `:${port}`]);
        checker.on('close', (code) => {
          resolve(code !== 0); // Port is available if lsof returns non-zero
        });
      });
    } catch {
      return true; // Assume available if we can't check
    }
  }

  private generateAppFiles(appType: string, requirements: string[], appName: string): Record<string, string> {
    switch (appType) {
      case 'todo':
        return this.generateTodoAppFiles(requirements, appName);
      case 'calculator':
        return this.generateCalculatorAppFiles(requirements, appName);
      case 'blog':
        return this.generateBlogAppFiles(requirements, appName);
      default:
        return this.generateGenericAppFiles(requirements, appName);
    }
  }

  private generateTodoAppFiles(requirements: string[], appName: string): Record<string, string> {
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appName} - Todo Application</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>${appName}</h1>
        <div class="todo-input">
            <input type="text" id="todoInput" placeholder="Add a new task...">
            <button onclick="addTodo()">Add Task</button>
        </div>
        <ul id="todoList"></ul>
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
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    padding: 20px;
}

.container {
    max-width: 600px;
    margin: 0 auto;
    background: white;
    border-radius: 15px;
    padding: 30px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

h1 {
    text-align: center;
    color: #333;
    margin-bottom: 30px;
}

.todo-input {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

input[type="text"] {
    flex: 1;
    padding: 15px;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 16px;
}

button {
    padding: 15px 25px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    transition: background 0.3s;
}

button:hover {
    background: #5a6fd8;
}

#todoList {
    list-style: none;
}

.todo-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px;
    margin: 10px 0;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #667eea;
}

.todo-item.completed {
    text-decoration: line-through;
    opacity: 0.7;
    border-left-color: #28a745;
}

.delete-btn {
    background: #dc3545;
    padding: 5px 10px;
    font-size: 14px;
}

.delete-btn:hover {
    background: #c82333;
}`;

    const scriptJS = `let todos = [];
let todoId = 0;

function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    
    if (text === '') return;
    
    const todo = {
        id: todoId++,
        text: text,
        completed: false
    };
    
    todos.push(todo);
    input.value = '';
    renderTodos();
}

function deleteTodo(id) {
    todos = todos.filter(todo => todo.id !== id);
    renderTodos();
}

function toggleTodo(id) {
    const todo = todos.find(todo => todo.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        renderTodos();
    }
}

function renderTodos() {
    const list = document.getElementById('todoList');
    list.innerHTML = '';
    
    todos.forEach(todo => {
        const li = document.createElement('li');
        li.className = \`todo-item \${todo.completed ? 'completed' : ''}\`;
        li.innerHTML = \`
            <span onclick="toggleTodo(\${todo.id})" style="cursor: pointer; flex: 1;">
                \${todo.text}
            </span>
            <button class="delete-btn" onclick="deleteTodo(\${todo.id})">Delete</button>
        \`;
        list.appendChild(li);
    });
}

// Add todo on Enter key press
document.getElementById('todoInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addTodo();
    }
});`;

    return {
      'index.html': indexHtml,
      'styles.css': stylesCSS,
      'script.js': scriptJS
    };
  }

  private generateCalculatorAppFiles(requirements: string[], appName: string): Record<string, string> {
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appName} - Calculator</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="calculator">
        <div class="display">
            <input type="text" id="display" readonly>
        </div>
        <div class="buttons">
            <button onclick="clearDisplay()" class="operator">C</button>
            <button onclick="deleteLast()" class="operator">⌫</button>
            <button onclick="appendToDisplay('/')" class="operator">÷</button>
            <button onclick="appendToDisplay('*')" class="operator">×</button>
            
            <button onclick="appendToDisplay('7')">7</button>
            <button onclick="appendToDisplay('8')">8</button>
            <button onclick="appendToDisplay('9')">9</button>
            <button onclick="appendToDisplay('-')" class="operator">-</button>
            
            <button onclick="appendToDisplay('4')">4</button>
            <button onclick="appendToDisplay('5')">5</button>
            <button onclick="appendToDisplay('6')">6</button>
            <button onclick="appendToDisplay('+')" class="operator">+</button>
            
            <button onclick="appendToDisplay('1')">1</button>
            <button onclick="appendToDisplay('2')">2</button>
            <button onclick="appendToDisplay('3')">3</button>
            <button onclick="calculate()" class="equals" rowspan="2">=</button>
            
            <button onclick="appendToDisplay('0')" class="zero">0</button>
            <button onclick="appendToDisplay('.')">.</button>
        </div>
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
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.calculator {
    background: #2c3e50;
    border-radius: 20px;
    padding: 25px;
    box-shadow: 0 15px 35px rgba(0,0,0,0.3);
    max-width: 350px;
    width: 100%;
}

.display {
    margin-bottom: 20px;
}

#display {
    width: 100%;
    height: 80px;
    border: none;
    background: #34495e;
    color: white;
    font-size: 2.5rem;
    text-align: right;
    padding: 0 20px;
    border-radius: 15px;
    outline: none;
}

.buttons {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 15px;
}

button {
    height: 70px;
    border: none;
    border-radius: 15px;
    font-size: 1.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    background: #7f8c8d;
    color: white;
}

button:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}

button:active {
    transform: translateY(0);
}

.operator {
    background: #e74c3c !important;
}

.equals {
    background: #27ae60 !important;
    grid-row: span 2;
}

.zero {
    grid-column: span 2;
}`;

    const scriptJS = `let display = document.getElementById('display');
let currentInput = '';
let operator = '';
let previousInput = '';

function appendToDisplay(value) {
    if (['+', '-', '*', '/'].includes(value)) {
        if (currentInput === '') return;
        if (operator !== '') {
            calculate();
        }
        operator = value;
        previousInput = currentInput;
        currentInput = '';
    } else {
        currentInput += value;
    }
    updateDisplay();
}

function updateDisplay() {
    display.value = currentInput || '0';
}

function clearDisplay() {
    currentInput = '';
    operator = '';
    previousInput = '';
    updateDisplay();
}

function deleteLast() {
    currentInput = currentInput.slice(0, -1);
    updateDisplay();
}

function calculate() {
    if (operator === '' || currentInput === '' || previousInput === '') return;
    
    let result;
    const prev = parseFloat(previousInput);
    const current = parseFloat(currentInput);
    
    switch (operator) {
        case '+':
            result = prev + current;
            break;
        case '-':
            result = prev - current;
            break;
        case '*':
            result = prev * current;
            break;
        case '/':
            result = current !== 0 ? prev / current : 'Error';
            break;
        default:
            return;
    }
    
    currentInput = result.toString();
    operator = '';
    previousInput = '';
    updateDisplay();
}

// Keyboard support
document.addEventListener('keydown', function(event) {
    const key = event.key;
    
    if ('0123456789.'.includes(key)) {
        appendToDisplay(key);
    } else if ('+-*/'.includes(key)) {
        appendToDisplay(key);
    } else if (key === 'Enter' || key === '=') {
        calculate();
    } else if (key === 'Escape' || key === 'c' || key === 'C') {
        clearDisplay();
    } else if (key === 'Backspace') {
        deleteLast();
    }
});`;

    return {
      'index.html': indexHtml,
      'styles.css': stylesCSS,
      'script.js': scriptJS
    };
  }

  private generateBlogAppFiles(requirements: string[], appName: string): Record<string, string> {
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appName} - Blog Platform</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>${appName}</h1>
        <nav>
            <a href="#home">Home</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
        </nav>
    </header>
    
    <main>
        <section class="hero">
            <h2>Welcome to ${appName}</h2>
            <p>Your thoughts, stories, and ideas matter</p>
        </section>
        
        <section class="posts">
            <article class="post">
                <h3>Getting Started with ${appName}</h3>
                <p class="meta">Published on <time>December 2024</time></p>
                <p>Welcome to your new blog platform! This is your first post. You can edit this content or create new posts.</p>
                <a href="#" class="read-more">Read More</a>
            </article>
            
            <article class="post">
                <h3>The Power of Storytelling</h3>
                <p class="meta">Published on <time>December 2024</time></p>
                <p>Every story has the power to inspire, educate, and connect us with others. Share your unique perspective with the world.</p>
                <a href="#" class="read-more">Read More</a>
            </article>
        </section>
    </main>
    
    <footer>
        <p>&copy; 2024 ${appName}. All rights reserved.</p>
    </footer>
    
    <script src="script.js"></script>
</body>
</html>`;

    const stylesCSS = `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Georgia', serif;
    line-height: 1.6;
    color: #333;
    background: #f8f9fa;
}

header {
    background: #2c3e50;
    color: white;
    padding: 1rem 0;
    position: sticky;
    top: 0;
    z-index: 100;
}

header h1 {
    text-align: center;
    margin-bottom: 0.5rem;
}

nav {
    text-align: center;
}

nav a {
    color: white;
    text-decoration: none;
    margin: 0 1rem;
    padding: 0.5rem 1rem;
    border-radius: 5px;
    transition: background 0.3s;
}

nav a:hover {
    background: rgba(255,255,255,0.1);
}

main {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
}

.hero {
    text-align: center;
    margin-bottom: 3rem;
    padding: 3rem 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 15px;
}

.hero h2 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
}

.posts {
    display: grid;
    gap: 2rem;
}

.post {
    background: white;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    transition: transform 0.3s, box-shadow 0.3s;
}

.post:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
}

.post h3 {
    color: #2c3e50;
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
}

.meta {
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 1rem;
    font-style: italic;
}

.read-more {
    color: #667eea;
    text-decoration: none;
    font-weight: bold;
    display: inline-block;
    margin-top: 1rem;
    transition: color 0.3s;
}

.read-more:hover {
    color: #5a6fd8;
}

footer {
    background: #2c3e50;
    color: white;
    text-align: center;
    padding: 2rem 0;
    margin-top: 3rem;
}

@media (max-width: 768px) {
    main {
        padding: 1rem;
    }
    
    .hero h2 {
        font-size: 2rem;
    }
    
    nav a {
        display: block;
        margin: 0.25rem 0;
    }
}`;

    const scriptJS = `// Simple blog functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('${appName} blog loaded successfully!');
    
    // Add smooth scrolling for navigation
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Add read time estimation
    document.querySelectorAll('.post').forEach(post => {
        const text = post.textContent;
        const wordCount = text.split(' ').length;
        const readTime = Math.ceil(wordCount / 200); // Average reading speed
        
        const meta = post.querySelector('.meta');
        if (meta) {
            meta.innerHTML += \` • \${readTime} min read\`;
        }
    });
});`;

    return {
      'index.html': indexHtml,
      'styles.css': stylesCSS,
      'script.js': scriptJS
    };
  }

  private generateGenericAppFiles(requirements: string[], appName: string): Record<string, string> {
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
                <p>This is your new web application. Start building amazing things!</p>
            </section>
            
            <section class="features">
                <div class="feature">
                    <h3>🚀 Fast</h3>
                    <p>Built for speed and performance</p>
                </div>
                <div class="feature">
                    <h3>📱 Responsive</h3>
                    <p>Works perfectly on all devices</p>
                </div>
                <div class="feature">
                    <h3>🎨 Beautiful</h3>
                    <p>Modern and clean design</p>
                </div>
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
    margin-bottom: 3rem;
}

.welcome h2 {
    color: #2c3e50;
    margin-bottom: 1rem;
}

.features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
}

.feature {
    text-align: center;
    padding: 2rem;
    background: #f8f9fa;
    border-radius: 10px;
    transition: transform 0.3s, box-shadow 0.3s;
}

.feature:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
}

.feature h3 {
    color: #667eea;
    margin-bottom: 1rem;
    font-size: 1.5rem;
}

footer {
    text-align: center;
    color: white;
    opacity: 0.8;
}

@media (max-width: 768px) {
    .container {
        padding: 1rem;
    }
    
    header h1 {
        font-size: 2rem;
    }
    
    main {
        padding: 2rem;
    }
    
    .features {
        grid-template-columns: 1fr;
    }
}`;

    const scriptJS = `// ${appName} Application
document.addEventListener('DOMContentLoaded', function() {
    console.log('${appName} loaded successfully!');
    
    // Add smooth animations
    const features = document.querySelectorAll('.feature');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    });
    
    features.forEach(feature => {
        feature.style.opacity = '0';
        feature.style.transform = 'translateY(20px)';
        feature.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(feature);
    });
    
    // Add click handlers for features
    features.forEach(feature => {
        feature.addEventListener('click', function() {
            this.style.backgroundColor = '#e3f2fd';
            setTimeout(() => {
                this.style.backgroundColor = '#f8f9fa';
            }, 200);
        });
    });
});`;

    return {
      'index.html': indexHtml,
      'styles.css': stylesCSS,
      'script.js': scriptJS
    };
  }

  private getServerCommand(appType: string, port: number): string {
    switch (appType) {
      case 'node':
        return `npm start`;
      case 'python':
        return `python -m http.server ${port}`;
      default:
        return `python3 -m http.server ${port}`;
    }
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

  private async createActualTodoApp(sessionId: string): Promise<void> {
    const files = this.generateTodoAppFiles(['responsive'], 'TodoApp');
    const projectDir = `todo-${Date.now()}`;
    
    for (const [filename, content] of Object.entries(files)) {
      await this.fileSystem.writeFile(`${projectDir}/${filename}`, content);
    }
  }

  private async createCalculatorApp(sessionId: string): Promise<void> {
    const files = this.generateCalculatorAppFiles(['responsive'], 'Calculator');
    const projectDir = `calculator-${Date.now()}`;
    
    for (const [filename, content] of Object.entries(files)) {
      await this.fileSystem.writeFile(`${projectDir}/${filename}`, content);
    }
  }

  private async createChatApp(sessionId: string): Promise<void> {
    const files = this.generateGenericAppFiles(['responsive', 'chat'], 'ChatApp');
    const projectDir = `chat-${Date.now()}`;
    
    for (const [filename, content] of Object.entries(files)) {
      await this.fileSystem.writeFile(`${projectDir}/${filename}`, content);
    }
  }

  private async createWeatherApp(sessionId: string): Promise<void> {
    const files = this.generateGenericAppFiles(['responsive', 'api'], 'WeatherApp');
    const projectDir = `weather-${Date.now()}`;
    
    for (const [filename, content] of Object.entries(files)) {
      await this.fileSystem.writeFile(`${projectDir}/${filename}`, content);
    }
  }

  private async startSimpleServer(sessionId: string, appName: string, port: number): Promise<void> {
    try {
      const command = `cd workspace/${sessionId}/${appName} && python3 -m http.server ${port}`;
      await this.terminal.executeCommand(command);
      console.log(`🚀 Started server for ${appName} on port ${port}`);
    } catch (error) {
      console.error(`Failed to start server for ${appName}:`, error);
    }
  }
}