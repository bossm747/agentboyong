export interface IntentPattern {
  mode: string;
  keywords: string[];
  phrases: string[];
  context_clues: string[];
  confidence_weight: number;
  examples: string[];
}

export interface DetectionResult {
  detected_mode: string;
  confidence: number;
  reasoning: string[];
  alternative_modes: { mode: string; confidence: number }[];
}

export class IntentDetectionService {
  private static instance: IntentDetectionService;
  
  private intentPatterns: IntentPattern[] = [
    {
      mode: "hacker",
      keywords: [
        "hack", "exploit", "penetration", "security", "vulnerability", "attack", 
        "crack", "breach", "scan", "enumerate", "inject", "bypass", "backdoor",
        "payload", "shell", "rootkit", "malware", "trojan", "virus", "worm",
        "phishing", "social engineering", "reconnaissance", "footprint",
        "nmap", "sqlmap", "metasploit", "burp", "nikto", "hashcat", "john",
        "wireshark", "tcpdump", "aircrack", "hydra", "dirb", "gobuster"
      ],
      phrases: [
        "test for vulnerabilities", "find security flaws", "penetration test",
        "security assessment", "ethical hacking", "red team", "blue team",
        "vulnerability scan", "port scan", "sql injection", "xss attack",
        "buffer overflow", "privilege escalation", "lateral movement",
        "password cracking", "hash cracking", "brute force", "dictionary attack",
        "network reconnaissance", "service enumeration", "web application testing",
        "system compromise", "data exfiltration", "backdoor access"
      ],
      context_clues: [
        "test security of", "check for weaknesses", "assess vulnerabilities",
        "perform security audit", "simulate attack", "find entry points",
        "break into", "gain access to", "compromise system", "steal data",
        "escalate privileges", "maintain persistence", "cover tracks"
      ],
      confidence_weight: 1.0,
      examples: [
        "Scan this website for vulnerabilities",
        "Test for SQL injection on this URL",
        "Crack these password hashes",
        "Perform a penetration test on the network",
        "Find security weaknesses in this system"
      ]
    },
    {
      mode: "developer",
      keywords: [
        "code", "program", "develop", "build", "create", "implement", "design",
        "debug", "fix", "optimize", "refactor", "deploy", "compile", "run",
        "function", "class", "method", "variable", "algorithm", "data structure",
        "api", "framework", "library", "database", "frontend", "backend",
        "react", "node", "python", "javascript", "typescript", "html", "css",
        "git", "github", "docker", "kubernetes", "aws", "cloud", "microservices"
      ],
      phrases: [
        "write code for", "develop an application", "create a program",
        "build a website", "implement a feature", "fix this bug",
        "optimize performance", "refactor code", "deploy application",
        "design architecture", "setup database", "create api",
        "frontend development", "backend development", "full stack",
        "mobile app", "web application", "software solution"
      ],
      context_clues: [
        "programming problem", "software development", "coding task",
        "technical implementation", "system design", "application logic",
        "user interface", "data processing", "business logic",
        "integration with", "automation script", "tool development"
      ],
      confidence_weight: 1.0,
      examples: [
        "Build a todo application with React",
        "Create a REST API using Node.js",
        "Write a Python script to process data",
        "Debug this JavaScript function",
        "Optimize database queries"
      ]
    },
    {
      mode: "researcher",
      keywords: [
        "research", "analyze", "study", "investigate", "explore", "examine",
        "data", "information", "report", "survey", "statistics", "trends",
        "comparison", "evaluation", "assessment", "review", "documentation",
        "paper", "article", "publication", "citation", "reference", "source",
        "methodology", "hypothesis", "experiment", "observation", "conclusion"
      ],
      phrases: [
        "research about", "analyze data", "study trends", "investigate topic",
        "gather information", "compile report", "statistical analysis",
        "literature review", "market research", "competitive analysis",
        "data mining", "trend analysis", "comparative study",
        "research methodology", "academic research", "empirical study"
      ],
      context_clues: [
        "find information about", "what does research say", "latest studies on",
        "academic literature", "peer reviewed", "evidence based",
        "data driven", "research findings", "scholarly articles",
        "survey results", "statistical significance", "correlation analysis"
      ],
      confidence_weight: 1.0,
      examples: [
        "Research the latest AI trends in 2024",
        "Analyze customer satisfaction data",
        "Study the impact of remote work",
        "Investigate cybersecurity threats",
        "Gather information about quantum computing"
      ]
    },
    {
      mode: "default",
      keywords: [
        "help", "assist", "explain", "how", "what", "why", "when", "where",
        "tell", "show", "describe", "define", "clarify", "understand",
        "question", "answer", "information", "advice", "suggestion",
        "recommendation", "guidance", "support", "tutorial", "guide"
      ],
      phrases: [
        "can you help", "please explain", "how do I", "what is",
        "tell me about", "I need help with", "can you show me",
        "I want to understand", "please describe", "what does this mean",
        "general question", "basic information", "simple task"
      ],
      context_clues: [
        "general inquiry", "basic question", "need explanation",
        "want to learn", "don't understand", "confused about",
        "looking for help", "seeking advice", "need guidance"
      ],
      confidence_weight: 0.8,
      examples: [
        "How does machine learning work?",
        "What is the best programming language?",
        "Can you explain blockchain technology?",
        "Help me understand APIs",
        "What's the difference between AI and ML?"
      ]
    }
  ];

  private constructor() {}

  public static getInstance(): IntentDetectionService {
    if (!IntentDetectionService.instance) {
      IntentDetectionService.instance = new IntentDetectionService();
    }
    return IntentDetectionService.instance;
  }

  public detectIntent(userMessage: string): DetectionResult {
    const message = userMessage.toLowerCase();
    const modeScores: { [key: string]: number } = {};
    const reasoningDetails: { [key: string]: string[] } = {};

    // Initialize scores
    for (const pattern of this.intentPatterns) {
      modeScores[pattern.mode] = 0;
      reasoningDetails[pattern.mode] = [];
    }

    // Score each mode based on patterns
    for (const pattern of this.intentPatterns) {
      let score = 0;
      const reasoning: string[] = [];

      // Check keywords
      const keywordMatches = pattern.keywords.filter(keyword => 
        message.includes(keyword)
      );
      if (keywordMatches.length > 0) {
        const keywordScore = keywordMatches.length * 10;
        score += keywordScore;
        reasoning.push(`Keywords matched: ${keywordMatches.join(', ')} (+${keywordScore})`);
      }

      // Check phrases
      const phraseMatches = pattern.phrases.filter(phrase => 
        message.includes(phrase)
      );
      if (phraseMatches.length > 0) {
        const phraseScore = phraseMatches.length * 20;
        score += phraseScore;
        reasoning.push(`Phrases matched: ${phraseMatches.join(', ')} (+${phraseScore})`);
      }

      // Check context clues
      const contextMatches = pattern.context_clues.filter(clue => 
        message.includes(clue)
      );
      if (contextMatches.length > 0) {
        const contextScore = contextMatches.length * 15;
        score += contextScore;
        reasoning.push(`Context clues: ${contextMatches.join(', ')} (+${contextScore})`);
      }

      // Apply confidence weight
      score *= pattern.confidence_weight;

      modeScores[pattern.mode] = score;
      reasoningDetails[pattern.mode] = reasoning;
    }

    // Find the highest scoring mode
    const sortedModes = Object.entries(modeScores)
      .sort(([,a], [,b]) => b - a);

    const topMode = sortedModes[0];
    const confidence = this.calculateConfidence(topMode[1], sortedModes);

    // Create alternative modes list
    const alternatives = sortedModes.slice(1, 3).map(([mode, score]) => ({
      mode,
      confidence: this.calculateConfidence(score, sortedModes)
    }));

    return {
      detected_mode: topMode[0],
      confidence,
      reasoning: reasoningDetails[topMode[0]],
      alternative_modes: alternatives
    };
  }

  private calculateConfidence(score: number, allScores: [string, number][]): number {
    const maxScore = Math.max(...allScores.map(([,s]) => s));
    if (maxScore === 0) return 0;
    
    const confidence = (score / maxScore) * 100;
    return Math.round(confidence);
  }

  public shouldAutoSwitch(detectionResult: DetectionResult): boolean {
    // Auto-switch if confidence is high enough and it's not default mode
    return detectionResult.confidence >= 70 && detectionResult.detected_mode !== 'default';
  }

  public generateModeExplanation(mode: string): string {
    const pattern = this.intentPatterns.find(p => p.mode === mode);
    if (!pattern) return `Unknown mode: ${mode}`;

    const modeDescriptions: { [key: string]: string } = {
      hacker: "🎯 **Agent Zero Hacker Mode** - Professional penetration testing and security analysis with full Kali Linux toolkit",
      developer: "💻 **Developer Mode** - Full-stack application development, coding, debugging, and system architecture",
      researcher: "🔬 **Researcher Mode** - Data analysis, information gathering, academic research, and report generation",
      default: "🤖 **Default Mode** - General AI assistant for questions, explanations, and basic tasks"
    };

    return modeDescriptions[mode] || `Mode: ${mode}`;
  }

  public generateAutoSwitchMessage(from: string, to: string, reasoning: string[]): string {
    let message = `🔄 **Auto-switching to ${this.generateModeExplanation(to)}**\n\n`;
    message += `**Detection Reasoning:**\n`;
    reasoning.forEach(reason => {
      message += `- ${reason}\n`;
    });
    message += `\n**Previous Mode:** ${from}\n`;
    message += `**New Mode:** ${to}\n\n`;
    message += `Pareng Boyong is now optimized for your specific task type!`;
    
    return message;
  }

  public getCapabilitiesForMode(mode: string): string[] {
    const capabilities: { [key: string]: string[] } = {
      hacker: [
        "Network reconnaissance and port scanning",
        "Web application vulnerability testing", 
        "SQL injection detection and exploitation",
        "Password cracking and hash analysis",
        "Network traffic analysis and packet capture",
        "Digital forensics and malware analysis",
        "Reverse engineering and exploit development",
        "Penetration testing methodologies"
      ],
      developer: [
        "Full-stack web application development",
        "API design and implementation",
        "Database design and optimization",
        "Code debugging and troubleshooting",
        "System architecture and design patterns",
        "DevOps and deployment automation",
        "Performance optimization",
        "Code review and refactoring"
      ],
      researcher: [
        "Academic and industry research",
        "Data collection and analysis",
        "Statistical analysis and visualization",
        "Literature review and citation",
        "Report writing and documentation",
        "Trend analysis and forecasting",
        "Comparative studies and benchmarking",
        "Research methodology design"
      ],
      default: [
        "General question answering",
        "Explanations and tutorials",
        "Basic problem solving",
        "Information lookup",
        "Simple task assistance",
        "Conceptual explanations"
      ]
    };

    return capabilities[mode] || capabilities['default'];
  }
}

export const intentDetectionService = IntentDetectionService.getInstance();