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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: applications = [] } = useQuery({
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

  if (!selectedApp) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-gray-400 text-center">
          <Globe className="h-12 w-12 mx-auto mb-3" />
          <p className="text-sm">No running applications</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={selectedApp.url}
      className="w-full h-full border-0 block"
      title={`${selectedApp.name} Preview`}
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads allow-pointer-lock"
      onLoad={() => console.log(`${selectedApp.name} loaded`)}
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%'
      }}
    />
  );
}