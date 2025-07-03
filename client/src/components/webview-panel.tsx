import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  Globe, 
  RefreshCw, 
  ExternalLink, 
  Monitor,
  Smartphone,
  Tablet,
  Maximize2,
  Minimize2
} from "lucide-react";
import type { Application } from "@shared/schema";

interface WebViewPanelProps {
  sessionId: string;
}

export default function WebViewPanel({ sessionId }: WebViewPanelProps) {
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [viewportSize, setViewportSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: applications = [], refetch: refetchApps } = useQuery({
    queryKey: ['/api/applications', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/applications/${sessionId}`);
      return response.json();
    },
    refetchInterval: 5000,
  });

  const runningApps = applications.filter((app: Application) => app.status === 'running');

  useEffect(() => {
    if (runningApps.length > 0 && !selectedApp) {
      setSelectedApp(runningApps[0]);
    }
  }, [runningApps, selectedApp]);

  const refreshIframe = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const openInNewTab = () => {
    if (selectedApp) {
      window.open(selectedApp.url, '_blank');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500/20 text-green-400 border-green-400/50';
      case 'starting':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/50';
      case 'stopped':
        return 'bg-gray-500/20 text-gray-400 border-gray-400/50';
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-400/50';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-400/50';
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-black overflow-hidden">
      {/* Mobile-optimized Controls at Top for better UX */}
      <div className="bg-black border-b border-purple-500/30 px-3 py-2 flex-shrink-0 lg:order-2 lg:border-t lg:border-b-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm text-cyan-400 flex items-center font-semibold">
            <Globe className="h-4 w-4 mr-2" />
            App Preview
          </h3>
          <div className="flex items-center space-x-1">
            {/* Viewport Controls */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewportSize('mobile')}
              className={`p-1 h-6 w-6 ${viewportSize === 'mobile' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400'}`}
            >
              <Smartphone className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewportSize('tablet')}
              className={`p-1 h-6 w-6 ${viewportSize === 'tablet' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400'}`}
            >
              <Tablet className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewportSize('desktop')}
              className={`p-1 h-6 w-6 ${viewportSize === 'desktop' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400'}`}
            >
              <Monitor className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={refreshIframe} className="p-1 h-6 w-6 text-gray-400">
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={openInNewTab} className="p-1 h-6 w-6 text-gray-400">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Running Apps */}
        {runningApps.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {runningApps.map((app: Application) => (
              <button
                key={app.id}
                onClick={() => setSelectedApp(app)}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  selectedApp?.id === app.id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/50'
                    : 'bg-gray-800/50 text-gray-400 border border-gray-600/50'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <span>{app.name}</span>
                  <Badge className={`px-1 py-0 text-[9px] ${getStatusColor(app.status)}`}>
                    {app.status}
                  </Badge>
                  <span className="text-purple-300">:{app.port}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Area - Optimized for mobile full screen */}
      <div className="flex-1 overflow-hidden lg:order-1 min-h-0">
        {selectedApp ? (
          <div className="w-full h-full relative">
            <iframe
              ref={iframeRef}
              src={`/app-proxy/${sessionId}/todo`}
              className="w-full h-full border-0 bg-white block"
              title={`${selectedApp.name} Preview`}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads allow-pointer-lock"
              loading="lazy"
              onLoad={() => console.log('Todo app loaded successfully')}
              onError={(e) => console.error('Failed to load todo app')}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div className="text-gray-400">
              <Globe className="h-12 w-12 mx-auto mb-3" />
              <p className="text-sm">No running applications</p>
              <p className="text-xs text-purple-300 mt-2">
                Create an app with Pareng Boyong to see it here
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}