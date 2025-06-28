export interface TerminalMessage {
  type: 'input' | 'output' | 'error' | 'system';
  data: string;
  timestamp: number;
}

export function parseAnsiCodes(text: string): string {
  // Remove ANSI escape codes for display
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

export function formatCommand(command: string, args: string[] = []): string {
  return `${command} ${args.join(' ')}`.trim();
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

export function getCommandHistory(): string[] {
  const history = localStorage.getItem('terminal-history');
  return history ? JSON.parse(history) : [];
}

export function addToCommandHistory(command: string): void {
  const history = getCommandHistory();
  const filtered = history.filter(cmd => cmd !== command);
  const updated = [...filtered, command].slice(-100); // Keep last 100 commands
  localStorage.setItem('terminal-history', JSON.stringify(updated));
}

export function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    'py': 'python',
    'js': 'javascript',
    'ts': 'typescript',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'sh': 'bash',
    'ps1': 'powershell',
  };
  
  return languageMap[ext || ''] || 'bash';
}

export function getExecutorForLanguage(language: string): { command: string; args: string[] } {
  const executors: Record<string, { command: string; args: string[] }> = {
    'python': { command: 'python3', args: [] },
    'javascript': { command: 'node', args: [] },
    'typescript': { command: 'ts-node', args: [] },
    'java': { command: 'java', args: [] },
    'cpp': { command: 'g++', args: ['-o', 'temp', '&&', './temp'] },
    'c': { command: 'gcc', args: ['-o', 'temp', '&&', './temp'] },
    'go': { command: 'go', args: ['run'] },
    'rust': { command: 'rustc', args: ['-o', 'temp', '&&', './temp'] },
    'php': { command: 'php', args: [] },
    'ruby': { command: 'ruby', args: [] },
    'bash': { command: 'bash', args: [] },
    'powershell': { command: 'pwsh', args: [] },
  };
  
  return executors[language] || { command: 'cat', args: [] };
}

export function isValidFilename(filename: string): boolean {
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(filename)) {
    return false;
  }
  
  // Check for reserved names (Windows)
  const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  if (reservedNames.test(filename)) {
    return false;
  }
  
  // Check length
  if (filename.length === 0 || filename.length > 255) {
    return false;
  }
  
  return true;
}

export function sanitizePath(path: string): string {
  // Remove leading slashes and resolve relative paths
  return path
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .replace(/\/\./g, '/')
    .replace(/\/\.\./g, '/')
    .replace(/\/$/, '');
}

export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    'txt': 'text/plain',
    'md': 'text/markdown',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'ts': 'application/typescript',
    'json': 'application/json',
    'xml': 'application/xml',
    'py': 'text/x-python',
    'java': 'text/x-java',
    'cpp': 'text/x-c++src',
    'c': 'text/x-csrc',
    'go': 'text/x-go',
    'rs': 'text/x-rust',
    'php': 'application/x-httpd-php',
    'rb': 'text/x-ruby',
    'sh': 'application/x-sh',
    'yml': 'application/x-yaml',
    'yaml': 'application/x-yaml',
  };
  
  return mimeTypes[ext || ''] || 'text/plain';
}
