import { spawn, type ChildProcess } from 'child_process';
import { storage } from '../storage';

interface TerminalSession {
  id: string;
  process: ChildProcess | null;
  history: string[];
  currentDir: string;
}

export class TerminalService {
  private sessionId: string;
  private terminals: Map<string, TerminalSession> = new Map();
  private processes: Map<number, ChildProcess> = new Map();

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  createTerminal(terminalId: string, workingDir: string = './workspace'): TerminalSession {
    const sessionWorkDir = `${workingDir}/${this.sessionId}`;
    
    const terminal: TerminalSession = {
      id: terminalId,
      process: null,
      history: [],
      currentDir: sessionWorkDir,
    };

    this.terminals.set(terminalId, terminal);
    return terminal;
  }

  getTerminal(terminalId: string): TerminalSession | undefined {
    return this.terminals.get(terminalId);
  }

  async writeToTerminal(terminalId: string, data: string): Promise<string> {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      return 'Terminal not found';
    }

    // Handle command execution
    const command = data.trim();
    if (command) {
      terminal.history.push(command);
      
      try {
        const result = await this.executeCommand(command, [], terminal.currentDir);
        const output = `$ ${command}\n${result.stdout}${result.stderr ? `\nError: ${result.stderr}` : ''}\n`;
        return output;
      } catch (error) {
        return `$ ${command}\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
      }
    }
    
    return '';
  }

  resizeTerminal(terminalId: string, cols: number, rows: number): void {
    // For web-based terminal, we don't need to handle resize
    console.log(`Terminal ${terminalId} resized to ${cols}x${rows}`);
  }

  killTerminal(terminalId: string): void {
    const terminal = this.terminals.get(terminalId);
    if (terminal && terminal.process) {
      terminal.process.kill();
    }
    this.terminals.delete(terminalId);
  }

  async executeCommand(command: string, args: string[] = [], workingDir?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const sessionWorkDir = workingDir || `./workspace/${this.sessionId}`;
    
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: sessionWorkDir,
        env: process.env,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', async (code) => {
        const exitCode = code || 0;
        
        // Store process information
        try {
          await storage.createProcess({
            sessionId: this.sessionId,
            pid: child.pid || 0,
            name: command,
            command: `${command} ${args.join(' ')}`,
            status: exitCode === 0 ? 'completed' : 'failed',
          });
        } catch (error) {
          console.error('Failed to store process info:', error);
        }

        resolve({ stdout, stderr, exitCode });
      });

      child.on('error', (error) => {
        reject(error);
      });

      this.processes.set(child.pid || 0, child);
    });
  }

  async getRunningProcesses(): Promise<any[]> {
    try {
      const processes = await storage.getProcesses(this.sessionId);
      return processes.filter(p => p.status === 'running' || p.status === 'active');
    } catch (error) {
      console.error('Failed to get processes:', error);
      return [];
    }
  }

  killProcess(pid: number): boolean {
    const process = this.processes.get(pid);
    if (process) {
      process.kill();
      this.processes.delete(pid);
      return true;
    }
    return false;
  }

  cleanup(): void {
    // Kill all terminals
    Array.from(this.terminals.entries()).forEach(([terminalId, terminal]) => {
      if (terminal.process) {
        terminal.process.kill();
      }
    });
    this.terminals.clear();

    // Kill all processes
    Array.from(this.processes.entries()).forEach(([pid, process]) => {
      process.kill();
    });
    this.processes.clear();
  }
}
