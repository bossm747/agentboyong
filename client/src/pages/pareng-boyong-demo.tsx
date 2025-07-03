import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Send, Settings, Play, Pause, Terminal, FileText, Globe, Search, Code, Cpu, MemoryStick, HardDrive, Menu, X, Activity, Monitor, FolderOpen } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import WebViewPanel from "@/components/webview-panel";
import BackgroundTasksPanel from "@/components/background-tasks-panel";
import FileManagerPanel from "@/components/file-manager-panel";
import { TerminalPanel } from "@/components/terminal-panel";

export default function ParengBoyongDemo() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "1",
      type: "system",
      content: "🇵🇭 Kumusta! Ako si Pareng Boyong, ang inyong Filipino AI AGI Super Agent mula sa InnovateHub PH! Handa na akong tumulong sa inyo sa anumang kailangan ninyo - programming, research, hacking, o kahit anong proyekto. Anong maitutulong ko sa inyo ngayon?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [selectedMode, setSelectedMode] = useState("default");
  const [currentContext, setCurrentContext] = useState("pareng-boyong-main");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close sidebar when window is resized to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  const handleSendMessage = async () => {
    if (!message.trim() || isProcessing) return;

    const userMessage = {
      id: Date.now().toString(),
      type: "user",
      content: message,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = message;
    setMessage("");
    setIsProcessing(true);

    try {
      // Call real AI API
      const response = await apiRequest("POST", "/api/pareng-boyong/chat", {
        message: currentMessage,
        mode: selectedMode,
        sessionId: currentContext,
        userId: 'demo_user'
      });

      const result = await response.json();

      let content = result.message || result.error || "Sorry, naging may problema sa pag-proseso ng mensahe.";
      
      // Add memory insights if available
      if (result.memoryInsights && result.memoryInsights.length > 0) {
        content += "\n\n🧠 **Memory Context:**\n" + result.memoryInsights.map((insight: string) => `• ${insight}`).join('\n');
      }

      // Add model info if available
      if (result.model) {
        content += `\n\n*Powered by ${result.model}${result.fallback ? ' (fallback)' : ''}*`;
      }

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: "agent",
        content,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI Chat Error:', error);
      
      // Get more detailed error information
      let errorDetails = "Unknown error occurred";
      if (error instanceof Error) {
        errorDetails = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorDetails = JSON.stringify(error);
      }
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: `Sorry, hindi ko na-proseso ang inyong mensahe. May problema sa koneksyon.\n\n**Error Details:** ${errorDetails}\n\nSubukan ninyo ulit.`,
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

  const modeOptions = [
    { value: "default", label: "🤖 Default", description: "General AI assistant" },
    { value: "researcher", label: "🔍 Researcher", description: "Research and analysis" },
    { value: "developer", label: "💻 Developer", description: "Code and development" },
    { value: "hacker", label: "🛡️ Hacker", description: "Security and testing" }
  ];

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Header */}
      <div className="bg-black border-b border-cyan-500/30 p-3 sm:p-4 shadow-lg shadow-cyan-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden text-cyan-400 hover:bg-cyan-500/20 p-2 touch-friendly min-h-[44px] min-w-[44px]"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-lg shadow-cyan-400/50 border border-cyan-400/50 overflow-hidden bg-white">
              <img 
                src="/attached_assets/innovatehub_1751536111664.png" 
                alt="InnovateHub Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-base sm:text-lg text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text truncate">Pareng Boyong</h1>
              <p className="text-xs sm:text-sm text-cyan-300 hidden sm:block truncate">Filipino AI AGI Super Agent by InnovateHub PH</p>
            </div>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="bg-green-400/20 text-green-400 border border-green-400/50 shadow-lg shadow-green-400/20 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm flex items-center">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full mr-1 sm:mr-2 animate-pulse"></div>
              <span className="hidden xs:inline">Online</span>
              <span className="xs:hidden">●</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="bg-transparent border border-purple-500/50 text-purple-400 hover:bg-purple-500/20 hover:border-purple-400 shadow-lg shadow-purple-500/20"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:translate-x-0 
          fixed lg:relative 
          top-0 left-0 
          z-50 lg:z-auto
          w-72 sm:w-80 h-full lg:h-auto
          bg-black border-r border-purple-500/30 p-3 overflow-y-auto
          transition-transform duration-300 ease-in-out
          shadow-xl lg:shadow-none
        `}>
          {/* Mobile Close Button */}
          <div className="flex justify-end mb-3 md:hidden">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-cyan-400 hover:text-purple-300 hover:bg-gray-800/50"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Mode Selection */}
          <div className="mb-4">
            <h3 className="font-medium mb-2 text-sm text-cyan-400">Agent Mode</h3>
            <div className="space-y-1">
              {modeOptions.map((mode) => (
                <div
                  key={mode.value}
                  className={`p-2 rounded cursor-pointer transition-all duration-300 ${
                    selectedMode === mode.value
                      ? 'bg-cyan-500/20 border border-cyan-400/50 shadow-lg shadow-cyan-400/20'
                      : 'hover:bg-gray-800 border border-transparent hover:border-purple-500/30'
                  }`}
                  onClick={() => {
                    setSelectedMode(mode.value);
                    // Close sidebar on mobile when mode is selected
                    if (window.innerWidth < 768) {
                      setIsSidebarOpen(false);
                    }
                  }}
                >
                  <div className="font-medium text-xs text-cyan-200">{mode.label}</div>
                  <div className="text-[10px] text-purple-300">{mode.description}</div>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-3 bg-purple-500/30" />

          {/* Navigation */}
          <div className="mb-4">
            <h3 className="font-medium mb-2 text-sm text-purple-400">Configuration</h3>
            <Link href="/settings">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-cyan-400 hover:text-purple-300 hover:bg-gray-800/50 border border-transparent hover:border-purple-500/30"
              >
                <Settings className="h-4 w-4 mr-2" />
                AI Models & Settings
              </Button>
            </Link>
          </div>

          <Separator className="my-3 bg-purple-500/30" />

          {/* System Status */}
          <div className="mb-4">
            <h3 className="font-medium mb-2 text-sm text-purple-400">System Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-3 w-3 text-cyan-400" />
                  <span className="text-cyan-300">CPU</span>
                </div>
                <span className="text-green-400">45%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <MemoryStick className="h-3 w-3 text-purple-400" />
                  <span className="text-purple-300">RAM</span>
                </div>
                <span className="text-green-400">62GB</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <HardDrive className="h-3 w-3 text-orange-400" />
                  <span className="text-orange-300">Storage</span>
                </div>
                <span className="text-green-400">180GB</span>
              </div>
            </div>
          </div>

          <Separator className="my-3 bg-purple-500/30" />

          {/* Available Tools */}
          <div>
            <h3 className="font-medium mb-2 text-sm text-green-400">Available Tools</h3>
            <div className="grid grid-cols-2 gap-1">
              <Button variant="ghost" size="sm" className="text-xs bg-transparent border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 h-8 shadow-lg shadow-cyan-500/20">
                <Code className="h-3 w-3 mr-1" />
                Code
              </Button>
              <Button variant="ghost" size="sm" className="text-xs bg-transparent border border-purple-500/50 text-purple-400 hover:bg-purple-500/20 hover:border-purple-400 h-8 shadow-lg shadow-purple-500/20">
                <Search className="h-3 w-3 mr-1" />
                Search
              </Button>
              <Button variant="ghost" size="sm" className="text-xs bg-transparent border border-green-500/50 text-green-400 hover:bg-green-500/20 hover:border-green-400 h-8 shadow-lg shadow-green-500/20">
                <Globe className="h-3 w-3 mr-1" />
                Web
              </Button>
              <Button variant="ghost" size="sm" className="text-xs bg-transparent border border-orange-500/50 text-orange-400 hover:bg-orange-500/20 hover:border-orange-400 h-8 shadow-lg shadow-orange-500/20">
                <Terminal className="h-3 w-3 mr-1" />
                Terminal
              </Button>
              <Button variant="ghost" size="sm" className="text-xs bg-transparent border border-pink-500/50 text-pink-400 hover:bg-pink-500/20 hover:border-pink-400 h-8 shadow-lg shadow-pink-500/20">
                <FileText className="h-3 w-3 mr-1" />
                Files
              </Button>
              <Button variant="ghost" size="sm" className="text-xs bg-transparent border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-400 h-8 shadow-lg shadow-yellow-500/20">
                <Settings className="h-3 w-3 mr-1" />
                System
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area with Tabs */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="chat" className="flex-1 flex flex-col">
            <div className="sticky top-0 z-10 border-b border-purple-500/30 bg-black/95 backdrop-blur-sm px-2 sm:px-4 py-2">
              <TabsList className="bg-gray-800/50 border border-gray-600/50 w-full justify-start overflow-x-auto scrollbar-hide scroll-smooth">
                <TabsTrigger 
                  value="chat" 
                  className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 flex-shrink-0 text-xs sm:text-sm"
                >
                  <Terminal className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Chat</span>
                  <span className="sm:hidden">💬</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="webview" 
                  className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 flex-shrink-0 text-xs sm:text-sm"
                >
                  <Globe className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">App Preview</span>
                  <span className="sm:hidden">🌐</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="tasks" 
                  className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 flex-shrink-0 text-xs sm:text-sm"
                >
                  <Activity className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Tasks</span>
                  <span className="sm:hidden">⚡</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="files" 
                  className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 flex-shrink-0 text-xs sm:text-sm"
                >
                  <FolderOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Files</span>
                  <span className="sm:hidden">📁</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="terminal" 
                  className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 flex-shrink-0 text-xs sm:text-sm"
                >
                  <Code className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Terminal</span>
                  <span className="sm:hidden">💻</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="chat" className="flex-1 flex flex-col m-0">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-black">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] sm:max-w-[85%] lg:max-w-[80%] rounded-lg p-3 sm:p-4 text-sm sm:text-base ${
                      msg.type === 'user' 
                        ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-400/50 text-cyan-100 shadow-lg shadow-cyan-500/30' 
                        : msg.type === 'system'
                        ? 'bg-green-500/20 border border-green-400/50 text-green-200 shadow-lg shadow-green-400/30'
                        : 'bg-gray-800/50 border border-purple-500/50 text-purple-100 shadow-lg shadow-purple-500/20'
                    }`}>
                      <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere">{msg.content}</div>
                      <div className={`text-xs mt-2 ${
                        msg.type === 'user' ? 'text-cyan-300' : 'text-purple-300'
                      }`}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-gray-800 border border-cyan-400/50 rounded-lg p-4 max-w-[80%] shadow-lg shadow-cyan-400/20">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                        <span className="text-cyan-300">Pareng Boyong is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-purple-500/30 bg-black p-3 sm:p-4 sticky bottom-0">
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message to Pareng Boyong..."
                    className="flex-1 bg-black border-cyan-500/50 text-cyan-100 placeholder-purple-400 focus:border-cyan-400 focus:ring-cyan-400/50 text-sm sm:text-base h-10 sm:h-auto"
                    disabled={isProcessing}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!message.trim() || isProcessing}
                    variant="ghost"
                    className="bg-transparent border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 text-xs text-purple-300">
                  Current mode: <strong className="text-cyan-400">{modeOptions.find(m => m.value === selectedMode)?.label}</strong> | 
                  Context: <strong className="text-purple-400">{currentContext}</strong>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="webview" className="flex-1 m-0 p-1 sm:p-2 min-h-0">
              <WebViewPanel sessionId={currentContext} />
            </TabsContent>

            <TabsContent value="tasks" className="flex-1 m-0 p-4">
              <BackgroundTasksPanel sessionId={currentContext} />
            </TabsContent>

            <TabsContent value="files" className="flex-1 m-0 p-4">
              <FileManagerPanel sessionId={currentContext} />
            </TabsContent>

            <TabsContent value="terminal" className="flex-1 m-0 p-4">
              <TerminalPanel sessionId={currentContext} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}