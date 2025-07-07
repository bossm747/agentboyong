import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Terminal, 
  FileEdit, 
  Globe, 
  Zap, 
  Clock, 
  CheckCircle,
  PlayCircle,
  AlertCircle
} from 'lucide-react';

interface ExecutionStep {
  id: string;
  type: 'terminal' | 'file' | 'browser' | 'analysis' | 'security';
  title: string;
  command?: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  timestamp: string;
  duration?: number;
  output?: string;
}

interface ExecutionStatusProps {
  sessionId: string;
  isActive: boolean;
}

export function ExecutionStatus({ sessionId, isActive }: ExecutionStatusProps) {
  const [currentExecution, setCurrentExecution] = useState<ExecutionStep | null>(null);
  const [recentSteps, setRecentSteps] = useState<ExecutionStep[]>([]);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    let interval: NodeJS.Timeout;
    
    // Simulate real execution monitoring
    const monitorExecution = () => {
      // This would connect to WebSocket in real implementation
      // For now, showing the structure
      interval = setInterval(() => {
        setTotalTime(prev => prev + 1);
      }, 1000);
    };

    monitorExecution();
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, sessionId]);

  const getStepIcon = (type: ExecutionStep['type']) => {
    switch (type) {
      case 'terminal':
        return <Terminal className="h-4 w-4 text-blue-500" />;
      case 'file':
        return <FileEdit className="h-4 w-4 text-green-500" />;
      case 'browser':
        return <Globe className="h-4 w-4 text-purple-500" />;
      case 'security':
        return <Zap className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'executing':
        return <PlayCircle className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive && !currentExecution && recentSteps.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center space-x-2 text-muted-foreground">
          <Activity className="h-5 w-5" />
          <span className="text-sm">Waiting for task execution...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className={`h-5 w-5 ${isActive ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
          <h3 className="font-semibold">Real-Time Execution</h3>
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Live' : 'Idle'}
          </Badge>
        </div>
        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{formatTime(totalTime)}</span>
        </div>
      </div>

      {/* Current Execution */}
      {currentExecution && (
        <Card className="p-3 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {getStepIcon(currentExecution.type)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-sm">{currentExecution.title}</p>
                <Badge variant="secondary" className="text-xs">
                  {currentExecution.type}
                </Badge>
              </div>
              {currentExecution.command && (
                <code className="text-xs text-muted-foreground font-mono block">
                  {currentExecution.command}
                </code>
              )}
              <div className="flex items-center space-x-2 mt-2">
                {getStatusIcon(currentExecution.status)}
                <span className="text-xs text-muted-foreground capitalize">
                  {currentExecution.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Steps */}
      {recentSteps.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recent Activity</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {recentSteps.slice(-5).map((step, index) => (
              <div
                key={step.id}
                className="flex items-center space-x-3 p-2 rounded border-l-2 border-l-gray-200 dark:border-l-gray-700"
              >
                <div className="flex-shrink-0">
                  {getStepIcon(step.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{step.title}</p>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(step.status)}
                      {step.duration && (
                        <span className="text-xs text-muted-foreground">
                          {step.duration}ms
                        </span>
                      )}
                    </div>
                  </div>
                  {step.command && (
                    <code className="text-xs text-muted-foreground font-mono truncate block">
                      {step.command}
                    </code>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      {isActive && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Task Progress</span>
            <span>{recentSteps.filter(s => s.status === 'completed').length} / {recentSteps.length} completed</span>
          </div>
          <Progress 
            value={recentSteps.length > 0 ? (recentSteps.filter(s => s.status === 'completed').length / recentSteps.length) * 100 : 0} 
            className="w-full h-2" 
          />
        </div>
      )}
    </Card>
  );
}