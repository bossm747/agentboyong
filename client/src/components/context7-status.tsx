import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, AlertCircle, Book, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Context7Status {
  status: 'healthy' | 'degraded' | 'error';
  apiKeyConfigured: boolean;
  cacheSize: number;
  lastError: string | null;
}

interface LibraryDoc {
  name: string;
  documentation: string;
  examples: any[];
  version: string;
  description: string;
  methods: any[];
  properties: any[];
  lastUpdated: string;
}

export default function Context7Status() {
  const [status, setStatus] = useState<Context7Status | null>(null);
  const [library, setLibrary] = useState("");
  const [documentation, setDocumentation] = useState<LibraryDoc | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await apiRequest("GET", "/api/context7/status");
      const result = await response.json();
      if (result.success) {
        setStatus({
          status: result.status,
          apiKeyConfigured: result.apiKeyConfigured,
          cacheSize: result.cacheSize,
          lastError: result.lastError
        });
      }
    } catch (err) {
      console.error('Failed to load Context7 status:', err);
    }
  };

  const searchLibrary = async () => {
    if (!library.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setDocumentation(null);

    try {
      const response = await apiRequest("GET", `/api/context7/library/${encodeURIComponent(library)}`);
      const result = await response.json();
      
      if (result.success) {
        setDocumentation(result.data);
      } else {
        setError(result.error || 'Failed to fetch documentation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documentation');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (status?.status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (status?.status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-500">Healthy</Badge>;
      case 'degraded':
        return <Badge variant="secondary" className="bg-yellow-500">Degraded</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            {getStatusIcon()}
            Context7 Documentation Service
            {status && getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {status && (
            <>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">API Key:</span>
                  <span className="ml-2">{status.apiKeyConfigured ? '✅ Configured' : '❌ Not Set'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cache Size:</span>
                  <span className="ml-2">{status.cacheSize} items</span>
                </div>
              </div>
              {status.lastError && (
                <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  <strong>Last Error:</strong> {status.lastError}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {status.status === 'degraded' 
                  ? 'Using fallback sources (NPM, GitHub, JSDelivr)' 
                  : status.status === 'healthy' 
                    ? 'Full Context7 API access available'
                    : 'Service unavailable'
                }
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Library Search */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Book className="h-4 w-4" />
            Test Library Documentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Enter library name (e.g., react, express, lodash)"
              value={library}
              onChange={(e) => setLibrary(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchLibrary()}
              className="text-sm"
            />
            <Button 
              onClick={searchLibrary} 
              disabled={isLoading || !library.trim()}
              size="sm"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {isLoading && (
            <div className="text-sm text-muted-foreground">
              Fetching documentation...
            </div>
          )}

          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {error}
            </div>
          )}

          {documentation && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{documentation.name}</h4>
                <Badge variant="outline" className="text-xs">{documentation.version}</Badge>
              </div>
              
              {documentation.description && (
                <p className="text-sm text-muted-foreground">{documentation.description}</p>
              )}

              <div className="text-xs text-muted-foreground">
                Updated: {new Date(documentation.lastUpdated).toLocaleString()}
              </div>

              {documentation.documentation && (
                <div className="bg-muted p-2 rounded text-xs max-h-32 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{documentation.documentation.substring(0, 500)}...</pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}