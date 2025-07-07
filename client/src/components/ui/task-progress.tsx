import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, PlayCircle, AlertCircle } from 'lucide-react';

interface TaskStep {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp?: string;
  duration?: number;
  details?: string;
  tool?: string;
}

interface TaskProgressProps {
  taskId: string;
  title: string;
  steps: TaskStep[];
  currentStep?: number;
  totalSteps: number;
  onStepClick?: (stepId: string) => void;
}

export function TaskProgress({ 
  taskId, 
  title, 
  steps, 
  currentStep = 0, 
  totalSteps,
  onStepClick 
}: TaskProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    setProgress((completedSteps / totalSteps) * 100);
  }, [steps, totalSteps]);

  const getStatusIcon = (status: TaskStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TaskStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{title}</h3>
          <Badge variant="outline">
            {currentStep + 1} / {totalSteps}
          </Badge>
        </div>
        <Progress value={progress} className="w-full" />
        <div className="text-sm text-muted-foreground">
          {Math.round(progress)}% Complete
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
              step.status === 'in_progress' ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950' : 'border-border'
            }`}
            onClick={() => onStepClick?.(step.id)}
          >
            <div className="flex-shrink-0">
              {getStatusIcon(step.status)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate">{step.title}</p>
                <div className="flex items-center space-x-2">
                  {step.tool && (
                    <Badge variant="secondary" className="text-xs">
                      {step.tool}
                    </Badge>
                  )}
                  <Badge className={`text-xs ${getStatusColor(step.status)}`}>
                    {step.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              
              {step.details && (
                <p className="text-xs text-muted-foreground mt-1">
                  {step.details}
                </p>
              )}
              
              <div className="flex items-center justify-between mt-1">
                {step.timestamp && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(step.timestamp).toLocaleTimeString()}
                  </span>
                )}
                {step.duration && (
                  <span className="text-xs text-muted-foreground">
                    {step.duration}ms
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}