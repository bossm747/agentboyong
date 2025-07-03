import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Terminal, X, Minus, Square, RotateCcw } from 'lucide-react';

interface TerminalPanelProps {
  sessionId: string;
}

interface TerminalLine {
  id: string;
  content: string;
  type: 'command' | 'output' | 'error' | 'system';
  timestamp: Date;
}

export function TerminalPanel({ sessionId }: TerminalPanelProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [currentDir, setCurrentDir] = useState('~/workspace');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    connectToTerminal();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionId]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const connectToTerminal = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?sessionId=${sessionId}`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      setIsConnected(true);
      addLine('Terminal connected', 'system');
      
      // Send session initialization
      wsRef.current?.send(JSON.stringify({
        type: 'terminal_init',
        sessionId,
        data: { cwd: `./workspace/${sessionId}` }
      }));
    };
    
    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleTerminalMessage(message);
      } catch (error) {
        console.error('Terminal message parse error:', error);
      }
    };
    
    wsRef.current.onclose = () => {
      setIsConnected(false);
      addLine('Terminal disconnected', 'system');
    };
    
    wsRef.current.onerror = (error) => {
      console.error('Terminal WebSocket error:', error);
      addLine('Terminal connection error', 'error');
    };
  };

  const handleTerminalMessage = (message: any) => {
    switch (message.type) {
      case 'terminal_output':
        addLine(message.data, 'output');
        setIsExecuting(false);
        break;
      case 'terminal_error':
        addLine(message.data, 'error');
        setIsExecuting(false);
        break;
      case 'terminal_cwd':
        setCurrentDir(message.data);
        break;
      case 'terminal_complete':
        setIsExecuting(false);
        break;
      case 'connection:established':
        // Handle WebSocket connection established message
        setIsConnected(true);
        addLine(`Terminal session established (${message.sessionId})`, 'system');
        break;
      default:
        // Only log truly unknown messages, not connection status updates
        if (!message.type?.includes('connection') && !message.type?.includes('status')) {
          console.log('Unknown terminal message:', message);
        }
    }
  };

  const addLine = (content: string, type: TerminalLine['type']) => {
    const newLine: TerminalLine = {
      id: Date.now().toString(),
      content,
      type,
      timestamp: new Date()
    };
    setLines(prev => [...prev, newLine]);
  };

  const executeCommand = () => {
    if (!currentCommand.trim() || !isConnected || isExecuting) return;
    
    const cmd = currentCommand.trim();
    
    // Add command to history
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);
    
    // Display command
    addLine(`$ ${cmd}`, 'command');
    
    // Send command to server
    setIsExecuting(true);
    wsRef.current?.send(JSON.stringify({
      type: 'terminal_execute',
      sessionId,
      data: { command: cmd }
    }));
    
    setCurrentCommand('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCurrentCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex]);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // TODO: Implement tab completion
    }
  };

  const clearTerminal = () => {
    setLines([]);
    addLine('Terminal cleared', 'system');
  };

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'command':
        return 'text-cyan-400';
      case 'output':
        return 'text-gray-300';
      case 'error':
        return 'text-red-400';
      case 'system':
        return 'text-yellow-400';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className="h-full flex flex-col bg-black border border-purple-500/30 rounded-lg overflow-hidden">
      <CardHeader className="pb-2 sm:pb-3 bg-black border-b border-purple-500/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs sm:text-sm text-cyan-400 flex items-center">
            <Terminal className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Terminal</span>
            <span className="sm:hidden">Shell</span>
            <div className={`ml-2 w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </CardTitle>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearTerminal}
              className="p-1 h-6 w-6 sm:h-7 sm:w-7 text-gray-400 hover:text-cyan-400"
            >
              <RotateCcw className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={connectToTerminal}
              className="p-1 h-6 w-6 sm:h-7 sm:w-7 text-gray-400 hover:text-cyan-400"
            >
              <Square className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </Button>
          </div>
        </div>
        
        {/* Current Directory */}
        <div className="text-[10px] sm:text-xs text-purple-300 bg-gray-800/30 px-2 py-1 rounded border border-gray-600/50 mt-2">
          {currentDir}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 flex flex-col">
        {/* Terminal Output */}
        <div
          ref={terminalRef}
          className="flex-1 p-2 sm:p-3 font-mono text-[10px] sm:text-xs overflow-y-auto bg-black"
          style={{ scrollbarWidth: 'thin' }}
        >
          {lines.map((line) => (
            <div key={line.id} className={`mb-1 ${getLineColor(line.type)}`}>
              <span className="whitespace-pre-wrap">{line.content}</span>
            </div>
          ))}
          {isExecuting && (
            <div className="text-yellow-400 animate-pulse">
              Executing...
            </div>
          )}
        </div>
        
        {/* Command Input */}
        <div className="border-t border-purple-500/30 p-2 sm:p-3 bg-gray-900/50">
          <div className="flex items-center space-x-2">
            <span className="text-cyan-400 font-mono text-[10px] sm:text-xs">$</span>
            <Input
              ref={inputRef}
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter command..."
              className="flex-1 bg-transparent border-none text-[10px] sm:text-xs text-gray-300 font-mono focus:ring-0 focus:border-none p-0"
              disabled={!isConnected || isExecuting}
            />
            <Button
              onClick={executeCommand}
              disabled={!isConnected || !currentCommand.trim() || isExecuting}
              className="px-2 sm:px-3 py-1 h-6 sm:h-7 text-[10px] sm:text-xs bg-cyan-600 hover:bg-cyan-700 text-black font-medium"
            >
              Run
            </Button>
          </div>
        </div>
      </CardContent>
    </div>
  );
}