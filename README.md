# Remote PC Agent

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Python Version](https://img.shields.io/badge/python-%3E%3D3.8-blue)](https://www.python.org/)
[![GitHub release](https://img.shields.io/badge/release-v7.0.0-blue)](https://github.com/coff33ninja/remote-pc-agent/releases)

AI-powered remote PC control system for Windows machines with natural language command execution via Google Gemini.

## Quick Start

### Prerequisites
- **Server**: Node.js 18+, Google Gemini API key
- **Agent**: Windows PC (Python 3.8+ for building from source)

### 1. Server Setup

```bash
cd server
npm install
```

Create `server/.env`:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
AUTH_TOKEN=your_secure_token_here
```

Start server:
```bash
npm start
```

Server runs at http://localhost:3000

### 2. Agent Setup

**Option A: Use Pre-built Executable**
1. Copy `agent/dist/agent.exe` to target PC
2. Create `.env` next to agent.exe:
```env
SERVER_URL=ws://your-server-ip:3000
AUTH_TOKEN=your_secure_token_here
AGENT_NICKNAME=My-PC
AGENT_TAGS=windows,office
```
3. Run `agent.exe`

**Option B: Build from Source**
```bash
cd agent
pip install -r requirements.txt
build.bat
```

### 3. Access Web UI

1. Open http://localhost:3000
2. Login with default credentials: `admin` / `admin123`
3. View connected agents and execute commands

## Key Features

- 🤖 **AI Command Generation** - Natural language to Windows commands via Gemini
- 📊 **Real-time Monitoring** - CPU, RAM, disk usage with live updates
- 🔍 **Activity Feed** - See what's happening on all remote machines
- 🎯 **AI System Analysis** - Get performance optimization suggestions
- 👥 **Multi-Agent Support** - Manage multiple PCs with nicknames and tags
- 📦 **Agent Groups** - Execute commands on multiple agents at once
- ⏱️ **Task Scheduler** - Schedule recurring commands
- 📝 **Command Templates** - 30+ pre-defined commands
- 🔐 **JWT Authentication** - Secure API access
- 📜 **Command History** - Track all executed commands
- 🔔 **Notifications** - Get alerts for important events

## Architecture

```
┌─────────────┐         WebSocket/REST API        ┌─────────────┐
│   Web UI    │◄──────────────────────────────────►│   Server    │
│ (Browser)   │         JWT Auth                   │  (Node.js)  │
└─────────────┘                                    └──────┬──────┘
                                                          │
                                                    WebSocket
                                                          │
                                                   ┌──────▼──────┐
                                                   │   Agents    │
                                                   │  (Windows)  │
                                                   └─────────────┘
```

## Project Structure

```
remote-pc-agent/
├── agent/              # Python agent (Windows executable)
│   ├── src/           # Source code
│   ├── dist/          # Built executable
│   └── build.bat      # Build script
├── server/            # Node.js server
│   ├── src/           # Server modules
│   ├── public/        # Web UI
│   └── package.json   # Dependencies
├── docs/              # Documentation
└── README.md          # This file
```

## Documentation

- **[Setup Guide](docs/SETUP.md)** - Detailed installation and configuration
- **[API Reference](docs/API.md)** - Complete API documentation
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions
- **[Features](docs/V6-FEATURES.md)** - Detailed feature documentation
- **[Improvements](docs/IMPROVEMENTS.md)** - Future enhancements

## Security

- JWT-based authentication for all API endpoints
- Command validation and guardrails
- Rate limiting on API and commands
- Optional HTTPS/WSS support
- Configurable command whitelist/blacklist

**⚠️ Important**: Change default admin password immediately after first login!

## Common Use Cases

- Remote system administration
- Batch maintenance across multiple machines
- Network diagnostics and monitoring
- Automated recurring operations
- IT support and troubleshooting
- Performance optimization with AI analysis

## API Examples

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Execute Command
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent-id","prompt":"show me the IP address"}'
```

### AI System Analysis
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent-id"}'
```

## Technology Stack

**Agent**: Python 3.8+, websockets, psutil, PyInstaller  
**Server**: Node.js 18+, Express, WebSocket, Google Gemini AI  
**Database**: SQLite (optional, falls back to in-memory)  
**UI**: Vanilla JavaScript, responsive design

## Configuration

### Server Environment Variables
```env
PORT=3000
GEMINI_API_KEY=your_key
AUTH_TOKEN=your_token
ENABLE_HTTPS=false
JWT_SECRET=auto_generated
```

### Agent Environment Variables
```env
SERVER_URL=ws://localhost:3000
AUTH_TOKEN=your_token
AGENT_NICKNAME=My-PC
AGENT_TAGS=windows,office
HEARTBEAT_INTERVAL=10
```

## Building

### Agent
```bash
cd agent
build.bat
# Output: agent/dist/agent.exe
```

### Release Package
```powershell
.\create-release.ps1
# Creates timestamped zip with agent and server
```

## Troubleshooting

**Agent won't connect**
- Check SERVER_URL and AUTH_TOKEN match server config
- Verify server is running and accessible
- Check firewall settings

**Authentication fails**
- Ensure JWT token is included in Authorization header
- Check token hasn't expired (24h default)
- Verify server JWT_SECRET hasn't changed

**AI commands fail**
- Verify GEMINI_API_KEY is set correctly
- Check API quota and billing
- Review server logs for detailed errors

## License

MIT License - See LICENSE file for details

## Support

For issues and questions, see [docs/](docs/) folder or create an issue.

---

**Default Credentials**: admin / admin123 (⚠️ Change immediately!)
