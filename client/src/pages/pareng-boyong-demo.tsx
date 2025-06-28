import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Send, Settings, Play, Pause, Terminal, FileText, Globe, Search, Code, Cpu, MemoryStick, HardDrive, Menu, X } from "lucide-react";

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

  const handleSendMessage = () => {
    if (!message.trim() || isProcessing) return;

    const userMessage = {
      id: Date.now().toString(),
      type: "user",
      content: message,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setIsProcessing(true);

    // Simulate AI processing
    setTimeout(() => {
      let response = "";
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes("kumusta") || lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
        response = "Kumusta! Mabuti naman ako. Salamat sa pagtatanong! Ano ang maitutulong ko sa inyo ngayon? Pwede akong gumawa ng code, mag-research, o mag-analyze ng mga files.";
      } else if (lowerMessage.includes("code") || lowerMessage.includes("program")) {
        response = "Sige, kaya kong gumawa ng code! Anong programming language ang gusto ninyo? Python, JavaScript, Java, C++, o iba pa? Sabihin lang ninyo kung anong proyekto ang gagawin natin.";
      } else if (lowerMessage.includes("research") || lowerMessage.includes("search")) {
        response = "Perfect! Kaya kong mag-research ng kahit anong topic. Magse-search ako sa internet, mag-analyze ng data, at magbibigay ng comprehensive na report. Anong topic ang ire-research natin?";
      } else if (lowerMessage.includes("hack") || lowerMessage.includes("security")) {
        response = "Oo, may hacker mode din ako! Kaya kong mag-analyze ng security vulnerabilities, gumawa ng penetration testing scripts, at mag-audit ng systems. Pero syempre, ethical hacking lang ha! Anong security analysis ang kailangan ninyo?";
      } else if (lowerMessage.includes("file") || lowerMessage.includes("folder")) {
        response = "Kaya kong mag-manage ng files at folders! Pwede kong basahin, gumawa, i-edit, o i-organize ang mga files ninyo. May specific na file operations ba kayong kailangan?";
      } else if (lowerMessage.includes("help") || lowerMessage.includes("tulong")) {
        response = "Eto ang mga kaya kong gawin:\n\n🔧 **Developer Mode**: Code generation, debugging, project creation\n🔍 **Researcher Mode**: Internet research, data analysis, reports\n🛡️ **Hacker Mode**: Security analysis, penetration testing, vulnerability assessment\n📁 **File Management**: Create, read, edit, organize files\n🖥️ **System Commands**: Execute terminal commands, manage processes\n\nAnong mode ang gusto ninyong subukan?";
      } else {
        response = `Naintindihan ko ang inyong tanong tungkol sa "${message}". Bilang AI AGI, kaya kong mag-analyze at magbigay ng comprehensive na sagot. Anong specific na aspeto ang gusto ninyong ma-explore ko dito?`;
      }

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsProcessing(false);
    }, 1500);
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
      <div className="bg-gray-900 border-b border-cyan-500/30 p-4 shadow-lg shadow-cyan-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="md:hidden text-cyan-400 hover:bg-cyan-500/20"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-cyan-400/50">
              🇵🇭
            </div>
            <div>
              <h1 className="font-bold text-lg text-cyan-400">Pareng Boyong</h1>
              <p className="text-sm text-gray-400 hidden sm:block">Filipino AI AGI Super Agent by InnovateHub PH</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-green-400/20 text-green-400 border-green-400/50 shadow-lg shadow-green-400/20">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              Online
            </Badge>
            <Button variant="outline" size="sm" className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 
          fixed md:relative 
          top-0 left-0 
          z-50 md:z-auto
          w-64 h-full md:h-auto
          bg-gray-900 border-r border-purple-500/30 p-3 overflow-y-auto
          transition-transform duration-300 ease-in-out
        `}>
          {/* Mobile Close Button */}
          <div className="flex justify-end mb-3 md:hidden">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-400 hover:text-white hover:bg-gray-800"
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
                  <div className="font-medium text-xs text-white">{mode.label}</div>
                  <div className="text-[10px] text-gray-400">{mode.description}</div>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-3 bg-purple-500/30" />

          {/* System Status */}
          <div className="mb-4">
            <h3 className="font-medium mb-2 text-sm text-purple-400">System Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-3 w-3 text-cyan-400" />
                  <span className="text-gray-300">CPU</span>
                </div>
                <span className="text-green-400">45%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <MemoryStick className="h-3 w-3 text-purple-400" />
                  <span className="text-gray-300">RAM</span>
                </div>
                <span className="text-green-400">62GB</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <HardDrive className="h-3 w-3 text-orange-400" />
                  <span className="text-gray-300">Storage</span>
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
              <Button variant="outline" size="sm" className="text-xs border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 h-8">
                <Code className="h-3 w-3 mr-1" />
                Code
              </Button>
              <Button variant="outline" size="sm" className="text-xs border-purple-500/50 text-purple-400 hover:bg-purple-500/20 h-8">
                <Search className="h-3 w-3 mr-1" />
                Search
              </Button>
              <Button variant="outline" size="sm" className="text-xs border-green-500/50 text-green-400 hover:bg-green-500/20 h-8">
                <Globe className="h-3 w-3 mr-1" />
                Web
              </Button>
              <Button variant="outline" size="sm" className="text-xs border-orange-500/50 text-orange-400 hover:bg-orange-500/20 h-8">
                <Terminal className="h-3 w-3 mr-1" />
                Terminal
              </Button>
              <Button variant="outline" size="sm" className="text-xs border-pink-500/50 text-pink-400 hover:bg-pink-500/20 h-8">
                <FileText className="h-3 w-3 mr-1" />
                Files
              </Button>
              <Button variant="outline" size="sm" className="text-xs border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20 h-8">
                <Settings className="h-3 w-3 mr-1" />
                System
              </Button>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-4 ${
                  msg.type === 'user' 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20' 
                    : msg.type === 'system'
                    ? 'bg-green-500/20 border border-green-400/50 text-green-200 shadow-lg shadow-green-400/20'
                    : 'bg-gray-800 border border-purple-500/30 text-gray-100 shadow-lg shadow-purple-500/10'
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div className={`text-xs mt-2 ${
                    msg.type === 'user' ? 'text-cyan-200' : 'text-gray-400'
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
          <div className="border-t border-purple-500/30 bg-gray-900 p-4">
            <div className="flex space-x-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message to Pareng Boyong..."
                className="flex-1 bg-black border-cyan-500/50 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400/50"
                disabled={isProcessing}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!message.trim() || isProcessing}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-lg shadow-cyan-500/20"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Current mode: <strong className="text-cyan-400">{modeOptions.find(m => m.value === selectedMode)?.label}</strong> | 
              Context: <strong className="text-purple-400">{currentContext}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}