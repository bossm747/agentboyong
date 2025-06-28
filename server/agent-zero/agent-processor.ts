import { AgentContextManager, AgentContext, AgentMessage, AgentLog } from './context';
import { TerminalService } from '../services/terminal';
import { FileSystemService } from '../services/fileSystem';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

export class AgentProcessor {
  private terminalService: TerminalService;
  private fileSystemService: FileSystemService;
  
  constructor(sessionId: string) {
    this.terminalService = new TerminalService(sessionId);
    this.fileSystemService = new FileSystemService(sessionId);
  }

  async processMessage(contextId: string, message: string, attachments: string[] = []): Promise<any> {
    const context = AgentContextManager.getContext(contextId);
    if (!context) {
      throw new Error('Context not found');
    }

    // Log user message
    AgentContextManager.addLog(contextId, {
      type: 'user',
      heading: 'User message',
      content: message,
      kvps: { attachments }
    });

    // Set context as streaming
    AgentContextManager.updateContext(contextId, { streaming: true });

    try {
      // Analyze message for tool usage
      const response = await this.generateAgentResponse(context, message, attachments);
      
      // Log agent response
      AgentContextManager.addLog(contextId, {
        type: 'agent',
        heading: 'Pareng Boyong Response',
        content: response.content,
        kvps: response.kvps || {}
      });

      return response;
    } finally {
      // Stop streaming
      AgentContextManager.updateContext(contextId, { streaming: false });
    }
  }

  private async generateAgentResponse(context: AgentContext, message: string, attachments: string[] = []): Promise<any> {
    const lowerMessage = message.toLowerCase();
    
    // Detect what the user wants to do
    if (lowerMessage.includes('execute') || lowerMessage.includes('run') || lowerMessage.includes('code')) {
      return await this.handleCodeExecution(context, message);
    } else if (lowerMessage.includes('file') || lowerMessage.includes('create') || lowerMessage.includes('write')) {
      return await this.handleFileOperation(context, message);
    } else if (lowerMessage.includes('list') || lowerMessage.includes('show') || lowerMessage.includes('directory')) {
      return await this.handleListOperation(context, message);
    } else if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
      return await this.handleSearchOperation(context, message);
    } else if (lowerMessage.includes('install') || lowerMessage.includes('package')) {
      return await this.handlePackageInstallation(context, message);
    } else {
      return await this.handleGeneralQuery(context, message);
    }
  }

  private async handleCodeExecution(context: AgentContext, message: string): Promise<any> {
    // Extract code from message
    const codeMatch = message.match(/```(\w+)?\n([\s\S]*?)\n```/);
    if (!codeMatch) {
      return {
        content: "I'd be happy to execute code for you! Please provide the code in a code block format like:\n```python\nprint('Hello World')\n```",
        kvps: { tool_used: 'code_execution', status: 'waiting_for_code' }
      };
    }

    const language = codeMatch[1] || 'python';
    const code = codeMatch[2];

    try {
      let result: ToolResult;
      
      if (language === 'python' || language === 'py') {
        result = await this.executePython(code);
      } else if (language === 'javascript' || language === 'js' || language === 'node') {
        result = await this.executeJavaScript(code);
      } else if (language === 'bash' || language === 'shell' || language === 'sh') {
        result = await this.executeBash(code);
      } else {
        result = { success: false, output: '', error: `Unsupported language: ${language}` };
      }

      if (result.success) {
        return {
          content: `Code executed successfully!\n\nOutput:\n${result.output}`,
          kvps: { 
            tool_used: 'code_execution', 
            language, 
            status: 'success',
            output: result.output
          }
        };
      } else {
        return {
          content: `Code execution failed:\n\nError:\n${result.error}\n\nOutput:\n${result.output}`,
          kvps: { 
            tool_used: 'code_execution', 
            language, 
            status: 'error',
            error: result.error
          }
        };
      }
    } catch (error) {
      return {
        content: `An error occurred during code execution: ${error}`,
        kvps: { tool_used: 'code_execution', status: 'error', error: String(error) }
      };
    }
  }

  private async handleFileOperation(context: AgentContext, message: string): Promise<any> {
    try {
      // Extract filename and content
      const createMatch = message.match(/create.*?file.*?(?:named|called)?\s*([^\s]+).*?(?:with|containing)?\s*(?:content|text)?:?\s*(.+)/i);
      if (createMatch) {
        const filename = createMatch[1].replace(/['"]/g, '');
        const content = createMatch[2];
        
        await this.fileSystemService.writeFile(filename, content);
        
        return {
          content: `File '${filename}' created successfully with the specified content.`,
          kvps: { 
            tool_used: 'file_management',
            action: 'create',
            filename,
            status: 'success'
          }
        };
      }

      // Read file operation
      const readMatch = message.match(/(?:read|show|open).*?file.*?([^\s]+)/i);
      if (readMatch) {
        const filename = readMatch[1].replace(/['"]/g, '');
        const content = await this.fileSystemService.readFile(filename);
        
        return {
          content: `Content of file '${filename}':\n\n${content}`,
          kvps: { 
            tool_used: 'file_management',
            action: 'read',
            filename,
            status: 'success'
          }
        };
      }

      return {
        content: "I can help you with file operations! Please specify what you'd like to do with files (create, read, list, etc.)",
        kvps: { tool_used: 'file_management', status: 'awaiting_instruction' }
      };
    } catch (error) {
      return {
        content: `File operation failed: ${error}`,
        kvps: { tool_used: 'file_management', status: 'error', error: String(error) }
      };
    }
  }

  private async handleListOperation(context: AgentContext, message: string): Promise<any> {
    try {
      const fileTree = await this.fileSystemService.getFileTree();
      const fileList = this.formatFileTree(fileTree);
      
      return {
        content: `Here are the files and directories in your workspace:\n\n${fileList}`,
        kvps: { 
          tool_used: 'file_browser',
          action: 'list',
          status: 'success',
          file_count: fileTree.length
        }
      };
    } catch (error) {
      return {
        content: `Failed to list files: ${error}`,
        kvps: { tool_used: 'file_browser', status: 'error', error: String(error) }
      };
    }
  }

  private async handleSearchOperation(context: AgentContext, message: string): Promise<any> {
    const searchMatch = message.match(/(?:search|find).*?(?:for)?\s*(['""].*?['""]|[^\s]+)/i);
    if (!searchMatch) {
      return {
        content: "What would you like me to search for? Please specify a search term.",
        kvps: { tool_used: 'search', status: 'awaiting_query' }
      };
    }

    const searchTerm = searchMatch[1].replace(/['"]/g, '');
    
    try {
      const result = await this.executeBash(`find ./workspace -name "*${searchTerm}*" -type f | head -20`);
      
      if (result.success && result.output.trim()) {
        return {
          content: `Found files matching "${searchTerm}":\n\n${result.output}`,
          kvps: { 
            tool_used: 'search',
            query: searchTerm,
            status: 'success'
          }
        };
      } else {
        return {
          content: `No files found matching "${searchTerm}".`,
          kvps: { 
            tool_used: 'search',
            query: searchTerm,
            status: 'no_results'
          }
        };
      }
    } catch (error) {
      return {
        content: `Search failed: ${error}`,
        kvps: { tool_used: 'search', status: 'error', error: String(error) }
      };
    }
  }

  private async handlePackageInstallation(context: AgentContext, message: string): Promise<any> {
    const packageMatch = message.match(/install.*?(npm|pip|python)?\s+(?:package\s+)?([^\s]+)/i);
    if (!packageMatch) {
      return {
        content: "Which package would you like me to install? Please specify the package name and package manager (npm, pip, etc.)",
        kvps: { tool_used: 'package_manager', status: 'awaiting_package' }
      };
    }

    const packageManager = packageMatch[1] || 'npm';
    const packageName = packageMatch[2];

    try {
      let result: ToolResult;
      
      if (packageManager.toLowerCase() === 'npm') {
        result = await this.executeBash(`npm install ${packageName}`);
      } else if (packageManager.toLowerCase() === 'pip' || packageManager.toLowerCase() === 'python') {
        result = await this.executeBash(`pip install ${packageName}`);
      } else {
        result = { success: false, output: '', error: `Unsupported package manager: ${packageManager}` };
      }

      if (result.success) {
        return {
          content: `Package '${packageName}' installed successfully using ${packageManager}!\n\nOutput:\n${result.output}`,
          kvps: { 
            tool_used: 'package_manager',
            package: packageName,
            manager: packageManager,
            status: 'success'
          }
        };
      } else {
        return {
          content: `Failed to install package '${packageName}':\n\nError:\n${result.error}`,
          kvps: { 
            tool_used: 'package_manager',
            package: packageName,
            manager: packageManager,
            status: 'error',
            error: result.error
          }
        };
      }
    } catch (error) {
      return {
        content: `Package installation failed: ${error}`,
        kvps: { tool_used: 'package_manager', status: 'error', error: String(error) }
      };
    }
  }

  private async handleGeneralQuery(context: AgentContext, message: string): Promise<any> {
    // Simple responses for general queries
    const responses = [
      "I'm Pareng Boyong, your Filipino AI AGI Super Agent! I can help you with coding, file management, running commands, and much more. What would you like me to do?",
      "Kumusta! I'm here to assist you with unlimited capabilities in this secure runtime sandbox. I can execute code, manage files, install packages, and help with development tasks.",
      "As your AI assistant, I have access to a complete development environment. I can run Python, JavaScript, bash commands, create and edit files, and much more. How can I help you today?",
      "Hello! I'm running in a secure runtime sandbox with full capabilities. I can help you with programming, system administration, file operations, and creative tasks. What's your next project?"
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    return {
      content: randomResponse,
      kvps: { 
        tool_used: 'general_chat',
        status: 'ready',
        capabilities: ['code_execution', 'file_management', 'package_installation', 'system_commands']
      }
    };
  }

  // Tool execution methods
  private async executePython(code: string): Promise<ToolResult> {
    try {
      const result = await this.terminalService.executeCommand('python3', ['-c', code]);
      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.stderr
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: String(error)
      };
    }
  }

  private async executeJavaScript(code: string): Promise<ToolResult> {
    try {
      const result = await this.terminalService.executeCommand('node', ['-e', code]);
      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.stderr
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: String(error)
      };
    }
  }

  private async executeBash(command: string): Promise<ToolResult> {
    try {
      const result = await this.terminalService.executeCommand('bash', ['-c', command]);
      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.stderr
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: String(error)
      };
    }
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
}