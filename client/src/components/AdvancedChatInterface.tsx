import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, Code, Terminal, Eye, Download, Copy, Play, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  mode?: string;
  metadata?: {
    intent_detected?: string;
    confidence?: number;
    tools_used?: string[];
    execution_time?: number;
    attachments?: any[];
  };
  renderAs?: 'text' | 'markdown' | 'code' | 'json' | 'html' | 'terminal' | 'chart' | 'interactive';
}

interface ChatStats {
  messages_sent: number;
  commands_executed: number;
  tools_used: string[];
  session_duration: number;
  current_mode: string;
}

interface AdvancedChatInterfaceProps {
  sessionId: string;
  currentMode: string;
  onModeChange: (mode: string) => void;
}

export const AdvancedChatInterface: React.FC<AdvancedChatInterfaceProps> = ({
  sessionId,
  currentMode,
  onModeChange
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [stats, setStats] = useState<ChatStats>({
    messages_sent: 0,
    commands_executed: 0,
    tools_used: [],
    session_duration: 0,
    current_mode: currentMode
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => {
      setStats(prev => ({ ...prev, session_duration: prev.session_duration + 1 }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const detectRenderType = (content: string): 'text' | 'markdown' | 'code' | 'json' | 'html' | 'terminal' | 'chart' => {
    if (content.includes('```')) return 'code';
    if (content.startsWith('{') && content.endsWith('}')) return 'json';
    if (content.includes('<html') || content.includes('<!DOCTYPE')) return 'html';
    if (content.includes('$') || content.includes('#') || content.includes('>>')) return 'terminal';
    if (content.includes('#') || content.includes('*') || content.includes('[')) return 'markdown';
    return 'text';
  };

  const renderMessageContent = (message: ChatMessage) => {
    const renderType = message.renderAs || detectRenderType(message.content);

    switch (renderType) {
      case 'code':
        return (
          <div className="relative">
            <SyntaxHighlighter
              style={oneDark}
              language="bash"
              customStyle={{
                margin: 0,
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              {message.content}
            </SyntaxHighlighter>
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 opacity-70 hover:opacity-100"
              onClick={() => navigator.clipboard.writeText(message.content)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        );

      case 'markdown':
        return (
          <ReactMarkdown
            className="prose prose-sm dark:prose-invert max-w-none"
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        );

      case 'json':
        try {
          const jsonData = JSON.parse(message.content);
          return (
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(jsonData, null, 2)}
            </pre>
          );
        } catch {
          return <div className="text-sm">{message.content}</div>;
        }

      case 'html':
        return (
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">HTML Preview</span>
            </div>
            <iframe
              srcDoc={message.content}
              className="w-full h-64 border rounded"
              sandbox="allow-scripts"
            />
          </div>
        );

      case 'terminal':
        return (
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="h-4 w-4" />
              <span className="text-xs">Terminal Output</span>
            </div>
            <pre className="whitespace-pre-wrap">{message.content}</pre>
          </div>
        );

      default:
        return <div className="text-sm whitespace-pre-wrap">{message.content}</div>;
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/pareng-boyong/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          sessionId,
          mode: currentMode
        })
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response,
        timestamp: new Date(),
        mode: data.mode || currentMode,
        metadata: {
          intent_detected: data.intent_detected,
          confidence: data.confidence,
          tools_used: data.tools_used || [],
          execution_time: data.execution_time,
          attachments: data.attachments || []
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        messages_sent: prev.messages_sent + 1,
        commands_executed: prev.commands_executed + (data.tools_used?.length || 0),
        tools_used: [...new Set([...prev.tools_used, ...(data.tools_used || [])])],
        current_mode: data.mode || currentMode
      }));

      // Auto-switch mode if detected
      if (data.mode && data.mode !== currentMode) {
        onModeChange(data.mode);
      }

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleVoiceInput = () => {
    setIsRecording(!isRecording);
    // TODO: Implement voice recording
  };

  const exportChat = () => {
    const chatData = {
      sessionId,
      messages,
      stats,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pareng-boyong-chat-${sessionId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const modeColors = {
    hacker: 'bg-red-500',
    developer: 'bg-blue-500',
    researcher: 'bg-green-500',
    default: 'bg-gray-500'
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header with Stats */}
      <div className="border-b bg-white dark:bg-gray-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${modeColors[currentMode] || modeColors.default}`} />
              <span className="font-semibold">Pareng Boyong</span>
              <Badge variant="outline" className="text-xs">
                {currentMode.toUpperCase()}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Messages: {stats.messages_sent}</span>
            <span>Tools: {stats.tools_used.length}</span>
            <span>Time: {formatDuration(stats.session_duration)}</span>
            <Button size="sm" variant="ghost" onClick={exportChat}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {stats.tools_used.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Active Tools:</span>
            <div className="flex gap-1">
              {stats.tools_used.slice(0, 5).map(tool => (
                <Badge key={tool} variant="secondary" className="text-xs">
                  {tool}
                </Badge>
              ))}
              {stats.tools_used.length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{stats.tools_used.length - 5}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400 mb-4">
                <div className="text-2xl mb-2">🇵🇭</div>
                <h3 className="text-lg font-semibold mb-2">Kumusta! I'm Pareng Boyong</h3>
                <p className="text-sm">Your Filipino AI AGI Super Agent with unlimited capabilities</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer" 
                      onClick={() => setInputValue("Scan this network for vulnerabilities")}>
                  <div className="text-red-500 mb-1">🎯</div>
                  <div className="text-sm font-medium">Security Testing</div>
                  <div className="text-xs text-gray-500">Network scans, penetration testing</div>
                </Card>
                <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setInputValue("Build a todo app with React")}>
                  <div className="text-blue-500 mb-1">💻</div>
                  <div className="text-sm font-medium">Development</div>
                  <div className="text-xs text-gray-500">Full-stack applications, APIs</div>
                </Card>
                <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setInputValue("Research AI trends in 2024")}>
                  <div className="text-green-500 mb-1">🔬</div>
                  <div className="text-sm font-medium">Research</div>
                  <div className="text-xs text-gray-500">Data analysis, academic research</div>
                </Card>
                <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setInputValue("How does machine learning work?")}>
                  <div className="text-gray-500 mb-1">🤖</div>
                  <div className="text-sm font-medium">General AI</div>
                  <div className="text-xs text-gray-500">Questions, explanations, help</div>
                </Card>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${
                message.type === 'user' 
                  ? 'bg-blue-500 text-white rounded-lg rounded-br-sm' 
                  : message.type === 'system'
                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg'
                  : 'bg-white dark:bg-gray-800 border rounded-lg rounded-bl-sm shadow-sm'
              } p-4`}>
                
                {message.type === 'assistant' && message.metadata && (
                  <div className="mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {message.mode && (
                        <Badge variant="outline" className="text-xs">
                          {message.mode.toUpperCase()}
                        </Badge>
                      )}
                      {message.metadata.intent_detected && (
                        <span>Intent: {message.metadata.intent_detected}</span>
                      )}
                      {message.metadata.confidence && (
                        <span>Confidence: {message.metadata.confidence}%</span>
                      )}
                      {message.metadata.execution_time && (
                        <span>Time: {message.metadata.execution_time}ms</span>
                      )}
                    </div>
                    {message.metadata.tools_used && message.metadata.tools_used.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {message.metadata.tools_used.map(tool => (
                          <Badge key={tool} variant="secondary" className="text-xs">
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {renderMessageContent(message)}
                
                <div className="text-xs text-gray-500 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border rounded-lg rounded-bl-sm shadow-sm p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <span className="text-sm text-gray-500">Pareng Boyong is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-white dark:bg-gray-800 p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 min-h-[2.5rem] max-h-32">
            <Textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... (Shift+Enter for new line)"
              className="resize-none min-h-[2.5rem]"
              disabled={isLoading}
            />
          </div>
          
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleFileUpload}
              disabled={isLoading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleVoiceInput}
              disabled={isLoading}
              className={isRecording ? 'text-red-500' : ''}
            >
              <Mic className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              onClick={sendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="px-4"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={(e) => {
            // TODO: Handle file uploads
            console.log('Files selected:', e.target.files);
          }}
        />
      </div>
    </div>
  );
};