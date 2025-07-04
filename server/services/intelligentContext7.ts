import { context7Service } from './context7Service';

interface CodeAnalysis {
  detectedLanguages: string[];
  detectedLibraries: string[];
  detectedPatterns: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  confidence: number;
}

interface Context7Enhancement {
  shouldUse: boolean;
  libraries: string[];
  reason: string;
  priority: 'low' | 'medium' | 'high';
}

export class IntelligentContext7Service {
  private static instance: IntelligentContext7Service;
  private knowledgeTriggers: Map<string, string[]> = new Map();
  private usageHistory: Map<string, number> = new Map();

  constructor() {
    this.initializeKnowledgeTriggers();
  }

  static getInstance(): IntelligentContext7Service {
    if (!IntelligentContext7Service.instance) {
      IntelligentContext7Service.instance = new IntelligentContext7Service();
    }
    return IntelligentContext7Service.instance;
  }

  private initializeKnowledgeTriggers(): void {
    // Programming-related triggers
    this.knowledgeTriggers.set('react', [
      'component', 'jsx', 'hook', 'usestate', 'useeffect', 'props', 'state management',
      'create react app', 'next.js', 'router', 'context api', 'redux'
    ]);

    this.knowledgeTriggers.set('express', [
      'server', 'api', 'route', 'middleware', 'req', 'res', 'app.get', 'app.post',
      'node.js server', 'rest api', 'backend'
    ]);

    this.knowledgeTriggers.set('mongodb', [
      'database', 'collection', 'document', 'mongoose', 'schema', 'query',
      'find', 'insert', 'update', 'delete', 'nosql'
    ]);

    this.knowledgeTriggers.set('typescript', [
      'interface', 'type', 'generic', 'enum', 'class', 'namespace',
      'compile', 'tsc', 'types', 'declaration'
    ]);

    this.knowledgeTriggers.set('tailwind', [
      'css', 'utility', 'responsive', 'dark mode', 'grid', 'flex',
      'margin', 'padding', 'color', 'styling'
    ]);

    this.knowledgeTriggers.set('prisma', [
      'orm', 'database', 'migration', 'schema', 'generate', 'client',
      'query', 'relation', 'model'
    ]);

    this.knowledgeTriggers.set('next.js', [
      'app router', 'pages', 'server components', 'client components',
      'middleware', 'api routes', 'deployment'
    ]);

    this.knowledgeTriggers.set('python', [
      'pandas', 'numpy', 'matplotlib', 'requests', 'flask', 'django',
      'fastapi', 'sqlalchemy', 'pytorch', 'tensorflow'
    ]);
  }

  async analyzeMessage(message: string, mode: string): Promise<Context7Enhancement> {
    console.log('🔍 Analyzing message for Context7 enhancement...');
    
    const analysis = this.performCodeAnalysis(message);
    const enhancement = this.determineContext7Usage(message, analysis, mode);
    
    // Track usage for learning
    if (enhancement.shouldUse) {
      enhancement.libraries.forEach(lib => {
        const count = this.usageHistory.get(lib) || 0;
        this.usageHistory.set(lib, count + 1);
      });
    }

    console.log('📊 Context7 Analysis Result:', {
      shouldUse: enhancement.shouldUse,
      libraries: enhancement.libraries,
      reason: enhancement.reason,
      priority: enhancement.priority
    });

    return enhancement;
  }

  private performCodeAnalysis(message: string): CodeAnalysis {
    const lowerMessage = message.toLowerCase();
    const detectedLanguages: string[] = [];
    const detectedLibraries: string[] = [];
    const detectedPatterns: string[] = [];

    // Language detection
    const languageKeywords = {
      'javascript': ['js', 'javascript', 'node', 'npm', 'yarn'],
      'typescript': ['ts', 'typescript', 'interface', 'type'],
      'python': ['python', 'py', 'pip', 'conda', 'venv'],
      'react': ['react', 'jsx', 'component', 'hook'],
      'css': ['css', 'styling', 'design', 'layout']
    };

    for (const [language, keywords] of Object.entries(languageKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        detectedLanguages.push(language);
      }
    }

    // Library detection using knowledge triggers
    for (const [library, triggers] of this.knowledgeTriggers.entries()) {
      const matches = triggers.filter(trigger => lowerMessage.includes(trigger));
      if (matches.length > 0) {
        detectedLibraries.push(library);
        detectedPatterns.push(...matches);
      }
    }

    // Code pattern detection
    const codePatterns = [
      'create', 'build', 'implement', 'develop', 'code', 'write',
      'fix', 'debug', 'error', 'issue', 'problem',
      'how to', 'tutorial', 'example', 'documentation'
    ];

    const foundPatterns = codePatterns.filter(pattern => lowerMessage.includes(pattern));
    detectedPatterns.push(...foundPatterns);

    // Determine complexity
    let complexity: CodeAnalysis['complexity'] = 'simple';
    if (detectedLibraries.length > 2 || detectedLanguages.length > 1) {
      complexity = 'complex';
    } else if (detectedLibraries.length > 0 && detectedPatterns.length > 2) {
      complexity = 'moderate';
    }

    const confidence = Math.min(
      (detectedLibraries.length * 0.4 + detectedPatterns.length * 0.2 + detectedLanguages.length * 0.3) * 100,
      100
    );

    return {
      detectedLanguages,
      detectedLibraries,
      detectedPatterns,
      complexity,
      confidence
    };
  }

  private determineContext7Usage(message: string, analysis: CodeAnalysis, mode: string): Context7Enhancement {
    const { detectedLibraries, complexity, confidence } = analysis;
    
    // Auto-use Context7 in developer mode for any programming task
    if (mode === 'developer' && detectedLibraries.length > 0) {
      return {
        shouldUse: true,
        libraries: detectedLibraries,
        reason: 'Developer mode: Programming task detected with specific libraries',
        priority: 'high'
      };
    }

    // High confidence code-related queries
    if (confidence > 60 && detectedLibraries.length > 0) {
      return {
        shouldUse: true,
        libraries: detectedLibraries,
        reason: `High confidence (${confidence.toFixed(0)}%) programming query detected`,
        priority: confidence > 80 ? 'high' : 'medium'
      };
    }

    // Complex multi-library scenarios
    if (complexity === 'complex') {
      return {
        shouldUse: true,
        libraries: detectedLibraries.slice(0, 3), // Limit to top 3 libraries
        reason: 'Complex multi-library scenario requiring current documentation',
        priority: 'high'
      };
    }

    // Tutorial or learning requests
    const learningKeywords = ['learn', 'tutorial', 'example', 'how to', 'guide', 'documentation'];
    if (learningKeywords.some(keyword => message.toLowerCase().includes(keyword)) && detectedLibraries.length > 0) {
      return {
        shouldUse: true,
        libraries: detectedLibraries,
        reason: 'Learning/tutorial request requiring current examples',
        priority: 'medium'
      };
    }

    // Error or debugging scenarios
    const debugKeywords = ['error', 'bug', 'fix', 'debug', 'issue', 'problem', 'not working'];
    if (debugKeywords.some(keyword => message.toLowerCase().includes(keyword)) && detectedLibraries.length > 0) {
      return {
        shouldUse: true,
        libraries: detectedLibraries,
        reason: 'Debugging scenario requiring current API documentation',
        priority: 'high'
      };
    }

    // Frequently used libraries (based on history)
    const frequentLibraries = detectedLibraries.filter(lib => (this.usageHistory.get(lib) || 0) > 3);
    if (frequentLibraries.length > 0) {
      return {
        shouldUse: true,
        libraries: frequentLibraries,
        reason: 'Frequently used libraries detected in user history',
        priority: 'medium'
      };
    }

    return {
      shouldUse: false,
      libraries: [],
      reason: 'No strong indicators for Context7 enhancement needed',
      priority: 'low'
    };
  }

  async enhancePromptWithIntelligentContext7(
    originalPrompt: string, 
    message: string, 
    mode: string
  ): Promise<string> {
    try {
      const enhancement = await this.analyzeMessage(message, mode);
      
      if (!enhancement.shouldUse) {
        console.log('ℹ️ Context7 not needed for this query');
        return originalPrompt;
      }

      console.log(`🚀 Automatically using Context7 for libraries: ${enhancement.libraries.join(', ')}`);
      console.log(`📝 Reason: ${enhancement.reason}`);

      // Fetch documentation for detected libraries
      const enhancedPrompt = await context7Service.enhancePromptWithDocumentation(
        originalPrompt,
        enhancement.libraries
      );

      console.log('✅ Prompt enhanced with real-time documentation');
      return enhancedPrompt;
      
    } catch (error) {
      console.warn('⚠️ Context7 auto-enhancement failed:', error);
      return originalPrompt;
    }
  }

  // Analytics for learning and improvement
  getUsageAnalytics(): { library: string; usage: number }[] {
    return Array.from(this.usageHistory.entries())
      .map(([library, usage]) => ({ library, usage }))
      .sort((a, b) => b.usage - a.usage);
  }

  // Get suggestions for user based on patterns
  getSuggestedLibraries(message: string): string[] {
    const analysis = this.performCodeAnalysis(message);
    return analysis.detectedLibraries.slice(0, 5);
  }
}

export const intelligentContext7 = IntelligentContext7Service.getInstance();