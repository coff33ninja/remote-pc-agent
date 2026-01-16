# Remote PC Agent Documentation

Complete documentation for the Remote PC Agent system.

## Getting Started

- **[Setup Guide](SETUP.md)** - Installation and initial configuration
- **[Quick Start](../README.md)** - Fast setup for testing

## Core Documentation

### User Guides
- **[Features](FEATURES.md)** - Complete feature list with descriptions
- **[Deployment](DEPLOYMENT.md)** - Production deployment guide

### Developer Documentation
- **[API Reference](API.md)** - Complete REST API documentation
- **[Changelog](CHANGELOG.md)** - Version history and breaking changes
- **[Improvements](IMPROVEMENTS.md)** - Planned features and enhancements

## Architecture

### System Overview
```
┌──────────────┐
│   Web UI     │  Browser-based control panel
│  (Browser)   │  - JWT authentication
└──────┬───────┘  - Real-time updates
       │
       │ HTTPS/WSS
       │
┌──────▼───────┐
│   Server     │  Node.js backend
│  (Node.js)   │  - WebSocket server
└──────┬───────┘  - REST API
       │          - Gemini AI integration
       │          - SQLite database
       │
       │ WebSocket
       │
┌──────▼───────┐
│   Agents     │  Windows executables
│  (Windows)   │  - System monitoring
└──────────────┘  - Command execution
                  - Auto-reconnect
```

### Component Details

#### Agent (Python)
- **Runtime**: Python 3.8+
- **Build**: PyInstaller → agent.exe
- **Communication**: WebSocket client
- **Features**:
  - System info collection (CPU, RAM, disk, services, processes)
  - Command execution with output capture
  - Network discovery
  - Heartbeat monitoring

#### Server (Node.js)
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: SQLite (optional, in-memory fallback)
- **AI**: Google Gemini API
- **Features**:
  - WebSocket server for agents
  - REST API for web UI
  - JWT authentication
  - Command queue management
  - Task scheduling
  - Activity tracking

#### Web UI (JavaScript)
- **Technology**: Vanilla JavaScript, HTML5, CSS3
- **Features**:
  - Responsive design
  - Real-time updates
  - JWT authentication
  - Activity feed
  - AI analysis interface

## Key Concepts

### Agents
- Windows PCs running agent.exe
- Identified by unique ID or custom nickname
- Organized with tags (e.g., "office", "server")
- Real-time status monitoring

### Commands
- Natural language input → AI → Windows command
- Validation and safety checks
- Execution tracking and history
- Queue support for sequential execution

### Groups
- Logical collections of agents
- Execute commands on multiple agents
- Batch operations support

### Templates
- Pre-defined command patterns
- 30+ built-in templates
- Parameter support
- Quick execution

### Tasks
- Scheduled recurring commands
- Cron-like scheduling
- Per-agent or group execution
- Enable/disable support

## Security

### Authentication
- JWT tokens (24h expiration)
- Bcrypt password hashing
- Role-based access (admin, user)
- Rate limiting (API, commands, auth)

### Command Safety
- Validation before execution
- Configurable whitelist/blacklist
- Execution timeouts
- Confirmation prompts

### Network Security
- Optional HTTPS/WSS
- Token-based agent authentication
- Secure WebSocket communication

## Configuration

### Server (.env)
```env
PORT=3000
GEMINI_API_KEY=your_key
AUTH_TOKEN=your_token
ENABLE_HTTPS=false
JWT_SECRET=auto_generated
DATABASE_PATH=./data/agent.db
```

### Agent (.env)
```env
SERVER_URL=ws://localhost:3000
AUTH_TOKEN=your_token
AGENT_NICKNAME=My-PC
AGENT_TAGS=windows,office
HEARTBEAT_INTERVAL=10
```

## API Overview

### Authentication
- `POST /api/auth/login` - Get JWT token
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/users` - List users (admin)

### Agents
- `GET /api/agents` - List all agents
- `GET /api/agents/:id` - Get agent details
- `GET /api/activity` - Get activity feed

### Commands
- `POST /api/execute` - Execute command
- `POST /api/execute-batch` - Batch execution
- `POST /api/analyze` - AI system analysis
- `GET /api/templates` - List templates

### Management
- `GET /api/queue/:agentId` - Get command queue
- `GET /api/groups` - List agent groups
- `GET /api/scheduler/tasks` - List scheduled tasks
- `GET /api/history` - Command history

See [API.md](API.md) for complete documentation.

## Troubleshooting

### Common Issues

**Agent Connection Failed**
- Verify SERVER_URL and AUTH_TOKEN
- Check server is running
- Review firewall settings
- Check server logs

**Authentication Errors**
- Ensure JWT token is valid
- Check token expiration (24h)
- Verify Authorization header format

**AI Commands Not Working**
- Verify GEMINI_API_KEY is set
- Check API quota/billing
- Review command guardrails
- Check server logs

**Database Issues**
- SQLite requires Windows SDK 10.0.19041.0
- Falls back to in-memory if unavailable
- Data not persisted without SQLite

### Debug Mode

Enable detailed logging:
```env
LOG_LEVEL=debug
```

View server logs:
- Web UI: Logs tab
- File: `server/logs/agent.log`
- Console: Real-time output

## Best Practices

### Production Deployment
1. Enable HTTPS/WSS
2. Change default admin password
3. Use strong JWT_SECRET
4. Configure rate limits
5. Set up SQLite for persistence
6. Regular backups
7. Monitor logs

### Agent Management
1. Use descriptive nicknames
2. Organize with tags
3. Create logical groups
4. Monitor activity feed
5. Review command history
6. Schedule regular health checks

### Security
1. Rotate JWT tokens regularly
2. Use command whitelist in production
3. Enable rate limiting
4. Monitor failed auth attempts
5. Review command history
6. Keep software updated

## Support

- **Issues**: Check troubleshooting section
- **Features**: See [IMPROVEMENTS.md](IMPROVEMENTS.md)
- **API**: See [API.md](API.md)
- **Setup**: See [SETUP.md](SETUP.md)

## Version Information

Current Version: **v7.0.0**

See [CHANGELOG.md](CHANGELOG.md) for version history.
