import { v4 as uuidv4 } from 'uuid';

export interface AgentMessage {
  id: string;
  type: 'user' | 'agent' | 'system' | 'tool' | 'error';
  content: string;
  timestamp: Date;
  attachments?: string[];
  kvps?: Record<string, any>;
}

export interface AgentLog {
  id: string;
  type: string;
  heading: string;
  content: string;
  timestamp: Date;
  kvps?: Record<string, any>;
}

export interface AgentContext {
  id: string;
  name: string;
  created_at: Date;
  last_message: Date;
  paused: boolean;
  type: 'user' | 'task' | 'mcp';
  messages: AgentMessage[];
  logs: AgentLog[];
  config: AgentConfig;
  streaming: boolean;
  current_agent?: Agent;
}

export interface AgentConfig {
  agent_name: string;
  system_prompt: string;
  prompts_subdir: string;
  memory_subdir: string;
  knowledge_subdir: string;
  max_iterations: number;
  runtime_sandbox: boolean;
}

export interface Agent {
  id: number;
  name: string;
  config: AgentConfig;
  context: AgentContext;
  tools: string[];
  memory: any[];
}

export class AgentContextManager {
  private static contexts: Map<string, AgentContext> = new Map();
  private static counter = 0;

  static createContext(
    name?: string, 
    type: 'user' | 'task' | 'mcp' = 'user',
    config?: Partial<AgentConfig>
  ): AgentContext {
    const id = uuidv4();
    const now = new Date();
    
    const defaultConfig: AgentConfig = {
      agent_name: 'Pareng Boyong',
      system_prompt: 'You are Pareng Boyong, a Filipino AI AGI Super Agent with unlimited capabilities in a secure runtime sandbox environment.',
      prompts_subdir: 'default',
      memory_subdir: 'default', 
      knowledge_subdir: 'default',
      max_iterations: 50,
      runtime_sandbox: true,
      ...config
    };

    const context: AgentContext = {
      id,
      name: name || `Chat ${++this.counter}`,
      created_at: now,
      last_message: now,
      paused: false,
      type,
      messages: [],
      logs: [],
      config: defaultConfig,
      streaming: false
    };

    this.contexts.set(id, context);
    return context;
  }

  static getContext(id: string): AgentContext | undefined {
    return this.contexts.get(id);
  }

  static getAllContexts(): AgentContext[] {
    return Array.from(this.contexts.values())
      .sort((a, b) => b.last_message.getTime() - a.last_message.getTime());
  }

  static removeContext(id: string): boolean {
    return this.contexts.delete(id);
  }

  static addMessage(contextId: string, message: Omit<AgentMessage, 'id' | 'timestamp'>): AgentMessage | null {
    const context = this.contexts.get(contextId);
    if (!context) return null;

    const fullMessage: AgentMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date()
    };

    context.messages.push(fullMessage);
    context.last_message = fullMessage.timestamp;
    
    return fullMessage;
  }

  static addLog(contextId: string, log: Omit<AgentLog, 'id' | 'timestamp'>): AgentLog | null {
    const context = this.contexts.get(contextId);
    if (!context) return null;

    const fullLog: AgentLog = {
      ...log,
      id: uuidv4(),
      timestamp: new Date()
    };

    context.logs.push(fullLog);
    return fullLog;
  }

  static updateContext(id: string, updates: Partial<AgentContext>): AgentContext | null {
    const context = this.contexts.get(id);
    if (!context) return null;

    Object.assign(context, updates);
    return context;
  }

  static serializeContext(context: AgentContext): any {
    return {
      id: context.id,
      name: context.name,
      created_at: context.created_at.toISOString(),
      last_message: context.last_message.toISOString(),
      paused: context.paused,
      type: context.type,
      message_count: context.messages.length,
      streaming: context.streaming
    };
  }

  static serializePollResponse(contextId: string, logFrom: number = 0): any {
    const context = this.contexts.get(contextId);
    if (!context) return null;

    return {
      context: contextId,
      contexts: this.getAllContexts().map(ctx => this.serializeContext(ctx)),
      tasks: [], // Tasks will be handled separately
      logs: context.logs.slice(logFrom).map(log => ({
        id: log.id,
        type: log.type,
        heading: log.heading,
        content: log.content,
        timestamp: log.timestamp.toISOString(),
        kvps: log.kvps || {}
      })),
      log_guid: contextId,
      log_version: context.logs.length,
      log_progress: 100,
      log_progress_active: context.streaming,
      paused: context.paused
    };
  }
}