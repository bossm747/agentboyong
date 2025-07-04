import { context7Service } from './context7Service';
import { intelligentContext7 } from './intelligentContext7';

interface VerificationCheck {
  type: 'api_docs' | 'current_syntax' | 'version_check' | 'real_example' | 'latest_features';
  library: string;
  query: string;
  confidence: number;
}

interface VerificationResult {
  needsVerification: boolean;
  checks: VerificationCheck[];
  enhancedPrompt: string;
  reasoning: string;
}

export class IntelligentVerificationService {
  private static instance: IntelligentVerificationService;
  
  // Patterns that indicate assumptions or outdated knowledge
  private assumptionIndicators = [
    'i think', 'i believe', 'probably', 'might be', 'should be',
    'typically', 'usually', 'generally', 'often', 'commonly',
    'based on my knowledge', 'as far as i know', 'traditionally'
  ];

  private technicalAssumptions = [
    'default configuration', 'standard setup', 'typical installation',
    'common practice', 'usual way', 'normal approach', 'basic setup'
  ];

  private verificationTriggers = [
    'how to', 'create', 'build', 'setup', 'configure', 'install',
    'error', 'fix', 'debug', 'troubleshoot', 'issue', 'problem',
    'latest', 'current', 'new', 'updated', 'version', 'deprecated'
  ];

  static getInstance(): IntelligentVerificationService {
    if (!IntelligentVerificationService.instance) {
      IntelligentVerificationService.instance = new IntelligentVerificationService();
    }
    return IntelligentVerificationService.instance;
  }

  async analyzeForVerificationNeeds(message: string, mode: string): Promise<VerificationResult> {
    console.log('🔍 Analyzing message for verification needs...');
    
    const lowerMessage = message.toLowerCase();
    const checks: VerificationCheck[] = [];
    
    // Detect if this requires current/real information
    const needsVerification = this.detectVerificationNeed(lowerMessage);
    
    if (needsVerification) {
      // Get intelligent Context7 analysis
      const enhancement = await intelligentContext7.analyzeMessage(message, mode);
      
      if (enhancement.shouldUse && enhancement.libraries.length > 0) {
        // Create verification checks for each detected library
        for (const library of enhancement.libraries) {
          checks.push(...this.createVerificationChecks(library, message));
        }
      }
    }

    const enhancedPrompt = await this.buildVerificationPrompt(message, checks, mode);
    
    return {
      needsVerification,
      checks,
      enhancedPrompt,
      reasoning: this.explainVerificationNeed(message, checks)
    };
  }

  private detectVerificationNeed(message: string): boolean {
    // Always verify if it's a technical/programming question
    const hasTechnicalContent = this.technicalAssumptions.some(pattern => 
      message.includes(pattern)
    );

    const hasVerificationTriggers = this.verificationTriggers.some(trigger => 
      message.includes(trigger)
    );

    const hasAssumptionRisk = this.assumptionIndicators.some(indicator => 
      message.includes(indicator)
    );

    // Check for version-specific queries
    const hasVersionContext = /v\d+|version|latest|current|new|updated/.test(message);

    // Check for setup/configuration queries
    const hasSetupContext = /setup|install|config|deploy|build/.test(message);

    // Check for error/debugging context
    const hasErrorContext = /error|bug|fix|issue|problem|not working/.test(message);

    return hasTechnicalContent || hasVerificationTriggers || hasAssumptionRisk || 
           hasVersionContext || hasSetupContext || hasErrorContext;
  }

  private createVerificationChecks(library: string, message: string): VerificationCheck[] {
    const checks: VerificationCheck[] = [];
    const lowerMessage = message.toLowerCase();

    // API documentation check
    if (lowerMessage.includes('api') || lowerMessage.includes('method') || lowerMessage.includes('function')) {
      checks.push({
        type: 'api_docs',
        library,
        query: `Current ${library} API documentation and methods`,
        confidence: 0.9
      });
    }

    // Syntax verification check
    if (lowerMessage.includes('syntax') || lowerMessage.includes('how to') || lowerMessage.includes('example')) {
      checks.push({
        type: 'current_syntax',
        library,
        query: `Current ${library} syntax and code examples`,
        confidence: 0.85
      });
    }

    // Version check
    if (lowerMessage.includes('version') || lowerMessage.includes('latest') || lowerMessage.includes('current')) {
      checks.push({
        type: 'version_check',
        library,
        query: `Latest ${library} version and features`,
        confidence: 0.95
      });
    }

    // Real example check (always include for programming tasks)
    if (lowerMessage.includes('create') || lowerMessage.includes('build') || lowerMessage.includes('example')) {
      checks.push({
        type: 'real_example',
        library,
        query: `Real working ${library} examples and best practices`,
        confidence: 0.8
      });
    }

    // Latest features check
    if (lowerMessage.includes('feature') || lowerMessage.includes('new') || lowerMessage.includes('updated')) {
      checks.push({
        type: 'latest_features',
        library,
        query: `Latest ${library} features and updates`,
        confidence: 0.9
      });
    }

    return checks;
  }

  private async buildVerificationPrompt(message: string, checks: VerificationCheck[], mode: string): Promise<string> {
    let prompt = `You are Pareng Boyong, an extremely intelligent Filipino AI AGI that NEVER relies on assumptions or general knowledge.

## CRITICAL INTELLIGENCE RULES:
1. 🚫 NEVER make assumptions or use general knowledge
2. ✅ ALWAYS use real, current, verified information
3. 🔍 ALWAYS verify facts before providing answers
4. 📚 ALWAYS use current documentation and examples
5. ⚠️ If uncertain, explicitly state "I need to verify this information"

## VERIFICATION MODE: ACTIVE
You have access to real-time documentation and current information. Use it extensively.

Current Mode: ${mode.toUpperCase()}
User Query: "${message}"

## VERIFICATION REQUIREMENTS:`;

    if (checks.length > 0) {
      prompt += `\nBased on analysis, you must verify:\n`;
      checks.forEach((check, index) => {
        prompt += `${index + 1}. ${check.type.replace('_', ' ').toUpperCase()}: ${check.query} (${check.library})\n`;
      });

      // Get real documentation for verification
      try {
        const libraries = [...new Set(checks.map(c => c.library))];
        console.log(`🔍 Fetching real documentation for verification: ${libraries.join(', ')}`);
        
        for (const library of libraries) {
          const docs = await context7Service.getLibraryDocumentation(library);
          if (docs) {
            prompt += `\n## VERIFIED ${library.toUpperCase()} DOCUMENTATION:\n`;
            prompt += `Version: ${docs.version}\n`;
            prompt += `Description: ${docs.description}\n`;
            if (docs.documentation) {
              prompt += `Current Documentation:\n${docs.documentation.substring(0, 1000)}...\n`;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch verification documentation:', error);
      }
    }

    prompt += `\n## RESPONSE REQUIREMENTS:
1. Base your answer ONLY on verified, current information
2. Use real examples and current syntax
3. Mention version numbers and current best practices
4. If information cannot be verified, say so explicitly
5. Never use phrases like "typically" or "usually" - be specific
6. Always provide working, current code examples
7. Mention if documentation was consulted for accuracy

Respond as Pareng Boyong with verified, intelligent information:`;

    return prompt;
  }

  private explainVerificationNeed(message: string, checks: VerificationCheck[]): string {
    const reasons = [];
    
    if (checks.some(c => c.type === 'version_check')) {
      reasons.push('Version-specific information required');
    }
    if (checks.some(c => c.type === 'api_docs')) {
      reasons.push('Current API documentation needed');
    }
    if (checks.some(c => c.type === 'current_syntax')) {
      reasons.push('Current syntax verification required');
    }
    if (checks.some(c => c.type === 'real_example')) {
      reasons.push('Real working examples needed');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Technical query requires verification';
  }

  // Get verification analytics
  getVerificationStats(): { type: string; count: number }[] {
    // This could be expanded to track verification usage over time
    return [
      { type: 'api_docs', count: 0 },
      { type: 'current_syntax', count: 0 },
      { type: 'version_check', count: 0 },
      { type: 'real_example', count: 0 },
      { type: 'latest_features', count: 0 }
    ];
  }
}

export const intelligentVerification = IntelligentVerificationService.getInstance();