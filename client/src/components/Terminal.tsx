import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Columns, Maximize2, Terminal as TerminalIcon } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

interface TerminalProps {
  sessionId: string;
}

export default function Terminal({ sessionId }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminalId, setTerminalId] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [currentInput, setCurrentInput] = useState<string>('');
  
  const { socket, isConnected } = useWebSocket(sessionId);

  useEffect(() => {
    if (socket && isConnected) {
      // Create terminal on server
      socket.send(JSON.stringify({
        type: 'terminal:create',
      }));

      // Handle socket messages
      const handleMessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'terminal:created':
              setTerminalId(message.terminalId);
              break;
              
            case 'terminal:data':
              if (message.terminalId === terminalId || !terminalId) {
                setTerminalOutput(prev => prev + message.data);
              }
              break;
              
            case 'terminal:exit':
              if (message.terminalId === terminalId) {
                setTerminalOutput(prev => prev + `\nProcess exited with code ${message.exitCode}\n`);
              }
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      socket.addEventListener('message', handleMessage);

      return () => {
        socket.removeEventListener('message', handleMessage);
      };
    }
  }, [socket, isConnected, terminalId]);

  const handleInputSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && socket && terminalId) {
      socket.send(JSON.stringify({
        type: 'terminal:input',
        terminalId,
        data: currentInput + '\n',
      }));
      setCurrentInput('');
    }
  };

  const handleClear = () => {
    setTerminalOutput('');
    if (socket && terminalId) {
      socket.send(JSON.stringify({
        type: 'terminal:clear',
        terminalId,
      }));
    }
  };

  const handleSplit = () => {
    // TODO: Implement terminal splitting
    console.log('Split terminal');
  };

  const handleMaximize = () => {
    // TODO: Implement terminal maximization
    console.log('Maximize terminal');
  };

  if (!isConnected) {
    return (
      <div className="h-64 bg-editor-bg border-t border-border-color flex items-center justify-center">
        <div className="text-text-secondary">Connecting to terminal...</div>
      </div>
    );
  }

  return (
    <div className="h-64 bg-editor-bg border-t border-border-color flex flex-col">
      {/* Terminal Header */}
      <div className="px-4 py-2 border-b border-border-color flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-sm font-medium flex items-center">
            <TerminalIcon className="mr-2 h-4 w-4 text-success-green" />
            Terminal
          </h3>
          <div className="flex items-center space-x-2 text-xs text-text-secondary">
            <span className="bg-border-color px-2 py-1 rounded">bash</span>
            <span>/workspace</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-text-secondary hover:text-text-primary"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSplit}
            className="text-text-secondary hover:text-text-primary"
          >
            <Columns className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMaximize}
            className="text-text-secondary hover:text-text-primary"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 p-2 bg-black text-green-400 font-mono text-sm overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto p-2">
            <pre className="whitespace-pre-wrap">
              {terminalOutput || 'Terminal ready. Type commands and press Enter...\n'}
            </pre>
          </div>
          <div className="flex items-center p-2 border-t border-gray-700">
            <span className="text-green-400">$ </span>
            <input
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleInputSubmit}
              className="flex-1 bg-transparent text-green-400 outline-none ml-1"
              placeholder="Enter command..."
              disabled={!isConnected || !terminalId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
