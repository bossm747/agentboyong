import { exec } from 'child_process';
import { promisify } from 'util';
import { TerminalService } from './terminal.js';

const execAsync = promisify(exec);

export interface SecurityExecutionResult {
  success: boolean;
  command: string;
  output: string;
  error?: string;
  executionTime: number;
  realExecution: boolean;
}

export class RealSecurityExecutor {
  private terminal: TerminalService;
  
  constructor(sessionId: string) {
    this.terminal = new TerminalService(sessionId);
  }

  private securityToolPaths = {
    nmap: '/nix/store/hk1jvn2l0581kjnia53nn9jlc8jga1yd-nmap-7.94/bin/nmap',
    nikto: '/nix/store/jqbva5zk7jxa445a23916qrih8z0268i-nikto-2.5.0/bin/nikto',
    sqlmap: '/nix/store/k8y38mbfvg8sjmsxcv1qh7dr1z4k1lk5-python3.11-sqlmap-1.8.5/bin/sqlmap',
    john: '/nix/store/yfyqnlplj6y28c1x9n3wf3av12b1dsqy-john-1.9.0-jumbo-1/bin/john',
    hashcat: '/nix/store/4zrz3bg7riydmpad1kn1306734ppdazv-hashcat-6.2.6/bin/hashcat',
    gobuster: '/nix/store/n3gspj7x1lw28fddj60yl4gpf5rd85nl-gobuster-3.6.0/bin/gobuster',
    dirb: '/nix/store/x7pdhvlz3r6sgayzpb2qmjm5mv20z8x0-dirb-2.22/bin/dirb',
    whois: '/nix/store/bp6my0hgyld9bk1b6gsxhwxbqzlgrlzn-whois-5.5.23/bin/whois',
    tcpdump: '/nix/store/p16nknin6274dnb8f9lsaakb9wzi40sz-tcpdump-4.99.4/bin/tcpdump',
    netcat: '/nix/store/p052kndxyj7v1bll77dack7zkvj2pmya-netcat-gnu-0.7.1/bin/netcat'
  };

  async executeSecurityCommand(toolName: string, args: string[], target?: string): Promise<SecurityExecutionResult> {
    const startTime = Date.now();
    
    try {
      const toolPath = this.securityToolPaths[toolName as keyof typeof this.securityToolPaths];
      
      if (!toolPath) {
        return {
          success: false,
          command: `${toolName} ${args.join(' ')}`,
          output: '',
          error: `Security tool '${toolName}' not found in tool inventory`,
          executionTime: Date.now() - startTime,
          realExecution: false
        };
      }

      // Build safe command with validation
      const sanitizedArgs = this.validateAndSanitizeArgs(args, target);
      const fullCommand = `${toolPath} ${sanitizedArgs.join(' ')}`;
      
      console.log(`🔧 Executing real security tool: ${fullCommand}`);
      
      // Execute with timeout and capture output
      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      const executionTime = Date.now() - startTime;
      
      console.log(`✅ Security tool executed successfully in ${executionTime}ms`);
      
      return {
        success: true,
        command: fullCommand,
        output: stdout || stderr || 'Command executed successfully with no output',
        executionTime,
        realExecution: true
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      console.error(`❌ Security tool execution failed:`, error.message);
      
      return {
        success: false,
        command: `${toolName} ${args.join(' ')}`,
        output: '',
        error: error.message || 'Unknown execution error',
        executionTime,
        realExecution: true // Still real execution, just failed
      };
    }
  }

  private validateAndSanitizeArgs(args: string[], target?: string): string[] {
    // Basic input validation and sanitization
    const sanitized = args.map(arg => {
      // Remove potentially dangerous characters
      return arg.replace(/[;&|`$(){}[\]<>]/g, '');
    });

    // Add target if provided and valid
    if (target && this.isValidTarget(target)) {
      sanitized.push(target);
    }

    return sanitized;
  }

  private isValidTarget(target: string): boolean {
    // Basic target validation
    const validPatterns = [
      /^127\.0\.0\.1$/, // localhost
      /^localhost$/, // localhost name
      /^192\.168\.\d{1,3}\.\d{1,3}$/, // private IP ranges
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // private IP ranges
      /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ // domain names
    ];

    return validPatterns.some(pattern => pattern.test(target));
  }

  async detectSecurityOperation(message: string): Promise<{
    isSecurityOperation: boolean;
    tool?: string;
    args?: string[];
    target?: string;
    operation?: string;
  }> {
    const lowerMessage = message.toLowerCase();
    
    // Detect nmap operations
    if (lowerMessage.includes('nmap') || lowerMessage.includes('port scan') || lowerMessage.includes('network scan')) {
      const portMatch = message.match(/port[s]?\s+(\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*)/i);
      const targetMatch = message.match(/(?:on|target|scan)\s+([a-zA-Z0-9.-]+)/i);
      
      const args = ['-sT']; // TCP connect scan (doesn't require root)
      if (portMatch) {
        args.push('-p', portMatch[1]);
      }
      
      return {
        isSecurityOperation: true,
        tool: 'nmap',
        args,
        target: targetMatch?.[1] || '127.0.0.1',
        operation: 'port_scan'
      };
    }

    // Detect web vulnerability scanning
    if (lowerMessage.includes('nikto') || lowerMessage.includes('web scan') || lowerMessage.includes('web vulnerability')) {
      const urlMatch = message.match(/https?:\/\/[^\s]+/i) || message.match(/(?:scan|target)\s+([a-zA-Z0-9.-]+)/i);
      
      return {
        isSecurityOperation: true,
        tool: 'nikto',
        args: ['-h'],
        target: urlMatch?.[1] || 'localhost',
        operation: 'web_vulnerability_scan'
      };
    }

    // Detect SQL injection testing
    if (lowerMessage.includes('sqlmap') || lowerMessage.includes('sql injection')) {
      const urlMatch = message.match(/https?:\/\/[^\s]+/i);
      
      return {
        isSecurityOperation: true,
        tool: 'sqlmap',
        args: ['-u', '--batch'],
        target: urlMatch?.[0],
        operation: 'sql_injection_test'
      };
    }

    // Detect directory enumeration
    if (lowerMessage.includes('gobuster') || lowerMessage.includes('directory') || lowerMessage.includes('dirb')) {
      const urlMatch = message.match(/https?:\/\/[^\s]+/i) || message.match(/(?:scan|target)\s+([a-zA-Z0-9.-]+)/i);
      
      return {
        isSecurityOperation: true,
        tool: 'gobuster',
        args: ['dir', '-u'],
        target: urlMatch?.[1] || 'http://localhost',
        operation: 'directory_enumeration'
      };
    }

    // Detect password cracking
    if (lowerMessage.includes('john') || lowerMessage.includes('password crack') || lowerMessage.includes('hash crack')) {
      return {
        isSecurityOperation: true,
        tool: 'john',
        args: ['--show'],
        operation: 'password_cracking'
      };
    }

    return { isSecurityOperation: false };
  }
}

export default RealSecurityExecutor;