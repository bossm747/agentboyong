import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Terminal, 
  FileEdit, 
  Globe, 
  Activity, 
  Play, 
  Pause, 
  Square,
  Clock,
  Zap
} from 'lucide-react';

interface ExecutionStep {
  id: string;
  type: 'terminal' | 'file' | 'browser' | 'api' | 'analysis';
  title: string;
  command?: string;
  file?: string;
  url?: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  output?: string;
  timestamp: string;
  duration?: number;
  tool: string;
}

interface LiveExecutionMonitorProps {
  sessionId: string;
  isActive: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
}

export function LiveExecutionMonitor({ 
  sessionId, 
  isActive, 
  onPause, 
  onResume, 
  onStop 
}: LiveExecutionMonitorProps) {
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [currentStep, setCurrentStep] = useState<ExecutionStep | null>(null);
  const [totalExecutionTime, setTotalExecutionTime] = useState(0);

  useEffect(() => {
    if (!sessionId) return;

    // WebSocket connection for real-time updates
    const ws = new WebSocket(`ws://localhost:5000`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'subscribe_execution',
        sessionId
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'execution_step') {
        const newStep: ExecutionStep = {
          id: Date.now().toString(),
          type: data.stepType || 'analysis',
          title: data.title,
          command: data.command,
          file: data.file,
          url: data.url,
          status: data.status,
          output: data.output,
          timestamp: new Date().toISOString(),
          duration: data.duration,
          tool: data.tool || 'Pareng Boyong'
        };

        setSteps(prev => [...prev, newStep]);
        
        if (data.status === 'executing') {
          setCurrentStep(newStep);
        } else if (data.status === 'completed' || data.status === 'failed') {
          setCurrentStep(null);
        }
      }
    };

    return () => {
      ws.close();
    };
  }, [sessionId]);

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setTotalExecutionTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isActive]);

  const getStepIcon = (type: ExecutionStep['type']) => {
    switch (type) {
      case 'terminal':
        return <Terminal className="h-4 w-4" />;
      case 'file':
        return <FileEdit className="h-4 w-4" />;
      case 'browser':
        return <Globe className="h-4 w-4" />;
      case 'api':
        return <Zap className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'executing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className={`h-5 w-5 ${isActive ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
            <h3 className="font-semibold">Live Execution Monitor</h3>
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'Live' : 'Stopped'}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(totalExecutionTime)}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              {isActive ? (
                <Button size="sm" variant="outline" onClick={onPause}>
                  <Pause className="h-4 w-4" />
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={onResume}>
                  <Play className="h-4 w-4" />
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={onStop}>
                <Square className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Current Step */}
        {currentStep && (
          <Card className="p-3 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 text-blue-500">
                {getStepIcon(currentStep.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{currentStep.title}</p>
                  <Badge className="text-xs bg-blue-100 text-blue-800">
                    {currentStep.tool}
                  </Badge>
                </div>
                {currentStep.command && (
                  <code className="text-xs text-muted-foreground font-mono">
                    {currentStep.command}
                  </code>
                )}
                {currentStep.file && (
                  <p className="text-xs text-muted-foreground">
                    File: {currentStep.file}
                  </p>
                )}
                {currentStep.url && (
                  <p className="text-xs text-muted-foreground">
                    URL: {currentStep.url}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Execution History */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Execution History</h4>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {steps.slice(-10).reverse().map((step) => (
                <div
                  key={step.id}
                  className="flex items-center space-x-3 p-2 rounded border"
                >
                  <div className="flex-shrink-0 text-muted-foreground">
                    {getStepIcon(step.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{step.title}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {step.tool}
                        </Badge>
                        <Badge className={`text-xs ${getStatusColor(step.status)}`}>
                          {step.status}
                        </Badge>
                      </div>
                    </div>
                    
                    {step.command && (
                      <code className="text-xs text-muted-foreground font-mono block truncate">
                        {step.command}
                      </code>
                    )}
                    
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </span>
                      {step.duration && (
                        <span className="text-xs text-muted-foreground">
                          {step.duration}ms
                        </span>
                      )}
                    </div>
                    
                    {step.output && step.status === 'completed' && (
                      <details className="mt-1">
                        <summary className="text-xs cursor-pointer text-blue-600 hover:text-blue-800">
                          View Output
                        </summary>
                        <pre className="text-xs mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto">
                          {step.output.substring(0, 200)}
                          {step.output.length > 200 && '...'}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </Card>
  );
}