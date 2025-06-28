import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Cpu, 
  HardDrive, 
  Activity, 
  Settings, 
  Plus,
  Circle
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { SystemStats, Process, EnvironmentVariable } from "@shared/schema";

interface SystemMonitorProps {
  sessionId: string;
}

export default function SystemMonitor({ sessionId }: SystemMonitorProps) {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const { socket, isConnected } = useWebSocket(sessionId);

  // Get processes
  const { data: processes = [] } = useQuery({
    queryKey: ['/api/processes', sessionId],
    enabled: !!sessionId,
    refetchInterval: 5000,
  });

  // Get environment variables
  const { data: envVars = [] } = useQuery({
    queryKey: ['/api/env', sessionId],
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (socket && isConnected) {
      // Request system monitoring
      socket.send(JSON.stringify({
        type: 'system:monitor',
      }));

      const handleMessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'system:stats') {
            setSystemStats(message.data);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      socket.addEventListener('message', handleMessage);

      return () => {
        socket.removeEventListener('message', handleMessage);
      };
    }
  }, [socket, isConnected]);

  const formatMemory = (bytes: number) => {
    return `${(bytes / 1024).toFixed(1)} GB`;
  };

  const formatDisk = (mb: number) => {
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* System Monitor */}
      <div className="border-b border-border-color">
        <div className="p-3 border-b border-border-color">
          <h3 className="text-sm font-medium flex items-center">
            <Cpu className="mr-2 h-4 w-4 text-success-green" />
            System Monitor
          </h3>
        </div>
        <div className="p-3 space-y-3">
          {systemStats ? (
            <>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>CPU Usage</span>
                  <span>{systemStats.cpu}%</span>
                </div>
                <Progress value={systemStats.cpu} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Memory</span>
                  <span>
                    {formatMemory(systemStats.memory.used)} / {formatMemory(systemStats.memory.total)}
                  </span>
                </div>
                <Progress 
                  value={(systemStats.memory.used / systemStats.memory.total) * 100} 
                  className="h-2" 
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Disk Usage</span>
                  <span>
                    {formatDisk(systemStats.disk.used)} / {formatDisk(systemStats.disk.total)}
                  </span>
                </div>
                <Progress 
                  value={(systemStats.disk.used / systemStats.disk.total) * 100} 
                  className="h-2" 
                />
              </div>
            </>
          ) : (
            <div className="text-xs text-text-secondary">Loading system stats...</div>
          )}
        </div>
      </div>

      {/* Running Processes */}
      <div className="border-b border-border-color">
        <div className="p-3 border-b border-border-color">
          <h3 className="text-sm font-medium flex items-center">
            <Activity className="mr-2 h-4 w-4 text-warning-yellow" />
            Active Processes
          </h3>
        </div>
        <ScrollArea className="max-h-40">
          {processes.length > 0 ? (
            processes.map((process: Process) => (
              <div key={process.id} className="px-3 py-2 border-b border-border-color last:border-b-0 hover:bg-border-color">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Circle 
                      className={`w-2 h-2 ${
                        process.status === 'running' || process.status === 'active'
                          ? 'text-success-green' 
                          : 'text-text-secondary'
                      }`}
                      fill="currentColor"
                    />
                    <span className="text-xs font-mono">{process.name}</span>
                  </div>
                  <span className="text-xs text-text-secondary">{process.pid}</span>
                </div>
                <div className="text-xs text-text-secondary mt-1 truncate">
                  {process.command}
                </div>
              </div>
            ))
          ) : (
            <div className="px-3 py-4 text-xs text-text-secondary text-center">
              No active processes
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Environment Variables */}
      <div className="flex-1 overflow-hidden">
        <div className="p-3 border-b border-border-color">
          <h3 className="text-sm font-medium flex items-center">
            <Settings className="mr-2 h-4 w-4 text-accent-blue" />
            Environment
          </h3>
        </div>
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-2 text-xs font-mono">
            {envVars.length > 0 ? (
              envVars.map((envVar: EnvironmentVariable) => (
                <div key={envVar.id} className="bg-border-color rounded p-2">
                  <div className="text-accent-blue font-medium">{envVar.key}</div>
                  <div className="text-text-secondary break-all">{envVar.value}</div>
                </div>
              ))
            ) : (
              <>
                {/* Default environment variables */}
                <div className="bg-border-color rounded p-2">
                  <div className="text-accent-blue font-medium">PYTHON_PATH</div>
                  <div className="text-text-secondary">/usr/bin/python3</div>
                </div>
                <div className="bg-border-color rounded p-2">
                  <div className="text-accent-blue font-medium">NODE_ENV</div>
                  <div className="text-text-secondary">development</div>
                </div>
                <div className="bg-border-color rounded p-2">
                  <div className="text-accent-blue font-medium">PATH</div>
                  <div className="text-text-secondary break-all">
                    /usr/local/bin:/usr/bin:/bin
                  </div>
                </div>
              </>
            )}
          </div>
          <Button 
            variant="ghost"
            className="w-full mt-3 bg-border-color hover:bg-gray-600 text-xs"
            size="sm"
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Variable
          </Button>
        </ScrollArea>
      </div>
    </div>
  );
}
