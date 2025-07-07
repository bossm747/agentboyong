import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Terminal, 
  FileEdit, 
  Globe, 
  Zap, 
  Clock, 
  CheckCircle,
  PlayCircle,
  AlertCircle,
  Brain,
  Shield,
  Code,
  Search,
  Eye,
  Settings,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface ExecutionStep {
  id: string;
  type: 'terminal' | 'file' | 'browser' | 'analysis' | 'security' | 'ai_thinking';
  title: string;
  command?: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  timestamp: string;
  duration?: number;
  output?: string;
  tool?: string;
  progress?: number;
}

interface LiveTask {
  id: string;
  title: string;
  description: string;
  steps: ExecutionStep[];
  status: 'pending' | 'executing' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  progress: number;
  category: 'security' | 'development' | 'research' | 'analysis';
}

interface CopilotKitInterfaceProps {
  sessionId: string;
  onTaskUpdate?: (task: LiveTask) => void;
  className?: string;
}

export function CopilotKitInterface({ sessionId, onTaskUpdate, className }: CopilotKitInterfaceProps) {
  const [activeTasks, setActiveTasks] = useState<LiveTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<LiveTask | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  useEffect(() => {
    if (!sessionId || !realTimeUpdates) return;

    // WebSocket connection for real-time task monitoring
    const ws = new WebSocket(`ws://localhost:5000?sessionId=${sessionId}`);
    
    ws.onopen = () => {
      console.log('🔗 CopilotKit monitoring connected');
      ws.send(JSON.stringify({
        type: 'subscribe_tasks',
        sessionId
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'task_started') {
          const newTask: LiveTask = {
            id: data.taskId,
            title: data.title,
            description: data.description || '',
            steps: [],
            status: 'executing',
            startTime: data.timestamp,
            progress: 0,
            category: data.category || 'analysis'
          };
          
          setActiveTasks(prev => [...prev.filter(t => t.id !== data.taskId), newTask]);
          onTaskUpdate?.(newTask);
        }
        
        if (data.type === 'step_started' || data.type === 'step_completed') {
          const newStep: ExecutionStep = {
            id: data.stepId || Date.now().toString(),
            type: data.stepType || 'analysis',
            title: data.title,
            command: data.command,
            status: data.status,
            timestamp: data.timestamp,
            duration: data.duration,
            output: data.output,
            tool: data.tool,
            progress: data.progress
          };

          setActiveTasks(prev => prev.map(task => {
            if (task.id === data.taskId) {
              const updatedSteps = task.steps.filter(s => s.id !== newStep.id);
              updatedSteps.push(newStep);
              
              const completedSteps = updatedSteps.filter(s => s.status === 'completed').length;
              const progress = updatedSteps.length > 0 ? (completedSteps / updatedSteps.length) * 100 : 0;
              
              const updatedTask = {
                ...task,
                steps: updatedSteps,
                progress
              };
              
              onTaskUpdate?.(updatedTask);
              return updatedTask;
            }
            return task;
          }));
        }

        if (data.type === 'task_completed') {
          setActiveTasks(prev => prev.map(task => 
            task.id === data.taskId 
              ? { ...task, status: data.status, endTime: data.timestamp, progress: 100 }
              : task
          ));
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [sessionId, realTimeUpdates, onTaskUpdate]);

  const getStepIcon = (type: ExecutionStep['type']) => {
    switch (type) {
      case 'terminal':
        return <Terminal className="h-4 w-4 text-blue-500" />;
      case 'file':
        return <FileEdit className="h-4 w-4 text-green-500" />;
      case 'browser':
        return <Globe className="h-4 w-4 text-purple-500" />;
      case 'security':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'ai_thinking':
        return <Brain className="h-4 w-4 text-orange-500" />;
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

  const getCategoryColor = (category: LiveTask['category']) => {
    switch (category) {
      case 'security':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'development':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'research':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const duration = Math.floor((end - start) / 1000);
    
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isExpanded) {
    return (
      <Card className={`p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className={`h-4 w-4 ${activeTasks.some(t => t.status === 'executing') ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
            <span className="text-sm font-medium">Task Monitor</span>
            <Badge variant="secondary" className="text-xs">
              {activeTasks.filter(t => t.status === 'executing').length} active
            </Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(true)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className={`h-5 w-5 ${activeTasks.some(t => t.status === 'executing') ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
          <h3 className="font-semibold">Live Task Execution</h3>
          <Badge variant={activeTasks.some(t => t.status === 'executing') ? 'default' : 'secondary'}>
            {activeTasks.filter(t => t.status === 'executing').length} / {activeTasks.length} active
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant={realTimeUpdates ? 'default' : 'outline'}
            onClick={() => setRealTimeUpdates(!realTimeUpdates)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(false)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Task List */}
      <ScrollArea className="h-96">
        <div className="space-y-3">
          {activeTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active tasks</p>
              <p className="text-xs">Tasks will appear here when AI operations begin</p>
            </div>
          ) : (
            activeTasks.map((task) => (
              <Card
                key={task.id}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedTask?.id === task.id ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950' : ''
                }`}
                onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
              >
                <div className="space-y-3">
                  {/* Task Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-sm">{task.title}</h4>
                      <Badge className={`text-xs ${getCategoryColor(task.category)}`}>
                        {task.category}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(task.startTime, task.endTime)}</span>
                    </div>
                  </div>

                  {/* Task Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{Math.round(task.progress)}%</span>
                    </div>
                    <Progress value={task.progress} className="h-2" />
                  </div>

                  {/* Task Description */}
                  {task.description && (
                    <p className="text-xs text-muted-foreground">{task.description}</p>
                  )}

                  {/* Recent Steps */}
                  {task.steps.length > 0 && (
                    <div className="space-y-1">
                      {task.steps.slice(-3).map((step) => (
                        <div
                          key={step.id}
                          className="flex items-center space-x-2 text-xs"
                        >
                          <div className="flex-shrink-0">
                            {getStepIcon(step.type)}
                          </div>
                          <span className="flex-1 truncate">{step.title}</span>
                          <div className="flex-shrink-0">
                            {getStatusIcon(step.status)}
                          </div>
                          {step.duration && (
                            <span className="text-muted-foreground">
                              {step.duration}ms
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expanded Details */}
                  {selectedTask?.id === task.id && task.steps.length > 3 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <h5 className="text-xs font-medium mb-2">All Steps</h5>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {task.steps.map((step) => (
                          <div
                            key={step.id}
                            className="flex items-center space-x-2 text-xs p-1 rounded hover:bg-muted/50"
                          >
                            <div className="flex-shrink-0">
                              {getStepIcon(step.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate">{step.title}</p>
                              {step.command && (
                                <code className="text-xs text-muted-foreground font-mono truncate block">
                                  {step.command}
                                </code>
                              )}
                            </div>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(step.status)}
                              {step.duration && (
                                <span className="text-muted-foreground">
                                  {step.duration}ms
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}