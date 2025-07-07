import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Bot, 
  User, 
  Shield, 
  Code, 
  Search, 
  Brain,
  Settings,
  Activity
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  mode?: string;
}

interface SimplifiedInterfaceProps {
  sessionId: string;
}

export function SimplifiedInterface({ sessionId }: SimplifiedInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: '🇵🇭 Kumusta! Ako si Pareng Boyong, ang inyong Filipino AI assistant. Anong maitutulong ko sa inyo?',
      timestamp: new Date().toISOString()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMode, setSelectedMode] = useState('default');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const modes = [
    { id: 'default', name: 'Chat', icon: Bot, description: 'General conversation' },
    { id: 'hacker', name: 'Security', icon: Shield, description: 'Security analysis' },
    { id: 'developer', name: 'Code', icon: Code, description: 'Programming help' },
    { id: 'researcher', name: 'Research', icon: Search, description: 'Information gathering' }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
      mode: selectedMode
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/pareng-boyong/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          sessionId,
          mode: selectedMode,
          userId: 'default_user'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.message,
          timestamp: data.timestamp,
          mode: selectedMode
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'system',
          content: `Error: ${data.error || 'Failed to process message'}`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: `Connection error: Please try again`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getCurrentMode = () => modes.find(m => m.id === selectedMode) || modes[0];
  const currentMode = getCurrentMode();

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Simple Header */}
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">PB</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold">Pareng Boyong</h1>
              <p className="text-xs text-muted-foreground">Filipino AI Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {currentMode.name} Mode
            </Badge>
          </div>
        </div>
      </Card>

      {/* Mode Selection */}
      <Card className="p-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
          <span className="text-sm font-medium text-muted-foreground">Choose your mode:</span>
          <div className="flex flex-wrap gap-1">
            {modes.map((mode) => (
              <Button
                key={mode.id}
                size="sm"
                variant={selectedMode === mode.id ? 'default' : 'outline'}
                onClick={() => setSelectedMode(mode.id)}
                className="text-xs flex-shrink-0"
                title={mode.description}
              >
                <mode.icon className="h-3 w-3 mr-1" />
                {mode.name}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {modes.find(m => m.id === selectedMode)?.description}
        </div>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col min-h-0">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${
                  message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                  message.type === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : message.type === 'system'
                    ? 'bg-gray-500 text-white'
                    : 'bg-green-500 text-white'
                }`}>
                  {message.type === 'user' ? (
                    <User className="h-3 w-3" />
                  ) : message.type === 'system' ? (
                    <Settings className="h-3 w-3" />
                  ) : (
                    <Bot className="h-3 w-3" />
                  )}
                </div>

                <div className={`flex-1 max-w-[85%] ${
                  message.type === 'user' ? 'text-right' : ''
                }`}>
                  <div className={`rounded-lg p-3 text-sm ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : message.type === 'system'
                      ? 'bg-gray-100 dark:bg-gray-800 text-muted-foreground'
                      : 'bg-muted'
                  }`}>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                    <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                    {message.mode && message.mode !== 'default' && (
                      <Badge variant="secondary" className="text-xs">
                        {modes.find(m => m.id === message.mode)?.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center">
                  <Bot className="h-3 w-3" />
                </div>
                <div className="flex-1">
                  <div className="rounded-lg p-3 bg-muted">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-3 w-3 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask Pareng Boyong anything (${currentMode.name} mode)...`}
              disabled={isProcessing}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isProcessing || !inputMessage.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-2 text-xs text-muted-foreground text-center">
            {currentMode.description} • Press Enter to send
          </div>
        </div>
      </Card>
    </div>
  );
}