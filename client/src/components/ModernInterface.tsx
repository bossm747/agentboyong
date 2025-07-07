import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  Bot, 
  User, 
  Shield, 
  Code, 
  Search, 
  Brain,
  Settings,
  Activity,
  ChevronDown,
  Sparkles,
  MessageSquare,
  Zap,
  Menu
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  mode?: string;
}

interface ModernInterfaceProps {
  sessionId: string;
}

export function ModernInterface({ sessionId }: ModernInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: 'Hi! I\'m Pareng Boyong, your AI assistant. I can help with coding, security analysis, research, and general questions. How can I assist you today?',
      timestamp: new Date().toISOString()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMode, setSelectedMode] = useState('default');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const modes = [
    { 
      id: 'default', 
      name: 'General Chat', 
      icon: MessageSquare, 
      color: 'blue',
      description: 'General conversation and questions'
    },
    { 
      id: 'developer', 
      name: 'Code Assistant', 
      icon: Code, 
      color: 'green',
      description: 'Programming help and code review'
    },
    { 
      id: 'hacker', 
      name: 'Security Expert', 
      icon: Shield, 
      color: 'red',
      description: 'Security analysis and penetration testing'
    },
    { 
      id: 'researcher', 
      name: 'Research Helper', 
      icon: Search, 
      color: 'purple',
      description: 'Information gathering and analysis'
    }
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
    <div className="h-screen bg-background">
      <div className="h-full max-w-4xl mx-auto flex flex-col">
        {/* Header */}
        <Card className="rounded-none border-x-0 border-t-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Sparkles className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">Pareng Boyong</CardTitle>
                  <p className="text-sm text-muted-foreground">AI Assistant by InnovateHub PH</p>
                </div>
              </div>
              
              {/* Mode Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <currentMode.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{currentMode.name}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {modes.map((mode) => (
                    <DropdownMenuItem
                      key={mode.id}
                      onClick={() => setSelectedMode(mode.id)}
                      className="flex items-start space-x-3 p-3"
                    >
                      <mode.icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium">{mode.name}</div>
                        <div className="text-xs text-muted-foreground">{mode.description}</div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Current Mode Badge */}
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                <currentMode.icon className="w-3 h-3 mr-1" />
                {currentMode.name}
              </Badge>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-xs text-muted-foreground">{currentMode.description}</span>
            </div>
          </CardHeader>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col rounded-none border-x-0 border-b-0">
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full p-6">
              <div className="space-y-6 max-w-none">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                      message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={
                        message.type === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : message.type === 'system'
                          ? 'bg-muted'
                          : 'bg-secondary'
                      }>
                        {message.type === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : message.type === 'system' ? (
                          <Settings className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>

                    <div className={`flex-1 max-w-[85%] space-y-2 ${
                      message.type === 'user' ? 'items-end' : 'items-start'
                    } flex flex-col`}>
                      <Card className={`${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : message.type === 'system'
                          ? 'bg-muted'
                          : 'bg-card'
                      }`}>
                        <CardContent className="p-3">
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground px-1">
                        <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                        {message.mode && message.mode !== 'default' && (
                          <>
                            <Separator orientation="vertical" className="h-3" />
                            <Badge variant="outline" className="text-xs">
                              {modes.find(m => m.id === message.mode)?.name}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isProcessing && (
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-secondary">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <Card className="bg-card">
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="h-2 w-2 bg-primary rounded-full animate-bounce"></div>
                            <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]"></div>
                            <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                          </div>
                          <span className="text-sm text-muted-foreground">Thinking...</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

            {/* Input Area */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex space-x-3">
                  <div className="flex-1 relative">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Ask ${currentMode.name.toLowerCase()}...`}
                      disabled={isProcessing}
                      className="pr-12 h-12 text-base rounded-xl border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isProcessing || !inputMessage.trim()}
                      size="sm"
                      className="absolute right-2 top-2 h-8 w-8 rounded-lg bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-2 text-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {currentMode.description} • Press Enter to send
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}