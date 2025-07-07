# Backend Architecture Analysis - Pareng Boyong AI System

## Core Infrastructure

### Database Schema (PostgreSQL + Drizzle ORM)
**User Management:**
- `users` - User accounts with authentication
- `sessions` - Session management with activity tracking
- `files` - File storage with versioning and MIME type detection
- `processes` - Process monitoring and management
- `environmentVariables` - Environment configuration per session

**AI & Memory System:**
- `conversations` - Persistent chat history with mode tracking
- `memories` - Long-term memory storage (preferences, facts, context, skills)
- `knowledge` - Cumulative learning knowledge base with confidence scoring
- `tools` - Dynamic tool creation and effectiveness tracking
- `experiences` - Problem-solving session records
- `reasoningChains` - Multi-step reasoning process storage

## Service Architecture

### 1. AI Service (`aiService.ts`)
**Core AI Processing:**
- **Dual AI Models**: Google Gemini 2.5 Flash (primary) + OpenAI GPT-4o (fallback)
- **Persistent Memory**: Database-backed conversation history and long-term memory
- **Context Enhancement**: Real-time documentation injection via Context7
- **Intent Detection**: Automatic mode switching based on user input analysis
- **Security Integration**: Real security tool execution via RealSecurityExecutor

**Key Features:**
- Memory context loading and saving
- Intelligent prompt building with memory insights
- Multi-mode support (default, developer, hacker, researcher)
- Tool usage tracking and execution time monitoring

### 2. Cognitive Service (`cognitiveService.ts`)
**Autonomous Reasoning:**
- **Problem Analysis**: Complex problem decomposition and approach planning
- **Tool Creation**: Dynamic tool generation for new capabilities
- **Self-Learning**: Experience recording and knowledge extraction
- **Reasoning Chains**: Multi-step problem-solving with confidence tracking

### 3. Real Security Executor (`realSecurityExecutor.ts`)
**Actual Security Tools:**
- **50+ Kali Linux Tools**: nmap, nikto, sqlmap, john, hashcat, gobuster, etc.
- **Real Command Execution**: Actual tool execution instead of simulated responses
- **Security Analysis**: Professional penetration testing capabilities
- **Fintech Focus**: BSP compliance and financial security testing

### 4. Context7 Service (`context7Service.ts`)
**Real-time Documentation:**
- **9000+ Libraries**: Live documentation fetching from NPM, GitHub, JSDelivr
- **Intelligent Detection**: Automatic library detection from user queries
- **Fallback System**: Multiple sources for 99% documentation availability
- **Enhanced Accuracy**: Eliminates AI hallucinations with current examples

### 5. File System Service (`fileSystem.ts`)
**Workspace Management:**
- **Session Isolation**: Dedicated workspace per session
- **Project Management**: IDE-like project organization
- **CRUD Operations**: Complete file management with MIME detection
- **Database Sync**: Automatic file versioning and storage

### 6. Terminal Service (`terminal.ts`)
**Command Execution:**
- **Cross-platform**: Works without native dependencies
- **Real-time Execution**: WebSocket-based terminal communication
- **Process Management**: Process tracking and monitoring
- **Language Support**: Python, JavaScript, TypeScript, Java, C++, Go, Rust, Bash

### 7. System Monitor (`systemMonitor.ts`)
**Real-time Monitoring:**
- **System Stats**: CPU, memory, disk usage tracking
- **Process Monitoring**: Running process management
- **Resource Limits**: Performance optimization and alerts

## API Architecture

### Core Endpoints
**Session Management:**
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Get session details

**File Operations:**
- `GET /api/files/:sessionId/tree` - File tree structure
- `GET/POST/DELETE /api/files/:sessionId/content` - File CRUD operations
- `POST /api/files/:sessionId/upload` - File upload with progress

**Execution & Processing:**
- `POST /api/execute/:sessionId` - Command execution
- `GET /api/processes/:sessionId` - Process monitoring
- `POST /api/clone/:sessionId` - Git repository cloning

**AI & Chat:**
- `POST /api/pareng-boyong/chat` - Main AI chat endpoint
- `GET /api/pareng-boyong/memories/:userId` - Memory retrieval
- `GET /api/pareng-boyong/conversations/:userId` - Conversation history

**Application Management:**
- `GET/POST/PUT/DELETE /api/applications/:sessionId` - Running app management
- `GET /api/background-tasks/:sessionId` - Background task monitoring

**System & Environment:**
- `GET /api/system/stats` - System performance metrics
- `GET/POST /api/env/:sessionId` - Environment variable management

### WebSocket Integration
**Real-time Communication:**
- Terminal output streaming
- Task progress monitoring
- File change notifications
- System performance updates

## Advanced Features

### 1. MCP (Model Context Protocol) Server
**Standardized AI Integration:**
- 10 core tools for session management, file operations, code execution
- Language support for multiple programming languages
- Agent Zero integration for advanced operations

### 2. Intelligent Context Enhancement
**Context7 Integration:**
- Library detection from user messages
- Real-time documentation fetching
- Enhanced AI responses with current examples
- Topic extraction and smart documentation injection

### 3. Security Capabilities
**Professional Penetration Testing:**
- Complete Kali Linux toolkit integration
- Fintech security specialization
- Philippine compliance (BSP, PCI DSS, Data Privacy Act)
- Executive reporting for security assessments

### 4. Memory & Learning System
**Persistent Intelligence:**
- Long-term memory across sessions
- Automatic insight extraction from conversations
- User preference learning and adaptation
- Knowledge base expansion through experience

### 5. Project Management
**IDE-like Functionality:**
- Project isolation with timestamped directories
- Template system (calculator, todo, website)
- Asset management and file organization
- Application registration and proxy routing

## Technical Implementation

### Database Connections
- **Neon PostgreSQL**: Serverless database with connection pooling
- **Drizzle ORM**: Type-safe database operations with schema validation
- **Migration System**: Automated schema updates with `npm run db:push`

### Authentication & Security
- **Session-based Authentication**: Secure session management
- **Input Sanitization**: SQL injection and XSS protection
- **Path Security**: Directory traversal protection
- **Rate Limiting**: API abuse prevention

### Performance Optimizations
- **Connection Pooling**: Efficient database connections
- **WebSocket Management**: Real-time communication optimization
- **Code Splitting**: Optimized frontend bundle sizes
- **Caching Strategy**: Intelligent response caching

### Error Handling & Monitoring
- **Comprehensive Logging**: Detailed operation tracking
- **Graceful Degradation**: Fallback mechanisms for service failures
- **Health Checks**: System availability monitoring
- **Error Boundaries**: Frontend error isolation

## Deployment Architecture

### Development Environment
- **Vite Dev Server**: Hot module replacement for frontend
- **tsx Runtime**: TypeScript execution for backend
- **Concurrent Development**: Frontend and backend development

### Production Configuration
- **Static Asset Optimization**: Vite build optimization
- **Server Bundling**: esbuild for Node.js deployment
- **Environment Configuration**: Secure environment variable management
- **Resource Monitoring**: Performance tracking and alerting

This comprehensive backend analysis reveals a sophisticated, production-ready AI system with advanced capabilities spanning real security testing, persistent memory, intelligent context enhancement, and professional-grade development tools. The frontend should leverage all these capabilities while maintaining simplicity and user-friendliness.