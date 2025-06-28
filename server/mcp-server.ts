import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolRequest,
  CallToolResult,
  TextContent,
  ImageContent,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { storage } from './storage.js';
import { FileSystemService } from './services/fileSystem.js';
import { TerminalService } from './services/terminal.js';
import { systemMonitor } from './services/systemMonitor.js';

interface MCPSandboxSession {
  id: string;
  fileSystem: FileSystemService;
  terminal: TerminalService;
  workspaceDir: string;
}

class MCPSandboxServer {
  private server: Server;
  private sessions: Map<string, MCPSandboxSession> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: "ai-runtime-sandbox",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupRequestHandlers();
  }

  private setupRequestHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "create_session",
            description: "Create a new isolated sandbox session",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Optional custom session ID",
                },
              },
            },
          },
          {
            name: "write_file",
            description: "Create or update a file in the sandbox",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID for the sandbox",
                },
                path: {
                  type: "string",
                  description: "File path relative to workspace root",
                },
                content: {
                  type: "string",
                  description: "File content to write",
                },
              },
              required: ["sessionId", "path", "content"],
            },
          },
          {
            name: "read_file",
            description: "Read a file from the sandbox",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID for the sandbox",
                },
                path: {
                  type: "string",
                  description: "File path relative to workspace root",
                },
              },
              required: ["sessionId", "path"],
            },
          },
          {
            name: "list_files",
            description: "List files and directories in the sandbox",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID for the sandbox",
                },
                path: {
                  type: "string",
                  description: "Directory path to list (default: root)",
                  default: "",
                },
              },
              required: ["sessionId"],
            },
          },
          {
            name: "execute_command",
            description: "Execute a command in the sandbox terminal",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID for the sandbox",
                },
                command: {
                  type: "string",
                  description: "Command to execute",
                },
                args: {
                  type: "array",
                  items: { type: "string" },
                  description: "Command arguments",
                  default: [],
                },
                workingDir: {
                  type: "string",
                  description: "Working directory for command execution",
                },
              },
              required: ["sessionId", "command"],
            },
          },
          {
            name: "run_code",
            description: "Execute code in various programming languages",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID for the sandbox",
                },
                code: {
                  type: "string",
                  description: "Code to execute",
                },
                language: {
                  type: "string",
                  enum: ["python", "javascript", "typescript", "bash", "java", "cpp", "go", "rust"],
                  description: "Programming language",
                },
                filename: {
                  type: "string",
                  description: "Optional filename for the code",
                },
              },
              required: ["sessionId", "code", "language"],
            },
          },
          {
            name: "install_package",
            description: "Install packages/dependencies in the sandbox",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID for the sandbox",
                },
                packages: {
                  type: "array",
                  items: { type: "string" },
                  description: "Package names to install",
                },
                manager: {
                  type: "string",
                  enum: ["pip", "npm", "yarn", "apt", "brew"],
                  description: "Package manager to use",
                  default: "pip",
                },
              },
              required: ["sessionId", "packages"],
            },
          },
          {
            name: "get_system_info",
            description: "Get system information and resource usage",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID for the sandbox",
                },
              },
              required: ["sessionId"],
            },
          },
          {
            name: "create_project",
            description: "Create a new project with boilerplate code",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID for the sandbox",
                },
                projectType: {
                  type: "string",
                  enum: ["python-flask", "python-fastapi", "node-express", "react", "vue", "java-spring", "go-gin"],
                  description: "Type of project to create",
                },
                projectName: {
                  type: "string",
                  description: "Name of the project",
                },
              },
              required: ["sessionId", "projectType", "projectName"],
            },
          },
          {
            name: "delete_file",
            description: "Delete a file or directory from the sandbox",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID for the sandbox",
                },
                path: {
                  type: "string",
                  description: "File or directory path to delete",
                },
              },
              required: ["sessionId", "path"],
            },
          },
        ] as Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      return await this.handleToolCall(request);
    });
  }

  private setupToolHandlers() {
    // Tool handlers will be implemented in handleToolCall method
  }

  private async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "create_session":
          return await this.createSession(args);
        case "write_file":
          return await this.writeFile(args);
        case "read_file":
          return await this.readFile(args);
        case "list_files":
          return await this.listFiles(args);
        case "execute_command":
          return await this.executeCommand(args);
        case "run_code":
          return await this.runCode(args);
        case "install_package":
          return await this.installPackage(args);
        case "get_system_info":
          return await this.getSystemInfo(args);
        case "create_project":
          return await this.createProject(args);
        case "delete_file":
          return await this.deleteFile(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          } as TextContent,
        ],
        isError: true,
      };
    }
  }

  private async createSession(args: any): Promise<CallToolResult> {
    const sessionId = args.sessionId || `mcp_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create session in storage
    const session = await storage.createSession({
      userId: null,
      status: 'active',
    });

    // Initialize services
    const fileSystem = new FileSystemService(session.id);
    const terminal = new TerminalService(session.id);
    const workspaceDir = path.join('./workspace', session.id);

    await fileSystem.ensureWorkspaceExists();

    this.sessions.set(session.id, {
      id: session.id,
      fileSystem,
      terminal,
      workspaceDir,
    });

    return {
      content: [
        {
          type: "text",
          text: `Session created successfully: ${session.id}`,
        } as TextContent,
      ],
    };
  }

  private async writeFile(args: any): Promise<CallToolResult> {
    const { sessionId, path: filePath, content } = args;
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    await session.fileSystem.writeFile(filePath, content);

    return {
      content: [
        {
          type: "text",
          text: `File written successfully: ${filePath}`,
        } as TextContent,
      ],
    };
  }

  private async readFile(args: any): Promise<CallToolResult> {
    const { sessionId, path: filePath } = args;
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const content = await session.fileSystem.readFile(filePath);

    return {
      content: [
        {
          type: "text",
          text: content,
        } as TextContent,
      ],
    };
  }

  private async listFiles(args: any): Promise<CallToolResult> {
    const { sessionId, path: dirPath = '' } = args;
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const fileTree = await session.fileSystem.getFileTree();
    const formattedTree = this.formatFileTree(fileTree);

    return {
      content: [
        {
          type: "text",
          text: `File tree:\n${formattedTree}`,
        } as TextContent,
      ],
    };
  }

  private async executeCommand(args: any): Promise<CallToolResult> {
    const { sessionId, command, args: cmdArgs = [], workingDir } = args;
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const result = await session.terminal.executeCommand(command, cmdArgs, workingDir);

    return {
      content: [
        {
          type: "text",
          text: `Command: ${command} ${cmdArgs.join(' ')}\n\nOutput:\n${result.stdout}\n\nError:\n${result.stderr}\n\nExit Code: ${result.exitCode}`,
        } as TextContent,
      ],
    };
  }

  private async runCode(args: any): Promise<CallToolResult> {
    const { sessionId, code, language, filename } = args;
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const extension = this.getFileExtension(language);
    const fileName = filename || `temp_${Date.now()}.${extension}`;

    // Write code to file
    await session.fileSystem.writeFile(fileName, code);

    // Execute based on language
    let result;
    switch (language) {
      case 'python':
        result = await session.terminal.executeCommand('python', [fileName]);
        break;
      case 'javascript':
        result = await session.terminal.executeCommand('node', [fileName]);
        break;
      case 'typescript':
        result = await session.terminal.executeCommand('npx', ['tsx', fileName]);
        break;
      case 'bash':
        result = await session.terminal.executeCommand('bash', [fileName]);
        break;
      case 'java':
        await session.terminal.executeCommand('javac', [fileName]);
        const className = fileName.replace('.java', '');
        result = await session.terminal.executeCommand('java', [className]);
        break;
      case 'cpp':
        await session.terminal.executeCommand('g++', [fileName, '-o', 'temp_executable']);
        result = await session.terminal.executeCommand('./temp_executable');
        break;
      case 'go':
        result = await session.terminal.executeCommand('go', ['run', fileName]);
        break;
      case 'rust':
        await session.terminal.executeCommand('rustc', [fileName, '-o', 'temp_executable']);
        result = await session.terminal.executeCommand('./temp_executable');
        break;
      default:
        throw new Error(`Unsupported language: ${language}`);
    }

    return {
      content: [
        {
          type: "text",
          text: `Code execution result:\n\nOutput:\n${result.stdout}\n\nError:\n${result.stderr}\n\nExit Code: ${result.exitCode}`,
        } as TextContent,
      ],
    };
  }

  private async installPackage(args: any): Promise<CallToolResult> {
    const { sessionId, packages, manager = 'pip' } = args;
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    let command: string;
    let cmdArgs: string[];

    switch (manager) {
      case 'pip':
        command = 'pip';
        cmdArgs = ['install', ...packages];
        break;
      case 'npm':
        command = 'npm';
        cmdArgs = ['install', ...packages];
        break;
      case 'yarn':
        command = 'yarn';
        cmdArgs = ['add', ...packages];
        break;
      case 'apt':
        command = 'apt';
        cmdArgs = ['install', '-y', ...packages];
        break;
      case 'brew':
        command = 'brew';
        cmdArgs = ['install', ...packages];
        break;
      default:
        throw new Error(`Unsupported package manager: ${manager}`);
    }

    const result = await session.terminal.executeCommand(command, cmdArgs);

    return {
      content: [
        {
          type: "text",
          text: `Package installation result:\n\nOutput:\n${result.stdout}\n\nError:\n${result.stderr}\n\nExit Code: ${result.exitCode}`,
        } as TextContent,
      ],
    };
  }

  private async getSystemInfo(args: any): Promise<CallToolResult> {
    const { sessionId } = args;
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const stats = await systemMonitor.getSystemStats();
    const processes = await storage.getProcesses(sessionId);

    const systemInfo = {
      cpu: `${stats.cpu}%`,
      memory: `${stats.memory.used}MB / ${stats.memory.total}MB`,
      disk: `${stats.disk.used}MB / ${stats.disk.total}MB`,
      processes: stats.processes,
      activeProcesses: processes.length,
      sessionProcesses: processes.map(p => ({
        name: p.name,
        pid: p.pid,
        status: p.status,
        command: p.command,
      })),
    };

    return {
      content: [
        {
          type: "text",
          text: `System Information:\n${JSON.stringify(systemInfo, null, 2)}`,
        } as TextContent,
      ],
    };
  }

  private async createProject(args: any): Promise<CallToolResult> {
    const { sessionId, projectType, projectName } = args;
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const projectDir = projectName;
    await session.fileSystem.createDirectory(projectDir);

    // Create project structure based on type
    const templates = this.getProjectTemplate(projectType, projectName);
    
    for (const [filePath, content] of Object.entries(templates)) {
      const fullPath = path.join(projectDir, filePath);
      await session.fileSystem.writeFile(fullPath, content);
    }

    return {
      content: [
        {
          type: "text",
          text: `Project '${projectName}' created successfully with ${projectType} template`,
        } as TextContent,
      ],
    };
  }

  private async deleteFile(args: any): Promise<CallToolResult> {
    const { sessionId, path: filePath } = args;
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    await session.fileSystem.deleteFile(filePath);

    return {
      content: [
        {
          type: "text",
          text: `File deleted successfully: ${filePath}`,
        } as TextContent,
      ],
    };
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

  private getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
      python: 'py',
      javascript: 'js',
      typescript: 'ts',
      bash: 'sh',
      java: 'java',
      cpp: 'cpp',
      go: 'go',
      rust: 'rs',
    };
    return extensions[language] || 'txt';
  }

  private getProjectTemplate(projectType: string, projectName: string): Record<string, string> {
    const templates: Record<string, Record<string, string>> = {
      'python-flask': {
        'app.py': `from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def hello():
    return jsonify({"message": "Hello from ${projectName}!"})

@app.route('/health')
def health():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
`,
        'requirements.txt': 'Flask==2.3.3\n',
        'README.md': `# ${projectName}

A Flask web application.

## Setup

\`\`\`bash
pip install -r requirements.txt
python app.py
\`\`\`
`,
      },
      'python-fastapi': {
        'main.py': `from fastapi import FastAPI

app = FastAPI(title="${projectName}")

@app.get("/")
async def root():
    return {"message": "Hello from ${projectName}!"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
`,
        'requirements.txt': 'fastapi==0.104.1\nuvicorn==0.24.0\n',
        'README.md': `# ${projectName}

A FastAPI web application.

## Setup

\`\`\`bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
\`\`\`
`,
      },
      'node-express': {
        'index.js': `const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from ${projectName}!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(\`Server running on port \${port}\`);
});
`,
        'package.json': `{
  "name": "${projectName}",
  "version": "1.0.0",
  "description": "Express.js application",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
`,
        'README.md': `# ${projectName}

An Express.js web application.

## Setup

\`\`\`bash
npm install
npm start
\`\`\`
`,
      },
    };

    return templates[projectType] || {};
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MCP AI Runtime Sandbox Server running on stdio");
  }
}

// Start the server
const server = new MCPSandboxServer();
server.run().catch(console.error);