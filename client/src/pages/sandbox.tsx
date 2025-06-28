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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Box, 
  Settings, 
  Maximize, 
  Plus, 
  X, 
  FileCode, 
  Terminal as TerminalIcon, 
  Globe 
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
      {/* Top Navigation Bar */}
      <div className="bg-panel-bg border-b border-border-color px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Box className="text-accent-blue text-xl" />
            <h1 className="text-lg font-semibold">AI Runtime Sandbox</h1>
          </div>
          <div className="flex items-center space-x-1 text-sm text-text-secondary">
            <Badge className="bg-success-green text-white">Online</Badge>
            <span>Session: {sessionId?.slice(-8)}</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" className="text-text-secondary hover:text-text-primary">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-text-secondary hover:text-text-primary">
            <Maximize className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="sm">
            Disconnect
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - File Explorer */}
        <div className="w-64 bg-panel-bg border-r border-border-color flex flex-col">
          <div className="p-3 border-b border-border-color">
            <h3 className="text-sm font-medium flex items-center">
              <FileCode className="mr-2 text-accent-blue" />
              File Explorer
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            <FileExplorer 
              fileTree={fileTree || []} 
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
        </div>

        {/* Main Editor and Terminal Area */}
        <div className="flex-1 flex flex-col">
          {/* Tab Bar */}
          <div className="bg-panel-bg border-b border-border-color flex items-center overflow-x-auto">
            <div className="flex">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-center px-4 py-2 border-r border-border-color cursor-pointer ${
                    tab.active 
                      ? 'bg-editor-bg text-text-primary' 
                      : 'hover:bg-border-color text-text-secondary'
                  }`}
                  onClick={() => handleTabClick(tab.id)}
                >
                  {tab.type === 'file' && <FileCode className="mr-2 h-4 w-4 text-accent-blue" />}
                  {tab.type === 'terminal' && <TerminalIcon className="mr-2 h-4 w-4" />}
                  {tab.type === 'browser' && <Globe className="mr-2 h-4 w-4" />}
                  <span className="text-sm">{tab.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 p-0 h-auto text-text-secondary hover:text-text-primary"
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
              className="px-3 py-2 text-text-secondary hover:text-text-primary"
              onClick={() => setIsBrowserModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col">
            {activeTabData?.type === 'file' && (
              <CodeEditor
                content={activeTabData.content || ''}
                language={getLanguageFromPath(activeTabData.path || '')}
                onSave={(content) => handleFileSave(activeTabData.path || '', content)}
              />
            )}
            
            {activeTabData?.type === 'terminal' && sessionId && (
              <Terminal sessionId={sessionId} />
            )}
          </div>
        </div>

        {/* Right Sidebar - System Monitor */}
        <div className="w-80 bg-panel-bg border-l border-border-color">
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
