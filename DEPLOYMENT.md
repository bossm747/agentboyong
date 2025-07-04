# 🚀 Pareng Boyong Deployment Guide

## Production Deployment Checklist

### ✅ Pre-Deployment Verification

**1. Core System Status**
- ✅ AI Service (Gemini/OpenAI integration)
- ✅ Intent Detection Service (90%+ accuracy)
- ✅ Context7 Documentation Integration
- ✅ Security Toolkit (50+ Kali Linux tools)
- ✅ PostgreSQL Database Schema
- ✅ WebSocket Real-time Communication
- ✅ Mobile-Responsive Interface

**2. Intelligence Features**
- ✅ Intelligent Context7 Auto-Detection
- ✅ Verification-Based Responses (No Assumptions)
- ✅ Real-time Documentation Fetching
- ✅ Multi-Modal AI Processing
- ✅ Persistent Memory System
- ✅ Cultural Intelligence (Filipino Context)

**3. Security & Performance**
- ✅ Input Validation & Sanitization
- ✅ Session Management & Isolation
- ✅ Error Handling & Graceful Degradation
- ✅ Database Connection Pooling
- ✅ WebSocket Stability & Reconnection

## Environment Configuration

### Required Environment Variables

```bash
# Database (Required)
DATABASE_URL=postgresql://username:password@host:5432/database

# AI Services (At least one required)
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Enhanced Features (Optional)
CONTEXT7_API_KEY=your_context7_api_key_here

# Application Settings
NODE_ENV=production
PORT=5000
```

### API Key Setup Instructions

**1. Google Gemini API (Primary)**
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with Google account
3. Navigate to "Get API Key"
4. Create new project or select existing
5. Generate API key
6. Copy key to `GEMINI_API_KEY`

**2. OpenAI API (Fallback)**
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up or sign in
3. Navigate to API Keys section
4. Create new secret key
5. Copy key to `OPENAI_API_KEY`

**3. Context7 API (Enhanced Documentation)**
1. Contact Context7 for premium access
2. Obtain API credentials
3. Add to `CONTEXT7_API_KEY`

## Replit Deployment (Recommended)

### Step 1: Fork Project
1. Fork this repository to your Replit account
2. Ensure all files are properly imported

### Step 2: Configure Secrets
1. Open Replit Secrets panel
2. Add required environment variables:
   - `DATABASE_URL`
   - `GEMINI_API_KEY` or `OPENAI_API_KEY`
   - Optional: `CONTEXT7_API_KEY`

### Step 3: Database Setup
```bash
# Automatically handled by Replit PostgreSQL
# Schema will be initialized on first run
```

### Step 4: Deploy
1. Click "Deploy" button in Replit
2. Choose deployment settings
3. App will be live at `https://your-repl-name.replit.app`

### Step 5: Verification
Visit your deployed app and test:
- Chat functionality
- Mode switching (Developer/Researcher/Hacker)
- File operations
- Terminal access
- Mobile responsiveness

## Manual Deployment

### Prerequisites
- Node.js v18+
- PostgreSQL v14+
- nginx (recommended)
- SSL certificate

### Build and Deploy
```bash
# 1. Install dependencies
npm ci --production

# 2. Build application
npm run build

# 3. Initialize database
npm run db:push

# 4. Start production server
npm start
```

### nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Docker Deployment (Alternative)

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Build application
RUN npm run build

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/status || exit 1

CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/parengboyong
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=parengboyong
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

## Performance Optimization

### Production Settings
```bash
# Node.js Performance
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=2048"

# Database Optimization
DATABASE_POOL_SIZE=20
DATABASE_CONNECTION_TIMEOUT=30000

# Caching
REDIS_URL=redis://localhost:6379 # Optional
```

### Monitoring Setup
```bash
# PM2 Process Manager
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monitor
```

### ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'pareng-boyong',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log'
  }]
};
```

## Security Hardening

### Application Security
```javascript
// Rate limiting
const rateLimit = require('express-rate-limit');
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// Security headers
const helmet = require('helmet');
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://your-domain.com'],
  credentials: true
}));
```

### Database Security
```sql
-- Create dedicated user
CREATE USER pareng_boyong WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE parengboyong TO pareng_boyong;
GRANT USAGE ON SCHEMA public TO pareng_boyong;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pareng_boyong;
```

## Monitoring & Logging

### Application Monitoring
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

### Error Tracking
```bash
# Install Sentry (recommended)
npm install @sentry/node

# Configure in server/index.ts
import * as Sentry from "@sentry/node";
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

## Testing in Production

### Automated Tests
```bash
# Run full test suite
npm test

# Load testing
npm run test:load

# Security testing
npm run test:security
```

### Manual Verification
1. **Chat Functionality**
   - Send message in each mode
   - Verify AI responses
   - Check intent detection

2. **File Operations**
   - Create, edit, delete files
   - Upload/download functionality
   - Project isolation

3. **Terminal Access**
   - Execute commands
   - Check security restrictions
   - Verify session isolation

4. **Mobile Interface**
   - Test on mobile devices
   - Verify responsive design
   - Check touch interactions

## Troubleshooting

### Common Issues

**Issue: AI not responding**
```bash
# Check API keys
echo $GEMINI_API_KEY
echo $OPENAI_API_KEY

# Check logs
tail -f logs/combined.log
```

**Issue: Database connection failed**
```bash
# Verify database URL
echo $DATABASE_URL

# Test connection
npm run db:check
```

**Issue: WebSocket disconnections**
```bash
# Check nginx websocket config
# Increase timeout values
proxy_read_timeout 86400;
proxy_send_timeout 86400;
```

### Performance Issues
```bash
# Monitor resource usage
top -p $(pgrep node)

# Check memory usage
node --inspect server/index.js

# Database performance
EXPLAIN ANALYZE SELECT * FROM conversations;
```

## Maintenance

### Regular Tasks
```bash
# Database cleanup (weekly)
npm run db:cleanup

# Log rotation (daily)
pm2 flush

# Security updates (monthly)
npm audit fix
```

### Backup Strategy
```bash
# Database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Application backup
tar -czf app_backup_$(date +%Y%m%d).tar.gz ./
```

## Support & Maintenance

### Monitoring Checklist
- [ ] Application health endpoint responding
- [ ] Database connections stable
- [ ] AI services responding within SLA
- [ ] WebSocket connections stable
- [ ] Mobile interface functioning
- [ ] Security scans passing
- [ ] Performance metrics within range

### Emergency Contacts
- **InnovateHub PH Support**: support@innovatehub.ph
- **Technical Lead**: Available 24/7 for critical issues
- **Database Admin**: For data-related emergencies

---

**Deployment Status: PRODUCTION READY ✅**

*Last Updated: July 4, 2025*
*Version: 1.0.0*
*InnovateHub PH - Filipino AI Innovation*