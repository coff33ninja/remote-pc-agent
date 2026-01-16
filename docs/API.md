# Remote PC Agent - API Documentation

Complete API reference for the Remote PC Agent server.

## Base URL

```
http://localhost:3000/api
https://localhost:3000/api  (with HTTPS enabled)
```

## Authentication

All API endpoints (except `/api/auth/login`) require JWT authentication.

### Headers

```
Authorization: Bearer <jwt_token>
```

### Getting a Token

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

# Response
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

---

## Authentication Endpoints

### POST /api/auth/login
Login and get JWT token.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "token": "string",
  "user": {
    "username": "string",
    "role": "admin|user"
  }
}
```

**Rate Limit:** 5 attempts per 5 minutes

---

### GET /api/auth/me
Get current user information.

**Response:**
```json
{
  "user": {
    "username": "string",
    "role": "admin|user"
  }
}
```

---

### POST /api/auth/change-password
Change current user's password.

**Request:**
```json
{
  "oldPassword": "string",
  "newPassword": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### POST /api/auth/users
Create new user (admin only).

**Request:**
```json
{
  "username": "string",
  "password": "string",
  "role": "admin|user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully"
}
```

---

### GET /api/auth/users
List all users (admin only).

**Response:**
```json
{
  "users": [
    {
      "username": "string",
      "role": "admin|user",
      "createdAt": "ISO8601"
    }
  ]
}
```

---

### DELETE /api/auth/users/:username
Delete user (admin only).

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## Agent Management

### GET /api/agents
List all connected agents.

**Response:**
```json
{
  "agents": [
    {
      "id": "string",
      "nickname": "string",
      "tags": ["string"],
      "connectedAt": "ISO8601",
      "lastSeen": "ISO8601",
      "status": "online|offline",
      "systemInfo": {
        "hostname": "string",
        "platform": "string",
        "cpu": "string",
        "ram": "string"
      },
      "stats": {
        "cpu": 45.2,
        "ram": 62.8
      }
    }
  ]
}
```

---

### GET /api/agents/:agentId
Get detailed agent information.

**Response:**
```json
{
  "id": "string",
  "nickname": "string",
  "tags": ["string"],
  "connectedAt": "ISO8601",
  "lastSeen": "ISO8601",
  "status": "online|offline",
  "systemInfo": { },
  "stats": { }
}
```

---

### POST /api/agents/:agentId/refresh
Request fresh system info from agent.

**Response:**
```json
{
  "success": true
}
```

---

## Command Execution

### POST /api/execute
Execute command on single agent.

**Request:**
```json
{
  "prompt": "string",
  "agentId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "command": "string",
  "commandId": "string"
}
```

**Rate Limit:** 10 commands per minute per user

---

### POST /api/execute-batch
Execute command on multiple agents.

**Request:**
```json
{
  "prompt": "string",
  "agentIds": ["string"],  // Optional
  "tags": ["string"]       // Optional
}
```

**Response:**
```json
{
  "success": true,
  "command": "string",
  "results": [
    {
      "agentId": "string",
      "commandId": "string",
      "success": true
    }
  ],
  "totalAgents": 5
}
```

---

## Command Queue

### POST /api/queue/add
Add command to agent's queue.

**Request:**
```json
{
  "prompt": "string",
  "agentId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "commandId": "string",
  "command": "string"
}
```

---

### GET /api/queue/:agentId
Get agent's command queue.

**Response:**
```json
{
  "queue": [
    {
      "id": "string",
      "command": "string",
      "status": "pending|executing|completed|failed",
      "addedAt": "ISO8601",
      "executedAt": "ISO8601",
      "result": "string"
    }
  ]
}
```

---

### GET /api/queue/:agentId/status
Get queue statistics.

**Response:**
```json
{
  "stats": {
    "total": 10,
    "pending": 3,
    "executing": 1,
    "completed": 5,
    "failed": 1
  },
  "queue": [ ]
}
```

---

### POST /api/queue/execute-next
Execute next command in queue.

**Request:**
```json
{
  "agentId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "command": {
    "id": "string",
    "command": "string"
  }
}
```

---

### DELETE /api/queue/:agentId
Clear agent's queue.

**Response:**
```json
{
  "success": true
}
```

---

## Agent Groups

### POST /api/groups
Create agent group.

**Request:**
```json
{
  "name": "string",
  "description": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Group created"
}
```

---

### GET /api/groups
List all groups.

**Response:**
```json
{
  "groups": {
    "group-name": {
      "agents": ["agentId"],
      "description": "string",
      "createdAt": "ISO8601",
      "count": 5
    }
  }
}
```

---

### POST /api/groups/:groupName/agents
Add agent to group.

**Request:**
```json
{
  "agentId": "string"
}
```

**Response:**
```json
{
  "success": true
}
```

---

### DELETE /api/groups/:groupName/agents/:agentId
Remove agent from group.

**Response:**
```json
{
  "success": true
}
```

---

### POST /api/groups/:groupName/execute
Execute command on all agents in group.

**Request:**
```json
{
  "prompt": "string"
}
```

**Response:**
```json
{
  "success": true,
  "command": "string",
  "results": [ ]
}
```

---

## Command History

### GET /api/history
Get command execution history.

**Query Parameters:**
- `agentId` (optional): Filter by agent
- `limit` (optional): Number of results (default: 50)

**Response:**
```json
{
  "history": [
    {
      "id": "string",
      "agentId": "string",
      "command": "string",
      "prompt": "string",
      "success": true,
      "output": "string",
      "timestamp": "ISO8601"
    }
  ]
}
```

---

### GET /api/history/stats
Get history statistics.

**Query Parameters:**
- `agentId` (optional): Filter by agent

**Response:**
```json
{
  "stats": {
    "total": 100,
    "successful": 95,
    "failed": 5,
    "successRate": 95.0
  }
}
```

---

### GET /api/history/search
Search command history.

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional): Number of results (default: 50)

**Response:**
```json
{
  "results": [ ]
}
```

---

## Notifications

### GET /api/notifications
Get recent notifications.

**Query Parameters:**
- `channel` (optional): Filter by channel
- `limit` (optional): Number of results (default: 50)

**Response:**
```json
{
  "notifications": [
    {
      "id": 1,
      "channel": "agent.connected",
      "data": { },
      "timestamp": "ISO8601"
    }
  ]
}
```

**Channels:**
- `agent.connected`
- `agent.disconnected`
- `command.executed`
- `command.failed`
- `security.alert`
- `system.error`

---

### GET /api/notifications/:channel
Get notifications for specific channel.

**Response:**
```json
{
  "notifications": [ ]
}
```

---

### DELETE /api/notifications
Clear all notifications (admin only).

**Response:**
```json
{
  "success": true,
  "message": "Notifications cleared"
}
```

---

## Task Scheduler

### POST /api/scheduler/tasks
Create scheduled task.

**Request:**
```json
{
  "taskId": "string",
  "agentId": "string",
  "commands": ["string"],
  "intervalMinutes": 60,
  "description": "string"
}
```

**Response:**
```json
{
  "success": true,
  "task": {
    "id": "string",
    "agent_id": "string",
    "commands": ["string"],
    "interval_minutes": 60,
    "description": "string",
    "last_run": null,
    "next_run": "ISO8601",
    "enabled": true,
    "created_at": "ISO8601"
  }
}
```

---

### GET /api/scheduler/tasks
List all scheduled tasks.

**Response:**
```json
{
  "tasks": [ ]
}
```

---

### GET /api/scheduler/tasks/:taskId
Get specific task.

**Response:**
```json
{
  "task": { }
}
```

---

### DELETE /api/scheduler/tasks/:taskId
Delete scheduled task.

**Response:**
```json
{
  "success": true,
  "message": "Task deleted"
}
```

---

### PATCH /api/scheduler/tasks/:taskId
Enable/disable task.

**Request:**
```json
{
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "enabled": true
}
```

---

### GET /api/scheduler/templates
Get task templates.

**Response:**
```json
{
  "templates": {
    "dailyHealthCheck": {
      "name": "Daily Health Check",
      "commands": ["systemInfo", "diskSpace"],
      "intervalMinutes": 1440,
      "description": "Daily system health check"
    }
  }
}
```

---

## Backup System

### POST /api/backup/create
Create configuration backup (admin only).

**Request:**
```json
{
  "name": "string"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "backupPath": "./backups/backup-name"
}
```

---

### GET /api/backup/list
List all backups (admin only).

**Response:**
```json
{
  "backups": [
    {
      "name": "string",
      "created": "ISO8601",
      "size": 1024
    }
  ]
}
```

---

### POST /api/backup/restore/:name
Restore from backup (admin only).

**Response:**
```json
{
  "success": true,
  "message": "Backup restored. Please restart server."
}
```

---

## Command Templates

### GET /api/templates
Get all command templates.

**Response:**
```json
{
  "templates": [
    {
      "id": "systemInfo",
      "name": "System Information",
      "command": "systeminfo",
      "description": "Get detailed system information",
      "category": "system"
    }
  ]
}
```

---

### POST /api/templates/execute
Execute template command.

**Request:**
```json
{
  "templateId": "string",
  "agentId": "string",
  "params": { }  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "command": "string",
  "commandId": "string"
}
```

---

## Server Logs

### GET /api/logs
Get server logs.

**Query Parameters:**
- `lines` (optional): Number of lines (default: 100)

**Response:**
```json
{
  "logs": [
    {
      "level": "info",
      "message": "string",
      "timestamp": "ISO8601"
    }
  ]
}
```

---

## Database Stats

### GET /api/database/stats
Get database statistics.

**Response:**
```json
{
  "stats": {
    "queueSize": 10,
    "groupsCount": 5,
    "historySize": 1000,
    "tasksCount": 3,
    "notificationsCount": 500,
    "databaseSize": 102400
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Authentication required
- `INVALID_TOKEN` (401): Invalid or expired token
- `FORBIDDEN` (403): Insufficient permissions
- `COMMAND_BLOCKED` (403): Command blocked by guardrails
- `AGENT_NOT_FOUND` (404): Agent not found
- `GROUP_NOT_FOUND` (404): Group not found
- `TASK_NOT_FOUND` (404): Task not found
- `MISSING_PARAMETER` (400): Required parameter missing
- `INVALID_PARAMETER` (400): Invalid parameter value
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error
- `AGENT_OFFLINE` (503): Agent is offline

---

## Rate Limits

- **Login**: 5 attempts per 5 minutes
- **Commands**: 10 per minute per user
- **API**: 100 calls per minute per user

Rate limit headers:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1705420800000
```

When rate limited:
```
Retry-After: 45
```

---

## WebSocket Protocol

Agents connect via WebSocket with these headers:

```
x-agent-id: unique-agent-id
x-agent-token: your_secure_token
x-agent-nickname: My-PC
x-agent-tags: office,windows
```

### Message Types

**Server → Agent:**
```json
{
  "type": "execute",
  "command": "systeminfo",
  "commandId": "cmd-123",
  "requireConfirmation": false
}
```

**Agent → Server:**
```json
{
  "type": "result",
  "command": "systeminfo",
  "commandId": "cmd-123",
  "success": true,
  "output": "..."
}
```

```json
{
  "type": "heartbeat",
  "data": {
    "cpu": 45.2,
    "ram": 62.8
  }
}
```

---

## Examples

### Complete Workflow Example

```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.token')

# 2. List agents
curl http://localhost:3000/api/agents \
  -H "Authorization: Bearer $TOKEN"

# 3. Execute command
curl -X POST http://localhost:3000/api/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"show disk space","agentId":"agent-123"}'

# 4. Check history
curl http://localhost:3000/api/history?agentId=agent-123 \
  -H "Authorization: Bearer $TOKEN"

# 5. Create scheduled task
curl -X POST http://localhost:3000/api/scheduler/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId":"health-check",
    "agentId":"agent-123",
    "commands":["systeminfo","diskspace"],
    "intervalMinutes":60,
    "description":"Hourly health check"
  }'
```

---

## SDK Examples

### JavaScript/Node.js

```javascript
const API_URL = 'http://localhost:3000/api';
let token = null;

// Login
async function login(username, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json();
  token = data.token;
  return data;
}

// Execute command
async function executeCommand(agentId, prompt) {
  const response = await fetch(`${API_URL}/execute`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ agentId, prompt })
  });
  return await response.json();
}

// Usage
await login('admin', 'admin123');
const result = await executeCommand('agent-123', 'show disk space');
```

### Python

```python
import requests

API_URL = 'http://localhost:3000/api'
token = None

# Login
def login(username, password):
    global token
    response = requests.post(f'{API_URL}/auth/login', json={
        'username': username,
        'password': password
    })
    data = response.json()
    token = data['token']
    return data

# Execute command
def execute_command(agent_id, prompt):
    response = requests.post(f'{API_URL}/execute', 
        headers={'Authorization': f'Bearer {token}'},
        json={'agentId': agent_id, 'prompt': prompt}
    )
    return response.json()

# Usage
login('admin', 'admin123')
result = execute_command('agent-123', 'show disk space')
```

---

## Support

For issues and questions:
- GitHub Issues: [repository-url]
- Documentation: See README.md and SETUP.md
- Troubleshooting: See TROUBLESHOOTING.md
