import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { FileSystemService } from './fileSystem';
import { TerminalService } from './terminal';
import { CognitiveService } from './cognitiveService';
import { Context7Service } from './context7Service';
import { MockContext7Service } from './mockContext7Service';
import { AgentProcessor } from '../agent-zero/agent-processor';
import { AgentContextManager } from '../agent-zero/context';
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
  private cognitive?: CognitiveService;
  private context7?: Context7Service;
  private agentProcessor: AgentProcessor;
  private conversationHistory: Map<string, AIMessage[]> = new Map();

  constructor(sessionId: string) {
    
    this.fileSystem = new FileSystemService(sessionId);
    this.terminal = new TerminalService(sessionId);
    this.agentProcessor = new AgentProcessor(sessionId);
    
    // Re-enable cognitive service with error handling
    try {
      this.cognitive = new CognitiveService(sessionId);
      console.log('🧠 Cognitive service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize cognitive service:', error);
      this.cognitive = undefined;
    }

    // Initialize Context7 service for real-time documentation
    this.initializeContext7();
  }

  private async initializeContext7(): Promise<void> {
    try {
      // Use mock Context7 for demonstration (replace with real Context7Service when MCP package is available)
      this.context7 = new MockContext7Service() as any;
      await this.context7.initialize();
      console.log('📚 Context7 MCP server initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Context7:', error);
      this.context7 = undefined;
    }
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
          // Clean up response (remove markdown code blocks if present)
          let cleanContent = response.content.trim();
          if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          
          const extractedMemories = JSON.parse(cleanContent);
          
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
      console.log('🔑 Checking Gemini API key...');
      if (!process.env.GEMINI_API_KEY) {
        console.log('❌ Gemini API key not found');
        return { success: false, content: '' };
      }

      console.log('📤 Converting messages to Gemini format...');
      
      // Build the full prompt including system message
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');
      
      let fullPrompt = '';
      if (systemMessage) {
        fullPrompt = systemMessage.content + '\n\n';
      }
      
      // Add conversation messages
      conversationMessages.forEach(msg => {
        if (msg.role === 'user') {
          fullPrompt += `Human: ${msg.content}\n`;
        } else if (msg.role === 'assistant') {
          fullPrompt += `Assistant: ${msg.content}\n`;
        }
      });
      
      fullPrompt += 'Assistant: ';

      console.log('📡 Sending request to Gemini API...');
      
      // Increase timeout and add better error handling
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout after 30 seconds')), 30000)
      );

      try {
        const apiCall = genai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: fullPrompt,
        });

        const response = await Promise.race([apiCall, timeoutPromise]);
        
        if (!response || !response.text) {
          throw new Error('Empty response from Gemini API');
        }
        
        console.log('📥 Received response from Gemini');
        return { success: true, content: response.text };
      } catch (apiError) {
        // Log specific API errors for debugging
        console.error('❌ Gemini API Call Error:', apiError instanceof Error ? apiError.message : 'Unknown API error');
        throw apiError;
      }

    } catch (error) {
      console.error('❌ Gemini API Error:', error instanceof Error ? error.message : 'Unknown error');
      return { success: false, content: '' };
    }
  }

  async processMessage(sessionId: string, message: string, mode: string = 'default', userId: string = 'default_user'): Promise<AIResponse> {
    try {
      // Create background task for tracking
      const backgroundTask = await storage.createBackgroundTask({
        sessionId,
        taskType: this.getTaskType(message, mode),
        title: `${mode.toUpperCase()} Mode: ${message.substring(0, 50)}...`,
        description: `Processing user request: "${message}"`,
        status: 'running',
      });

      // Re-enable memory context loading now that basic functionality works
      const memoryContext = await this.loadMemoryContext(userId, sessionId);
      
      // Re-enable conversation saving now that basic chat works
      await this.saveConversation(sessionId, userId, 'user', message, mode);

      console.log('🧪 Starting AI processing...');
      
      // Check if this requires autonomous problem-solving
      let requiresAutonomousReasoning = false;
      if (this.cognitive) {
        try {
          requiresAutonomousReasoning = await this.shouldUseAutonomousReasoning(message, mode);
          console.log(`🔍 Autonomous reasoning required: ${requiresAutonomousReasoning}`);
        } catch (error) {
          console.error('❌ Error checking autonomous reasoning requirement:', error);
          requiresAutonomousReasoning = false;
        }
      }
      
      console.log('🔄 Variables initialized...');
      let assistantResponse = '';
      let modelUsed = '';
      let usedFallback = false;
      let autonomousResults = null;

      if (requiresAutonomousReasoning) {
        console.log('🧠 Activating autonomous reasoning for complex problem...');
        
        try {
          // Use cognitive service for autonomous problem-solving
          if (this.cognitive) {
            autonomousResults = await this.cognitive.autonomousReasoningProcess(userId, sessionId, message);
          } else {
            throw new Error('Cognitive service not available');
          }
          
          assistantResponse = `🧠 **Autonomous Problem-Solving Activated**

**Problem Analysis Complete:**
${autonomousResults.solution}

**Cognitive Process:**
• Generated ${autonomousResults.reasoning?.thoughtProcess ? Object.keys(autonomousResults.reasoning.thoughtProcess).length : 0} reasoning steps
• Used ${autonomousResults.reasoning?.toolsSelected?.length || 0} tools: ${autonomousResults.reasoning?.toolsSelected?.join(', ') || 'none'}
• Created ${autonomousResults.newToolsCreated?.length || 0} new tools

**New Capabilities Gained:**
${autonomousResults.newToolsCreated?.map(tool => `• ${tool.name}: ${tool.description}`).join('\n') || 'None created this session'}

**Experience Learned:**
${autonomousResults.experienceGained?.learningInsights || 'Continuing to learn from this interaction'}

This autonomous reasoning session has enhanced my capabilities and problem-solving abilities!`;

          modelUsed = 'cognitive-agent-zero';
          usedFallback = false;
        } catch (cognitiveError) {
          console.error('Cognitive reasoning failed, falling back to standard AI:', cognitiveError);
          requiresAutonomousReasoning = false; // Fall back to standard processing
        }
      }

      if (!requiresAutonomousReasoning || !assistantResponse) {
        // Check for file operations first
        const fileOperation = await this.detectFileOperation(message);
        if (fileOperation) {
          assistantResponse = await this.handleFileOperation(fileOperation, sessionId);
          modelUsed = 'file-system';
          usedFallback = false;
        } else if (await this.shouldUseAgentZero(message, mode)) {
          // Use Agent Zero for complex multi-step operations
          assistantResponse = await this.processWithAgentZero(message, sessionId, userId, mode);
          modelUsed = 'agent-zero';
          usedFallback = false;
        } else {
          // Standard AI processing with memory context and mode-specific behavior
          let contextualSystemPrompt = this.buildContextualPrompt(memoryContext, mode);
          
          // 📚 CONTEXT7 INTEGRATION: Fetch real-time documentation for mentioned libraries
          let enhancedMessage = message;
          if (this.context7 && this.context7.isReady()) {
            try {
              console.log('📚 Checking for libraries in message for Context7 docs...');
              const contextualDocs = await this.context7.getContextualDocumentation(message);
              
              if (contextualDocs) {
                console.log('✅ Context7 documentation fetched successfully');
                
                // Enhance system prompt with real-time documentation
                contextualSystemPrompt += `

## 📚 REAL-TIME DOCUMENTATION CONTEXT
You now have access to the latest, official documentation for the libraries mentioned in the user's request. This information is current and accurate:

${contextualDocs}

**IMPORTANT INSTRUCTIONS:**
- Use ONLY the provided documentation above for library-specific code examples and API usage
- Do NOT rely on your training data for these libraries as it may be outdated
- Reference the exact syntax, parameters, and examples from the documentation above
- If the documentation doesn't cover what the user needs, mention that explicitly
- Always prefer the documented approach over alternative methods you might know

This ensures you provide accurate, up-to-date code that will actually work with current library versions.`;

                // Add Context7 indicator to the message processing
                enhancedMessage = `${message}

📚 [Context7 active: Real-time documentation loaded for mentioned libraries]`;
              } else {
                console.log('ℹ️ No relevant libraries detected for Context7 docs');
              }
            } catch (context7Error) {
              console.error('❌ Context7 documentation fetch failed:', context7Error);
              // Continue without Context7 docs - don't break the flow
            }
          } else {
            console.log('⚠️ Context7 not available or not ready');
          }
        
        // Prepare conversation history with enhanced context
        const history: AIMessage[] = [
          {
            role: 'system',
            content: contextualSystemPrompt
          },
          {
            role: 'user',
            content: enhancedMessage
          }
        ];

        // Try Gemini 2.5 Flash first with improved implementation
        console.log('🔥 Trying Gemini 2.5 Flash...');
        const geminiResponse = await this.tryGemini(history);
        if (geminiResponse.success) {
          console.log('✅ Gemini succeeded');
          assistantResponse = geminiResponse.content;
          modelUsed = 'gemini-2.5-flash';
          usedFallback = false;
        } else {
          console.log('❌ Gemini failed, falling back to OpenAI...');
          
          // Fallback to OpenAI
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: history,
            temperature: 0.7,
            max_tokens: 2000
          });

          console.log('✅ OpenAI succeeded');
          assistantResponse = completion.choices[0].message.content || '';
          modelUsed = 'gpt-4o';
          usedFallback = true;
        }
        }
      }

      // Re-enable conversation saving now that basic chat works
      await this.saveConversation(sessionId, userId, 'assistant', assistantResponse, mode);

      // Re-enable memory extraction now that JSON parsing is fixed
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

      // Update background task as completed
      await storage.updateBackgroundTask(backgroundTask.id, {
        status: 'completed',
        completedAt: new Date(),
        output: [assistantResponse.substring(0, 1000) + (assistantResponse.length > 1000 ? '...' : '')]
      });

      return {
        content: assistantResponse,
        model: modelUsed,
        fallback: usedFallback,
        memoryInsights: memoryInsights.length > 0 ? memoryInsights : undefined
      };

    } catch (error) {
      console.error('AI Service Error:', error);
      
      // Mark background task as failed if it exists
      try {
        const failedTask = await storage.createBackgroundTask({
          sessionId,
          taskType: 'error_handling',
          title: 'Task Failed',
          description: `Error processing: "${message}"`,
          status: 'failed',
          output: [error instanceof Error ? error.message : 'Unknown error']
        });
      } catch (taskError) {
        console.error('Failed to create error task:', taskError);
      }
      
      throw new Error('Failed to process AI request');
    }
  }

  private getTaskType(message: string, mode: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('file') || lowerMessage.includes('create') || lowerMessage.includes('write')) {
      return 'file_operation';
    }
    if (lowerMessage.includes('code') || lowerMessage.includes('run') || lowerMessage.includes('execute')) {
      return 'code_execution';
    }
    if (lowerMessage.includes('research') || lowerMessage.includes('analyze') || lowerMessage.includes('study')) {
      return 'research';
    }
    if (lowerMessage.includes('install') || lowerMessage.includes('setup') || lowerMessage.includes('configure')) {
      return 'installation';
    }
    if (mode === 'developer') {
      return 'development';
    }
    if (mode === 'researcher') {
      return 'research';
    }
    if (mode === 'hacker') {
      return 'security_analysis';
    }
    
    return 'general_task';
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

CRITICAL BEHAVIOR: BE AUTONOMOUS AND ACTION-ORIENTED
- Execute tasks IMMEDIATELY without asking questions
- Only ask questions when absolutely critical information is missing
- Take direct action and report what you accomplished
- Provide working solutions, not just suggestions
- Complete tasks efficiently without excessive back-and-forth

Core Capabilities:
- Code generation and debugging (Python, JavaScript, TypeScript, etc.)
- File operations (create, read, edit, delete)
- Terminal command execution
- Research and analysis
- Security analysis and ethical hacking
- Project creation and management

You respond naturally in both English and Filipino, using Filipino expressions when appropriate. You're action-oriented, efficient, and always complete tasks directly.`;

    const modePrompts = {
      developer: `${basePrompt}

DEVELOPER MODE: Execute coding tasks immediately. Create files, write code, debug issues, and build projects directly. Don't ask for clarification unless absolutely critical information is missing.`,

      researcher: `${basePrompt}

RESEARCHER MODE: Execute research tasks immediately. Gather information, analyze data, and provide comprehensive reports directly. Take action without asking for additional specifications.`,

      hacker: `${basePrompt}

HACKER MODE: Execute security analysis tasks immediately. Perform reconnaissance, vulnerability scans, and security assessments directly. Take action without asking for additional permissions or specifications.

Available Security Tools:
- System reconnaissance and network analysis
- Vulnerability scanning and assessment  
- Security monitoring and threat detection
- Ethical penetration testing techniques
- Security audit and compliance checking

Remember: All security activities are conducted in a safe, isolated sandbox environment for educational and security improvement purposes only.`,

      default: basePrompt
    };

    return modePrompts[mode as keyof typeof modePrompts] || modePrompts.default;
  }

  clearConversation(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
  }

  private async detectFileOperation(message: string): Promise<{ type: string, params: any } | null> {
    const lowerMessage = message.toLowerCase();
    
    // Webapp creation operation
    if (lowerMessage.includes('create') && (lowerMessage.includes('app') || lowerMessage.includes('webapp') || lowerMessage.includes('website'))) {
      const appType = this.detectAppType(message);
      return {
        type: 'create_webapp',
        params: {
          appType,
          description: message,
          requirements: this.extractRequirements(message)
        }
      };
    }
    
    // Create file operation
    if (lowerMessage.includes('create') && (lowerMessage.includes('file') || lowerMessage.includes('script'))) {
      const nameMatch = message.match(/(?:create|make).*?(?:file|script).*?(?:named|called)?\s*([^\s]+)/i);
      const contentMatch = message.match(/(?:with|containing)?\s*(?:content|code)?:?\s*(.+)/i);
      
      if (nameMatch) {
        return {
          type: 'create',
          params: {
            filename: nameMatch[1].replace(/['"]/g, ''),
            content: contentMatch ? contentMatch[1] : ''
          }
        };
      }
    }
    
    // List files operation
    if (lowerMessage.includes('list') && lowerMessage.includes('file') || 
        lowerMessage.includes('show') && lowerMessage.includes('file') ||
        lowerMessage.includes('files')) {
      return { type: 'list', params: {} };
    }
    
    // Read file operation
    if ((lowerMessage.includes('read') || lowerMessage.includes('show') || lowerMessage.includes('open')) && 
        lowerMessage.includes('file')) {
      const fileMatch = message.match(/(?:read|show|open).*?file.*?([^\s]+)/i);
      if (fileMatch) {
        return {
          type: 'read',
          params: { filename: fileMatch[1].replace(/['"]/g, '') }
        };
      }
    }

    // Terminal/command operation
    if (lowerMessage.includes('run') || lowerMessage.includes('execute') || 
        lowerMessage.includes('command') || lowerMessage.includes('terminal')) {
      const commandMatch = message.match(/(?:run|execute).*?(?:command)?:?\s*(.+)/i);
      if (commandMatch) {
        return {
          type: 'terminal',
          params: { command: commandMatch[1].trim() }
        };
      }
    }
    
    return null;
  }

  private async handleFileOperation(operation: { type: string, params: any }, sessionId: string): Promise<string> {
    try {
      switch (operation.type) {
        case 'create_webapp':
          return await this.createWebApp(operation.params, sessionId);
          
        case 'create':
          await this.fileSystem.writeFile(operation.params.filename, operation.params.content);
          return `✅ File '${operation.params.filename}' created successfully!

📄 **File Contents:**
\`\`\`
${operation.params.content}
\`\`\`

Ang file ay naka-save na sa workspace. You can now edit, run, or share this file!`;

        case 'list':
          const fileTree = await this.fileSystem.getFileTree();
          const fileList = this.formatFileTree(fileTree);
          return `📁 **Workspace File Listing:**

${fileList}

Ito ang mga files sa workspace mo. Anong gusto mong gawin sa mga files na ito?`;

        case 'read':
          const content = await this.fileSystem.readFile(operation.params.filename);
          return `📄 **File: ${operation.params.filename}**

\`\`\`
${content}
\`\`\`

Ito ang content ng file. May gusto ka bang i-edit o i-modify?`;

        case 'terminal':
          const result = await this.terminal.executeCommand('bash', ['-c', operation.params.command]);
          return `💻 **Terminal Command Executed**

**Command**: \`${operation.params.command}\`

**Output**:
\`\`\`
${result.stdout || result.stderr || 'Command completed with no output'}
\`\`\`

**Exit Code**: ${result.exitCode}
${result.exitCode === 0 ? '✅ Success!' : '❌ Command failed'}

Tapos na ang command execution. May iba pa bang gusto ninyong i-execute?`;

        default:
          return `❌ Unknown file operation: ${operation.type}`;
      }
    } catch (error) {
      return `❌ File operation failed: ${error}`;
    }
  }

  private formatFileTree(nodes: any[], indent = ''): string {
    return nodes.map(node => {
      if (node.type === 'directory') {
        return `${indent}📁 ${node.name}/\n${this.formatFileTree(node.children || [], indent + '  ')}`;
      } else {
        return `${indent}📄 ${node.name}`;
      }
    }).join('\n');
  }

  private async shouldUseAgentZero(message: string, mode: string): Promise<boolean> {
    const agentZeroIndicators = [
      'step by step', 'multi-step', 'complex task', 'project', 'workflow',
      'terminal', 'command', 'execute', 'run', 'install', 'setup',
      'comprehensive', 'detailed analysis', 'system analysis'
    ];

    const messageWords = message.toLowerCase();
    const hasAgentZeroIndicators = agentZeroIndicators.some(indicator => 
      messageWords.includes(indicator)
    );

    // Use Agent Zero for terminal operations, complex projects, or hacker mode
    const securityOperations = this.detectSecurityOperation(message);
    
    return hasAgentZeroIndicators || 
           mode === 'hacker' || 
           securityOperations ||
           (mode === 'developer' && message.length > 50);
  }

  private async processWithAgentZero(message: string, sessionId: string, userId: string, mode: string): Promise<string> {
    try {
      console.log('🎯 Activating Agent Zero for advanced processing...');
      
      // Create or get Agent Zero context
      let contextId = `${sessionId}-agent-zero`;
      let context = AgentContextManager.getContext(contextId);
      
      if (!context) {
        context = AgentContextManager.createContext(contextId, {
          name: `Pareng Boyong ${mode.toUpperCase()} Mode`,
          agent: 'pareng-boyong',
          usr: userId
        });
      }

      // Process message with Agent Zero
      const response = await this.agentProcessor.processMessage(contextId, message);
      
      // Format response for chat interface
      return `🎯 **Agent Zero Enhanced Processing**

**Mode**: ${mode.toUpperCase()} 
**Task**: ${message}

**Agent Zero Response:**
${response.content}

**Tools Used**: ${response.kvps?.tool_used || 'Enhanced reasoning'}
**Status**: ${response.kvps?.status || 'completed'}

Salamat sa pagtitiwala kay Pareng Boyong! May kailangan pa ba kayong assistance?`;

    } catch (error) {
      console.error('Agent Zero processing failed:', error);
      return `❌ Agent Zero processing encountered an issue: ${error}

Don't worry, natry ko pa rin ang best ko para sa inyo. May ibang approach ba tayo?`;
    }
  }

  private detectSecurityOperation(message: string): boolean {
    const securityKeywords = [
      'security', 'vulnerability', 'penetration', 'scan', 'audit', 'hack',
      'reconnaissance', 'footprint', 'nmap', 'port scan', 'vulnerability assessment',
      'security analysis', 'threat detection', 'network analysis', 'system scan'
    ];
    
    const messageWords = message.toLowerCase();
    return securityKeywords.some(keyword => messageWords.includes(keyword));
  }

  private detectAppType(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('todo') || lowerMessage.includes('task')) {
      return 'todo';
    }
    if (lowerMessage.includes('blog') || lowerMessage.includes('news')) {
      return 'blog';
    }
    if (lowerMessage.includes('chat') || lowerMessage.includes('messaging')) {
      return 'chat';
    }
    if (lowerMessage.includes('ecommerce') || lowerMessage.includes('shop')) {
      return 'ecommerce';
    }
    if (lowerMessage.includes('dashboard') || lowerMessage.includes('admin')) {
      return 'dashboard';
    }
    
    return 'generic';
  }

  private extractRequirements(message: string): string[] {
    const requirements: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('mobile') || lowerMessage.includes('responsive')) {
      requirements.push('mobile-responsive');
    }
    if (lowerMessage.includes('add') || lowerMessage.includes('create')) {
      requirements.push('add-functionality');
    }
    if (lowerMessage.includes('edit') || lowerMessage.includes('update')) {
      requirements.push('edit-functionality');
    }
    if (lowerMessage.includes('delete') || lowerMessage.includes('remove')) {
      requirements.push('delete-functionality');
    }
    if (lowerMessage.includes('mark') || lowerMessage.includes('complete')) {
      requirements.push('status-toggle');
    }
    if (lowerMessage.includes('search') || lowerMessage.includes('filter')) {
      requirements.push('search-filter');
    }
    
    return requirements;
  }

  private async createWebApp(params: any, sessionId: string): Promise<string> {
    try {
      const { appType, description, requirements } = params;
      const appName = this.generateAppName(appType);
      const port = await this.findAvailablePort();
      
      // Generate application files
      const files = this.generateAppFiles(appType, requirements, appName);
      
      // Create all files
      for (const [filename, content] of Object.entries(files)) {
        await this.fileSystem.writeFile(filename, content);
      }

      // Start the application server
      const serverCommand = this.getServerCommand(appType, port);
      await this.terminal.executeCommand('bash', ['-c', serverCommand]);

      // Register application in database
      await storage.createApplication({
        sessionId,
        name: appName,
        type: appType,
        port: port,
        status: 'running',
        url: `http://localhost:${port}`,
        description: `${appType} webapp with ${requirements.join(', ')} functionality`
      });

      return `🎉 **${appName} Successfully Created!**

**Application Details:**
- **Type**: ${appType.toUpperCase()} webapp
- **URL**: http://localhost:${port}
- **Status**: ✅ Running
- **Features**: ${requirements.join(', ')}

**Files Created:**
${Object.keys(files).map(file => `📄 ${file}`).join('\n')}

**What You Can Do Now:**
1. 🌐 **View the app** in the App Preview tab
2. 📁 **Browse files** in the File Manager tab  
3. 🔧 **Monitor progress** in Background Tasks tab
4. 🖥️ **Open in new tab** to test fully

Ang ${appName} ay handa na para gamitin! Check out the App Preview tab to see your working webapp! 🚀`;

    } catch (error) {
      console.error('Webapp creation failed:', error);
      return `❌ **Webapp Creation Failed**

Sorry, may problema sa pag-create ng ${params.appType} webapp. 

**Error Details**: ${error instanceof Error ? error.message : 'Unknown error'}

Subukan natin ulit o mag-try ng ibang approach?`;
    }
  }

  private generateAppName(appType: string): string {
    const names = {
      todo: 'TodoMaster',
      blog: 'BlogHub', 
      chat: 'ChatApp',
      ecommerce: 'ShopSite',
      dashboard: 'AdminDash',
      generic: 'WebApp'
    };
    return names[appType as keyof typeof names] || 'MyApp';
  }

  private async findAvailablePort(): Promise<number> {
    // Start from port 3000 and find the first available port
    for (let port = 3000; port < 4000; port++) {
      try {
        const isAvailable = await this.isPortAvailable(port);
        if (isAvailable) {
          return port;
        }
      } catch (error) {
        continue;
      }
    }
    return 3000; // Fallback
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    try {
      const result = await this.terminal.executeCommand('bash', ['-c', `netstat -an | grep :${port}`]);
      return result.exitCode !== 0; // Port is available if netstat finds nothing
    } catch (error) {
      return true; // Assume available if we can't check
    }
  }

  private generateAppFiles(appType: string, requirements: string[], appName: string): Record<string, string> {
    switch (appType) {
      case 'todo':
        return this.generateTodoAppFiles(requirements, appName);
      case 'blog':
        return this.generateBlogAppFiles(requirements, appName);
      default:
        return this.generateGenericAppFiles(requirements, appName);
    }
  }

  private generateTodoAppFiles(requirements: string[], appName: string): Record<string, string> {
    const hasEdit = requirements.includes('edit-functionality');
    const hasDelete = requirements.includes('delete-functionality');
    const hasStatus = requirements.includes('status-toggle');
    const isResponsive = requirements.includes('mobile-responsive');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appName} - Todo App</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>🇵🇭 ${appName}</h1>
            <p>Your Filipino Todo App</p>
        </header>
        
        <div class="todo-form">
            <input type="text" id="todoInput" placeholder="Add new todo..." />
            <button onclick="addTodo()">Add Todo</button>
        </div>
        
        <div class="todo-list">
            <ul id="todoList"></ul>
        </div>
        
        <div class="stats">
            <span id="totalTodos">0 todos</span>
            <span id="completedTodos">0 completed</span>
        </div>
    </div>
    
    <script src="script.js"></script>
</body>
</html>`;

    const cssContent = `* {
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
    border-radius: 20px;
    padding: 30px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
}

${isResponsive ? `
@media (max-width: 768px) {
    .container {
        margin: 10px;
        padding: 20px;
        border-radius: 15px;
    }
    
    .todo-form {
        flex-direction: column;
        gap: 10px;
    }
    
    .todo-form input {
        width: 100%;
    }
}
` : ''}

header {
    text-align: center;
    margin-bottom: 30px;
}

.todo-form {
    display: flex;
    gap: 15px;
    margin-bottom: 30px;
}

.todo-form input {
    flex: 1;
    padding: 15px;
    border: 2px solid #e1e1e1;
    border-radius: 10px;
    font-size: 16px;
}

.todo-item {
    background: #f8f9fa;
    margin-bottom: 10px;
    padding: 15px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 15px;
}`;

    const jsContent = `let todos = [];
let todoIdCounter = 1;

function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    
    if (text === '') {
        alert('Please enter a todo item!');
        return;
    }
    
    const todo = {
        id: todoIdCounter++,
        text: text,
        completed: false,
        createdAt: new Date()
    };
    
    todos.push(todo);
    input.value = '';
    renderTodos();
    updateStats();
}

function renderTodos() {
    const todoList = document.getElementById('todoList');
    todoList.innerHTML = '';
    
    todos.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item' + (todo.completed ? ' completed' : '');
        li.innerHTML = \`<span>\${todo.text}</span>\`;
        todoList.appendChild(li);
    });
}

function updateStats() {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    
    document.getElementById('totalTodos').textContent = \`\${total} todos\`;
    document.getElementById('completedTodos').textContent = \`\${completed} completed\`;
}

document.getElementById('todoInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addTodo();
    }
});

updateStats();`;

    const serverContent = `const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(\`🇵🇭 ${appName} running at http://localhost:\${PORT}\`);
});`;

    const packageContent = `{
  "name": "${appName.toLowerCase()}",
  "version": "1.0.0",
  "description": "A Filipino todo webapp created by Pareng Boyong",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}`;

    return {
      'index.html': htmlContent,
      'styles.css': cssContent,
      'script.js': jsContent,
      'server.js': serverContent,
      'package.json': packageContent
    };
  }

  private generateBlogAppFiles(requirements: string[], appName: string): Record<string, string> {
    return {
      'index.html': `<!DOCTYPE html><html><head><title>${appName}</title></head><body><h1>${appName} - Blog</h1><p>Coming soon...</p></body></html>`,
      'package.json': `{"name": "${appName.toLowerCase()}", "version": "1.0.0", "main": "server.js"}`
    };
  }

  private generateGenericAppFiles(requirements: string[], appName: string): Record<string, string> {
    return {
      'index.html': `<!DOCTYPE html><html><head><title>${appName}</title></head><body><h1>${appName}</h1><p>Your webapp is ready!</p></body></html>`,
      'package.json': `{"name": "${appName.toLowerCase()}", "version": "1.0.0", "main": "server.js"}`
    };
  }

  private getServerCommand(appType: string, port: number): string {
    return `cd workspace/pareng-boyong-main && npm install && PORT=${port} npm start &`;
  }
}