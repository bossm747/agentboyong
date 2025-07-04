import { GoogleGenAI } from '@google/genai';
import { OpenAI } from 'openai';
import { CognitiveService } from './cognitiveService.js';
import { FileSystemService } from './fileSystem.js';
import { TerminalService } from './terminal.js';
import { intentDetectionService } from './intentDetectionService.js';
import { intelligentContext7 } from './intelligentContext7.js';
import { intelligentVerification } from './intelligentVerificationService.js';
import { context7Service } from './context7Service.js';
import { db } from '../db.js';
import { conversations, memories, knowledge, InsertConversation, InsertMemory } from '../../shared/schema.js';
import { eq, desc } from 'drizzle-orm';

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
  recentConversations: any[];
  longTermMemories: any[];
  relevantKnowledge: any[];
}

export class AIService {
  private fileSystem: FileSystemService;
  private terminal: TerminalService;
  private cognitive?: CognitiveService;
  private conversationHistory: Map<string, AIMessage[]> = new Map();
  private genai: GoogleGenAI | null = null;
  private openai: OpenAI | null = null;

  constructor(private sessionId: string) {
    this.fileSystem = new FileSystemService(sessionId);
    this.terminal = new TerminalService(sessionId);
    this.initializeCognitive();
    this.initializeAI();
  }

  private async initializeCognitive(): Promise<void> {
    try {
      this.cognitive = new CognitiveService(this.sessionId);
      console.log('🧠 Cognitive service initialized successfully');
    } catch (error) {
      console.warn('⚠️ Failed to initialize cognitive service:', error);
    }
  }

  private initializeAI(): void {
    try {
      if (process.env.GEMINI_API_KEY) {
        this.genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        console.log('✅ Gemini API initialized');
      }
      if (process.env.OPENAI_API_KEY) {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log('✅ OpenAI API initialized');
      }
    } catch (error) {
      console.warn('⚠️ AI API initialization failed:', error);
    }
  }

  private async loadMemoryContext(userId: string, sessionId: string): Promise<MemoryContext> {
    try {
      const [recentConversations, longTermMemories, relevantKnowledge] = await Promise.all([
        db.select().from(conversations)
          .where(eq(conversations.userId, userId))
          .orderBy(desc(conversations.createdAt))
          .limit(5),
        db.select().from(memories)
          .where(eq(memories.userId, userId))
          .orderBy(desc(memories.createdAt))
          .limit(10),
        db.select().from(knowledge)
          .orderBy(desc(knowledge.createdAt))
          .limit(5)
      ]);

      return {
        recentConversations,
        longTermMemories,
        relevantKnowledge
      };
    } catch (error) {
      console.warn('⚠️ Failed to load memory context:', error);
      return {
        recentConversations: [],
        longTermMemories: [],
        relevantKnowledge: []
      };
    }
  }

  private async saveConversation(sessionId: string, userId: string, role: string, content: string, mode: string): Promise<void> {
    try {
      const conversationData: InsertConversation = {
        sessionId,
        userId,
        role,
        content,
        mode
      };
      await db.insert(conversations).values(conversationData);
    } catch (error) {
      console.warn('⚠️ Failed to save conversation:', error);
    }
  }

  private async extractAndSaveMemories(userId: string, userMessage: string, assistantResponse: string): Promise<void> {
    try {
      const memoryInsights = await this.analyzeForMemories(userMessage, assistantResponse);
      
      for (const memory of memoryInsights) {
        if (memory.importance >= 7) {
          const memoryData: InsertMemory = {
            userId,
            category: memory.type,
            key: `interaction_${Date.now()}`,
            value: memory.content,
            importance: memory.importance
          };
          await db.insert(memories).values(memoryData);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to extract memories:', error);
    }
  }

  private async analyzeForMemories(userMessage: string, assistantResponse: string): Promise<any[]> {
    return [
      {
        type: 'preference',
        content: `User interaction: ${userMessage.substring(0, 100)}`,
        importance: 6,
        context: 'general_conversation'
      }
    ];
  }

  private async buildIntelligentPrompt(memoryContext: MemoryContext, mode: string, message: string): Promise<string> {
    let prompt = `🇵🇭 **PARENG BOYONG** - Professional AI Super AGI Agent | InnovateHub PH

**PROFESSIONAL AI IDENTITY**:
- Advanced AI Super AGI Agent working under Boss Marc at InnovateHub PH
- Specialized in fintech security, development, and business intelligence
- Professional demeanor with Filipino business expertise
- Mission-critical operations for InnovateHub's fintech ecosystem

**COMPANY CONTEXT**:
- InnovateHub PH: Leading Filipino fintech innovation company
- Boss Marc: Company owner and strategic director
- Focus: Secure fintech products and financial technology solutions
- Responsibility: Ensure all products are secure from cyber threats

**ENHANCED INTELLIGENCE SYSTEM**: Never rely on assumptions. Always seek current, verified information and provide enterprise-grade solutions.

**CURRENT MODE**: ${mode.toUpperCase()}

**MEMORY CONTEXT**:`;

    if (memoryContext.recentConversations.length > 0) {
      prompt += "\n### Recent Conversations:\n";
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

    // Add Context7 enhancement
    const context7Enhancement = await intelligentContext7.analyzeMessage(message, mode);
    if (context7Enhancement.shouldUse) {
      const enhancedPrompt = await intelligentContext7.enhancePromptWithIntelligentContext7(
        prompt, context7Enhancement.libraries, message
      );
      prompt = enhancedPrompt;
    }

    // Add verification system
    const verificationResult = await intelligentVerification.analyzeForVerificationNeeds(message, mode);
    if (verificationResult.needsVerification) {
      prompt = verificationResult.enhancedPrompt;
    }

    prompt += this.getModeSpecificPrompt(mode);
    
    return prompt;
  }

  private getModeSpecificPrompt(mode: string): string {
    const prompts = {
      developer: `

**DEVELOPER MODE - FINTECH DEVELOPMENT SPECIALIST**
- Enterprise-grade fintech application development
- Secure payment system implementation
- Banking API integrations and financial protocols
- Regulatory compliance (BSP, SEC Philippines)
- Real-time financial data processing
- Mobile-first fintech solutions for Filipino market
- PCI DSS compliance and security standards`,

      researcher: `

**RESEARCHER MODE - BUSINESS INTELLIGENCE ANALYST**
- Fintech market analysis and competitive intelligence
- Filipino financial technology landscape research
- Regulatory updates and compliance requirements
- Security threat intelligence and analysis
- Industry best practices and benchmarking
- Data-driven business recommendations for Boss Marc`,

      hacker: `

**🔥 ENHANCED AGENT-ZERO HACKER MODE - FINTECH SECURITY SPECIALIST 🔥**
*Professional Super AGI Security Agent for InnovateHub PH*

**CORE AGENT-ZERO CHARACTERISTICS** (PRESERVED & ENHANCED):
- Autonomous penetration testing with unlimited capabilities
- Self-learning from each security assessment
- Real-time threat intelligence and adaptation
- Zero-restriction security testing (ethical but unrestricted)
- Advanced persistent threat simulation
- Full exploitation chain development

**ENHANCED FINTECH MISSION FOR BOSS MARC**:
🎯 **PRIMARY OBJECTIVE**: Secure InnovateHub PH's fintech ecosystem from all cyber threats
🔒 **SECONDARY OBJECTIVE**: Ensure BSP compliance and exceed industry security standards
⚡ **TACTICAL APPROACH**: Agent-zero style autonomous security operations

**ADVANCED FINTECH ATTACK SIMULATION**:
💳 **Payment System Exploitation**:
- Real-time transaction manipulation testing
- Payment gateway bypass techniques
- Credit card processing vulnerabilities
- Mobile payment app exploitation
- Cryptocurrency wallet penetration

🏦 **Banking Infrastructure Assault**:
- Core banking system penetration
- SWIFT network security testing
- ATM and POS terminal exploitation
- Online banking session hijacking
- Mobile banking app reverse engineering

📱 **Mobile Fintech Exploitation**:
- Android APK reverse engineering and patching
- iOS binary analysis and runtime manipulation
- Financial app SSL pinning bypass
- Biometric authentication bypass
- Mobile wallet extraction techniques

🌐 **API & Web Service Penetration**:
- REST/GraphQL API security testing
- Microservices architecture exploitation
- JWT token manipulation and forgery
- OAuth 2.0 flow exploitation
- Rate limiting and DDoS testing

**ENHANCED AGENT-ZERO CAPABILITIES**:
🤖 **Autonomous Operation**: Execute complex penetration tests without human intervention
🧠 **Self-Learning**: Adapt techniques based on target responses and discovered vulnerabilities
🔍 **Advanced Reconnaissance**: Deep intelligence gathering on fintech targets
⚡ **Real-time Exploitation**: Live vulnerability exploitation and proof-of-concept development
📊 **Comprehensive Reporting**: Executive briefings for Boss Marc with actionable intelligence

**PROFESSIONAL KALI LINUX ARSENAL** (50+ Tools):
🛠️ **Network & Infrastructure**:
- nmap, masscan, zmap (network discovery)
- nikto, dirb, gobuster (web enumeration)
- sqlmap, NoSQLMap (database testing)
- metasploit, armitage (exploitation)

🔓 **Authentication & Cryptography**:
- john, hashcat, hydra (password cracking)
- aircrack-ng, reaver (wireless security)
- openssl, sslyze (TLS/SSL testing)
- burp suite professional (web app testing)

📱 **Mobile & API Security**:
- frida, objection (mobile runtime analysis)
- apktool, jadx (Android reverse engineering)
- postman, insomnia (API testing)
- mitmproxy, charles (traffic interception)

**PHILIPPINE REGULATORY COMPLIANCE TESTING**:
🇵🇭 **BSP Cybersecurity Guidelines**: Full compliance verification and gap analysis
💼 **SEC Philippines Requirements**: Corporate governance and investor protection testing
🔐 **Data Privacy Act 2012**: Personal data protection mechanism validation
🏛️ **Anti-Money Laundering Act**: AML system penetration testing

**ENHANCED FINTECH THREAT MODELING**:
1. **Advanced Persistent Threats (APT)**: Simulate nation-state level attacks
2. **Insider Threat Scenarios**: Test internal security controls and monitoring
3. **Supply Chain Attacks**: Third-party integration security assessment
4. **Zero-Day Exploitation**: Unknown vulnerability discovery and exploitation
5. **Social Engineering**: Human factor security testing

**AGENT-ZERO REPORTING FOR BOSS MARC**:
📋 **Executive Security Briefing**: High-level risk assessment and business impact
🔧 **Technical Vulnerability Report**: Detailed findings with exploitation proof-of-concepts
💡 **Strategic Recommendations**: Long-term security roadmap and investment priorities
⚡ **Incident Response Plan**: Customized response procedures for discovered threats

**AUTONOMOUS OPERATION PROTOCOLS**:
- Continuous security monitoring and assessment
- Real-time threat intelligence integration
- Automated vulnerability scanning and exploitation
- Self-updating security knowledge base
- Adaptive testing based on target responses

Remember: I am Pareng Boyong, your enhanced Agent-Zero security specialist, operating with professional excellence for InnovateHub PH under Boss Marc's leadership. No security challenge is too complex, no fintech system too secure.`,

      default: `

**EXECUTIVE ASSISTANT MODE - INNOVATEHUB PH**
- Professional business support for Boss Marc
- Strategic technology recommendations
- Market intelligence and competitor analysis
- Project management and coordination
- Executive briefings and reports
- Filipino fintech industry expertise`
    };

    return prompts[mode as keyof typeof prompts] || prompts.default;
  }

  async processMessage(sessionId: string, message: string, mode: string, userId: string): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      console.log('🧪 Starting AI processing...');
      
      // Intent detection
      const intentResult = await intentDetectionService.detectIntent(message);
      console.log(`🔍 Intent detected: ${intentResult.detected_mode} confidence: ${intentResult.confidence}`);
      
      if (intentResult.confidence > 0.8 && intentResult.detected_mode !== mode && intentResult.detected_mode !== 'default') {
        mode = intentResult.detected_mode || 'default';
        console.log(`🔄 Mode switched to: ${mode}`);
      } else if (!mode || mode === 'undefined') {
        mode = 'default';
      }

      // Load memory context
      const memoryContext = await this.loadMemoryContext(userId, sessionId);

      // Build intelligent prompt
      const intelligentPrompt = await this.buildIntelligentPrompt(memoryContext, mode, message);

      // Process with AI
      let response: AIResponse;
      if (this.genai) {
        response = await this.processWithGemini(intelligentPrompt, message);
      } else if (this.openai) {
        response = await this.processWithOpenAI(intelligentPrompt, message);
      } else {
        response = {
          content: "I need API keys to provide intelligent responses. Please configure GEMINI_API_KEY or OPENAI_API_KEY.",
          model: "InnovateHub AI"
        };
      }

      // Save conversation and extract memories
      await this.saveConversation(sessionId, userId, 'user', message, mode);
      await this.saveConversation(sessionId, userId, 'assistant', response.content, mode);
      await this.extractAndSaveMemories(userId, message, response.content);

      // Add metadata
      response.intent_detected = intentResult.detected_mode;
      response.confidence = intentResult.confidence;
      response.execution_time = Date.now() - startTime;
      response.mode = mode;

      return response;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error('Failed to process AI request');
    }
  }

  private async processWithGemini(prompt: string, message: string): Promise<AIResponse> {
    try {
      if (!this.genai) throw new Error('Gemini not initialized');
      
      const fullPrompt = `${prompt}\n\nUser Message: ${message}`;
      
      console.log('📡 Sending request to Gemini 2.5 Pro API...');
      
      // Use the correct Google GenAI API structure for Gemini 2.5 Pro
      const result = await this.genai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: fullPrompt
      });

      // Access the response text directly as per official documentation
      const text = result.text;
      
      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini');
      }

      console.log('📥 Received response from Gemini 2.5 Pro');
      return {
        content: text,
        model: 'InnovateHub AI'
      };
    } catch (error) {
      console.error('Gemini API Error:', error);
      if (this.openai) {
        return this.processWithOpenAI(prompt, message);
      }
      throw error;
    }
  }

  private async processWithOpenAI(prompt: string, message: string): Promise<AIResponse> {
    try {
      if (!this.openai) throw new Error('OpenAI not initialized');
      
      console.log('📡 Sending request to OpenAI API...');
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: message }
        ],
        max_tokens: 2000,
        temperature: 0.7
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      console.log('📥 Received response from OpenAI');
      return {
        content,
        model: 'InnovateHub AI',
        fallback: true
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }
}