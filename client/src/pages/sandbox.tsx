import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import FileExplorer from "@/components/FileExplorer";
import CodeEditor from "@/components/CodeEditor";
import Terminal from "@/components/Terminal";
import SystemMonitor from "@/components/SystemMonitor";
import BrowserModal from "@/components/BrowserModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Box, 
  Settings, 
  Maximize, 
  Plus, 
  X, 
  FileCode, 
  Terminal as TerminalIcon, 
  Globe,
  Menu,
  ChevronDown,
  ChevronUp,
  Sidebar,
  Monitor
} from "lucide-react";
import type { Session, FileTreeNode } from "@shared/schema";

interface Tab {
  id: string;
  name: string;
  type: 'file' | 'terminal' | 'browser';
  content?: string;
  path?: string;
  active: boolean;
}

export default function SandboxPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isBrowserModalOpen, setIsBrowserModalOpen] = useState(false);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(false);
  const [isSystemMonitorOpen, setIsSystemMonitorOpen] = useState(false);
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);

  // Create session on mount
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sessions");
      return response.json();
    },
    onSuccess: (session: Session) => {
      setSessionId(session.id);
      // Add default terminal tab
      const terminalTab: Tab = {
        id: 'terminal-default',
        name: 'Terminal',
        type: 'terminal',
        active: true,
      };
      setTabs([terminalTab]);
      setActiveTab(terminalTab.id);
    },
  });

  // Get file tree
  const { data: fileTree, refetch: refetchFileTree } = useQuery({
    queryKey: ['/api/files', sessionId, 'tree'],
    enabled: !!sessionId,
  });

  useEffect(() => {
    createSessionMutation.mutate();
  }, []);

  const handleFileOpen = async (node: FileTreeNode) => {
    if (node.type === 'file' && sessionId) {
      try {
        const response = await apiRequest("GET", `/api/files/${sessionId}/content?path=${encodeURIComponent(node.path)}`);
        const { content } = await response.json();
        
        // Check if tab already exists
        const existingTab = tabs.find(tab => tab.path === node.path);
        if (existingTab) {
          setActiveTab(existingTab.id);
          return;
        }

        // Create new tab
        const newTab: Tab = {
          id: `file-${Date.now()}`,
          name: node.name,
          type: 'file',
          content,
          path: node.path,
          active: true,
        };

        setTabs(prev => prev.map(tab => ({ ...tab, active: false })).concat(newTab));
        setActiveTab(newTab.id);
      } catch (error) {
        console.error('Failed to open file:', error);
      }
    }
  };

  const handleNewFile = () => {
    const newTab: Tab = {
      id: `file-${Date.now()}`,
      name: 'untitled.py',
      type: 'file',
      content: '',
      path: 'untitled.py',
      active: true,
    };

    setTabs(prev => prev.map(tab => ({ ...tab, active: false })).concat(newTab));
    setActiveTab(newTab.id);
  };

  const handleCloseTab = (tabId: string) => {
    setTabs(prev => {
      const filtered = prev.filter(tab => tab.id !== tabId);
      if (activeTab === tabId && filtered.length > 0) {
        setActiveTab(filtered[filtered.length - 1].id);
        filtered[filtered.length - 1].active = true;
      }
      return filtered;
    });
  };

  const handleTabClick = (tabId: string) => {
    setTabs(prev => prev.map(tab => ({
      ...tab,
      active: tab.id === tabId,
    })));
    setActiveTab(tabId);
  };

  const handleFileSave = async (path: string, content: string) => {
    if (!sessionId) return;

    try {
      await apiRequest("POST", `/api/files/${sessionId}/content`, {
        path,
        content,
      });
      
      // Update tab content
      setTabs(prev => prev.map(tab => 
        tab.path === path ? { ...tab, content } : tab
      ));
      
      // Refresh file tree
      refetchFileTree();
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  if (createSessionMutation.isPending) {
    return (
      <div className="h-screen flex items-center justify-center bg-editor-bg">
        <div className="text-text-primary">Initializing sandbox environment...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-editor-bg text-text-primary">
      {/* Mobile-First Top Navigation Bar */}
      <div className="bg-panel-bg border-b border-border-color px-2 sm:px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <Box className="text-accent-blue text-lg sm:text-xl" />
            <h1 className="text-sm sm:text-lg font-semibold hidden xs:block">AI Runtime Sandbox</h1>
            <h1 className="text-sm font-semibold xs:hidden">Sandbox</h1>
          </div>
          <div className="hidden sm:flex items-center space-x-1 text-sm text-text-secondary">
            <Badge className="bg-success-green text-white text-xs">Online</Badge>
            <span className="hidden md:inline">Session: {sessionId?.slice(-8)}</span>
          </div>
        </div>
        
        {/* Mobile Navigation Controls */}
        <div className="flex items-center space-x-1 sm:space-x-3">
          {/* Mobile File Explorer Toggle */}
          <Sheet open={isFileExplorerOpen} onOpenChange={setIsFileExplorerOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="sm:hidden text-text-secondary hover:text-text-primary">
                <Sidebar className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 bg-panel-bg border-border-color p-0">
              <div className="flex flex-col h-full">
                <div className="p-3 border-b border-border-color">
                  <h3 className="text-sm font-medium flex items-center">
                    <FileCode className="mr-2 text-accent-blue" />
                    File Explorer
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <FileExplorer 
                    fileTree={(fileTree as any) || []} 
                    onFileOpen={(node) => {
                      handleFileOpen(node);
                      setIsFileExplorerOpen(false);
                    }}
                    onRefresh={refetchFileTree}
                  />
                </div>
                <div className="p-2 border-t border-border-color">
                  <Button 
                    onClick={() => {
                      handleNewFile();
                      setIsFileExplorerOpen(false);
                    }}
                    className="w-full bg-accent-blue hover:bg-blue-600"
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New File
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Mobile System Monitor Toggle */}
          <Sheet open={isSystemMonitorOpen} onOpenChange={setIsSystemMonitorOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="sm:hidden text-text-secondary hover:text-text-primary">
                <Monitor className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-panel-bg border-border-color p-0">
              <SystemMonitor sessionId={sessionId || ''} />
            </SheetContent>
          </Sheet>

          {/* Desktop Controls */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="hidden sm:inline-flex text-text-secondary hover:text-text-primary bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30"
            onClick={() => window.open('/pareng-boyong/', '_blank')}
            title="Open Pareng Boyong - Filipino AI AGI"
          >
            🇵🇭 Pareng Boyong
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-text-secondary hover:text-text-primary">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-text-secondary hover:text-text-primary">
            <Maximize className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="sm" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Disconnect</span>
            <X className="h-4 w-4 sm:hidden" />
          </Button>
        </div>
      </div>

      {/* Main Content Area - Responsive Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Left Sidebar - File Explorer */}
        <div className="hidden sm:flex w-64 lg:w-80 bg-panel-bg border-r border-border-color flex-col">
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="w-full">
              <div className="p-3 border-b border-border-color flex items-center justify-between hover:bg-border-color">
                <h3 className="text-sm font-medium flex items-center">
                  <FileCode className="mr-2 text-accent-blue" />
                  File Explorer
                </h3>
                <ChevronDown className="h-4 w-4 text-text-secondary" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex-1 overflow-y-auto max-h-96">
                <FileExplorer 
                  fileTree={(fileTree as any) || []} 
                  onFileOpen={handleFileOpen}
                  onRefresh={refetchFileTree}
                />
              </div>
              <div className="p-2 border-t border-border-color">
                <Button 
                  onClick={handleNewFile}
                  className="w-full bg-accent-blue hover:bg-blue-600"
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New File
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Main Editor and Terminal Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab Bar - Responsive */}
          <div className="bg-panel-bg border-b border-border-color flex items-center overflow-x-auto">
            <div className="flex min-w-max">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-center px-2 sm:px-4 py-2 border-r border-border-color cursor-pointer whitespace-nowrap ${
                    tab.active 
                      ? 'bg-editor-bg text-text-primary' 
                      : 'hover:bg-border-color text-text-secondary'
                  }`}
                  onClick={() => handleTabClick(tab.id)}
                >
                  {tab.type === 'file' && <FileCode className="mr-1 sm:mr-2 h-3 sm:h-4 w-3 sm:w-4 text-accent-blue" />}
                  {tab.type === 'terminal' && <TerminalIcon className="mr-1 sm:mr-2 h-3 sm:h-4 w-3 sm:w-4" />}
                  {tab.type === 'browser' && <Globe className="mr-1 sm:mr-2 h-3 sm:h-4 w-3 sm:w-4" />}
                  <span className="text-xs sm:text-sm truncate max-w-24 sm:max-w-none">{tab.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 sm:ml-2 p-0 h-auto text-text-secondary hover:text-text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(tab.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="px-2 sm:px-3 py-2 text-text-secondary hover:text-text-primary"
              onClick={() => setIsBrowserModalOpen(true)}
            >
              <Plus className="h-3 sm:h-4 w-3 sm:w-4" />
            </Button>
          </div>

          {/* Content Area - Responsive */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Main Editor/Terminal Content */}
            <div className={`flex-1 ${isTerminalCollapsed ? 'h-full' : 'h-1/2 sm:h-2/3'}`}>
              {activeTabData?.type === 'file' && (
                <CodeEditor
                  content={activeTabData.content || ''}
                  language={getLanguageFromPath(activeTabData.path || '')}
                  onSave={(content) => handleFileSave(activeTabData.path || '', content)}
                />
              )}
              
              {activeTabData?.type === 'terminal' && sessionId && (
                <div className="h-full">
                  <Terminal sessionId={sessionId} />
                </div>
              )}
            </div>

            {/* Collapsible Terminal for File Tabs */}
            {activeTabData?.type === 'file' && sessionId && (
              <Collapsible open={!isTerminalCollapsed} onOpenChange={(open) => setIsTerminalCollapsed(!open)}>
                <CollapsibleTrigger className="w-full">
                  <div className="bg-panel-bg border-t border-border-color px-4 py-2 flex items-center justify-between hover:bg-border-color">
                    <h3 className="text-sm font-medium flex items-center">
                      <TerminalIcon className="mr-2 h-4 w-4 text-success-green" />
                      Terminal
                    </h3>
                    {isTerminalCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="h-48 sm:h-64">
                    <Terminal sessionId={sessionId} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>

        {/* Desktop Right Sidebar - System Monitor */}
        <div className="hidden lg:flex w-80 bg-panel-bg border-l border-border-color">
          <SystemMonitor sessionId={sessionId || ''} />
        </div>
      </div>

      {/* Browser Modal */}
      <BrowserModal 
        isOpen={isBrowserModalOpen}
        onClose={() => setIsBrowserModalOpen(false)}
      />
    </div>
  );
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'md': 'markdown',
    'txt': 'plaintext',
    'xml': 'xml',
    'yml': 'yaml',
    'yaml': 'yaml',
  };
  return languageMap[ext || ''] || 'plaintext';
}
