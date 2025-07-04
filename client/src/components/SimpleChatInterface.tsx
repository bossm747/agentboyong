import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  };
}

interface SimpleChatInterfaceProps {
  sessionId: string;
  currentMode: string;
  onModeChange: (mode: string) => void;
}

export const SimpleChatInterface: React.FC<SimpleChatInterfaceProps> = ({
  sessionId,
  currentMode,
  onModeChange
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          mode: currentMode,
          userId: 'demo_user'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response || data.message || 'No response received',
        timestamp: new Date(),
        mode: data.mode || currentMode,
        metadata: {
          intent_detected: data.intent_detected,
          confidence: data.confidence,
          tools_used: data.tools_used || [],
          execution_time: data.execution_time
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
      
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

  const modeColors: { [key: string]: string } = {
    hacker: 'bg-red-500',
    developer: 'bg-blue-500',
    researcher: 'bg-green-500',
    default: 'bg-gray-500'
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-800 p-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${modeColors[currentMode] || modeColors.default}`} />
          <span className="font-semibold">Pareng Boyong</span>
          <Badge variant="outline" className="text-xs">
            {currentMode.toUpperCase()}
          </Badge>
        </div>
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
                
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                
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
              disabled={isLoading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              disabled={isLoading}
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
      </div>
    </div>
  );
};