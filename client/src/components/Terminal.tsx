import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Columns, Maximize2, Terminal as TerminalIcon } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

interface TerminalProps {
  sessionId: string;
}

export default function Terminal({ sessionId }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [xterm, setXterm] = useState<any>(null);
  const [fitAddon, setFitAddon] = useState<any>(null);
  const [terminalId, setTerminalId] = useState<string | null>(null);
  
  const { socket, isConnected } = useWebSocket(sessionId);

  useEffect(() => {
    // Load xterm.js
    const loadXterm = async () => {
      // Load CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/xterm@5.3.0/css/xterm.css';
      document.head.appendChild(link);

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/xterm@5.3.0/lib/xterm.js';
      script.onload = () => {
        const fitScript = document.createElement('script');
        fitScript.src = 'https://unpkg.com/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js';
        fitScript.onload = () => {
          setXterm((window as any).Terminal);
          setFitAddon((window as any).FitAddon);
        };
        document.head.appendChild(fitScript);
      };
      document.head.appendChild(script);
    };

    loadXterm();
  }, []);

  useEffect(() => {
    if (xterm && fitAddon && terminalRef.current && socket && isConnected) {
      const terminal = new xterm({
        theme: {
          background: '#1e1e1e',
          foreground: '#cccccc',
          cursor: '#cccccc',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#e5e5e5',
        },
        fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
        fontSize: 14,
        lineHeight: 1.2,
        cursorBlink: true,
        allowTransparency: true,
      });

      const fit = new fitAddon.FitAddon();
      terminal.loadAddon(fit);
      terminal.open(terminalRef.current);
      fit.fit();

      // Handle terminal input
      terminal.onData((data: string) => {
        if (socket && terminalId) {
          socket.send(JSON.stringify({
            type: 'terminal:input',
            terminalId,
            data,
          }));
        }
      });

      // Handle resize
      terminal.onResize(({ cols, rows }) => {
        if (socket && terminalId) {
          socket.send(JSON.stringify({
            type: 'terminal:resize',
            terminalId,
            cols,
            rows,
          }));
        }
      });

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
                terminal.write(message.data);
              }
              break;
              
            case 'terminal:exit':
              if (message.terminalId === terminalId) {
                terminal.write('\r\n\x1b[31mProcess exited with code ' + message.exitCode + '\x1b[0m\r\n');
              }
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      socket.addEventListener('message', handleMessage);

      // Handle window resize
      const handleResize = () => {
        fit.fit();
      };
      window.addEventListener('resize', handleResize);

      return () => {
        socket.removeEventListener('message', handleMessage);
        window.removeEventListener('resize', handleResize);
        terminal.dispose();
      };
    }
  }, [xterm, fitAddon, socket, isConnected, terminalId]);

  const handleClear = () => {
    if (terminalRef.current) {
      const terminal = (terminalRef.current as any).terminal;
      if (terminal) {
        terminal.clear();
      }
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
      <div className="flex-1 p-2">
        <div 
          ref={terminalRef} 
          className="h-full w-full"
          style={{ background: 'var(--editor-bg)' }}
        />
      </div>
    </div>
  );
}
