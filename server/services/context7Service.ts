import fetch from 'node-fetch';

interface Context7APIResponse {
  success: boolean;
  data?: {
    documentation?: string;
    examples?: string[];
    version?: string;
    description?: string;
    methods?: any[];
    properties?: any[];
  };
  error?: string;
}

interface LibraryDocumentation {
  name: string;
  documentation: string;
  examples: string[];
  version: string;
  description: string;
  methods: any[];
  properties: any[];
  lastUpdated: Date;
}

export class Context7Service {
  private static instance: Context7Service;
  private baseURL: string = 'https://context7.io/api/v1';
  private apiKey: string | null = null;
  private cache: Map<string, LibraryDocumentation> = new Map();
  private rateLimitDelay: number = 1000; // 1 second between requests
  private lastRequestTime: number = 0;

  private constructor() {
    this.apiKey = process.env.CONTEXT7_API_KEY || null;
    if (!this.apiKey) {
      console.warn('Context7 API key not found. Some features may be limited.');
    }
  }

  public static getInstance(): Context7Service {
    if (!Context7Service.instance) {
      Context7Service.instance = new Context7Service();
    }
    return Context7Service.instance;
  }

  private async rateLimitedRequest(url: string, options: any = {}): Promise<any> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Pareng-Boyong/1.0',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
          ...options.headers
        },
        timeout: 10000 // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Context7 API request failed:', error);
      throw error;
    }
  }

  public async getLibraryDocumentation(libraryName: string): Promise<LibraryDocumentation | null> {
    // Check cache first
    const cacheKey = libraryName.toLowerCase();
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      // Cache for 1 hour
      if (Date.now() - cached.lastUpdated.getTime() < 3600000) {
        return cached;
      }
    }

    try {
      // Try Context7 API first
      const apiResponse = await this.fetchFromContext7API(libraryName);
      if (apiResponse) {
        this.cache.set(cacheKey, apiResponse);
        return apiResponse;
      }

      // Fallback to alternative documentation sources
      const fallbackResponse = await this.fetchFromAlternativeSources(libraryName);
      if (fallbackResponse) {
        this.cache.set(cacheKey, fallbackResponse);
        return fallbackResponse;
      }

      return null;
    } catch (error) {
      console.error(`Failed to fetch documentation for ${libraryName}:`, error);
      return null;
    }
  }

  private async fetchFromContext7API(libraryName: string): Promise<LibraryDocumentation | null> {
    if (!this.apiKey) {
      console.warn('Context7 API key not available, skipping API call');
      return null;
    }

    try {
      const url = `${this.baseURL}/library/${encodeURIComponent(libraryName)}`;
      const response = await this.rateLimitedRequest(url);

      if (response.success && response.data) {
        return {
          name: libraryName,
          documentation: response.data.documentation || '',
          examples: response.data.examples || [],
          version: response.data.version || 'unknown',
          description: response.data.description || '',
          methods: response.data.methods || [],
          properties: response.data.properties || [],
          lastUpdated: new Date()
        };
      }

      return null;
    } catch (error) {
      console.error(`Context7 API error for ${libraryName}:`, error);
      return null;
    }
  }

  private async fetchFromAlternativeSources(libraryName: string): Promise<LibraryDocumentation | null> {
    // Try multiple fallback sources
    const sources = [
      () => this.fetchFromNPMRegistry(libraryName),
      () => this.fetchFromGitHub(libraryName),
      () => this.fetchFromJSDelivr(libraryName)
    ];

    for (const source of sources) {
      try {
        const result = await source();
        if (result) {
          return result;
        }
      } catch (error) {
        console.debug(`Alternative source failed for ${libraryName}:`, error);
        continue;
      }
    }

    return null;
  }

  private async fetchFromNPMRegistry(libraryName: string): Promise<LibraryDocumentation | null> {
    try {
      const url = `https://registry.npmjs.org/${encodeURIComponent(libraryName)}`;
      const response = await this.rateLimitedRequest(url);

      if (response && response.name) {
        const latestVersion = response['dist-tags']?.latest || 'unknown';
        const description = response.description || '';
        const readme = response.readme || '';

        return {
          name: libraryName,
          documentation: readme,
          examples: this.extractExamplesFromReadme(readme),
          version: latestVersion,
          description: description,
          methods: [],
          properties: [],
          lastUpdated: new Date()
        };
      }

      return null;
    } catch (error) {
      console.debug(`NPM registry error for ${libraryName}:`, error);
      return null;
    }
  }

  private async fetchFromGitHub(libraryName: string): Promise<LibraryDocumentation | null> {
    try {
      // Try common GitHub patterns
      const possibleRepos = [
        `${libraryName}/${libraryName}`,
        `${libraryName}/lib`,
        `lib/${libraryName}`,
        `${libraryName}/js`,
        `js/${libraryName}`
      ];

      for (const repo of possibleRepos) {
        try {
          const url = `https://api.github.com/repos/${repo}/readme`;
          const response = await this.rateLimitedRequest(url);

          if (response && response.content) {
            const readme = Buffer.from(response.content, 'base64').toString();
            
            return {
              name: libraryName,
              documentation: readme,
              examples: this.extractExamplesFromReadme(readme),
              version: 'latest',
              description: `Documentation from GitHub: ${repo}`,
              methods: [],
              properties: [],
              lastUpdated: new Date()
            };
          }
        } catch (error) {
          continue; // Try next repo
        }
      }

      return null;
    } catch (error) {
      console.debug(`GitHub error for ${libraryName}:`, error);
      return null;
    }
  }

  private async fetchFromJSDelivr(libraryName: string): Promise<LibraryDocumentation | null> {
    try {
      const url = `https://data.jsdelivr.com/v1/package/npm/${encodeURIComponent(libraryName)}`;
      const response = await this.rateLimitedRequest(url);

      if (response && response.versions) {
        const latestVersion = response.versions[0];
        
        return {
          name: libraryName,
          documentation: `Library: ${libraryName}\nVersion: ${latestVersion}\nSource: JSDelivr CDN`,
          examples: [],
          version: latestVersion,
          description: `CDN package information for ${libraryName}`,
          methods: [],
          properties: [],
          lastUpdated: new Date()
        };
      }

      return null;
    } catch (error) {
      console.debug(`JSDelivr error for ${libraryName}:`, error);
      return null;
    }
  }

  private extractExamplesFromReadme(readme: string): string[] {
    const examples: string[] = [];
    
    // Extract code blocks
    const codeBlockRegex = /```(?:javascript|js|typescript|ts)?\n([\s\S]*?)```/gi;
    let match;
    
    while ((match = codeBlockRegex.exec(readme)) !== null) {
      const code = match[1].trim();
      if (code.length > 10 && code.length < 1000) { // Reasonable size limits
        examples.push(code);
      }
    }

    return examples.slice(0, 5); // Limit to 5 examples
  }

  public async detectLibrariesInMessage(message: string): Promise<string[]> {
    const libraries: string[] = [];
    
    // Common library patterns
    const patterns = [
      /import\s+.*?from\s+['"]([^'"]+)['"]/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /npm\s+install\s+([a-zA-Z0-9_-]+)/g,
      /yarn\s+add\s+([a-zA-Z0-9_-]+)/g,
      /using\s+([a-zA-Z0-9_-]+)/gi,
      /with\s+([a-zA-Z0-9_-]+)\s+library/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        const libraryName = match[1];
        if (libraryName && !libraryName.startsWith('./') && !libraryName.startsWith('../')) {
          libraries.push(libraryName);
        }
      }
    }

    // Remove duplicates and common built-ins
    const filteredLibraries = Array.from(new Set(libraries)).filter(lib => 
      !['fs', 'path', 'os', 'util', 'crypto', 'http', 'https', 'url'].includes(lib)
    );

    return filteredLibraries.slice(0, 10); // Limit to 10 libraries
  }

  public async enhancePromptWithDocumentation(prompt: string, detectedLibraries: string[]): Promise<string> {
    if (detectedLibraries.length === 0) {
      return prompt;
    }

    let enhancedPrompt = prompt + '\n\n## AVAILABLE LIBRARY DOCUMENTATION\n\n';
    
    for (const library of detectedLibraries) {
      const doc = await this.getLibraryDocumentation(library);
      if (doc) {
        enhancedPrompt += `### ${library} (v${doc.version})\n`;
        enhancedPrompt += `${doc.description}\n\n`;
        
        if (doc.examples.length > 0) {
          enhancedPrompt += `**Examples:**\n`;
          doc.examples.slice(0, 2).forEach((example, i) => {
            enhancedPrompt += `\`\`\`javascript\n${example}\n\`\`\`\n`;
          });
          enhancedPrompt += '\n';
        }

        if (doc.documentation && doc.documentation.length > 0) {
          const truncatedDoc = doc.documentation.length > 500 
            ? doc.documentation.substring(0, 500) + '...' 
            : doc.documentation;
          enhancedPrompt += `**Documentation:**\n${truncatedDoc}\n\n`;
        }
      }
    }

    return enhancedPrompt;
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public getCacheSize(): number {
    return this.cache.size;
  }

  public async getServiceStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    apiKeyConfigured: boolean;
    cacheSize: number;
    lastError?: string;
  }> {
    const status = {
      status: 'healthy' as const,
      apiKeyConfigured: !!this.apiKey,
      cacheSize: this.cache.size,
      lastError: undefined as string | undefined
    };

    if (!this.apiKey) {
      return {
        status: 'degraded' as const,
        apiKeyConfigured: false,
        cacheSize: this.cache.size,
        lastError: 'API key not configured'
      };
    }

    try {
      // Test API connectivity
      const url = `${this.baseURL}/health`;
      await this.rateLimitedRequest(url);
      return {
        status: 'healthy' as const,
        apiKeyConfigured: true,
        cacheSize: this.cache.size
      };
    } catch (error) {
      return {
        status: 'degraded' as const,
        apiKeyConfigured: true,
        cacheSize: this.cache.size,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const context7Service = Context7Service.getInstance();