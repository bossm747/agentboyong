import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { 
  Globe, 
  Play, 
  Square, 
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
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const runningApps = applications.filter((app: Application) => app.status === 'running');

  useEffect(() => {
    if (runningApps.length > 0 && !selectedApp) {
      setSelectedApp(runningApps[0]);
    }
  }, [runningApps, selectedApp]);

  const getViewportDimensions = () => {
    switch (viewportSize) {
      case 'mobile':
        return { width: '375px', height: '667px' };
      case 'tablet':
        return { width: '768px', height: '1024px' };
      case 'desktop':
        return { width: '100%', height: '100%' };
      default:
        return { width: '100%', height: '100%' };
    }
  };

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

  const dimensions = getViewportDimensions();

  return (
    <div className="h-full flex flex-col bg-black border border-purple-500/30 rounded-lg overflow-hidden">
      <CardHeader className="pb-3 bg-black border-b border-purple-500/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-cyan-400 flex items-center">
            <Globe className="h-4 w-4 mr-2" />
            App Preview
          </CardTitle>
          <div className="flex items-center space-x-2">
            {/* Viewport Size Controls */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewportSize('mobile')}
                className={`p-1 h-7 w-7 ${
                  viewportSize === 'mobile' 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-400 hover:text-cyan-400'
                }`}
              >
                <Smartphone className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewportSize('tablet')}
                className={`p-1 h-7 w-7 ${
                  viewportSize === 'tablet' 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-400 hover:text-cyan-400'
                }`}
              >
                <Tablet className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewportSize('desktop')}
                className={`p-1 h-7 w-7 ${
                  viewportSize === 'desktop' 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-400 hover:text-cyan-400'
                }`}
              >
                <Monitor className="h-3 w-3" />
              </Button>
            </div>
            
            <Separator orientation="vertical" className="h-4 bg-purple-500/30" />
            
            {/* Action Controls */}
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshIframe}
              className="p-1 h-7 w-7 text-gray-400 hover:text-cyan-400"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={openInNewTab}
              className="p-1 h-7 w-7 text-gray-400 hover:text-cyan-400"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1 h-7 w-7 text-gray-400 hover:text-cyan-400"
            >
              {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* App Selection */}
        {runningApps.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {runningApps.map((app: Application) => (
              <button
                key={app.id}
                onClick={() => setSelectedApp(app)}
                className={`px-3 py-1 rounded-full text-xs transition-all duration-200 ${
                  selectedApp?.id === app.id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/50'
                    : 'bg-gray-800/50 text-gray-400 border border-gray-600/50 hover:border-purple-400/50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>{app.name}</span>
                  <Badge className={`px-1 py-0 text-[10px] ${getStatusColor(app.status)}`}>
                    {app.status}
                  </Badge>
                  <span className="text-purple-300">:{app.port}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0 relative overflow-hidden">
        {selectedApp ? (
          <div 
            className={`${
              isFullscreen 
                ? 'fixed inset-0 z-50 bg-black' 
                : 'w-full h-full'
            } flex items-center justify-center`}
          >
            <div 
              className="border border-gray-600/50 rounded-lg overflow-hidden shadow-lg"
              style={{
                width: dimensions.width,
                height: isFullscreen ? '100vh' : 'calc(100% - 20px)',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            >
              <iframe
                ref={iframeRef}
                src={selectedApp.url}
                className="w-full h-full border-0"
                title={`${selectedApp.name} Preview`}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads allow-pointer-lock"
                loading="lazy"
                onLoad={() => {
                  console.log('Iframe loaded successfully for:', selectedApp.url);
                  console.log('Iframe content window:', iframeRef.current?.contentWindow);
                }}
                onError={(e) => {
                  console.error('Iframe error:', e);
                  console.error('Failed to load:', selectedApp.url);
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div className="text-gray-400">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No running applications</p>
              <p className="text-xs text-purple-300 mt-2">
                Create an app with Pareng Boyong to see it here
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </div>
  );
}