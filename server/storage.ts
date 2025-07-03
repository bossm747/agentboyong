import { 
  users, sessions, files, processes, environmentVariables,
  conversations, memories, knowledge, tools, experiences, reasoningChains,
  type User, type InsertUser, type Session, type InsertSession,
  type File, type InsertFile, type Process, type InsertProcess,
  type EnvironmentVariable, type InsertEnvironmentVariable,
  type Conversation, type InsertConversation, type Memory, type InsertMemory, 
  type Knowledge, type InsertKnowledge, type Tool, type InsertTool, 
  type Experience, type InsertExperience, type ReasoningChain, type InsertReasoningChain,
  type SystemStats, type FileTreeNode
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { desc } from "drizzle-orm";
import { systemMonitor } from "./services/systemMonitor";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Session operations
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  updateSessionActivity(id: string): Promise<void>;
  endSession(id: string): Promise<void>;

  // File operations
  createFile(file: InsertFile): Promise<File>;
  getFile(sessionId: string, path: string): Promise<File | undefined>;
  updateFile(sessionId: string, path: string, content: string): Promise<File>;
  deleteFile(sessionId: string, path: string): Promise<void>;
  getFileTree(sessionId: string): Promise<FileTreeNode[]>;

  // Process operations
  createProcess(process: InsertProcess): Promise<Process>;
  getProcesses(sessionId: string): Promise<Process[]>;
  updateProcess(id: number, data: Partial<Process>): Promise<Process>;
  deleteProcess(id: number): Promise<void>;

  // Environment variable operations
  createEnvironmentVariable(envVar: InsertEnvironmentVariable): Promise<EnvironmentVariable>;
  getEnvironmentVariables(sessionId: string): Promise<EnvironmentVariable[]>;
  updateEnvironmentVariable(id: number, value: string): Promise<EnvironmentVariable>;
  deleteEnvironmentVariable(id: number): Promise<void>;

  // System monitoring
  getSystemStats(): Promise<SystemStats>;

  // Memory management
  getMemories(userId: string): Promise<Memory[]>;
  getConversations(userId: string, limit?: number): Promise<Conversation[]>;
  deleteMemory(userId: string, memoryId: number): Promise<void>;

  // Tool management
  createTool(tool: InsertTool): Promise<Tool>;
  getTools(userId: string): Promise<Tool[]>;
  updateTool(id: number, data: Partial<Tool>): Promise<Tool>;
  deleteTool(id: number): Promise<void>;

  // Experience management
  createExperience(experience: InsertExperience): Promise<Experience>;
  getExperiences(userId: string, problemType?: string): Promise<Experience[]>;

  // Knowledge management
  createKnowledge(knowledge: InsertKnowledge): Promise<Knowledge>;
  getKnowledge(userId: string, topic?: string): Promise<Knowledge[]>;

  // Reasoning chains
  createReasoningChain(chain: InsertReasoningChain): Promise<ReasoningChain>;
  getReasoningChains(userId: string, sessionId?: string): Promise<ReasoningChain[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionData = {
      id,
      ...insertSession,
      createdAt: new Date(),
      lastActivity: new Date(),
    };
    
    const [session] = await db
      .insert(sessions)
      .values(sessionData)
      .returning();
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async updateSessionActivity(id: string): Promise<void> {
    await db
      .update(sessions)
      .set({ lastActivity: new Date() })
      .where(eq(sessions.id, id));
  }

  async endSession(id: string): Promise<void> {
    await db
      .update(sessions)
      .set({ status: 'inactive', lastActivity: new Date() })
      .where(eq(sessions.id, id));
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const fileData = {
      ...insertFile,
      createdAt: new Date(),
    };
    
    const [file] = await db
      .insert(files)
      .values(fileData)
      .returning();
    return file;
  }

  async getFile(sessionId: string, path: string): Promise<File | undefined> {
    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.sessionId, sessionId), eq(files.path, path)));
    return file || undefined;
  }

  async updateFile(sessionId: string, path: string, content: string): Promise<File> {
    const existingFile = await this.getFile(sessionId, path);
    
    if (existingFile) {
      const [file] = await db
        .update(files)
        .set({ content })
        .where(and(eq(files.sessionId, sessionId), eq(files.path, path)))
        .returning();
      return file;
    } else {
      // Create new file if it doesn't exist
      return this.createFile({
        sessionId,
        path,
        content,
        mimeType: 'text/plain',
        size: content.length,
      });
    }
  }

  async deleteFile(sessionId: string, path: string): Promise<void> {
    await db
      .delete(files)
      .where(and(eq(files.sessionId, sessionId), eq(files.path, path)));
  }

  async getFileTree(sessionId: string): Promise<FileTreeNode[]> {
    const sessionFiles = await db
      .select()
      .from(files)
      .where(eq(files.sessionId, sessionId));

    const nodes: FileTreeNode[] = [];
    const nodeMap = new Map<string, FileTreeNode>();

    for (const file of sessionFiles) {
      const pathParts = file.path.split('/').filter(part => part);
      let currentPath = '';

      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!nodeMap.has(currentPath)) {
          const isFile = i === pathParts.length - 1;
          const node: FileTreeNode = {
            id: currentPath,
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'directory',
            children: isFile ? undefined : [],
            size: isFile ? file.size : undefined,
            mimeType: isFile ? file.mimeType : undefined,
          };

          nodeMap.set(currentPath, node);

          if (parentPath) {
            const parent = nodeMap.get(parentPath);
            if (parent && parent.children) {
              parent.children.push(node);
            }
          } else {
            nodes.push(node);
          }
        }
      }
    }

    return nodes;
  }

  async createProcess(insertProcess: InsertProcess): Promise<Process> {
    const processData = {
      ...insertProcess,
      createdAt: new Date(),
      startedAt: new Date(),
    };
    
    const [process] = await db
      .insert(processes)
      .values(processData)
      .returning();
    return process;
  }

  async getProcesses(sessionId: string): Promise<Process[]> {
    return await db
      .select()
      .from(processes)
      .where(eq(processes.sessionId, sessionId));
  }

  async updateProcess(id: number, data: Partial<Process>): Promise<Process> {
    const [process] = await db
      .update(processes)
      .set(data)
      .where(eq(processes.id, id))
      .returning();
    return process;
  }

  async deleteProcess(id: number): Promise<void> {
    await db
      .delete(processes)
      .where(eq(processes.id, id));
  }

  async createEnvironmentVariable(insertEnvVar: InsertEnvironmentVariable): Promise<EnvironmentVariable> {
    const envVarData = {
      ...insertEnvVar,
      createdAt: new Date(),
    };
    
    const [envVar] = await db
      .insert(environmentVariables)
      .values(envVarData)
      .returning();
    return envVar;
  }

  async getEnvironmentVariables(sessionId: string): Promise<EnvironmentVariable[]> {
    return await db
      .select()
      .from(environmentVariables)
      .where(eq(environmentVariables.sessionId, sessionId));
  }

  async updateEnvironmentVariable(id: number, value: string): Promise<EnvironmentVariable> {
    const [envVar] = await db
      .update(environmentVariables)
      .set({ value })
      .where(eq(environmentVariables.id, id))
      .returning();
    return envVar;
  }

  async deleteEnvironmentVariable(id: number): Promise<void> {
    await db
      .delete(environmentVariables)
      .where(eq(environmentVariables.id, id));
  }

  async getSystemStats(): Promise<SystemStats> {
    const stats = await systemMonitor.getSystemStats();
    return {
      cpu: stats.cpu,
      memory: stats.memory,
      disk: stats.disk,
      processes: stats.processes,
    };
  }

  // Memory management methods
  async getMemories(userId: string): Promise<Memory[]> {
    return await db.select()
      .from(memories)
      .where(eq(memories.userId, userId))
      .orderBy(desc(memories.lastAccessed));
  }

  async getConversations(userId: string, limit: number = 20): Promise<Conversation[]> {
    return await db.select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt))
      .limit(limit);
  }

  async deleteMemory(userId: string, memoryId: number): Promise<void> {
    await db.delete(memories)
      .where(and(
        eq(memories.userId, userId),
        eq(memories.id, memoryId)
      ));
  }

  // Tool management methods
  async createTool(insertTool: InsertTool): Promise<Tool> {
    const [tool] = await db
      .insert(tools)
      .values(insertTool)
      .returning();
    return tool;
  }

  async getTools(userId: string): Promise<Tool[]> {
    return await db
      .select()
      .from(tools)
      .where(eq(tools.userId, userId))
      .orderBy(desc(tools.effectiveness));
  }

  async updateTool(id: number, data: Partial<Tool>): Promise<Tool> {
    const [tool] = await db
      .update(tools)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tools.id, id))
      .returning();
    return tool;
  }

  async deleteTool(id: number): Promise<void> {
    await db
      .delete(tools)
      .where(eq(tools.id, id));
  }

  // Experience management methods
  async createExperience(insertExperience: InsertExperience): Promise<Experience> {
    const [experience] = await db
      .insert(experiences)
      .values(insertExperience)
      .returning();
    return experience;
  }

  async getExperiences(userId: string, problemType?: string): Promise<Experience[]> {
    if (problemType) {
      return await db
        .select()
        .from(experiences)
        .where(and(
          eq(experiences.userId, userId),
          eq(experiences.problemType, problemType)
        ))
        .orderBy(desc(experiences.createdAt));
    }

    return await db
      .select()
      .from(experiences)
      .where(eq(experiences.userId, userId))
      .orderBy(desc(experiences.createdAt));
  }

  // Knowledge management methods
  async createKnowledge(insertKnowledge: InsertKnowledge): Promise<Knowledge> {
    const [knowledgeItem] = await db
      .insert(knowledge)
      .values(insertKnowledge)
      .returning();
    return knowledgeItem;
  }

  async getKnowledge(userId: string, topic?: string): Promise<Knowledge[]> {
    if (topic) {
      return await db
        .select()
        .from(knowledge)
        .where(and(
          eq(knowledge.userId, userId),
          eq(knowledge.topic, topic)
        ))
        .orderBy(desc(knowledge.confidence));
    }

    return await db
      .select()
      .from(knowledge)
      .where(eq(knowledge.userId, userId))
      .orderBy(desc(knowledge.confidence));
  }

  // Reasoning chain methods
  async createReasoningChain(insertChain: InsertReasoningChain): Promise<ReasoningChain> {
    const [chain] = await db
      .insert(reasoningChains)
      .values(insertChain)
      .returning();
    return chain;
  }

  async getReasoningChains(userId: string, sessionId?: string): Promise<ReasoningChain[]> {
    if (sessionId) {
      return await db
        .select()
        .from(reasoningChains)
        .where(and(
          eq(reasoningChains.userId, userId),
          eq(reasoningChains.sessionId, sessionId)
        ))
        .orderBy(desc(reasoningChains.createdAt));
    }

    return await db
      .select()
      .from(reasoningChains)
      .where(eq(reasoningChains.userId, userId))
      .orderBy(desc(reasoningChains.createdAt));
  }
}

export const storage = new DatabaseStorage();