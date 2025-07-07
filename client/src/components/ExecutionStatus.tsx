import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Play,
  Pause,
  Square,
  Zap,
  Terminal,
  FileEdit,
  Globe,
  Shield,
  Brain,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';

interface ExecutionStatusProps {
  sessionId: string;
  className?: string;
}

interface ExecutionEvent {
  id: string;
  type: 'security' | 'file' | 'terminal' | 'ai' | 'analysis';
  action: string;
  status: 'running' | 'completed' | 'failed';
  timestamp: string;
  duration?: number;
  details?: string;
  tool?: string;
}

export function ExecutionStatus({ sessionId, className }: ExecutionStatusProps) {
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [totalExecutionTime, setTotalExecutionTime] = useState(0);

  useEffect(() => {
    if (!sessionId || !isLive) return;

    // Simulate real-time execution events for demonstration
    const generateEvent = (type: ExecutionEvent['type'], action: string, tool?: string): ExecutionEvent => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      action,
      status: 'running',
      timestamp: new Date().toISOString(),
      tool
    });

    // Sample events to demonstrate the interface
    const sampleEvents = [
      generateEvent('security', 'Scanning ports with nmap', 'nmap'),
      generateEvent('analysis', 'Analyzing scan results'),
      generateEvent('ai', 'Processing security intelligence'),
      generateEvent('terminal', 'Executing vulnerability check', 'nikto')
    ];

    let eventIndex = 0;
    const interval = setInterval(() => {
      if (eventIndex < sampleEvents.length) {
        const event = sampleEvents[eventIndex];
        setEvents(prev => [...prev, event]);
        
        // Complete the event after 2-5 seconds
        setTimeout(() => {
          setEvents(prev => prev.map(e => 
            e.id === event.id 
              ? { ...e, status: 'completed', duration: Math.floor(Math.random() * 3000) + 500 }
              : e
          ));
        }, Math.random() * 3000 + 2000);
        
        eventIndex++;
      } else {
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [sessionId, isLive]);

  useEffect(() => {
    const completedEvents = events.filter(e => e.status === 'completed' && e.duration);
    const total = completedEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
    setTotalExecutionTime(total);
  }, [events]);

  const getEventIcon = (type: ExecutionEvent['type']) => {
    switch (type) {
      case 'security':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'file':
        return <FileEdit className="h-4 w-4 text-green-500" />;
      case 'terminal':
        return <Terminal className="h-4 w-4 text-blue-500" />;
      case 'ai':
        return <Brain className="h-4 w-4 text-purple-500" />;
      case 'analysis':
        return <Search className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: ExecutionEvent['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ExecutionEvent['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const runningEvents = events.filter(e => e.status === 'running').length;
  const completedEvents = events.filter(e => e.status === 'completed').length;
  const totalEvents = events.length;
  const progress = totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0;

  return (
    <Card className={`p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className={`h-5 w-5 ${runningEvents > 0 ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
          <h3 className="font-semibold">Execution Status</h3>
          <Badge variant={runningEvents > 0 ? 'default' : 'secondary'}>
            {runningEvents} / {totalEvents} active
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant={isLive ? 'default' : 'outline'}
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEvents([])}
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Overall Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{completedEvents} completed</span>
          <span>Total time: {(totalExecutionTime / 1000).toFixed(1)}s</span>
        </div>
      </div>

      {/* Event List */}
      <ScrollArea className="h-64">
        <div className="space-y-2">
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No execution events</p>
              <p className="text-xs">Events will appear here when AI operations begin</p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  {getEventIcon(event.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium truncate">{event.action}</p>
                    {event.tool && (
                      <Badge variant="outline" className="text-xs">
                        {event.tool}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                    {event.duration && (
                      <>
                        <span>•</span>
                        <span>{event.duration}ms</span>
                      </>
                    )}
                  </div>
                  {event.details && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {event.details}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Badge className={`text-xs ${getStatusColor(event.status)}`}>
                    {event.status}
                  </Badge>
                  {getStatusIcon(event.status)}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Live Indicator */}
      {isLive && runningEvents > 0 && (
        <div className="flex items-center justify-center space-x-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-700 dark:text-green-300 font-medium">
            Live execution monitoring active
          </span>
        </div>
      )}
    </Card>
  );
}