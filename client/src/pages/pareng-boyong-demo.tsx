import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Send, Settings, Play, Pause, Terminal, FileText, Globe, Search, Code, Cpu, MemoryStick, HardDrive } from "lucide-react";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              🇵🇭
            </div>
            <div>
              <h1 className="font-bold text-lg">Pareng Boyong</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Filipino AI AGI Super Agent by InnovateHub PH</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="default" className="bg-green-500">
              <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
              Online
            </Badge>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r p-4 overflow-y-auto">
          {/* Mode Selection */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">Agent Mode</h3>
            <div className="space-y-2">
              {modeOptions.map((mode) => (
                <div
                  key={mode.value}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedMode === mode.value
                      ? 'bg-blue-100 dark:bg-blue-900/20 border border-blue-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
                  }`}
                  onClick={() => setSelectedMode(mode.value)}
                >
                  <div className="font-medium text-sm">{mode.label}</div>
                  <div className="text-xs text-gray-500">{mode.description}</div>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-4" />

          {/* System Status */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-4 w-4 text-blue-500" />
                  <span>CPU</span>
                </div>
                <span className="text-green-500">45%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <MemoryStick className="h-4 w-4 text-purple-500" />
                  <span>Memory</span>
                </div>
                <span className="text-green-500">62GB/256GB</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <HardDrive className="h-4 w-4 text-orange-500" />
                  <span>Storage</span>
                </div>
                <span className="text-green-500">180GB free</span>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Available Tools */}
          <div>
            <h3 className="font-medium mb-3">Available Tools</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="text-xs">
                <Code className="h-3 w-3 mr-1" />
                Code
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                <Search className="h-3 w-3 mr-1" />
                Search
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                Web
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                <Terminal className="h-3 w-3 mr-1" />
                Terminal
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Files
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                <Settings className="h-3 w-3 mr-1" />
                System
              </Button>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-4 ${
                  msg.type === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : msg.type === 'system'
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    : 'bg-white dark:bg-gray-800 border'
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div className={`text-xs mt-2 ${
                    msg.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border rounded-lg p-4 max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="text-gray-600">Pareng Boyong is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t bg-white dark:bg-gray-800 p-4">
            <div className="flex space-x-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message to Pareng Boyong..."
                className="flex-1"
                disabled={isProcessing}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!message.trim() || isProcessing}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Current mode: <strong>{modeOptions.find(m => m.value === selectedMode)?.label}</strong> | 
              Context: <strong>{currentContext}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}