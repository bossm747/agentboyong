import { 
  users, sessions, files, processes, environmentVariables,
  type User, type InsertUser, type Session, type InsertSession,
  type File, type InsertFile, type Process, type InsertProcess,
  type EnvironmentVariable, type InsertEnvironmentVariable,
  type SystemStats, type FileTreeNode
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
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
}

export const storage = new DatabaseStorage();