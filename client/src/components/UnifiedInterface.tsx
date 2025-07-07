import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Send, 
  Bot, 
  User, 
  Shield, 
  Code, 
  Search, 
  Settings,
  Activity,
  ChevronDown,
  Sparkles,
  MessageSquare,
  Terminal,
  FileText,
  Globe,
  FolderOpen,
  Monitor,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Menu,
  X
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  mode?: string;
  metadata?: {
    tools_used?: string[];
    execution_time?: number;
    intent_detected?: string;
    confidence?: number;
  };
}

interface Task {
  id: string;
  title: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  startTime: string;
  endTime?: string;
}

interface UnifiedInterfaceProps {
  sessionId: string;
}

export function UnifiedInterface({ sessionId }: UnifiedInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: '🇵🇭 Kumusta! I\'m Pareng Boyong, your Filipino AI assistant. I can help with coding, security analysis, research, and general questions. What would you like to work on today?',
      timestamp: new Date().toISOString()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMode, setSelectedMode] = useState('default');
  const [activeTab, setActiveTab] = useState('chat');
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [systemStats, setSystemStats] = useState({ cpu: 0, memory: 0, storage: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const modes = [
    { 
      id: 'default', 
      name: 'General Assistant', 
      icon: MessageSquare, 
      color: 'blue',
      description: 'General conversation and help'
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

  const tabs = [
    { id: 'chat', name: 'Chat', icon: MessageSquare },
    { id: 'files', name: 'Files', icon: FolderOpen },
    { id: 'terminal', name: 'Terminal', icon: Terminal },
    { id: 'apps', name: 'Apps', icon: Globe },
    { id: 'tasks', name: 'Tasks', icon: Activity },
    { id: 'system', name: 'System', icon: Monitor }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch system stats periodically
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/system/stats');
        if (response.ok) {
          const stats = await response.json();
          setSystemStats({
            cpu: Math.round(stats.cpu?.usage || 0),
            memory: Math.round(stats.memory?.percentage || 0),
            storage: Math.round(stats.storage?.percentage || 0)
          });
        }
      } catch (error) {
        console.error('Failed to fetch system stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

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
          mode: selectedMode,
          metadata: {
            tools_used: data.tools_used,
            execution_time: data.execution_time,
            intent_detected: data.intent_detected,
            confidence: data.confidence
          }
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Auto-switch mode if intent detection suggests it
        if (data.intent_detected && data.confidence > 0.8 && data.intent_detected !== selectedMode) {
          setSelectedMode(data.intent_detected);
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
        content: `Connection error: Please check your internet connection`,
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
    <div className="h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">Pareng Boyong</h2>
                  <p className="text-xs text-muted-foreground">InnovateHub AI</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="lg:hidden"
                onClick={() => setShowSidebar(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="p-4 border-b">
            <h3 className="text-sm font-medium mb-3">AI Mode</h3>
            <div className="space-y-1">
              {modes.map((mode) => (
                <Button
                  key={mode.id}
                  variant={selectedMode === mode.id ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => setSelectedMode(mode.id)}
                >
                  <mode.icon className="h-3 w-3 mr-2" />
                  {mode.name}
                </Button>
              ))}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {currentMode.description}
            </div>
          </div>

          {/* System Status */}
          <div className="p-4 border-b">
            <h3 className="text-sm font-medium mb-3">System Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>CPU</span>
                <span>{systemStats.cpu}%</span>
              </div>
              <Progress value={systemStats.cpu} className="h-1" />
              
              <div className="flex items-center justify-between text-xs">
                <span>Memory</span>
                <span>{systemStats.memory}%</span>
              </div>
              <Progress value={systemStats.memory} className="h-1" />
              
              <div className="flex items-center justify-between text-xs">
                <span>Storage</span>
                <span>{systemStats.storage}%</span>
              </div>
              <Progress value={systemStats.storage} className="h-1" />
            </div>
          </div>

          {/* Active Tasks */}
          <div className="p-4 flex-1">
            <h3 className="text-sm font-medium mb-3">Active Tasks</h3>
            {activeTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active tasks</p>
            ) : (
              <div className="space-y-2">
                {activeTasks.map((task) => (
                  <div key={task.id} className="p-2 bg-muted rounded text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{task.title}</span>
                      {task.status === 'running' ? (
                        <Activity className="h-3 w-3 animate-spin" />
                      ) : task.status === 'completed' ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                    <Progress value={task.progress} className="h-1" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="bg-card border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                size="sm"
                variant="ghost"
                className="lg:hidden"
                onClick={() => setShowSidebar(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              
              <Badge variant="secondary" className="text-xs">
                <currentMode.icon className="w-3 h-3 mr-1" />
                {currentMode.name}
              </Badge>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList className="grid grid-cols-6 w-full">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id} className="text-xs">
                    <tab.icon className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline">{tab.name}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0">
          <Tabs value={activeTab} className="h-full">
            {/* Chat Tab */}
            <TabsContent value="chat" className="h-full m-0">
              <div className="h-full flex flex-col">
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="max-w-4xl mx-auto space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex items-start space-x-3 ${
                          message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          message.type === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : message.type === 'system'
                            ? 'bg-muted'
                            : 'bg-secondary'
                        }`}>
                          {message.type === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : message.type === 'system' ? (
                            <Settings className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>

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
                            {message.metadata?.tools_used && message.metadata.tools_used.length > 0 && (
                              <>
                                <Separator orientation="vertical" className="h-3" />
                                <Badge variant="outline" className="text-xs">
                                  {message.metadata.tools_used.join(', ')}
                                </Badge>
                              </>
                            )}
                            {message.metadata?.execution_time && (
                              <>
                                <Separator orientation="vertical" className="h-3" />
                                <span>{message.metadata.execution_time}ms</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {isProcessing && (
                      <div className="flex items-start space-x-3">
                        <div className="h-8 w-8 bg-secondary rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4" />
                        </div>
                        <Card className="bg-card">
                          <CardContent className="p-3">
                            <div className="flex items-center space-x-2">
                              <div className="flex space-x-1">
                                <div className="h-2 w-2 bg-primary rounded-full animate-bounce"></div>
                                <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]"></div>
                                <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                              </div>
                              <span className="text-sm text-muted-foreground">Processing...</span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="border-t p-4">
                  <div className="max-w-4xl mx-auto">
                    <div className="flex space-x-3">
                      <div className="flex-1 relative">
                        <Input
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder={`Message Pareng Boyong in ${currentMode.name} mode...`}
                          disabled={isProcessing}
                          className="pr-12"
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={isProcessing || !inputMessage.trim()}
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-center">
                      <span className="text-xs text-muted-foreground">
                        {currentMode.description} • Press Enter to send
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Other tabs content placeholders */}
            {['files', 'terminal', 'apps', 'tasks', 'system'].map((tabId) => (
              <TabsContent key={tabId} value={tabId} className="h-full m-0">
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-4">🚧</div>
                    <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
                    <p className="text-muted-foreground">
                      {tabId.charAt(0).toUpperCase() + tabId.slice(1)} functionality will be available in the next update
                    </p>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
}