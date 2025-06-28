import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Special handler for Agent Zero settings endpoint that sends "null" as body
app.post('/settings_get', (req: Request, res: Response) => {
  // Agent Zero sends "null" as string body, we handle it gracefully
  res.json({
    settings: {
      sections: [
        {
          id: 'agent',
          tab: 'agent',
          title: 'Agent Configuration',
          description: 'Configure your AI agent settings for runtime sandbox',
          fields: [
            {
              type: 'text',
              name: 'agent_name',
              title: 'Agent Name',
              value: 'Agent Zero (Runtime Sandbox)',
              description: 'The name of your AI agent'
            },
            {
              type: 'textarea',
              name: 'system_message',
              title: 'System Message',
              value: 'You are Agent Zero, a general-purpose AI assistant running in a secure runtime sandbox. You can execute code, manage files, and help with various tasks.',
              description: 'System message for the agent'
            },
            {
              type: 'checkbox',
              name: 'runtime_sandbox_enabled',
              title: 'Runtime Sandbox',
              value: true,
              description: 'Use runtime sandbox instead of Docker Desktop'
            }
          ]
        },
        {
          id: 'models',
          tab: 'models', 
          title: 'Model Configuration',
          description: 'AI model settings for runtime sandbox',
          fields: [
            {
              type: 'select',
              name: 'chat_model',
              title: 'Chat Model',
              value: 'runtime-sandbox',
              options: [
                { value: 'runtime-sandbox', title: 'Runtime Sandbox Model' }
              ],
              description: 'Model used for chat completions'
            },
            {
              type: 'text',
              name: 'api_key',
              title: 'API Key',
              value: 'runtime-sandbox-key',
              description: 'API key for the model (handled by runtime sandbox)'
            }
          ]
        }
      ]
    }
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Enhanced production error handling
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
      ? (status < 500 ? err.message : "Internal Server Error")
      : err.message || "Internal Server Error";

    log(`Error ${req.method} ${req.path}: ${err.message}`);
    
    res.status(status).json({ 
      error: message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
