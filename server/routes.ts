import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { FileSystemService } from "./services/fileSystem";
import { TerminalService } from "./services/terminal";
import { systemMonitor } from "./services/systemMonitor";
import { insertFileSchema, insertEnvironmentVariableSchema } from "@shared/schema";

const upload = multer({ dest: 'uploads/' });

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const sessionServices: Map<string, {
    fileSystem: FileSystemService;
    terminal: TerminalService;
  }> = new Map();

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
    });
  });

  return httpServer;
}
