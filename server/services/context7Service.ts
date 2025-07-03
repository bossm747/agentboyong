import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

interface Context7Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

interface Context7Resource {
  uri: string;
  name: string;
  description: string;
}

interface Context7Response {
  content: Array<{
    type: 'text' | 'resource';
    text?: string;
    uri?: string;
  }>;
}

interface LibraryDocumentationRequest {
  libraryId: string;
  topic?: string;
  tokens?: number;
}

interface LibraryResolveRequest {
  libraryName: string;
}

export class Context7Service extends EventEmitter {
  private mcpProcess: ChildProcess | null = null;
  private isConnected = false;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();
  
  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔗 Initializing Context7 MCP Server...');
      
      // Start Context7 MCP server process
      this.mcpProcess = spawn('npx', ['-y', '@upstash/context7-mcp'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      // Handle process communication
      this.setupMessageHandling();
      
      // Initialize MCP connection
      await this.initializeMCPConnection();
      
      console.log('✅ Context7 MCP Server connected successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Context7:', error);
      throw error;
    }
  }

  private setupMessageHandling(): void {
    if (!this.mcpProcess) return;

    this.mcpProcess.stdout?.on('data', (data) => {
      try {
        const messages = data.toString().split('\n').filter(Boolean);
        messages.forEach((msg: string) => {
          try {
            const response = JSON.parse(msg);
            this.handleMCPResponse(response);
          } catch (e) {
            // Ignore non-JSON output
          }
        });
      } catch (error) {
        console.error('Context7 stdout error:', error);
      }
    });

    this.mcpProcess.stderr?.on('data', (data) => {
      console.error('Context7 stderr:', data.toString());
    });

    this.mcpProcess.on('error', (error) => {
      console.error('Context7 process error:', error);
      this.isConnected = false;
    });

    this.mcpProcess.on('exit', (code) => {
      console.log(`Context7 process exited with code ${code}`);
      this.isConnected = false;
    });
  }

  private async initializeMCPConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const initRequest = {
        jsonrpc: '2.0',
        id: this.getNextRequestId(),
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {}
          },
          clientInfo: {
            name: 'Pareng Boyong',
            version: '1.0.0'
          }
        }
      };

      this.pendingRequests.set(initRequest.id, { resolve, reject });
      this.sendMCPMessage(initRequest);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(initRequest.id)) {
          this.pendingRequests.delete(initRequest.id);
          reject(new Error('Context7 initialization timeout'));
        }
      }, 10000);
    });
  }

  private handleMCPResponse(response: any): void {
    if (response.id && this.pendingRequests.has(response.id)) {
      const { resolve, reject } = this.pendingRequests.get(response.id)!;
      this.pendingRequests.delete(response.id);

      if (response.error) {
        reject(new Error(response.error.message || 'MCP Error'));
      } else {
        if (response.method === 'initialize') {
          this.isConnected = true;
        }
        resolve(response.result);
      }
    }
  }

  private sendMCPMessage(message: any): void {
    if (this.mcpProcess?.stdin) {
      this.mcpProcess.stdin.write(JSON.stringify(message) + '\n');
    }
  }

  private getNextRequestId(): number {
    return ++this.requestId;
  }

  async resolveLibraryId(libraryName: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Context7 not connected');
    }

    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        id: this.getNextRequestId(),
        method: 'tools/call',
        params: {
          name: 'resolve-library-id',
          arguments: { libraryName }
        }
      };

      this.pendingRequests.set(request.id, { resolve, reject });
      this.sendMCPMessage(request);

      setTimeout(() => {
        if (this.pendingRequests.has(request.id)) {
          this.pendingRequests.delete(request.id);
          reject(new Error('Library resolve timeout'));
        }
      }, 15000);
    });
  }

  async getLibraryDocs(libraryId: string, topic?: string, tokens: number = 5000): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Context7 not connected');
    }

    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        id: this.getNextRequestId(),
        method: 'tools/call',
        params: {
          name: 'get-library-docs',
          arguments: { 
            context7CompatibleLibraryID: libraryId,
            topic,
            tokens
          }
        }
      };

      this.pendingRequests.set(request.id, { 
        resolve: (result: any) => {
          // Extract text content from MCP response
          const content = result.content || [];
          const textContent = content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.text)
            .join('\n');
          resolve(textContent);
        }, 
        reject 
      });
      this.sendMCPMessage(request);

      setTimeout(() => {
        if (this.pendingRequests.has(request.id)) {
          this.pendingRequests.delete(request.id);
          reject(new Error('Library docs timeout'));
        }
      }, 30000);
    });
  }

  async getContextualDocumentation(message: string): Promise<string | null> {
    try {
      const libraries = this.extractLibrariesFromMessage(message);
      
      if (libraries.length === 0) {
        return null;
      }

      console.log(`📚 Fetching docs for libraries: ${libraries.join(', ')}`);
      
      const docs: string[] = [];
      
      for (const library of libraries.slice(0, 3)) { // Limit to 3 libraries to avoid token overflow
        try {
          const libraryId = await this.resolveLibraryId(library);
          const topic = this.extractTopicFromMessage(message, library);
          const documentation = await this.getLibraryDocs(libraryId, topic, 3000);
          
          docs.push(`## ${library.toUpperCase()} Documentation\n${documentation}`);
        } catch (error) {
          console.error(`Failed to fetch docs for ${library}:`, error);
        }
      }

      return docs.length > 0 ? docs.join('\n\n---\n\n') : null;
    } catch (error) {
      console.error('Context7 documentation fetch error:', error);
      return null;
    }
  }

  private extractLibrariesFromMessage(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const libraries: string[] = [];

    // Common frameworks and libraries
    const libraryPatterns = [
      'react', 'vue', 'angular', 'svelte', 'nextjs', 'next.js', 'nuxt',
      'express', 'fastify', 'nestjs', 'koa',
      'mongodb', 'mysql', 'postgresql', 'redis', 'sqlite',
      'tailwind', 'bootstrap', 'material-ui', 'chakra-ui',
      'typescript', 'javascript', 'node.js', 'nodejs',
      'axios', 'fetch', 'apollo', 'graphql',
      'jest', 'vitest', 'cypress', 'playwright',
      'vite', 'webpack', 'rollup', 'parcel',
      'prisma', 'drizzle', 'sequelize', 'mongoose',
      'stripe', 'paypal', 'supabase', 'firebase',
      'aws', 'vercel', 'netlify', 'cloudflare',
      'docker', 'kubernetes', 'nginx'
    ];

    for (const pattern of libraryPatterns) {
      if (lowerMessage.includes(pattern)) {
        libraries.push(pattern);
      }
    }

    // Remove duplicates and return
    return Array.from(new Set(libraries));
  }

  private extractTopicFromMessage(message: string, library: string): string | undefined {
    const lowerMessage = message.toLowerCase();
    
    // Common topics based on user intent
    if (lowerMessage.includes('auth') || lowerMessage.includes('login') || lowerMessage.includes('signup')) {
      return 'authentication';
    }
    if (lowerMessage.includes('api') || lowerMessage.includes('endpoint') || lowerMessage.includes('route')) {
      return 'api';
    }
    if (lowerMessage.includes('database') || lowerMessage.includes('db') || lowerMessage.includes('query')) {
      return 'database';
    }
    if (lowerMessage.includes('deploy') || lowerMessage.includes('production') || lowerMessage.includes('build')) {
      return 'deployment';
    }
    if (lowerMessage.includes('test') || lowerMessage.includes('testing')) {
      return 'testing';
    }
    if (lowerMessage.includes('style') || lowerMessage.includes('css') || lowerMessage.includes('design')) {
      return 'styling';
    }
    
    return undefined;
  }

  async disconnect(): Promise<void> {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.mcpProcess = null;
    }
    this.isConnected = false;
    this.pendingRequests.clear();
  }

  isReady(): boolean {
    return this.isConnected;
  }
}