# MCP Server Demonstration

## Quick Start

The AI Runtime Sandbox is now fully operational as a Model Context Protocol server. Here's how to use it:

### 1. Start the MCP Server

```bash
tsx server/mcp-server.ts
```

### 2. Available Tools

The server provides 10 powerful tools for AI agents:

| Tool | Description | Use Case |
|------|-------------|----------|
| `create_session` | Create isolated sandbox session | Initialize workspace |
| `write_file` | Create/update files | Code development |
| `read_file` | Read file contents | Code review |
| `list_files` | Browse file structure | Project exploration |
| `execute_command` | Run shell commands | System operations |
| `run_code` | Execute code in 8+ languages | Code testing |
| `install_package` | Install dependencies | Environment setup |
| `create_project` | Generate project templates | Rapid prototyping |
| `get_system_info` | Monitor resources | Performance tracking |
| `delete_file` | Remove files/directories | Cleanup operations |

### 3. Integration Examples

#### Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ai-runtime-sandbox": {
      "command": "tsx",
      "args": ["server/mcp-server.ts"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

#### AI Agent Workflow

```python
# Example AI workflow using the sandbox

# 1. Create isolated environment
session = await create_session()

# 2. Set up Python project
await create_project(session, "python-flask", "my-api")
await install_package(session, ["flask", "requests"], "pip")

# 3. Write application code
await write_file(session, "app.py", """
from flask import Flask, jsonify
app = Flask(__name__)

@app.route('/')
def hello():
    return jsonify({"message": "Hello from AI!"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
""")

# 4. Test the application
result = await run_code(session, "python app.py", "python")
print(f"Server started: {result}")

# 5. Monitor system resources
stats = await get_system_info(session)
print(f"System usage: {stats}")
```

## Key Features

### Universal Compatibility
- Works with any MCP-compatible AI client
- Cross-platform execution environment
- Standardized tool interface
- No vendor lock-in

### Comprehensive Language Support
- Python (pip package management)
- JavaScript/TypeScript (npm/yarn)
- Java (compilation and execution)
- C++ (gcc compilation)
- Go (go run)
- Rust (rustc compilation)
- Bash scripting

### Project Templates
- Flask web applications
- FastAPI microservices
- Express.js servers
- React frontends
- Vue.js applications
- Spring Boot APIs
- Gin web frameworks

### Security & Isolation
- Session-based workspace isolation
- Resource monitoring and limits
- Safe command execution
- File system sandboxing

## Mobile-First Web Interface

The system also provides a responsive web interface:

### Desktop Experience
- Full IDE with file explorer, code editor, terminal
- System monitoring dashboard
- Real-time collaboration features
- Advanced debugging tools

### Mobile Experience
- Collapsible file explorer (slide-out from left)
- Collapsible system monitor (slide-out from right)
- Touch-optimized code editor
- Swipe gestures for navigation
- Adaptive terminal interface

### Tablet Experience
- Split-screen coding and terminal
- Drag-and-drop file management
- Multi-tab interface
- Optimized for productivity

## Real-World Applications

### AI Development Workflows
1. **Code Generation & Testing**: AI writes code, tests it immediately
2. **Data Analysis**: Process datasets with pandas, matplotlib, scikit-learn
3. **Web Development**: Build full-stack applications with live preview
4. **Machine Learning**: Train models, evaluate performance, visualize results
5. **DevOps**: Deploy applications, manage infrastructure, monitor systems

### Educational Use Cases
1. **Interactive Learning**: Students learn by doing in safe environment
2. **Code Review**: Teachers can examine and run student code
3. **Collaborative Projects**: Multiple students work on shared codebase
4. **Programming Contests**: Isolated environments for fair competition

### Enterprise Applications
1. **Prototyping**: Rapid development of proof-of-concept applications
2. **Code Analysis**: Security teams analyze suspicious code safely
3. **Training**: Developer onboarding with hands-on exercises
4. **Integration Testing**: Test API integrations in controlled environment

## Performance Metrics

The sandbox provides comprehensive monitoring:

- **CPU Usage**: Real-time processor utilization
- **Memory Usage**: RAM consumption tracking
- **Disk Usage**: Storage space monitoring
- **Process Count**: Active process tracking
- **Network I/O**: Connection monitoring
- **Execution Time**: Code performance metrics

## Deployment Options

### Development
```bash
npm run dev  # Web interface
tsx server/mcp-server.ts  # MCP server
```

### Production
```bash
npm run build
npm start  # Web interface
node dist/mcp-server.js  # MCP server
```

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Cloud Deployment
- Supports AWS, Azure, GCP
- Kubernetes-ready
- Auto-scaling capabilities
- Load balancer compatible

## Success Metrics

The AI Runtime Sandbox delivers:

✅ **Cross-Platform Compatibility**: Works on all major operating systems  
✅ **Mobile-First Design**: Responsive interface for all devices  
✅ **MCP Standard Compliance**: Universal AI tool integration  
✅ **Multi-Language Support**: 8+ programming languages  
✅ **Isolated Execution**: Secure sandbox environments  
✅ **Real-Time Monitoring**: Live system metrics  
✅ **Project Templates**: Rapid development scaffolding  
✅ **Package Management**: Automated dependency installation  
✅ **File System Operations**: Complete CRUD capabilities  
✅ **Terminal Access**: Full command-line interface  

## Conclusion

The AI Runtime Sandbox represents a new paradigm in AI-assisted development. By combining a powerful web interface with standardized MCP tools, it enables AI agents to perform complex development tasks while providing developers with a familiar, productive environment.

Whether you're building AI applications, teaching programming, or developing enterprise solutions, the sandbox provides the tools and flexibility needed to succeed in today's fast-paced development landscape.