import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Globe,
  ExternalLink 
} from "lucide-react";

interface BrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BrowserModal({ isOpen, onClose }: BrowserModalProps) {
  const [url, setUrl] = useState("https://example.com");
  const [currentUrl, setCurrentUrl] = useState("https://example.com");

  const handleNavigate = () => {
    setCurrentUrl(url);
  };

  const handleBack = () => {
    // TODO: Implement browser history navigation
    console.log('Navigate back');
  };

  const handleForward = () => {
    // TODO: Implement browser history navigation
    console.log('Navigate forward');
  };

  const handleRefresh = () => {
    // TODO: Implement page refresh
    console.log('Refresh page');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNavigate();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] bg-panel-bg border-border-color">
        <DialogHeader>
          <DialogTitle className="flex items-center text-text-primary">
            <Globe className="mr-2 h-5 w-5 text-accent-blue" />
            Integrated Browser
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-full">
          {/* Browser Navigation Bar */}
          <div className="flex items-center space-x-2 p-2 border-b border-border-color">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleForward}
              className="text-text-secondary hover:text-text-primary"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-text-secondary hover:text-text-primary"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Input
              type="url"
              placeholder="Enter URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 bg-editor-bg border-border-color text-text-primary"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(currentUrl, '_blank')}
              className="text-text-secondary hover:text-text-primary"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>

          {/* Browser Content Area */}
          <div className="flex-1 bg-white relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-500">
                <Globe className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">Sandbox Browser</h3>
                <p className="text-sm mb-2">
                  Browser content would be rendered here in a production environment
                </p>
                <p className="text-xs text-gray-400">
                  This would integrate with a sandboxed browser engine
                </p>
                <div className="mt-4 p-3 bg-white rounded border border-gray-200 text-left max-w-md mx-auto">
                  <div className="text-xs text-gray-600 mb-1">Current URL:</div>
                  <div className="text-sm font-mono text-blue-600">{currentUrl}</div>
                </div>
              </div>
            </div>
            
            {/* Simulated browser frame */}
            <div className="absolute top-4 left-4 right-4 bottom-4 border-2 border-dashed border-gray-300 rounded-lg pointer-events-none" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
