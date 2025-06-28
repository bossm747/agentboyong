# Replit.md

## Overview

This is a comprehensive AI Runtime Sandbox that now hosts Agent Zero as the primary AGI interface. The system provides a secure, isolated execution environment where Agent Zero runs with full capabilities as a true super agent. Agent Zero has complete freedom within the runtime sandbox while maintaining host system security. The architecture combines our runtime sandbox infrastructure with Agent Zero's powerful AGI capabilities, creating an unlimited potential AI assistant.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Radix UI components with Tailwind CSS for styling
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: Native WebSocket API for live updates

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Real-time**: WebSocket server for live collaboration
- **File Upload**: Multer for handling file uploads
- **Process Management**: Node.js child_process and node-pty for terminal emulation

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Connection**: Neon Database serverless driver
- **Session Storage**: In-memory storage with fallback to database persistence
- **File System**: Local file system with workspace isolation per session

## Key Components

### Agent Zero AGI Interface
- **Primary User Interface**: Agent Zero runs as the main AGI super agent interface
- **Complete Freedom**: Full execution capabilities within secure runtime sandbox
- **Docker Replacement**: Eliminated Docker Desktop dependency, using runtime sandbox instead
- **Unlimited Potential**: No artificial restrictions on Agent Zero's capabilities
- **Persistent Memory**: Database-backed long-term memory across sessions

### Model Context Protocol (MCP) Server
- **Standardized AI Integration**: Implements MCP specification for tool-based AI interactions
- **10 Core Tools**: Session management, file operations, code execution, package installation, project templates
- **Language Support**: Python, JavaScript, TypeScript, Java, C++, Go, Rust, Bash
- **Agent Zero Integration**: Provides backend services for Agent Zero's operations

### Session Management
Each session is isolated with its own workspace directory and associated services. Sessions support both web UI and MCP tool access with consistent state management.

### File System Service
- Workspace isolation per session under `./workspace/{sessionId}`
- File CRUD operations with MIME type detection
- Directory tree structure management
- MCP tool integration for programmatic access

### Terminal Service
- Cross-platform command execution without native dependencies
- Support for multiple programming language runtimes
- Real-time execution through WebSockets and MCP tools
- Process tracking and management

### Mobile-Responsive Web Interface
- **Collapsible Containers**: File explorer and system monitor slide-out panels
- **Touch-Optimized**: Mobile-first design with gesture support
- **Adaptive Layout**: Responsive breakpoints for mobile, tablet, and desktop
- **Progressive Web App**: Installable with offline capabilities

### Code Editor
- Monaco Editor integration with syntax highlighting
- Multi-language support with automatic language detection
- Real-time file saving with optimistic updates
- Mobile-optimized interface

### System Monitoring
- Real-time CPU, memory, and disk usage tracking
- Process monitoring and management
- Environment variable management
- WebSocket and MCP tool access

## Data Flow

1. **Session Creation**: User connects → Creates session → Initializes workspace and services
2. **File Operations**: File actions → FileSystemService → Local filesystem → Database sync
3. **Code Editing**: Editor changes → Debounced save → API call → File update
4. **Terminal Operations**: User input → WebSocket → TerminalService → PTY → Output back through WebSocket
5. **System Updates**: Periodic monitoring → SystemMonitorService → WebSocket broadcast → UI updates

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless connection
- **drizzle-orm**: Type-safe database ORM
- **node-pty**: Terminal emulation
- **ws**: WebSocket server implementation
- **multer**: File upload handling

### UI Dependencies
- **@radix-ui/***: Accessible UI component primitives
- **@tanstack/react-query**: Server state management
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **wouter**: Lightweight React router

## Deployment Strategy

### Development
- Vite dev server with HMR for frontend
- tsx for TypeScript execution in development
- Concurrent frontend and backend development

### Production Build
- Vite builds optimized static assets
- esbuild bundles server code for Node.js
- Environment-based configuration switching

### Database
- Drizzle migrations for schema management
- Environment variable configuration for database URL
- PostgreSQL dialect with connection pooling

## Changelog
- June 28, 2025. Initial setup
- June 28, 2025. Added PostgreSQL database integration with Drizzle ORM
- June 28, 2025. Cloned Agent Zero repository from GitHub
- June 28, 2025. **Major Update**: Replaced Docker dependency with runtime sandbox integration
- June 28, 2025. **Agent Zero Integration**: Agent Zero now runs as primary AGI interface in runtime sandbox

## Recent Changes
✓ Successfully cloned Agent Zero open source project
✓ Completely eliminated Docker Desktop dependency 
✓ Created runtime sandbox adapters for Agent Zero
✓ Agent Zero now has secure house (runtime sandbox) with unlimited capabilities
✓ Integrated database persistence for Agent Zero sessions
✓ Agent Zero ready to run as main AGI super agent interface

## User Preferences

Preferred communication style: Simple, everyday language.
Architecture: Agent Zero as primary AGI interface running in secure runtime sandbox.
Goal: Agent Zero with unlimited potential in secure isolated environment.