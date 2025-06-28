# Cross-Platform Integration Guide

## Overview

The AI Runtime Sandbox is designed to be compatible with all technology stacks through its RESTful API and WebSocket interface. This guide provides integration examples for popular frameworks and languages.

## Platform Compatibility

### Supported Technologies
- **Frontend**: React, Vue, Angular, Svelte, vanilla JavaScript
- **Backend**: Node.js, Python, Java, C#, Go, PHP, Ruby
- **Mobile**: React Native, Flutter, iOS, Android
- **Desktop**: Electron, Tauri, .NET, Java Swing/JavaFX
- **Cloud**: AWS, Azure, GCP, Vercel, Netlify

## SDK Implementations

### JavaScript/TypeScript SDK

```typescript
class SandboxAPI {
  private baseUrl: string;
  private sessionId: string | null = null;
  private ws: WebSocket | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async createSession(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' })
    });
    const session = await response.json();
    this.sessionId = session.id;
    return session.id;
  }

  async readFile(path: string): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/api/files/${this.sessionId}/content?path=${encodeURIComponent(path)}`
    );
    const data = await response.json();
    return data.content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/files/${this.sessionId}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content })
    });
  }

  async executeCommand(command: string, args: string[] = []): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/execute/${this.sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, args })
    });
    return response.json();
  }

  connectTerminal(onData: (data: string) => void): void {
    const wsUrl = this.baseUrl.replace('http', 'ws') + `/ws?sessionId=${this.sessionId}`;
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      this.ws?.send(JSON.stringify({ type: 'terminal:create' }));
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'terminal:data') {
        onData(message.data);
      }
    };
  }

  sendTerminalInput(data: string): void {
    this.ws?.send(JSON.stringify({
      type: 'terminal:input',
      data
    }));
  }
}

// Usage
const sandbox = new SandboxAPI('http://localhost:3000');
await sandbox.createSession();
await sandbox.writeFile('hello.py', 'print("Hello World")');
const result = await sandbox.executeCommand('python', ['hello.py']);
console.log(result.stdout); // "Hello World"
```

### Python SDK

```python
import requests
import websocket
import json
import threading

class SandboxAPI:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session_id = None
        self.ws = None

    def create_session(self):
        response = requests.post(f"{self.base_url}/api/sessions", 
                               json={"status": "active"})
        session = response.json()
        self.session_id = session["id"]
        return session["id"]

    def read_file(self, path):
        response = requests.get(
            f"{self.base_url}/api/files/{self.session_id}/content",
            params={"path": path}
        )
        return response.json()["content"]

    def write_file(self, path, content):
        requests.post(
            f"{self.base_url}/api/files/{self.session_id}/content",
            json={"path": path, "content": content}
        )

    def execute_command(self, command, args=None):
        if args is None:
            args = []
        response = requests.post(
            f"{self.base_url}/api/execute/{self.session_id}",
            json={"command": command, "args": args}
        )
        return response.json()

    def connect_terminal(self, on_data):
        ws_url = self.base_url.replace("http", "ws") + f"/ws?sessionId={self.session_id}"
        
        def on_message(ws, message):
            data = json.loads(message)
            if data["type"] == "terminal:data":
                on_data(data["data"])
        
        def on_open(ws):
            ws.send(json.dumps({"type": "terminal:create"}))
        
        self.ws = websocket.WebSocketApp(ws_url,
                                       on_message=on_message,
                                       on_open=on_open)
        
        # Run in separate thread
        threading.Thread(target=self.ws.run_forever, daemon=True).start()

    def send_terminal_input(self, data):
        if self.ws:
            self.ws.send(json.dumps({
                "type": "terminal:input",
                "data": data
            }))

# Usage
sandbox = SandboxAPI("http://localhost:3000")
sandbox.create_session()
sandbox.write_file("hello.py", "print('Hello World')")
result = sandbox.execute_command("python", ["hello.py"])
print(result["stdout"])  # "Hello World"
```

### Go SDK

```go
package sandbox

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "net/url"
    "github.com/gorilla/websocket"
)

type SandboxAPI struct {
    BaseURL   string
    SessionID string
    ws        *websocket.Conn
}

type Session struct {
    ID     string `json:"id"`
    Status string `json:"status"`
}

type ExecuteResult struct {
    Stdout   string `json:"stdout"`
    Stderr   string `json:"stderr"`
    ExitCode int    `json:"exitCode"`
}

func NewSandboxAPI(baseURL string) *SandboxAPI {
    return &SandboxAPI{BaseURL: baseURL}
}

func (s *SandboxAPI) CreateSession() error {
    payload := map[string]string{"status": "active"}
    jsonData, _ := json.Marshal(payload)
    
    resp, err := http.Post(s.BaseURL+"/api/sessions", "application/json", 
                          bytes.NewBuffer(jsonData))
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    
    var session Session
    json.NewDecoder(resp.Body).Decode(&session)
    s.SessionID = session.ID
    return nil
}

func (s *SandboxAPI) WriteFile(path, content string) error {
    payload := map[string]string{"path": path, "content": content}
    jsonData, _ := json.Marshal(payload)
    
    _, err := http.Post(
        fmt.Sprintf("%s/api/files/%s/content", s.BaseURL, s.SessionID),
        "application/json", 
        bytes.NewBuffer(jsonData),
    )
    return err
}

func (s *SandboxAPI) ExecuteCommand(command string, args []string) (*ExecuteResult, error) {
    payload := map[string]interface{}{"command": command, "args": args}
    jsonData, _ := json.Marshal(payload)
    
    resp, err := http.Post(
        fmt.Sprintf("%s/api/execute/%s", s.BaseURL, s.SessionID),
        "application/json",
        bytes.NewBuffer(jsonData),
    )
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var result ExecuteResult
    json.NewDecoder(resp.Body).Decode(&result)
    return &result, nil
}

// Usage
func main() {
    sandbox := NewSandboxAPI("http://localhost:3000")
    sandbox.CreateSession()
    sandbox.WriteFile("hello.go", `package main; import "fmt"; func main() { fmt.Println("Hello World") }`)
    result, _ := sandbox.ExecuteCommand("go", []string{"run", "hello.go"})
    fmt.Println(result.Stdout) // "Hello World"
}
```

## Framework Integration Examples

### React Integration

```tsx
import { useState, useEffect } from 'react';
import { SandboxAPI } from './sandbox-sdk';

export function CodeEditor() {
  const [sandbox] = useState(() => new SandboxAPI('http://localhost:3000'));
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');

  useEffect(() => {
    sandbox.createSession();
  }, []);

  const runCode = async () => {
    await sandbox.writeFile('temp.py', code);
    const result = await sandbox.executeCommand('python', ['temp.py']);
    setOutput(result.stdout);
  };

  return (
    <div>
      <textarea value={code} onChange={(e) => setCode(e.target.value)} />
      <button onClick={runCode}>Run Code</button>
      <pre>{output}</pre>
    </div>
  );
}
```

### Vue Integration

```vue
<template>
  <div>
    <textarea v-model="code"></textarea>
    <button @click="runCode">Run Code</button>
    <pre>{{ output }}</pre>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { SandboxAPI } from './sandbox-sdk';

const sandbox = new SandboxAPI('http://localhost:3000');
const code = ref('');
const output = ref('');

onMounted(async () => {
  await sandbox.createSession();
});

const runCode = async () => {
  await sandbox.writeFile('temp.py', code.value);
  const result = await sandbox.executeCommand('python', ['temp.py']);
  output.value = result.stdout;
};
</script>
```

### Flask (Python) Integration

```python
from flask import Flask, render_template, request, jsonify
from sandbox_sdk import SandboxAPI

app = Flask(__name__)
sandbox = SandboxAPI("http://localhost:3000")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/execute', methods=['POST'])
def execute_code():
    data = request.json
    code = data['code']
    language = data['language']
    
    # Create session if not exists
    if not hasattr(sandbox, 'session_id') or not sandbox.session_id:
        sandbox.create_session()
    
    # Write and execute code
    filename = f"temp.{language}"
    sandbox.write_file(filename, code)
    
    if language == 'py':
        result = sandbox.execute_command('python', [filename])
    elif language == 'js':
        result = sandbox.execute_command('node', [filename])
    
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)
```

## Deployment Configurations

### Docker Integration

```dockerfile
# Multi-stage build for universal deployment
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Install system dependencies for cross-platform support
RUN apk add --no-cache \
    python3 \
    py3-pip \
    openjdk11 \
    gcc \
    g++ \
    make

EXPOSE 3000
CMD ["npm", "start"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-sandbox
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-sandbox
  template:
    metadata:
      labels:
        app: ai-sandbox
    spec:
      containers:
      - name: sandbox
        image: ai-sandbox:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          limits:
            cpu: "1"
            memory: "1Gi"
          requests:
            cpu: "500m"
            memory: "512Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: ai-sandbox-service
spec:
  selector:
    app: ai-sandbox
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Security Considerations

### API Authentication

```typescript
// Add authentication to your SDK
class SecureSandboxAPI extends SandboxAPI {
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    super(baseUrl);
    this.apiKey = apiKey;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };
  }

  async createSession(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/sessions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ status: 'active' })
    });
    const session = await response.json();
    this.sessionId = session.id;
    return session.id;
  }
}
```

### Rate Limiting Implementation

```typescript
class RateLimitedSandboxAPI extends SandboxAPI {
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;

  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;
    
    this.isProcessing = true;
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      await request();
      await new Promise(resolve => setTimeout(resolve, 100)); // Rate limit
    }
    this.isProcessing = false;
  }

  async executeCommand(command: string, args: string[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await super.executeCommand(command, args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }
}
```

## Performance Optimization

### Connection Pooling

```typescript
class PooledSandboxAPI {
  private pool: SandboxAPI[] = [];
  private maxPoolSize = 10;

  async getConnection(): Promise<SandboxAPI> {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    
    if (this.pool.length < this.maxPoolSize) {
      const api = new SandboxAPI('http://localhost:3000');
      await api.createSession();
      return api;
    }
    
    // Wait for available connection
    return new Promise(resolve => {
      const checkPool = () => {
        if (this.pool.length > 0) {
          resolve(this.pool.pop()!);
        } else {
          setTimeout(checkPool, 100);
        }
      };
      checkPool();
    });
  }

  releaseConnection(api: SandboxAPI): void {
    if (this.pool.length < this.maxPoolSize) {
      this.pool.push(api);
    }
  }
}
```

This comprehensive integration guide enables developers to integrate the AI Runtime Sandbox with any technology stack while maintaining security, performance, and reliability.