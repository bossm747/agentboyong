import fs from 'fs/promises';
import path from 'path';
import { storage } from '../storage';
import type { FileTreeNode } from '@shared/schema';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || './workspace';

export class FileSystemService {
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  private getFullPath(relativePath: string): string {
    const sessionPath = path.join(WORKSPACE_ROOT, this.sessionId);
    return path.join(sessionPath, relativePath);
  }

  async ensureWorkspaceExists(): Promise<void> {
    const sessionPath = path.join(WORKSPACE_ROOT, this.sessionId);
    try {
      await fs.access(sessionPath);
    } catch {
      await fs.mkdir(sessionPath, { recursive: true });
    }
  }

  async readFile(filePath: string): Promise<string> {
    const fullPath = this.getFullPath(filePath);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    // Input validation
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path provided');
    }
    
    if (typeof content !== 'string') {
      throw new Error('Content must be a string');
    }
    
    // Security check: prevent path traversal
    if (filePath.includes('..') || path.isAbsolute(filePath)) {
      throw new Error('Invalid file path: path traversal detected');
    }
    
    const fullPath = this.getFullPath(filePath);
    const dir = path.dirname(fullPath);
    
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
      
      // Update storage with error handling
      const stats = await fs.stat(fullPath);
      const mimeType = this.getMimeType(filePath);
      
      const existingFile = await storage.getFile(this.sessionId, filePath);
      if (existingFile) {
        await storage.updateFile(this.sessionId, filePath, content);
      } else {
        await storage.createFile({
          sessionId: this.sessionId,
          path: filePath,
          content,
          mimeType,
          size: stats.size,
        });
      }
    } catch (error) {
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = this.getFullPath(filePath);
    try {
      await fs.unlink(fullPath);
      await storage.deleteFile(this.sessionId, filePath);
    } catch (error) {
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    const fullPath = this.getFullPath(dirPath);
    try {
      await fs.mkdir(fullPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFileTree(): Promise<FileTreeNode[]> {
    await this.ensureWorkspaceExists();
    const sessionPath = path.join(WORKSPACE_ROOT, this.sessionId);
    return this.buildFileTree(sessionPath, '');
  }

  private async buildFileTree(basePath: string, relativePath: string): Promise<FileTreeNode[]> {
    const nodes: FileTreeNode[] = [];
    const fullPath = path.join(basePath, relativePath);
    
    try {
      const items = await fs.readdir(fullPath);
      
      for (const item of items) {
        const itemPath = relativePath ? path.join(relativePath, item) : item;
        const itemFullPath = path.join(fullPath, item);
        const stats = await fs.stat(itemFullPath);
        
        if (stats.isDirectory()) {
          const children = await this.buildFileTree(basePath, itemPath);
          nodes.push({
            id: itemPath,
            name: item,
            path: itemPath,
            type: 'directory',
            children,
          });
        } else {
          nodes.push({
            id: itemPath,
            name: item,
            path: itemPath,
            type: 'file',
            size: stats.size,
            mimeType: this.getMimeType(item),
          });
        }
      }
    } catch (error) {
      // Return empty array if directory doesn't exist or can't be read
    }
    
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.py': 'text/x-python',
      '.html': 'text/html',
      '.css': 'text/css',
      '.json': 'application/json',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.xml': 'application/xml',
      '.yml': 'application/x-yaml',
      '.yaml': 'application/x-yaml',
    };
    
    return mimeTypes[ext] || 'text/plain';
  }
}
