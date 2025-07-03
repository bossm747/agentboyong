import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  FileText,
  Code,
  Search,
  Terminal,
  Settings,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react";
import type { BackgroundTask } from "@shared/schema";

interface BackgroundTasksPanelProps {
  sessionId: string;
}

export default function BackgroundTasksPanel({ sessionId }: BackgroundTasksPanelProps) {
  const [selectedTask, setSelectedTask] = useState<BackgroundTask | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['/api/background-tasks', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/background-tasks/${sessionId}`);
      return response.json();
    },
    refetchInterval: 2000, // Refresh every 2 seconds for real-time updates
  });

  const activeTasks = tasks.filter((task: BackgroundTask) => 
    task.status === 'running' || (showCompleted && ['completed', 'failed', 'cancelled'].includes(task.status))
  );

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'file_operation':
        return FileText;
      case 'code_execution':
        return Code;
      case 'research':
        return Search;
      case 'analysis':
        return Activity;
      case 'installation':
        return Settings;
      default:
        return Terminal;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-400" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-400" />;
      case 'failed':
        return <XCircle className="h-3 w-3 text-red-400" />;
      case 'cancelled':
        return <XCircle className="h-3 w-3 text-gray-400" />;
      default:
        return <Clock className="h-3 w-3 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500/20 text-blue-400 border-blue-400/50';
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-400/50';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-400/50';
      case 'cancelled':
        return 'bg-gray-500/20 text-gray-400 border-gray-400/50';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/50';
    }
  };

  const formatDuration = (startedAt: string | Date, completedAt?: string | Date) => {
    const start = startedAt instanceof Date ? startedAt : new Date(startedAt);
    const end = completedAt 
      ? (completedAt instanceof Date ? completedAt : new Date(completedAt))
      : new Date();
    const diff = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  };

  const deleteTask = async (taskId: number) => {
    try {
      await fetch(`/api/background-tasks/${taskId}`, { method: 'DELETE' });
      refetchTasks();
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  return (
    <div className="h-full flex bg-black border border-purple-500/30 rounded-lg overflow-hidden">
      {/* Task List */}
      <div className="w-80 border-r border-purple-500/30 bg-black">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-cyan-400 flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Background Tasks
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCompleted(!showCompleted)}
              className="p-1 h-7 w-7 text-gray-400 hover:text-cyan-400"
            >
              {showCompleted ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-180px)]">
            {activeTasks.length > 0 ? (
              <div className="space-y-2 p-3">
                {activeTasks.map((task: BackgroundTask) => {
                  const TaskIcon = getTaskIcon(task.taskType);
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedTask?.id === task.id
                          ? 'bg-cyan-500/10 border-cyan-400/50'
                          : 'bg-gray-800/30 border-gray-600/50 hover:border-purple-400/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2 flex-1">
                          <TaskIcon className="h-4 w-4 mt-0.5 text-purple-400" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(task.status)}
                              <h4 className="text-sm font-medium text-cyan-300 truncate">
                                {task.title}
                              </h4>
                            </div>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                              {task.description}
                            </p>
                            {task.status === 'running' && task.currentStep && (
                              <p className="text-xs text-purple-300 mt-1">
                                {task.currentStep}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                          {task.status}
                        </Badge>
                      </div>

                      {task.status === 'running' && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{task.progress}%</span>
                          </div>
                          <Progress value={task.progress} className="h-1" />
                          {task.totalSteps && (
                            <p className="text-xs text-purple-300 mt-1">
                              Step {Math.ceil((task.progress / 100) * task.totalSteps)} of {task.totalSteps}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>{formatDuration(task.startedAt, task.completedAt)}</span>
                        {task.status !== 'running' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTask(task.id);
                            }}
                            className="p-1 h-5 w-5 text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-center">
                <div className="text-gray-400">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No background tasks</p>
                  <p className="text-xs text-purple-300 mt-1">
                    Tasks will appear here automatically
                  </p>
                </div>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </div>

      {/* Task Details */}
      <div className="flex-1 bg-black">
        {selectedTask ? (
          <div className="h-full flex flex-col">
            <CardHeader className="pb-3 border-b border-purple-500/30">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm text-cyan-400 flex items-center">
                    {getStatusIcon(selectedTask.status)}
                    <span className="ml-2">{selectedTask.title}</span>
                  </CardTitle>
                  <p className="text-sm text-gray-400 mt-1">{selectedTask.description}</p>
                </div>
                <Badge className={`${getStatusColor(selectedTask.status)}`}>
                  {selectedTask.status}
                </Badge>
              </div>

              {selectedTask.status === 'running' && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                    <span>Progress</span>
                    <span>{selectedTask.progress}%</span>
                  </div>
                  <Progress value={selectedTask.progress} className="h-2" />
                  {selectedTask.currentStep && (
                    <p className="text-sm text-purple-300 mt-2">
                      Current: {selectedTask.currentStep}
                    </p>
                  )}
                </div>
              )}
            </CardHeader>

            <CardContent className="flex-1 p-3">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-cyan-400 mb-2">Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Type:</span>
                        <span className="ml-2 text-purple-300">{selectedTask.taskType}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Started:</span>
                        <span className="ml-2 text-purple-300">
                          {new Date(selectedTask.startedAt).toLocaleString()}
                        </span>
                      </div>
                      {selectedTask.completedAt && (
                        <div>
                          <span className="text-gray-400">Completed:</span>
                          <span className="ml-2 text-purple-300">
                            {new Date(selectedTask.completedAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400">Duration:</span>
                        <span className="ml-2 text-purple-300">
                          {formatDuration(selectedTask.startedAt, selectedTask.completedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-purple-500/30" />

                  {selectedTask.output && selectedTask.output.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-cyan-400 mb-2">Output</h4>
                      <div className="bg-gray-900/50 border border-gray-600/50 rounded-lg p-3">
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                          {selectedTask.output.join('\n')}
                        </pre>
                      </div>
                    </div>
                  )}

                  {selectedTask.errorMessage && (
                    <div>
                      <h4 className="text-sm font-medium text-red-400 mb-2">Error</h4>
                      <div className="bg-red-500/10 border border-red-400/50 rounded-lg p-3">
                        <pre className="text-xs text-red-300 whitespace-pre-wrap">
                          {selectedTask.errorMessage}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div className="text-gray-400">
              <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Select a task to view details</p>
              <p className="text-xs text-purple-300 mt-2">
                Monitor real-time progress and outputs
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}