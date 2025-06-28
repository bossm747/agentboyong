import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { storage } from "./storage";
import { FileSystemService } from "./services/fileSystem";
import { TerminalService } from "./services/terminal";
import { systemMonitor } from "./services/systemMonitor";
import { insertFileSchema, insertEnvironmentVariableSchema } from "@shared/schema";

const upload = multer({ dest: 'uploads/' });

// Helper function to sync project files to database
async function syncProjectToDatabase(sessionId: string, projectPath: string): Promise<void> {
  const fullPath = path.join('./workspace', projectPath);
  
  async function processDirectory(dirPath: string, relativePath: string = ''): Promise<void> {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        if (item.name.startsWith('.git')) continue; // Skip git files
        
        const itemPath = path.join(dirPath, item.name);
        const relativeItemPath = relativePath ? `${relativePath}/${item.name}` : item.name;
        
        if (item.isDirectory()) {
          await processDirectory(itemPath, relativeItemPath);
        } else if (item.isFile()) {
          try {
            const content = await fs.readFile(itemPath, 'utf-8');
            const stats = await fs.stat(itemPath);
            
            // Get MIME type based on file extension
            const ext = path.extname(item.name).toLowerCase();
            const mimeType = getMimeTypeFromExtension(ext);
            
            await storage.createFile({
              sessionId,
              path: `${projectPath}/${relativeItemPath}`,
              content,
              mimeType,
              size: stats.size,
            });
          } catch (err) {
            // Skip binary files or files that can't be read as text
            console.warn(`Skipping file ${itemPath}:`, err);
          }
        }
      }
    } catch (err) {
      console.error(`Error processing directory ${dirPath}:`, err);
    }
  }
  
  await processDirectory(fullPath, '');
}

function getMimeTypeFromExtension(ext: string): string {
  const mimeTypes: { [key: string]: string } = {
    '.py': 'text/x-python',
    '.js': 'text/javascript',
    '.ts': 'text/typescript',
    '.json': 'application/json',
    '.md': 'text/markdown',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.yml': 'text/yaml',
    '.yaml': 'text/yaml',
    '.toml': 'text/toml',
    '.sh': 'text/x-shellscript',
    '.dockerfile': 'text/x-dockerfile',
  };
  
  return mimeTypes[ext] || 'text/plain';
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const sessionServices: Map<string, {
    fileSystem: FileSystemService;
    terminal: TerminalService;
  }> = new Map();

  // Health check endpoint for production monitoring
  app.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      services: {
        sessions: sessionServices.size,
        websocket: wss.clients.size
      }
    });
  });

  // Session management
  app.post("/api/sessions", async (req, res) => {
    try {
      const session = await storage.createSession({
        userId: null,
        status: "active",
      });

      // Initialize services for this session
      const fileSystem = new FileSystemService(session.id);
      const terminal = new TerminalService(session.id);
      
      await fileSystem.ensureWorkspaceExists();
      
      sessionServices.set(session.id, { fileSystem, terminal });

      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to get session" });
    }
  });

  // File system operations
  app.get("/api/files/:sessionId/tree", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const services = sessionServices.get(sessionId);
      
      if (!services) {
        return res.status(404).json({ error: "Session not found" });
      }

      const fileTree = await services.fileSystem.getFileTree();
      res.json(fileTree);
    } catch (error) {
      res.status(500).json({ error: "Failed to get file tree" });
    }
  });

  app.get("/api/files/:sessionId/content", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { path: filePath } = req.query;
      
      if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({ error: "File path is required" });
      }

      const services = sessionServices.get(sessionId);
      if (!services) {
        return res.status(404).json({ error: "Session not found" });
      }

      const content = await services.fileSystem.readFile(filePath);
      res.json({ content });
    } catch (error) {
      res.status(500).json({ error: "Failed to read file" });
    }
  });

  app.post("/api/files/:sessionId/content", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { path: filePath, content } = req.body;
      
      if (!filePath || content === undefined) {
        return res.status(400).json({ error: "File path and content are required" });
      }

      const services = sessionServices.get(sessionId);
      if (!services) {
        return res.status(404).json({ error: "Session not found" });
      }

      await services.fileSystem.writeFile(filePath, content);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to write file" });
    }
  });

  app.delete("/api/files/:sessionId/content", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { path: filePath } = req.query;
      
      if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({ error: "File path is required" });
      }

      const services = sessionServices.get(sessionId);
      if (!services) {
        return res.status(404).json({ error: "Session not found" });
      }

      await services.fileSystem.deleteFile(filePath);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  app.post("/api/files/:sessionId/upload", upload.single('file'), async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { path: targetPath } = req.body;
      
      if (!req.file || !targetPath) {
        return res.status(400).json({ error: "File and target path are required" });
      }

      const services = sessionServices.get(sessionId);
      if (!services) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Read uploaded file and write to target location
      const fs = await import('fs/promises');
      const content = await fs.readFile(req.file.path, 'utf-8');
      await services.fileSystem.writeFile(targetPath, content);
      
      // Clean up uploaded file
      await fs.unlink(req.file.path);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Command execution
  app.post("/api/execute/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { command, args = [] } = req.body;
      
      if (!command) {
        return res.status(400).json({ error: "Command is required" });
      }

      const services = sessionServices.get(sessionId);
      if (!services) {
        return res.status(404).json({ error: "Session not found" });
      }

      const result = await services.terminal.executeCommand(command, args);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to execute command" });
    }
  });

  // Process management
  app.get("/api/processes/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const processes = await storage.getProcesses(sessionId);
      res.json(processes);
    } catch (error) {
      res.status(500).json({ error: "Failed to get processes" });
    }
  });

  // Clone GitHub repository
  app.post("/api/clone/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { repoUrl, projectName } = req.body;
      
      if (!repoUrl) {
        return res.status(400).json({ error: "Repository URL is required" });
      }

      const services = sessionServices.get(sessionId);
      if (!services) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Execute git clone
      const cloneResult = await services.terminal.executeCommand('git', ['clone', repoUrl, projectName || '']);
      
      if (cloneResult.exitCode !== 0) {
        return res.status(500).json({ error: `Git clone failed: ${cloneResult.stderr}` });
      }

      // Sync files to database
      await syncProjectToDatabase(sessionId, projectName || repoUrl.split('/').pop()?.replace('.git', '') || 'project');
      
      res.json({ 
        success: true, 
        message: `Successfully cloned ${repoUrl}`,
        output: cloneResult.stdout 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to clone repository" });
    }
  });

  // Environment variables
  app.get("/api/env/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const envVars = await storage.getEnvironmentVariables(sessionId);
      res.json(envVars);
    } catch (error) {
      res.status(500).json({ error: "Failed to get environment variables" });
    }
  });

  app.post("/api/env/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const envVar = insertEnvironmentVariableSchema.parse({
        sessionId,
        ...req.body,
      });
      
      const result = await storage.createEnvironmentVariable(envVar);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to create environment variable" });
    }
  });

  // System monitoring
  app.get("/api/system/stats", async (req, res) => {
    try {
      const stats = await systemMonitor.getSystemStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get system stats" });
    }
  });

  // WebSocket handling
  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      ws.close(1008, 'Session ID required');
      return;
    }

    const services = sessionServices.get(sessionId);
    if (!services) {
      ws.close(1008, 'Session not found');
      return;
    }

    let terminalId: string | null = null;

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'terminal:create':
            terminalId = `terminal_${Date.now()}`;
            const terminal = services.terminal.createTerminal(terminalId);
            
            ws.send(JSON.stringify({
              type: 'terminal:created',
              terminalId,
            }));

            // Send welcome message
            ws.send(JSON.stringify({
              type: 'terminal:data',
              terminalId,
              data: `Welcome to AI Runtime Sandbox Terminal\nSession: ${sessionId}\nType 'help' for available commands\n\n$ `,
            }));
            break;

          case 'terminal:input':
            if (terminalId && message.data) {
              services.terminal.writeToTerminal(terminalId, message.data)
                .then(output => {
                  if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                      type: 'terminal:data',
                      terminalId,
                      data: output + '$ ',
                    }));
                  }
                })
                .catch(error => {
                  if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                      type: 'terminal:data',
                      terminalId,
                      data: `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n$ `,
                    }));
                  }
                });
            }
            break;

          case 'terminal:resize':
            if (terminalId && message.cols && message.rows) {
              services.terminal.resizeTerminal(terminalId, message.cols, message.rows);
            }
            break;

          case 'terminal:clear':
            if (terminalId) {
              ws.send(JSON.stringify({
                type: 'terminal:cleared',
                terminalId,
              }));
            }
            break;

          case 'system:monitor':
            const sendStats = (stats: any) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'system:stats',
                  data: stats,
                }));
              }
            };
            
            systemMonitor.startMonitoring(sendStats);
            
            // Send initial stats
            systemMonitor.getSystemStats().then(sendStats);
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (terminalId) {
        services.terminal.killTerminal(terminalId);
      }
      
      // Stop monitoring for this connection
      systemMonitor.stopMonitoring();
      console.log(`WebSocket connection closed for session ${sessionId}`);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for session ${sessionId}:`, error);
      if (terminalId) {
        services.terminal.killTerminal(terminalId);
      }
    });

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connection:established',
      sessionId,
      timestamp: Date.now(),
    }));
  });

  // Serve Pareng Boyong WebUI static files
  app.use('/pareng-boyong', express.static(path.join(process.cwd(), 'workspace/agent-zero/webui')));
  
  // Route for Pareng Boyong main interface - specific route must come before static middleware
  app.get('/pareng-boyong/', (req: Request, res: Response) => {
    res.sendFile(path.resolve(process.cwd(), 'workspace/agent-zero/webui/index.html'));
  });

  return httpServer;
}
