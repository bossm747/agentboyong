import { 
  users, sessions, files, processes, environmentVariables,
  type User, type InsertUser, type Session, type InsertSession,
  type File, type InsertFile, type Process, type InsertProcess,
  type EnvironmentVariable, type InsertEnvironmentVariable,
  type SystemStats, type FileTreeNode
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

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

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private sessions: Map<string, Session> = new Map();
  private files: Map<string, File> = new Map();
  private processes: Map<number, Process> = new Map();
  private environmentVariables: Map<number, EnvironmentVariable> = new Map();
  
  private currentUserId: number = 1;
  private currentFileId: number = 1;
  private currentProcessId: number = 1;
  private currentEnvVarId: number = 1;

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: Session = {
      id,
      userId: insertSession.userId ?? null,
      status: insertSession.status ?? 'active',
      createdAt: new Date(),
      lastActivity: new Date(),
    };
    this.sessions.set(id, session);
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async updateSessionActivity(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      session.lastActivity = new Date();
      this.sessions.set(id, session);
    }
  }

  async endSession(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      session.status = "ended";
      this.sessions.set(id, session);
    }
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = this.currentFileId++;
    const file: File = {
      id,
      ...insertFile,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const key = `${insertFile.sessionId}:${insertFile.path}`;
    this.files.set(key, file);
    return file;
  }

  async getFile(sessionId: string, path: string): Promise<File | undefined> {
    const key = `${sessionId}:${path}`;
    return this.files.get(key);
  }

  async updateFile(sessionId: string, path: string, content: string): Promise<File> {
    const key = `${sessionId}:${path}`;
    const existingFile = this.files.get(key);
    if (!existingFile) {
      throw new Error("File not found");
    }
    
    const updatedFile: File = {
      ...existingFile,
      content,
      size: content.length,
      updatedAt: new Date(),
    };
    this.files.set(key, updatedFile);
    return updatedFile;
  }

  async deleteFile(sessionId: string, path: string): Promise<void> {
    const key = `${sessionId}:${path}`;
    this.files.delete(key);
  }

  async getFileTree(sessionId: string): Promise<FileTreeNode[]> {
    const sessionFiles = Array.from(this.files.values())
      .filter(file => file.sessionId === sessionId);
    
    const tree: FileTreeNode[] = [];
    const pathMap: Map<string, FileTreeNode> = new Map();

    // Create directory structure
    sessionFiles.forEach(file => {
      const pathParts = file.path.split('/').filter(part => part.length > 0);
      let currentPath = '';
      
      pathParts.forEach((part, index) => {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!pathMap.has(currentPath)) {
          const isFile = index === pathParts.length - 1;
          const node: FileTreeNode = {
            id: currentPath,
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'directory',
            ...(isFile && { size: file.size, mimeType: file.mimeType }),
            children: isFile ? undefined : [],
          };
          
          pathMap.set(currentPath, node);
          
          if (parentPath) {
            const parent = pathMap.get(parentPath);
            if (parent && parent.children) {
              parent.children.push(node);
            }
          } else {
            tree.push(node);
          }
        }
      });
    });

    return tree;
  }

  async createProcess(insertProcess: InsertProcess): Promise<Process> {
    const id = this.currentProcessId++;
    const process: Process = {
      id,
      sessionId: insertProcess.sessionId,
      pid: insertProcess.pid,
      name: insertProcess.name,
      command: insertProcess.command,
      status: insertProcess.status,
      cpuUsage: insertProcess.cpuUsage || 0,
      memoryUsage: insertProcess.memoryUsage || 0,
      startedAt: new Date(),
    };
    this.processes.set(id, process);
    return process;
  }

  async getProcesses(sessionId: string): Promise<Process[]> {
    return Array.from(this.processes.values())
      .filter(process => process.sessionId === sessionId);
  }

  async updateProcess(id: number, data: Partial<Process>): Promise<Process> {
    const process = this.processes.get(id);
    if (!process) {
      throw new Error("Process not found");
    }
    
    const updatedProcess = { ...process, ...data };
    this.processes.set(id, updatedProcess);
    return updatedProcess;
  }

  async deleteProcess(id: number): Promise<void> {
    this.processes.delete(id);
  }

  async createEnvironmentVariable(insertEnvVar: InsertEnvironmentVariable): Promise<EnvironmentVariable> {
    const id = this.currentEnvVarId++;
    const envVar: EnvironmentVariable = {
      id,
      ...insertEnvVar,
      createdAt: new Date(),
    };
    this.environmentVariables.set(id, envVar);
    return envVar;
  }

  async getEnvironmentVariables(sessionId: string): Promise<EnvironmentVariable[]> {
    return Array.from(this.environmentVariables.values())
      .filter(envVar => envVar.sessionId === sessionId);
  }

  async updateEnvironmentVariable(id: number, value: string): Promise<EnvironmentVariable> {
    const envVar = this.environmentVariables.get(id);
    if (!envVar) {
      throw new Error("Environment variable not found");
    }
    
    const updatedEnvVar = { ...envVar, value };
    this.environmentVariables.set(id, updatedEnvVar);
    return updatedEnvVar;
  }

  async deleteEnvironmentVariable(id: number): Promise<void> {
    this.environmentVariables.delete(id);
  }

  async getSystemStats(): Promise<SystemStats> {
    // Simulate system stats
    return {
      cpu: Math.floor(Math.random() * 60) + 10,
      memory: { used: 1200, total: 4096 },
      disk: { used: 25600, total: 102400 },
      processes: this.processes.size,
    };
  }
}



// DatabaseStorage implementation
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
    const [session] = await db
      .insert(sessions)
      .values(insertSession)
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
      .set({ updatedAt: new Date() })
      .where(eq(sessions.id, id));
  }

  async endSession(id: string): Promise<void> {
    await db
      .update(sessions)
      .set({ status: 'inactive', updatedAt: new Date() })
      .where(eq(sessions.id, id));
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const [file] = await db
      .insert(files)
      .values(insertFile)
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
    const [file] = await db
      .update(files)
      .set({ content, updatedAt: new Date() })
      .where(and(eq(files.sessionId, sessionId), eq(files.path, path)))
      .returning();
    
    if (!file) {
      // Create new file if it doesn't exist
      return this.createFile({
        sessionId,
        path,
        content,
        mimeType: 'text/plain',
        size: content.length,
      });
    }
    
    return file;
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
    const [process] = await db
      .insert(processes)
      .values(insertProcess)
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
      .set({ ...data, updatedAt: new Date() })
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
    const [envVar] = await db
      .insert(environmentVariables)
      .values(insertEnvVar)
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
      .set({ value, updatedAt: new Date() })
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
    // This would typically query system metrics from the database
    // For now, return basic stats
    return {
      cpu: 0,
      memory: { used: 0, total: 0 },
      disk: { used: 0, total: 0 },
      processes: 0,
    };
  }
}

export const storage = new DatabaseStorage();
