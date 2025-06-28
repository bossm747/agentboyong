import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Settings, 
  Calendar, 
  FileText, 
  Play, 
  Pause, 
  RefreshCw,
  Send,
  Paperclip,
  Bot,
  User,
  Terminal,
  Code,
  Search,
  Globe
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Message {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  attachments?: string[];
}

interface AgentContext {
  id: string;
  name: string;
  created_at: string;
  last_message: string;
  paused: boolean;
}

interface Task {
  id: string;
  name: string;
  type: 'scheduled' | 'planned' | 'adhoc';
  state: 'idle' | 'running' | 'completed' | 'failed';
  system_prompt: string;
  prompt: string;
  created_at: string;
  last_run?: string;
}

interface PollResponse {
  context: string;
  contexts: AgentContext[];
  tasks: Task[];
  logs: any[];
  paused: boolean;
}

export default function AgentZeroPage() {
  const [activeTab, setActiveTab] = useState('chat');
  const [currentContext, setCurrentContext] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [selectedMode, setSelectedMode] = useState('default');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Create a simple test context for now
  const pollData = {
    context: 'test-context',
    contexts: [],
    tasks: [],
    logs: [
      {
        id: '1',
        type: 'system',
        heading: 'System',
        content: 'Welcome to Pareng Boyong Agent Zero! The system is loading...',
        timestamp: new Date().toISOString(),
        kvps: {}
      }
    ],
    paused: false
  };

  const contexts: AgentContext[] = [];

  // Placeholder mutations for demo
  const sendMessageMutation = {
    mutate: (messageData: { text: string; context?: string; attachments?: File[] }) => {
      console.log('Sending message:', messageData.text);
      setMessage('');
      setIsStreaming(false);
    },
    isPending: false
  };

  const createContextMutation = {
    mutate: (mode: string) => {
      console.log('Creating context for mode:', mode);
      setCurrentContext('demo-context-' + Date.now());
    }
  };

  // Effect to scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [pollData?.logs]);

  // Initialize context if none exists
  useEffect(() => {
    if (!currentContext) {
      createContextMutation.mutate(selectedMode);
    }
  }, [selectedMode]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    setIsStreaming(true);
    sendMessageMutation.mutate({
      text: message,
      context: currentContext || undefined
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentContextData = { paused: false };
  const logs = pollData.logs || [];

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Bot className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-semibold">🇵🇭 Pareng Boyong - Agent Zero</h1>
            </div>
            <div className="flex space-x-2">
              <Badge variant={currentContextData?.paused ? "destructive" : "default"}>
                {currentContextData?.paused ? "Paused" : "Active"}
              </Badge>
              <Badge variant="outline">{selectedMode}</Badge>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <select 
              value={selectedMode} 
              onChange={(e) => setSelectedMode(e.target.value)}
              className="px-3 py-1 border rounded-md"
            >
              <option value="default">Default Mode</option>
              <option value="researcher">🔬 Researcher Mode</option>
              <option value="developer">💻 Developer Mode</option>
              <option value="hacker">🔧 Hacker Mode</option>
            </select>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="chat" className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span>Chat</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Tasks</span>
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Files</span>
              </TabsTrigger>
              <TabsTrigger value="terminal" className="flex items-center space-x-2">
                <Terminal className="h-4 w-4" />
                <span>Terminal</span>
              </TabsTrigger>
            </TabsList>

            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col">
              <div className="flex-1 flex flex-col">
                {/* Messages Area */}
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4">
                    {logs.map((log: any, index: number) => (
                      <div key={index} className="flex space-x-3">
                        <div className="flex-shrink-0">
                          {log.type === 'user' ? (
                            <User className="h-6 w-6 text-blue-600" />
                          ) : (
                            <Bot className="h-6 w-6 text-green-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium">
                              {log.type === 'user' ? 'You' : 'Pareng Boyong'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                            <div className="whitespace-pre-wrap">{log.content}</div>
                            {log.kvps?.attachments && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {log.kvps.attachments.map((attachment: string, i: number) => (
                                  <Badge key={i} variant="outline">
                                    <Paperclip className="h-3 w-3 mr-1" />
                                    {attachment}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isStreaming && (
                      <div className="flex space-x-3">
                        <Bot className="h-6 w-6 text-green-600" />
                        <div className="flex-1">
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                            <div className="flex items-center space-x-2">
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              <span>Pareng Boyong is thinking...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="border-t p-4 bg-white dark:bg-gray-800">
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type your message to Pareng Boyong..."
                        className="min-h-[80px] resize-none"
                        disabled={sendMessageMutation.isPending}
                      />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button variant="outline" size="sm">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!message.trim() || sendMessageMutation.isPending}
                        size="sm"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="flex-1 p-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Scheduler</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pollData.tasks.map((task: any) => (
                      <div key={task.id || 'demo'} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{task.name || 'Demo Task'}</h3>
                            <p className="text-sm text-gray-600">{task.type || 'demo'}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">
                              ready
                            </Badge>
                            <Button variant="outline" size="sm">
                              <Play className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="text-center text-gray-500 py-8">
                      No tasks yet. Create your first task!
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="flex-1 p-6">
              <Card>
                <CardHeader>
                  <CardTitle>File Browser</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>File management system coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Terminal Tab */}
            <TabsContent value="terminal" className="flex-1 p-6">
              <Card>
                <CardHeader>
                  <CardTitle>Terminal</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Terminal interface coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l bg-white dark:bg-gray-800 p-4">
          <div className="space-y-4">
            {/* Contexts */}
            <div>
              <h3 className="font-medium mb-2">Conversations</h3>
              <div className="space-y-2">
                {contexts?.map((context) => (
                  <div 
                    key={context.id}
                    className={`p-2 rounded cursor-pointer ${
                      context.id === currentContext ? 'bg-blue-50 dark:bg-blue-900' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setCurrentContext(context.id)}
                  >
                    <div className="font-medium text-sm">{context.name || 'Unnamed Chat'}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(context.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Agent Tools */}
            <div>
              <h3 className="font-medium mb-2">Available Tools</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  <Code className="h-4 w-4 mr-1" />
                  Code
                </Button>
                <Button variant="outline" size="sm">
                  <Search className="h-4 w-4 mr-1" />
                  Search
                </Button>
                <Button variant="outline" size="sm">
                  <Globe className="h-4 w-4 mr-1" />
                  Web
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-1" />
                  Files
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}