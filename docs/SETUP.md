# Setup Guide

## Prerequisites

- Node.js 18+ (for server)
- Python 3.8+ (for agent)
- Gemini API key (get from https://aistudio.google.com/app/apikey)

## Step 1: Server Setup

```bash
cd server
npm install
```

Create `.env` file:
```bash
cp ../.env.example .env
```

Edit `.env` and add your Gemini API key:
```
GEMINI_API_KEY=your_actual_api_key_here
AGENT_TOKEN=change_this_to_something_secure
```

Start server:
```bash
npm start
```

Server will run on http://localhost:3000

## Step 2: Build Agent

```bash
cd agent
```

Create `.env` file:
```bash
copy .env.example .env
```

Edit `.env` and match the token from server:
```
AGENT_TOKEN=same_token_as_server
```

Build the executable:
```bash
build.bat
```

This creates `dist/agent.exe`

## Step 3: Run Agent

On the target PC, run:
```bash
dist\agent.exe
```

The agent will connect to your server automatically.

## Step 4: Control via Web UI

Open browser: http://localhost:3000

1. Select connected agent
2. Enter natural language prompt (e.g., "show system info")
3. Click Execute

## API Usage

You can also use the REST API:

```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"prompt": "check disk space", "agentId": "your-agent-id"}'
```

## Security Tips

1. Change default AGENT_TOKEN
2. Use HTTPS in production
3. Restrict ALLOWED_COMMANDS in .env
4. Enable REQUIRE_CONFIRMATION for sensitive operations
5. Run server behind firewall/VPN
6. Review logs regularly

## Troubleshooting

**Agent won't connect:**
- Check SERVER_URL in agent/.env
- Verify AGENT_TOKEN matches server
- Ensure server is running

**Commands blocked:**
- Check ALLOWED_COMMANDS whitelist
- Review BLOCKED_KEYWORDS
- Check logs for specific reason

**Gemini errors:**
- Verify API key is valid
- Check API quota/limits
- Review server logs
