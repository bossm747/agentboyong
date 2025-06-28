# AI Runtime Sandbox API Specification

## Overview

The AI Runtime Sandbox provides a RESTful API and WebSocket interface for creating isolated development environments. This specification enables integration with any technology stack.

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication

Currently using session-based authentication. Future versions will support:
- API Keys
- OAuth 2.0
- JWT tokens

## Session Management

### Create Session
```http
POST /api/sessions
Content-Type: application/json

{
  "userId": null,           // Optional: User ID for authenticated sessions
  "status": "active"        // Optional: Session status
}
```

**Response:**
```json
{
  "id": "session_1234567890_abcdefg",
  "userId": null,
  "status": "active",
  "createdAt": "2025-06-28T10:00:00.000Z",
  "lastActivity": "2025-06-28T10:00:00.000Z"
}
```

### Get Session
```http
GET /api/sessions/{sessionId}
```

## File System Operations

### Get File Tree
```http
GET /api/files/{sessionId}/tree
```

**Response:**
```json
[
  {
    "id": "src",
    "name": "src",
    "path": "src",
    "type": "directory",
    "children": [
      {
        "id": "src/main.py",
        "name": "main.py",
        "path": "src/main.py",
        "type": "file",
        "size": 1024,
        "mimeType": "text/x-python"
      }
    ]
  }
]
```

### Read File Content
```http
GET /api/files/{sessionId}/content?path={filePath}
```

**Response:**
```json
{
  "content": "print('Hello World')"
}
```

### Write File Content
```http
POST /api/files/{sessionId}/content
Content-Type: application/json

{
  "path": "src/main.py",
  "content": "print('Hello World')"
}
```

### Delete File
```http
DELETE /api/files/{sessionId}/content?path={filePath}
```

### Upload File
```http
POST /api/files/{sessionId}/upload
Content-Type: multipart/form-data

file: [File]
path: "destination/path.ext"
```

## Command Execution

### Execute Command
```http
POST /api/execute/{sessionId}
Content-Type: application/json

{
  "command": "python",
  "args": ["main.py"]
}
```

**Response:**
```json
{
  "stdout": "Hello World\n",
  "stderr": "",
  "exitCode": 0
}
```

## Process Management

### Get Running Processes
```http
GET /api/processes/{sessionId}
```

**Response:**
```json
[
  {
    "id": 1,
    "sessionId": "session_123",
    "pid": 1234,
    "name": "python",
    "command": "python main.py",
    "status": "running",
    "cpuUsage": 5,
    "memoryUsage": 50,
    "startedAt": "2025-06-28T10:00:00.000Z"
  }
]
```

## Environment Variables

### Get Environment Variables
```http
GET /api/env/{sessionId}
```

### Create Environment Variable
```http
POST /api/env/{sessionId}
Content-Type: application/json

{
  "key": "API_KEY",
  "value": "secret_value"
}
```

## System Monitoring

### Get System Stats
```http
GET /api/system/stats
```

**Response:**
```json
{
  "cpu": 25,
  "memory": {
    "used": 1200,
    "total": 4096
  },
  "disk": {
    "used": 25600,
    "total": 102400
  },
  "processes": 15
}
```

## WebSocket Interface

### Connection
```javascript
const ws = new WebSocket('ws://localhost:3000/ws?sessionId=session_123');
```

### Terminal Operations

#### Create Terminal
```json
{
  "type": "terminal:create"
}
```

**Response:**
```json
{
  "type": "terminal:created",
  "terminalId": "terminal_1234567890"
}
```

#### Send Input
```json
{
  "type": "terminal:input",
  "terminalId": "terminal_1234567890",
  "data": "ls -la\n"
}
```

**Response:**
```json
{
  "type": "terminal:data",
  "terminalId": "terminal_1234567890",
  "data": "total 8\ndrwxr-xr-x 2 user user 4096 Jun 28 10:00 .\n"
}
```

#### Resize Terminal
```json
{
  "type": "terminal:resize",
  "terminalId": "terminal_1234567890",
  "cols": 80,
  "rows": 24
}
```

### System Monitoring
```json
{
  "type": "system:monitor"
}
```

**Response:**
```json
{
  "type": "system:stats",
  "data": {
    "cpu": 25,
    "memory": { "used": 1200, "total": 4096 },
    "disk": { "used": 25600, "total": 102400 },
    "processes": 15
  }
}
```

## Error Handling

All API endpoints return standard HTTP status codes:

- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

Error response format:
```json
{
  "error": "Error message description"
}
```

## Rate Limiting

- API calls: 1000 requests per minute per session
- WebSocket messages: 100 messages per second per connection
- File uploads: 10MB per file, 100MB per session per hour

## CORS Configuration

The API supports CORS for cross-origin requests:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```