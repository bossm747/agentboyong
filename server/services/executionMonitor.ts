import { WebSocket } from 'ws';

export interface ExecutionEvent {
  type: 'task_started' | 'step_started' | 'step_completed' | 'task_completed' | 'tool_executed';
  sessionId: string;
  taskId: string;
  stepId?: string;
  title: string;
  description?: string;
  tool?: string;
  command?: string;
  file?: string;
  url?: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  output?: string;
  error?: string;
  timestamp: string;
  duration?: number;
  progress?: number;
}

export class ExecutionMonitor {
  private static instance: ExecutionMonitor;
  private wsClients: Map<string, WebSocket[]> = new Map();
  private activeTasks: Map<string, any> = new Map();

  static getInstance(): ExecutionMonitor {
    if (!ExecutionMonitor.instance) {
      ExecutionMonitor.instance = new ExecutionMonitor();
    }
    return ExecutionMonitor.instance;
  }

  addClient(sessionId: string, ws: WebSocket): void {
    if (!this.wsClients.has(sessionId)) {
      this.wsClients.set(sessionId, []);
    }
    this.wsClients.get(sessionId)!.push(ws);

    ws.on('close', () => {
      this.removeClient(sessionId, ws);
    });
  }

  removeClient(sessionId: string, ws: WebSocket): void {
    const clients = this.wsClients.get(sessionId);
    if (clients) {
      const index = clients.indexOf(ws);
      if (index > -1) {
        clients.splice(index, 1);
      }
      if (clients.length === 0) {
        this.wsClients.delete(sessionId);
      }
    }
  }

  emitEvent(event: ExecutionEvent): void {
    const clients = this.wsClients.get(event.sessionId);
    if (clients) {
      const eventData = JSON.stringify({
        ...event,
        timestamp: new Date().toISOString()
      });

      clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(eventData);
          } catch (error) {
            console.error('Failed to send execution event:', error);
          }
        }
      });
    }
  }

  startTask(sessionId: string, taskId: string, title: string, description?: string): void {
    const task = {
      id: taskId,
      sessionId,
      title,
      description,
      startTime: Date.now(),
      steps: [],
      status: 'executing'
    };

    this.activeTasks.set(taskId, task);
    
    this.emitEvent({
      type: 'task_started',
      sessionId,
      taskId,
      title,
      description,
      status: 'executing',
      timestamp: new Date().toISOString()
    });
  }

  addStep(sessionId: string, taskId: string, stepId: string, title: string, tool?: string): void {
    const task = this.activeTasks.get(taskId);
    if (task) {
      const step = {
        id: stepId,
        title,
        tool,
        startTime: Date.now(),
        status: 'executing'
      };
      
      task.steps.push(step);
      
      this.emitEvent({
        type: 'step_started',
        sessionId,
        taskId,
        stepId,
        title,
        tool,
        status: 'executing',
        timestamp: new Date().toISOString()
      });
    }
  }

  completeStep(
    sessionId: string, 
    taskId: string, 
    stepId: string, 
    status: 'completed' | 'failed',
    output?: string,
    error?: string
  ): void {
    const task = this.activeTasks.get(taskId);
    if (task) {
      const step = task.steps.find((s: any) => s.id === stepId);
      if (step) {
        step.status = status;
        step.endTime = Date.now();
        step.duration = step.endTime - step.startTime;
        step.output = output;
        step.error = error;

        this.emitEvent({
          type: 'step_completed',
          sessionId,
          taskId,
          stepId,
          title: step.title,
          tool: step.tool,
          status,
          output,
          error,
          duration: step.duration,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  executeCommand(
    sessionId: string,
    taskId: string,
    command: string,
    tool: string,
    output?: string,
    duration?: number,
    success: boolean = true
  ): void {
    this.emitEvent({
      type: 'tool_executed',
      sessionId,
      taskId,
      title: `Executed ${tool}`,
      tool,
      command,
      status: success ? 'completed' : 'failed',
      output,
      duration,
      timestamp: new Date().toISOString()
    });
  }

  completeTask(sessionId: string, taskId: string, status: 'completed' | 'failed'): void {
    const task = this.activeTasks.get(taskId);
    if (task) {
      task.status = status;
      task.endTime = Date.now();
      task.duration = task.endTime - task.startTime;

      this.emitEvent({
        type: 'task_completed',
        sessionId,
        taskId,
        title: task.title,
        status,
        duration: task.duration,
        timestamp: new Date().toISOString()
      });

      // Clean up completed task
      this.activeTasks.delete(taskId);
    }
  }

  getActiveTask(taskId: string): any {
    return this.activeTasks.get(taskId);
  }

  getAllActiveTasks(sessionId: string): any[] {
    return Array.from(this.activeTasks.values()).filter(task => task.sessionId === sessionId);
  }
}

export const executionMonitor = ExecutionMonitor.getInstance();