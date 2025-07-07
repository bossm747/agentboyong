import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopilotKitInterface } from './CopilotKitInterface';
import { 
  Send, 
  Bot, 
  User, 
  Activity, 
  Terminal, 
  FileEdit, 
  Globe, 
  Shield, 
  Brain,
  Play,
  Pause,
  Square,
  Eye,
  EyeOff,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'task_update';
  content: string;
  timestamp: string;
  metadata?: {
    task_id?: string;
    execution_time?: number;
    tools_used?: string[];
    mode?: string;
    intent_detected?: string;
    confidence?: number;
  };
}

interface AdvancedAIInterfaceProps {
  sessionId: string;
  mode?: string;
  onModeChange?: (mode: string) => void;
}

export function AdvancedAIInterface({ sessionId, mode = 'default', onModeChange }: AdvancedAIInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: '🇵🇭 Kumusta! Ako si Pareng Boyong, ang inyong Filipino AI AGI Super Agent mula sa InnovateHub PH! Handa na akong tumulong sa inyo sa anumang kailangan ninyo - programming, research, hacking, o kahit anong proyekto. Anong maitutulong ko sa inyo ngayon?',
      timestamp: new Date().toISOString()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLiveMonitor, setShowLiveMonitor] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const modes = [
    { id: 'default', name: 'Default', icon: Bot, color: 'blue' },
    { id: 'hacker', name: 'Hacker', icon: Shield, color: 'red' },
    { id: 'developer', name: 'Developer', icon: FileEdit, color: 'green' },
    { id: 'researcher', name: 'Researcher', icon: Brain, color: 'purple' }
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
      timestamp: new Date().toISOString()
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
          mode,
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
          metadata: {
            task_id: data.task_id,
            execution_time: data.execution_time,
            tools_used: data.tools_used,
            mode: data.mode,
            intent_detected: data.intent_detected,
            confidence: data.confidence
          }
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Auto-switch mode if intent detection suggests it
        if (data.intent_detected && data.confidence > 0.8 && data.intent_detected !== mode) {
          onModeChange?.(data.intent_detected);
        }
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
        content: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

  const getCurrentModeInfo = () => {
    return modes.find(m => m.id === mode) || modes[0];
  };

  const formatMessage = (content: string) => {
    // Basic markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  };

  const currentMode = getCurrentModeInfo();

  return (
    <div className="flex flex-col h-full space-y-2 p-2 sm:space-y-4 sm:p-4">
      {/* Header with Mode Selection */}
      <Card className="p-2 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <currentMode.icon className={`h-4 w-4 sm:h-5 sm:w-5 text-${currentMode.color}-500`} />
              <h2 className="text-sm sm:text-lg font-semibold">Pareng Boyong</h2>
              <Badge variant="outline" className={`text-xs sm:text-sm text-${currentMode.color}-600`}>
                {currentMode.name}
              </Badge>
            </div>
            
            <div className="flex space-x-1 overflow-x-auto">
              {modes.map((modeOption) => (
                <Button
                  key={modeOption.id}
                  size="sm"
                  variant={mode === modeOption.id ? 'default' : 'outline'}
                  onClick={() => onModeChange?.(modeOption.id)}
                  className="flex items-center space-x-1 flex-shrink-0"
                >
                  <modeOption.icon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">{modeOption.name}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={showLiveMonitor ? 'default' : 'outline'}
              onClick={() => setShowLiveMonitor(!showLiveMonitor)}
              className="text-xs sm:text-sm"
            >
              {showLiveMonitor ? <Eye className="h-3 w-3 sm:h-4 sm:w-4" /> : <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />}
              <span className="hidden sm:inline ml-1">Monitor</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Interface */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-4 min-h-0">
        {/* Chat Interface */}
        <div className="lg:col-span-2 min-h-0">
          <Card className="h-full flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="p-2 sm:p-4 border-b">
                <TabsList className="grid grid-cols-2 w-full max-w-md">
                  <TabsTrigger value="chat" className="text-xs sm:text-sm">Chat</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs sm:text-sm">History</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="chat" className="flex-1 flex flex-col m-0">
                {/* Messages */}
                <ScrollArea className="flex-1 p-2 sm:p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex items-start space-x-3 ${
                          message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                        }`}
                      >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          message.type === 'user' 
                            ? 'bg-blue-500 text-white' 
                            : message.type === 'system'
                            ? 'bg-gray-500 text-white'
                            : 'bg-green-500 text-white'
                        }`}>
                          {message.type === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : message.type === 'system' ? (
                            <Activity className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>

                        <div className={`flex-1 max-w-[80%] ${
                          message.type === 'user' ? 'text-right' : ''
                        }`}>
                          <div className={`rounded-lg p-3 ${
                            message.type === 'user'
                              ? 'bg-blue-500 text-white'
                              : message.type === 'system'
                              ? 'bg-gray-100 dark:bg-gray-800'
                              : 'bg-white dark:bg-gray-900 border'
                          }`}>
                            <div 
                              className="prose prose-sm max-w-none dark:prose-invert"
                              dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                            />
                          </div>

                          <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                            <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                            {message.metadata && (
                              <div className="flex items-center space-x-2">
                                {message.metadata.execution_time && (
                                  <Badge variant="secondary" className="text-xs">
                                    {message.metadata.execution_time}ms
                                  </Badge>
                                )}
                                {message.metadata.tools_used && message.metadata.tools_used.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {message.metadata.tools_used.join(', ')}
                                  </Badge>
                                )}
                                {message.metadata.intent_detected && (
                                  <Badge variant="outline" className="text-xs">
                                    {message.metadata.intent_detected} ({Math.round((message.metadata.confidence || 0) * 100)}%)
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isProcessing && (
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="rounded-lg p-3 bg-white dark:bg-gray-900 border">
                            <div className="flex items-center space-x-2">
                              <Activity className="h-4 w-4 animate-spin" />
                              <span>Pareng Boyong is thinking...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-2 sm:p-4 border-t">
                  <div className="flex space-x-2">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Message Pareng Boyong in ${currentMode.name} mode...`}
                      disabled={isProcessing}
                      className="flex-1 text-xs sm:text-sm"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isProcessing || !inputMessage.trim()}
                      size="sm"
                      className="px-2 sm:px-3"
                    >
                      <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history" className="flex-1 p-2 sm:p-4">
                <div className="text-center text-muted-foreground">
                  <Activity className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs sm:text-sm">Chat history and analytics will appear here</p>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Live Monitoring Panel */}
        {showLiveMonitor && (
          <div className="lg:col-span-1 min-h-0">
            <CopilotKitInterface
              sessionId={sessionId}
              onTaskUpdate={(task) => {
                // Add task update to messages
                const taskMessage: Message = {
                  id: `task_${task.id}`,
                  type: 'task_update',
                  content: `Task "${task.title}" is ${task.status} (${Math.round(task.progress)}% complete)`,
                  timestamp: new Date().toISOString(),
                  metadata: {
                    task_id: task.id
                  }
                };
                // Only add if not already present
                setMessages(prev => {
                  const exists = prev.some(m => m.id === taskMessage.id);
                  return exists ? prev : [...prev, taskMessage];
                });
              }}
              className="h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}