import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Special route that bypasses JSON parsing - Agent Zero sends "null" as body
app.post('/settings_get', (req: Request, res: Response) => {
  // Agent Zero sends "null" as body - we provide proper settings structure
  res.json({
    settings: {
      sections: [
        {
          id: 'chat_model',
          tab: 'agent',
          title: 'Chat Model',
          description: 'Selection and settings for main chat model used by Pareng Boyong',
          fields: [
            {
              id: 'chat_model_provider',
              title: 'Chat model provider',
              description: 'Select provider for main chat model used by Pareng Boyong',
              type: 'select',
              value: 'runtime_sandbox',
              options: [
                { value: 'runtime_sandbox', label: 'Runtime Sandbox' },
                { value: 'openai', label: 'OpenAI' }
              ]
            },
            {
              id: 'chat_model_name', 
              title: 'Chat model name',
              description: 'Exact name of model from selected provider',
              type: 'text',
              value: 'pareng-boyong-runtime'
            },
            {
              id: 'chat_model_ctx_length',
              title: 'Chat model context length',
              description: 'Maximum number of tokens in the context window for LLM',
              type: 'number',
              value: 32768
            },
            {
              id: 'chat_model_vision',
              title: 'Supports Vision',
              description: 'Models capable of Vision can natively see image attachments',
              type: 'switch',
              value: true
            }
          ]
        },
        {
          id: 'agent_prompts',
          tab: 'agent', 
          title: 'Agent Configuration',
          description: 'Settings for Pareng Boyong agent behavior',
          fields: [
            {
              id: 'agent_prompts_subdir',
              title: 'Agent prompts subdirectory',
              description: 'Subdirectory for agent prompts in the prompts folder',
              type: 'select',
              value: 'default',
              options: [
                { value: 'default', label: 'Default' },
                { value: 'developer', label: 'Developer' },
                { value: 'researcher', label: 'Researcher' },
                { value: 'hacker', label: 'Hacker' }
              ]
            },
            {
              id: 'agent_memory_subdir',
              title: 'Agent memory subdirectory', 
              description: 'Subdirectory for agent memory storage',
              type: 'text',
              value: 'default'
            },
            {
              id: 'agent_knowledge_subdir',
              title: 'Agent knowledge subdirectory',
              description: 'Subdirectory for agent knowledge base',
              type: 'text', 
              value: 'default'
            }
          ]
        },
        {
          id: 'api_keys',
          tab: 'external',
          title: 'API Keys',
          description: 'API keys for external services',
          fields: [
            {
              id: 'openai_api_key',
              title: 'OpenAI API Key',
              description: 'API key for OpenAI services',
              type: 'password',
              value: ''
            },
            {
              id: 'anthropic_api_key',
              title: 'Anthropic API Key', 
              description: 'API key for Anthropic Claude',
              type: 'password',
              value: ''
            }
          ]
        }
      ]
    }
  });
});

// Settings save endpoint
app.post('/settings_post', (req: Request, res: Response) => {
  try {
    const settingsData = req.body;
    console.log('Pareng Boyong Settings Update:', Object.keys(settingsData).length, 'fields');
    
    // TODO: Integrate with Agent Zero's actual settings persistence
    // For now, we acknowledge the save and return success
    
    res.json({
      success: true,
      message: 'Pareng Boyong settings saved successfully',
      timestamp: new Date().toISOString(),
      fields_saved: Object.keys(settingsData).length
    });
  } catch (error) {
    console.error('Settings save error:', error);
    res.status(500).json({ 
      error: 'Failed to save settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
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
