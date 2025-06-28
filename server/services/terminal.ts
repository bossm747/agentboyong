import { spawn, type ChildProcess } from 'child_process';
import * as pty from 'node-pty';
import { storage } from '../storage';

export class TerminalService {
  private sessionId: string;
  private terminals: Map<string, pty.IPty> = new Map();
  private processes: Map<number, ChildProcess> = new Map();

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  createTerminal(terminalId: string, workingDir: string = './workspace'): pty.IPty {
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    const sessionWorkDir = `${workingDir}/${this.sessionId}`;
    
    const terminal = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: sessionWorkDir,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
      },
    });

    this.terminals.set(terminalId, terminal);
    return terminal;
  }

  getTerminal(terminalId: string): pty.IPty | undefined {
    return this.terminals.get(terminalId);
  }

  writeToTerminal(terminalId: string, data: string): void {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      terminal.write(data);
    }
  }

  resizeTerminal(terminalId: string, cols: number, rows: number): void {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      terminal.resize(cols, rows);
    }
  }

  killTerminal(terminalId: string): void {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      terminal.kill();
      this.terminals.delete(terminalId);
    }
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
    for (const [terminalId, terminal] of this.terminals) {
      terminal.kill();
    }
    this.terminals.clear();

    // Kill all processes
    for (const [pid, process] of this.processes) {
      process.kill();
    }
    this.processes.clear();
  }
}
