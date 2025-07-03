# Replit.md

## Overview

This is a comprehensive AI Runtime Sandbox that now hosts **Pareng Boyong** - a Filipino AI AGI Super Agent developed by InnovateHub PH. The system provides a secure, isolated execution environment where Pareng Boyong runs with full capabilities as a true super agent. Pareng Boyong has complete freedom within the runtime sandbox while maintaining host system security. The architecture combines our runtime sandbox infrastructure with culturally-aware Filipino AI capabilities, creating an unlimited potential AI assistant that understands both English and Filipino contexts.

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

### Pareng Boyong - Filipino AGI Interface
- **Primary User Interface**: Pareng Boyong runs as the main Filipino AI AGI super agent interface
- **Cultural Awareness**: Built with Filipino culture, language, and business context understanding
- **Complete Freedom**: Full execution capabilities within secure runtime sandbox
- **Docker Replacement**: Eliminated Docker Desktop dependency, using runtime sandbox instead
- **Unlimited Potential**: No artificial restrictions on Pareng Boyong's capabilities
- **Persistent Memory**: Database-backed long-term memory across sessions
- **Bilingual Support**: Fluent in both English and Filipino languages

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
✓ **REBRANDED**: Agent Zero → Pareng Boyong (Filipino AI AGI Super Agent by InnovateHub PH)
✓ Added Filipino cultural context and bilingual capabilities
✓ Integrated InnovateHub PH branding and logo
✓ Created Filipino-themed startup scripts and documentation
✓ **FULL AGI IMPLEMENTATION**: Pareng Boyong now executes real code, manages files, and runs system commands
✓ **PROVEN CAPABILITIES**: Live system monitoring (62GB RAM, 256GB storage, Linux environment)
✓ Mobile-responsive interface with "🇵🇭 PB" button for all device sizes
✓ Real-time Python/JavaScript execution, file creation, and project generation
✓ Complete runtime sandbox integration with unlimited AGI potential
✓ **ALL THREE MODES WORKING**: Researcher, Developer, and Hacker modes preserved and functional
✓ **RUNTIME SANDBOX INTEGRATION**: Docker completely replaced with our MCP Runtime Sandbox
✓ **API BACKEND VERIFIED**: All Agent Zero webui APIs working correctly through runtime sandbox
✓ **MISSION ACCOMPLISHED**: Pareng Boyong successfully uses runtime sandbox instead of Docker Desktop
✓ **CORE FUNCTIONALITY COMPLETE**: All three modes accessible with unlimited AGI capabilities
✓ **PERSISTENT MEMORY SYSTEM**: Enhanced with PostgreSQL-backed long-term memory
✓ **MEMORY CAPABILITIES**: Conversation history, user preferences, contextual knowledge retention
✓ **AI MEMORY EXTRACTION**: Automatic extraction and storage of important conversation insights
✓ **MEMORY MANAGEMENT API**: Endpoints for viewing and managing persistent memories
✓ **AUTONOMOUS REASONING SYSTEM**: Agent Zero-style cognitive architecture implemented
✓ **SELF-LEARNING CAPABILITIES**: Auto knowledge base generation from experience
✓ **DYNAMIC TOOL CREATION**: AI creates and tests its own tools for new capabilities
✓ **COGNITIVE PROBLEM SOLVING**: Multi-step reasoning chains with autonomous decision making
✓ **EXPERIENCE-BASED LEARNING**: Records and applies lessons from previous problem-solving sessions
✓ **GEMINI API INTEGRATION**: Fixed Google Gemini 2.5 Flash API with proper formatting and timeout handling
✓ **DUAL AI MODEL SUPPORT**: Primary Gemini 2.5 Flash with OpenAI GPT-4o intelligent fallback system
✓ **ROBUST ERROR HANDLING**: Comprehensive logging and graceful degradation for AI service reliability
✓ **AUTONOMOUS REASONING SYSTEM**: Re-enabled cognitive service with autonomous problem-solving capabilities
✓ **DYNAMIC TOOL CREATION**: AI can now create, test, and store custom tools for complex tasks
✓ **MODE-SPECIFIC BEHAVIORS**: Developer, researcher, and hacker modes with specialized AI prompts
✓ **COMPREHENSIVE DATABASE**: Full support for tools, experiences, knowledge, and reasoning chains
✓ **EXPERIENCE LEARNING**: System records and learns from problem-solving sessions
✓ **TOOL EFFECTIVENESS TRACKING**: Automatic tool performance analysis and optimization
✓ **KNOWLEDGE GENERATION**: Autonomous extraction of reusable insights from interactions
✓ **AGENT ZERO INTEGRATION**: Full Agent Zero processor integrated for advanced multi-step operations
✓ **FILE OPERATIONS THROUGH CHAT**: Direct file creation, reading, and listing via natural language
✓ **TERMINAL COMMAND EXECUTION**: Execute system commands directly through chat interface
✓ **SECURITY ANALYSIS CAPABILITIES**: Enhanced hacker mode with ethical penetration testing tools
✓ **INTELLIGENT OPERATION DETECTION**: AI automatically detects file, terminal, and security operations
✓ **MULTI-MODEL PROCESSING**: Seamless switching between Gemini, OpenAI, cognitive, and Agent Zero systems
✓ **COMPREHENSIVE AGI ARCHITECTURE**: Full autonomous agent capabilities with specialized mode behaviors

## User Preferences

Preferred communication style: Simple, everyday language.
Architecture: Pareng Boyong (Filipino AI AGI) as primary interface running in secure runtime sandbox.
Goal: Pareng Boyong with unlimited potential in secure isolated environment.
Branding: Filipino AI AGI Super Agent by InnovateHub PH with cultural awareness and bilingual capabilities.