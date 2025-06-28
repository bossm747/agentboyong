# Model Context Protocol (MCP) Server Guide

## Overview

The AI Runtime Sandbox now functions as a Model Context Protocol (MCP) server, enabling AI models to interact with the sandbox environment through a standardized interface. This allows LLMs to execute code, manage files, and perform system operations in an isolated environment.

## What is MCP?

Model Context Protocol (MCP) is a standardized way for AI models to access external tools and resources. It defines how AI assistants can:

- Execute code in various programming languages
- Manage files and directories
- Install packages and dependencies
- Monitor system resources
- Create and manage projects

## Installation & Setup

### Prerequisites

```bash
npm install @modelcontextprotocol/sdk
```

### Configuration

Add the MCP server to your AI client's configuration:

```json
{
  "mcpServers": {
    "ai-runtime-sandbox": {
      "command": "npm",
      "args": ["run", "mcp-server"],
      "description": "AI Runtime Sandbox - A powerful execution environment for AI agents"
    }
  }
}
```

### Starting the MCP Server

```bash
# Start the MCP server
tsx server/mcp-server.ts

# Or using npm script (when available)
npm run mcp-server
```

## Available Tools

### Session Management

#### `create_session`
Create a new isolated sandbox session.

**Parameters:**
- `sessionId` (optional): Custom session identifier

**Example:**
```json
{
  "name": "create_session",
  "arguments": {
    "sessionId": "my-coding-session"
  }
}
```

### File Operations

#### `write_file`
Create or update a file in the sandbox.

**Parameters:**
- `sessionId`: Session identifier
- `path`: File path relative to workspace
- `content`: File content

**Example:**
```json
{
  "name": "write_file",
  "arguments": {
    "sessionId": "my-session",
    "path": "hello.py",
    "content": "print('Hello, World!')"
  }
}
```

#### `read_file`
Read file content from the sandbox.

**Parameters:**
- `sessionId`: Session identifier
- `path`: File path to read

#### `list_files`
List files and directories in the sandbox.

**Parameters:**
- `sessionId`: Session identifier
- `path` (optional): Directory path to list

#### `delete_file`
Delete a file or directory.

**Parameters:**
- `sessionId`: Session identifier
- `path`: File or directory path to delete

### Code Execution

#### `run_code`
Execute code in various programming languages.

**Supported Languages:**
- Python
- JavaScript
- TypeScript
- Bash
- Java
- C++
- Go
- Rust

**Parameters:**
- `sessionId`: Session identifier
- `code`: Code to execute
- `language`: Programming language
- `filename` (optional): Custom filename

**Example:**
```json
{
  "name": "run_code",
  "arguments": {
    "sessionId": "my-session",
    "code": "print('Hello from Python!')",
    "language": "python"
  }
}
```

#### `execute_command`
Execute shell commands in the sandbox.

**Parameters:**
- `sessionId`: Session identifier
- `command`: Command to execute
- `args`: Command arguments
- `workingDir` (optional): Working directory

**Example:**
```json
{
  "name": "execute_command",
  "arguments": {
    "sessionId": "my-session",
    "command": "ls",
    "args": ["-la"]
  }
}
```

### Package Management

#### `install_package`
Install packages using various package managers.

**Supported Managers:**
- pip (Python)
- npm (Node.js)
- yarn (Node.js)
- apt (System packages)
- brew (macOS packages)

**Parameters:**
- `sessionId`: Session identifier
- `packages`: Array of package names
- `manager`: Package manager to use

**Example:**
```json
{
  "name": "install_package",
  "arguments": {
    "sessionId": "my-session",
    "packages": ["requests", "numpy"],
    "manager": "pip"
  }
}
```

### Project Templates

#### `create_project`
Create a new project with boilerplate code.

**Supported Project Types:**
- `python-flask`: Flask web application
- `python-fastapi`: FastAPI web application
- `node-express`: Express.js web application
- `react`: React frontend application
- `vue`: Vue.js frontend application
- `java-spring`: Spring Boot application
- `go-gin`: Gin web framework

**Parameters:**
- `sessionId`: Session identifier
- `projectType`: Type of project template
- `projectName`: Name of the project

**Example:**
```json
{
  "name": "create_project",
  "arguments": {
    "sessionId": "my-session",
    "projectType": "python-flask",
    "projectName": "my-api"
  }
}
```

### System Monitoring

#### `get_system_info`
Get system information and resource usage.

**Parameters:**
- `sessionId`: Session identifier

**Returns:**
- CPU usage percentage
- Memory usage (used/total)
- Disk usage (used/total)
- Process count
- Active session processes

## Usage Examples

### AI Assistant Integration

Here's how an AI assistant might use the MCP server:

```python
# Example AI assistant workflow

# 1. Create a session
session_response = await call_tool("create_session", {})
session_id = extract_session_id(session_response)

# 2. Create a Python script
await call_tool("write_file", {
    "sessionId": session_id,
    "path": "data_analysis.py",
    "content": """
import pandas as pd
import matplotlib.pyplot as plt

# Load and analyze data
data = pd.read_csv('data.csv')
print(data.describe())

# Create visualization
plt.figure(figsize=(10, 6))
plt.plot(data['x'], data['y'])
plt.title('Data Analysis')
plt.savefig('analysis.png')
"""
})

# 3. Install required packages
await call_tool("install_package", {
    "sessionId": session_id,
    "packages": ["pandas", "matplotlib"],
    "manager": "pip"
})

# 4. Execute the script
result = await call_tool("run_code", {
    "sessionId": session_id,
    "code": open("data_analysis.py").read(),
    "language": "python"
})

# 5. Check system resources
system_info = await call_tool("get_system_info", {
    "sessionId": session_id
})
```

### Web Development Workflow

```python
# Create a full-stack web application

# 1. Create session
session_id = await create_session()

# 2. Create Flask backend
await call_tool("create_project", {
    "sessionId": session_id,
    "projectType": "python-flask",
    "projectName": "my-webapp"
})

# 3. Install additional dependencies
await call_tool("execute_command", {
    "sessionId": session_id,
    "command": "pip",
    "args": ["install", "flask-cors", "flask-sqlalchemy"],
    "workingDir": "my-webapp"
})

# 4. Add database models
await call_tool("write_file", {
    "sessionId": session_id,
    "path": "my-webapp/models.py",
    "content": """
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
"""
})

# 5. Start the application
await call_tool("execute_command", {
    "sessionId": session_id,
    "command": "python",
    "args": ["app.py"],
    "workingDir": "my-webapp"
})
```

## Integration with AI Clients

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ai-runtime-sandbox": {
      "command": "npm",
      "args": ["run", "mcp-server"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

### Cline VS Code Extension

Add to Cline MCP settings:

```json
{
  "ai-runtime-sandbox": {
    "command": "tsx",
    "args": ["server/mcp-server.ts"]
  }
}
```

### Custom AI Applications

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Connect to MCP server
const transport = new StdioClientTransport({
  command: "tsx",
  args: ["server/mcp-server.ts"]
});

const client = new Client({
  name: "my-ai-client",
  version: "1.0.0"
}, {
  capabilities: {}
});

await client.connect(transport);

// Use the sandbox
const result = await client.request({
  method: "tools/call",
  params: {
    name: "run_code",
    arguments: {
      sessionId: "my-session",
      code: "print('Hello from MCP!')",
      language: "python"
    }
  }
});
```

## Security Considerations

### Isolation
- Each session runs in an isolated workspace
- Files are sandboxed within session directories
- Processes are tracked and can be terminated

### Resource Limits
- Memory usage monitoring
- CPU usage tracking
- Disk space limitations
- Process count limits

### Access Control
- Session-based access control
- File path validation
- Command execution restrictions

## Error Handling

The MCP server provides detailed error messages for:

- Invalid session IDs
- File system errors
- Command execution failures
- Resource exhaustion
- Invalid parameters

## Best Practices

### Session Management
1. Create dedicated sessions for different tasks
2. Clean up sessions when done
3. Monitor resource usage
4. Handle session timeouts gracefully

### Code Execution
1. Validate code before execution
2. Use appropriate timeouts
3. Handle both stdout and stderr
4. Check exit codes

### File Operations
1. Use relative paths within workspace
2. Validate file names and paths
3. Handle file permissions
4. Implement proper error handling

### Package Management
1. Specify exact package versions when possible
2. Use virtual environments for Python
3. Clean up unused packages
4. Monitor installation logs

## Troubleshooting

### Common Issues

1. **Session Not Found**
   - Ensure session was created successfully
   - Check session ID spelling
   - Verify session hasn't expired

2. **File Operation Errors**
   - Verify file paths are relative to workspace
   - Check file permissions
   - Ensure parent directories exist

3. **Command Execution Failures**
   - Check command availability in environment
   - Verify working directory exists
   - Review command arguments

4. **Package Installation Issues**
   - Ensure package manager is available
   - Check network connectivity
   - Verify package names and versions

### Debugging

Enable debug logging:

```bash
DEBUG=mcp:* tsx server/mcp-server.ts
```

Monitor system resources:

```json
{
  "name": "get_system_info",
  "arguments": {
    "sessionId": "debug-session"
  }
}
```

## Future Enhancements

Planned features for the MCP server:

1. **Enhanced Security**
   - User authentication
   - Role-based access control
   - Audit logging

2. **Advanced Monitoring**
   - Real-time metrics
   - Performance profiling
   - Resource alerts

3. **Extended Language Support**
   - R programming
   - Julia
   - Scala
   - More system tools

4. **Cloud Integration**
   - Docker container support
   - Kubernetes deployment
   - Cloud storage integration

5. **Collaboration Features**
   - Shared sessions
   - Real-time collaboration
   - Session snapshots

This MCP server transforms the AI Runtime Sandbox into a powerful tool for AI agents, enabling them to perform complex development tasks in a controlled, secure environment.