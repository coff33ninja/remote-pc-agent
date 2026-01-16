import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { createLogger } from './logger.js';
import { processPrompt } from './gemini.js';
import { validateCommand } from './guardrails.js';
import { 
  authenticate, 
  requireAdmin, 
  authenticateUser, 
  createUser, 
  changePassword, 
  listUsers, 
  deleteUser 
} from './auth.js';
import { RateLimiter, createRateLimitMiddleware } from './ratelimit.js';
import { createHttpsServer, getServerProtocol, getWebSocketProtocol } from './https-server.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const logger = createLogger();

// Create rate limiters
const commandLimiter = new RateLimiter(10, 60000); // 10 commands per minute
const apiLimiter = new RateLimiter(100, 60000);    // 100 API calls per minute
const authLimiter = new RateLimiter(5, 300000);    // 5 login attempts per 5 minutes

app.use(express.json());
app.use(express.static('public'));

// Create server (HTTP or HTTPS based on config)
const httpsServer = createHttpsServer(app);
const server = httpsServer || http.createServer(app);

server.listen(PORT, () => {
  const protocol = getServerProtocol();
  const wsProtocol = getWebSocketProtocol();
  logger.info(`Server running on ${protocol}://localhost:${PORT}`);
  logger.info(`WebSocket available on ${wsProtocol}://localhost:${PORT}`);
  
  if (httpsServer) {
    logger.info('✓ HTTPS/WSS enabled');
  } else {
    logger.warn('⚠ Running without HTTPS/WSS - Set ENABLE_HTTPS=true for production');
  }
});

// ===== AUTHENTICATION ENDPOINTS =====

// Login endpoint (no auth required, but rate limited)
app.post('/api/auth/login', createRateLimitMiddleware(authLimiter), async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const result = await authenticateUser(username, password);
    
    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }

    logger.info(`User logged in: ${username}`);
    res.json(result);
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user info
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Change password
app.post('/api/auth/change-password', authenticate, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old and new password required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    const result = await changePassword(req.user.username, oldPassword, newPassword);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    logger.info(`Password changed for user: ${req.user.username}`);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Password change error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

// Create user (admin only)
app.post('/api/auth/users', authenticate, requireAdmin, async (req, res) => {
  const { username, password, role = 'user' } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role must be "user" or "admin"' });
  }

  try {
    const result = await createUser(username, password, role);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    logger.info(`User created: ${username} (role: ${role}) by ${req.user.username}`);
    res.json({ success: true, message: 'User created successfully' });
  } catch (error) {
    logger.error('User creation error:', error);
    res.status(500).json({ error: 'User creation failed' });
  }
});

// List users (admin only)
app.get('/api/auth/users', authenticate, requireAdmin, (req, res) => {
  try {
    const users = listUsers();
    res.json({ users });
  } catch (error) {
    logger.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// Delete user (admin only)
app.delete('/api/auth/users/:username', authenticate, requireAdmin, async (req, res) => {
  const { username } = req.params;

  if (username === req.user.username) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    const result = await deleteUser(username);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    logger.info(`User deleted: ${username} by ${req.user.username}`);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    logger.error('User deletion error:', error);
    res.status(500).json({ error: 'User deletion failed' });
  }
});

// Apply authentication to all API endpoints (except auth endpoints)
app.use('/api', authenticate);

// Apply general rate limiting to all API endpoints
app.use('/api', createRateLimitMiddleware(apiLimiter, (req) => req.user?.username || req.ip));

const wss = new WebSocketServer({ server });
const agents = new Map();

wss.on('connection', (ws, req) => {
  const agentId = req.headers['x-agent-id'];
  const token = req.headers['x-agent-token'];
  const nickname = req.headers['x-agent-nickname'] || agentId;
  const tags = req.headers['x-agent-tags'] ? req.headers['x-agent-tags'].split(',').map(t => t.trim()) : [];

  if (token !== process.env.AGENT_TOKEN) {
    ws.close(1008, 'Invalid token');
    return;
  }

  agents.set(agentId, { 
    ws, 
    nickname,
    tags,
    systemInfo: null, 
    stats: null, 
    connectedAt: new Date(),
    lastSeen: new Date(),
    status: 'online'
  });
  logger.info(`Agent connected: ${nickname} (${agentId}) [${tags.join(', ')}]`);
  
  // Track activity
  activityFeed.add(agentId, 'connection', {
    nickname,
    tags,
    action: 'connected'
  });
  
  // Send notification
  notificationManager.notify(NotificationChannels.AGENT_CONNECTED, {
    agentId,
    nickname,
    tags,
    timestamp: new Date().toISOString()
  });

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'result') {
        logger.info(`Command result from ${agentId}:`, message.output);
        
        // Track activity
        activityFeed.add(agentId, 'command', {
          command: message.command,
          success: message.success,
          output: message.output?.substring(0, 200) // Limit output size
        });
        
        // Record in history
        commandHistory.addEntry({
          agentId: agentId,
          command: message.command,
          success: message.success,
          output: message.output,
          commandId: message.commandId
        });
        
        // Send notification
        if (message.success) {
          notificationManager.notify(NotificationChannels.COMMAND_EXECUTED, {
            agentId,
            command: message.command,
            commandId: message.commandId,
            timestamp: new Date().toISOString()
          });
        } else {
          notificationManager.notify(NotificationChannels.COMMAND_FAILED, {
            agentId,
            command: message.command,
            commandId: message.commandId,
            error: message.output,
            timestamp: new Date().toISOString()
          });
        }
        
        // Handle queue command completion if commandId is present
        if (message.commandId) {
          if (message.success) {
            await commandQueue.markCompleted(message.commandId, {
              output: message.output,
              timestamp: new Date()
            });
            logger.info(`Queue command completed: ${message.commandId}`);
          } else {
            await commandQueue.markFailed(message.commandId, message.output || 'Command failed');
            logger.warn(`Queue command failed: ${message.commandId}`);
          }
        }
      } else if (message.type === 'agent_info') {
        // Store agent system info
        const agent = agents.get(agentId);
        if (agent) {
          agent.systemInfo = message.data;
          agent.lastSeen = new Date();
          logger.info(`Received system info from ${agentId}`);
        }
      } else if (message.type === 'system_info') {
        logger.info(`System info from ${agentId}:`, message.data);
      } else if (message.type === 'quick_stats') {
        const agent = agents.get(agentId);
        if (agent) {
          agent.stats = message.data;
          agent.lastSeen = new Date();
        }
      } else if (message.type === 'heartbeat') {
        const agent = agents.get(agentId);
        if (agent) {
          agent.stats = message.data;
          agent.lastSeen = new Date();
          agent.status = 'online';
        }
      }
    } catch (error) {
      logger.error('Message error:', error);
    }
  });

  ws.on('close', () => {
    const agent = agents.get(agentId);
    agents.delete(agentId);
    logger.info(`Agent disconnected: ${agentId}`);
    
    // Send notification
    if (agent) {
      notificationManager.notify(NotificationChannels.AGENT_DISCONNECTED, {
        agentId,
        nickname: agent.nickname,
        timestamp: new Date().toISOString()
      });
    }
  });
});

// API endpoint to send prompts (with command rate limiting)
app.post('/api/execute', createRateLimitMiddleware(commandLimiter, (req) => req.user.username), async (req, res) => {
  const { prompt, agentId } = req.body;

  if (!prompt || !agentId) {
    return res.status(400).json({ error: 'Missing prompt or agentId' });
  }

  const agentData = agents.get(agentId);
  if (!agentData) {
    return res.status(404).json({ error: 'Agent not connected' });
  }

  try {
    // Get command from Gemini
    const command = await processPrompt(prompt);
    logger.info(`Generated command: ${command}`);

    // Validate with guardrails
    const validation = validateCommand(command);
    if (!validation.allowed) {
      // Send security alert notification
      notificationManager.notify(NotificationChannels.SECURITY_ALERT, {
        agentId,
        command,
        reason: validation.reason,
        user: req.user.username,
        timestamp: new Date().toISOString()
      });
      
      return res.status(403).json({ error: validation.reason });
    }

    // Generate unique command ID for tracking
    const commandId = `cmd-${agentId}-${Date.now()}`;
    
    // Send to agent
    agentData.ws.send(JSON.stringify({
      type: 'execute',
      command: command,
      commandId: commandId,
      requireConfirmation: process.env.REQUIRE_CONFIRMATION === 'true'
    }));

    res.json({ success: true, command, commandId });
  } catch (error) {
    logger.error('Execution error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch execute on multiple agents (with command rate limiting)
app.post('/api/execute-batch', createRateLimitMiddleware(commandLimiter, (req) => req.user.username), async (req, res) => {
  const { prompt, agentIds, tags } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  let targetAgents = [];

  // Select agents by IDs or tags
  if (agentIds && agentIds.length > 0) {
    targetAgents = agentIds.map(id => ({ id, data: agents.get(id) })).filter(a => a.data);
  } else if (tags && tags.length > 0) {
    targetAgents = Array.from(agents.entries())
      .filter(([id, data]) => tags.some(tag => data.tags.includes(tag)))
      .map(([id, data]) => ({ id, data }));
  } else {
    // Execute on all agents
    targetAgents = Array.from(agents.entries()).map(([id, data]) => ({ id, data }));
  }

  if (targetAgents.length === 0) {
    return res.status(404).json({ error: 'No agents found' });
  }

  try {
    // Get command from Gemini
    const command = await processPrompt(prompt);
    logger.info(`Generated batch command: ${command}`);

    // Validate with guardrails
    const validation = validateCommand(command);
    if (!validation.allowed) {
      return res.status(403).json({ error: validation.reason });
    }

    // Send to all target agents
    const results = targetAgents.map(({ id, data }) => {
      try {
        const commandId = `cmd-${id}-${Date.now()}`;
        data.ws.send(JSON.stringify({
          type: 'execute',
          command: command,
          commandId: commandId,
          requireConfirmation: false // Disable confirmation for batch
        }));
        return { agentId: id, commandId, success: true };
      } catch (error) {
        return { agentId: id, success: false, error: error.message };
      }
    });

    res.json({ 
      success: true, 
      command,
      results,
      totalAgents: targetAgents.length
    });
  } catch (error) {
    logger.error('Batch execution error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/agents', (req, res) => {
  const now = new Date();
  const agentList = Array.from(agents.entries()).map(([id, data]) => {
    const secondsSinceLastSeen = (now - data.lastSeen) / 1000;
    const status = secondsSinceLastSeen > 30 ? 'offline' : 'online';
    
    return {
      id,
      nickname: data.nickname,
      tags: data.tags,
      connectedAt: data.connectedAt,
      lastSeen: data.lastSeen,
      status,
      systemInfo: data.systemInfo,
      stats: data.stats
    };
  });
  
  res.json({ agents: agentList });
});

// Get detailed agent info
app.get('/api/agents/:agentId', authenticate, (req, res) => {
  const { agentId } = req.params;
  const agentData = agents.get(agentId);
  
  if (!agentData) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  const now = new Date();
  const secondsSinceLastSeen = (now - agentData.lastSeen) / 1000;
  const status = secondsSinceLastSeen > 30 ? 'offline' : 'online';
  
  res.json({
    id: agentId,
    nickname: agentData.nickname,
    tags: agentData.tags,
    connectedAt: agentData.connectedAt,
    lastSeen: agentData.lastSeen,
    status,
    systemInfo: agentData.systemInfo,
    stats: agentData.stats
  });
});

// Get activity feed
app.get('/api/activity', authenticate, (req, res) => {
  const { limit = 100, agentId, type } = req.query;
  
  let activities;
  if (type) {
    activities = activityFeed.getByType(type, parseInt(limit));
  } else {
    activities = activityFeed.getRecent(parseInt(limit), agentId);
  }
  
  res.json({ activities });
});

// AI-powered system analysis
app.post('/api/analyze', authenticate, async (req, res) => {
  const { agentId } = req.body;
  
  if (!agentId) {
    return res.status(400).json({ error: 'Agent ID required' });
  }
  
  const agentData = agents.get(agentId);
  if (!agentData || !agentData.systemInfo) {
    return res.status(404).json({ error: 'Agent not found or no system info available' });
  }
  
  try {
    const systemInfo = agentData.systemInfo;
    const analysisPrompt = `Analyze this Windows system and suggest performance optimizations:

System Info:
- CPU: ${systemInfo.processor} (${systemInfo.cpu_count} cores, ${systemInfo.cpu_percent}% usage)
- RAM: ${(systemInfo.memory.total / 1024 / 1024 / 1024).toFixed(2)}GB total, ${systemInfo.memory.percent}% used
- Platform: ${systemInfo.platform} ${systemInfo.platform_release}

${systemInfo.top_processes ? `Top CPU Processes:
${systemInfo.top_processes.by_cpu.slice(0, 5).map(p => `- ${p.name}: ${p.cpu}%`).join('\n')}

Top Memory Processes:
${systemInfo.top_processes.by_memory.slice(0, 5).map(p => `- ${p.name}: ${p.memory.toFixed(1)}%`).join('\n')}` : ''}

${systemInfo.services ? `Running Services: ${systemInfo.services.filter(s => s.state === 'RUNNING').length} active` : ''}

Provide:
1. Performance assessment (Good/Fair/Poor)
2. Top 3 specific optimization suggestions with Windows commands
3. Services that could be safely disabled (if any)

Format as JSON:
{
  "assessment": "Good/Fair/Poor",
  "cpu_status": "description",
  "memory_status": "description",
  "suggestions": [
    {"title": "...", "command": "...", "reason": "..."}
  ],
  "services_to_disable": ["service_name"]
}`;

    const analysis = await processPrompt(analysisPrompt);
    
    // Try to parse as JSON, fallback to text
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(analysis);
    } catch {
      parsedAnalysis = { raw: analysis };
    }
    
    res.json({ 
      agentId,
      analysis: parsedAnalysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Request fresh system info from agent
app.post('/api/agents/:agentId/refresh', (req, res) => {
  const { agentId } = req.params;
  const agentData = agents.get(agentId);
  
  if (!agentData) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  agentData.ws.send(JSON.stringify({ type: 'get_system_info' }));
  res.json({ success: true });
});

// Import new modules
import { commandQueue } from './queue.js';
import { groupManager } from './groups.js';
import { getDatabaseStats } from './database.js';
import { CommandHistory } from './history.js';
import { NotificationManager, NotificationChannels } from './notifications.js';
import { TaskScheduler, scheduledTaskTemplates } from './scheduler.js';
import { ConfigBackup } from './backup.js';
import activityFeed from './activity.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize command history
const commandHistory = new CommandHistory();

// Initialize notification manager
const notificationManager = new NotificationManager();
console.log('✓ Notification system initialized');

// Initialize task scheduler
const taskScheduler = new TaskScheduler();
console.log('✓ Task scheduler initialized');

// Initialize backup system
const configBackup = new ConfigBackup();
console.log('✓ Backup system initialized');

// Set up scheduler callback to execute commands
taskScheduler.setExecuteCallback(async (agentId, commands) => {
  const agentData = agents.get(agentId);
  if (!agentData) {
    throw new Error('Agent not connected');
  }

  // Execute commands sequentially
  const results = [];
  for (const cmd of commands) {
    const commandId = `sched-${agentId}-${Date.now()}`;
    
    agentData.ws.send(JSON.stringify({
      type: 'execute',
      command: cmd,
      commandId: commandId,
      requireConfirmation: false
    }));
    
    results.push({ command: cmd, commandId });
  }

  return { success: true, output: results };
});

// ===== COMMAND QUEUE ENDPOINTS =====

// Add command to queue
app.post('/api/queue/add', async (req, res) => {
  const { prompt, agentId } = req.body;
  
  if (!prompt || !agentId) {
    return res.status(400).json({ error: 'Missing prompt or agentId' });
  }
  
  try {
    const command = await processPrompt(prompt);
    const validation = validateCommand(command);
    
    if (!validation.allowed) {
      return res.status(403).json({ error: validation.reason });
    }
    
    const commandId = await commandQueue.addCommand(agentId, command, prompt);
    res.json({ success: true, commandId, command });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get queue for agent
app.get('/api/queue/:agentId', (req, res) => {
  const { agentId } = req.params;
  const queue = commandQueue.getQueue(agentId);
  res.json({ queue });
});

// Get queue status with statistics
app.get('/api/queue/:agentId/status', (req, res) => {
  const { agentId } = req.params;
  const queue = commandQueue.getQueue(agentId);
  const stats = commandQueue.getStats(agentId);
  
  res.json({ stats, queue });
});

// Execute next command in queue
app.post('/api/queue/execute-next', async (req, res) => {
  const { agentId } = req.body;
  
  const agentData = agents.get(agentId);
  if (!agentData) {
    return res.status(404).json({ error: 'Agent not connected' });
  }
  
  try {
    const nextCommand = await commandQueue.getNextCommand(agentId);
    if (!nextCommand) {
      return res.status(404).json({ error: 'No pending commands in queue' });
    }
    
    await commandQueue.markExecuting(nextCommand.id);
    
    agentData.ws.send(JSON.stringify({
      type: 'execute',
      command: nextCommand.command,
      commandId: nextCommand.id,
      requireConfirmation: false
    }));
    
    res.json({ success: true, command: nextCommand });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear queue
app.delete('/api/queue/:agentId', async (req, res) => {
  const { agentId } = req.params;
  try {
    await commandQueue.clearQueue(agentId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== GROUP MANAGEMENT ENDPOINTS =====

// Create group
app.post('/api/groups', async (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Missing group name' });
  }
  
  try {
    const result = await groupManager.createGroup(name, description);
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all groups
app.get('/api/groups', (req, res) => {
  const groups = groupManager.getAllGroups();
  res.json({ groups });
});

// Add agent to group
app.post('/api/groups/:groupName/agents', async (req, res) => {
  const { groupName } = req.params;
  const { agentId } = req.body;
  
  if (!agentId) {
    return res.status(400).json({ error: 'Missing agentId' });
  }
  
  try {
    const result = await groupManager.addAgentToGroup(groupName, agentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove agent from group
app.delete('/api/groups/:groupName/agents/:agentId', async (req, res) => {
  const { groupName, agentId } = req.params;
  try {
    const result = await groupManager.removeAgentFromGroup(groupName, agentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute on group
app.post('/api/groups/:groupName/execute', async (req, res) => {
  const { groupName } = req.params;
  const { prompt } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }
  
  const agentIds = groupManager.getGroupAgents(groupName);
  if (agentIds.length === 0) {
    return res.status(404).json({ error: 'No agents in group' });
  }
  
  try {
    const command = await processPrompt(prompt);
    const validation = validateCommand(command);
    
    if (!validation.allowed) {
      return res.status(403).json({ error: validation.reason });
    }
    
    const results = agentIds.map(id => {
      const agentData = agents.get(id);
      if (!agentData) {
        return { agentId: id, success: false, error: 'Agent not connected' };
      }
      
      try {
        const commandId = `cmd-${id}-${Date.now()}`;
        agentData.ws.send(JSON.stringify({
          type: 'execute',
          command,
          commandId: commandId,
          requireConfirmation: false
        }));
        return { agentId: id, commandId, success: true };
      } catch (error) {
        return { agentId: id, success: false, error: error.message };
      }
    });
    
    res.json({ success: true, command, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== LOGS ENDPOINT =====

// Get server logs
app.get('/api/logs', (req, res) => {
  const { lines = 100 } = req.query;
  const logFile = path.join(__dirname, '../logs/agent.log');
  
  try {
    if (!fs.existsSync(logFile)) {
      return res.json({ logs: [] });
    }
    
    const content = fs.readFileSync(logFile, 'utf8');
    const logLines = content.trim().split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line, level: 'info' };
        }
      })
      .slice(-parseInt(lines));
    
    res.json({ logs: logLines });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== DATABASE STATS ENDPOINT =====

// Get database statistics
app.get('/api/database/stats', (req, res) => {
  try {
    const stats = getDatabaseStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== COMMAND HISTORY ENDPOINTS =====

// Get command history
app.get('/api/history', (req, res) => {
  try {
    const { agentId, limit = 50 } = req.query;
    const history = commandHistory.getHistory(agentId, parseInt(limit));
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get history statistics
app.get('/api/history/stats', (req, res) => {
  try {
    const { agentId } = req.query;
    const stats = commandHistory.getStats(agentId);
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search command history
app.get('/api/history/search', (req, res) => {
  try {
    const { q, limit = 50 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Missing search query (q parameter)' });
    }
    
    const results = commandHistory.search(q);
    res.json({ results: results.slice(0, parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== NOTIFICATION ENDPOINTS =====

// Get recent notifications
app.get('/api/notifications', (req, res) => {
  try {
    const { channel, limit = 50 } = req.query;
    const notifications = notificationManager.getNotifications(channel, parseInt(limit));
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get notifications by channel
app.get('/api/notifications/:channel', (req, res) => {
  try {
    const { channel } = req.params;
    const { limit = 50 } = req.query;
    const notifications = notificationManager.getNotifications(channel, parseInt(limit));
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear notifications
app.delete('/api/notifications', requireAdmin, (req, res) => {
  try {
    notificationManager.clearAll();
    logger.info(`Notifications cleared by ${req.user.username}`);
    res.json({ success: true, message: 'Notifications cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SCHEDULER ENDPOINTS =====

// Create scheduled task
app.post('/api/scheduler/tasks', (req, res) => {
  const { taskId, agentId, commands, intervalMinutes, description } = req.body;

  if (!taskId || !agentId || !commands || !intervalMinutes) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!Array.isArray(commands) || commands.length === 0) {
    return res.status(400).json({ error: 'Commands must be a non-empty array' });
  }

  if (intervalMinutes < 1) {
    return res.status(400).json({ error: 'Interval must be at least 1 minute' });
  }

  try {
    const task = taskScheduler.addTask(taskId, agentId, commands, intervalMinutes, description);
    logger.info(`Scheduled task created: ${taskId} by ${req.user.username}`);
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List all scheduled tasks
app.get('/api/scheduler/tasks', (req, res) => {
  try {
    const tasks = taskScheduler.getTasks();
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific task
app.get('/api/scheduler/tasks/:taskId', (req, res) => {
  const { taskId } = req.params;
  
  try {
    const task = taskScheduler.getTask(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete scheduled task
app.delete('/api/scheduler/tasks/:taskId', (req, res) => {
  const { taskId } = req.params;

  try {
    taskScheduler.removeTask(taskId);
    logger.info(`Scheduled task deleted: ${taskId} by ${req.user.username}`);
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enable/disable task
app.patch('/api/scheduler/tasks/:taskId', (req, res) => {
  const { taskId } = req.params;
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be a boolean' });
  }

  try {
    const result = enabled 
      ? taskScheduler.enableTask(taskId)
      : taskScheduler.disableTask(taskId);

    if (!result) {
      return res.status(404).json({ error: 'Task not found' });
    }

    logger.info(`Task ${taskId} ${enabled ? 'enabled' : 'disabled'} by ${req.user.username}`);
    res.json({ success: true, enabled });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get task templates
app.get('/api/scheduler/templates', (req, res) => {
  try {
    res.json({ templates: scheduledTaskTemplates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== BACKUP ENDPOINTS =====

// Create backup
app.post('/api/backup/create', requireAdmin, async (req, res) => {
  const { name } = req.body;

  try {
    const backupPath = await configBackup.createBackup(name);
    logger.info(`Backup created: ${backupPath} by ${req.user.username}`);
    res.json({ success: true, backupPath });
  } catch (error) {
    logger.error('Backup creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List backups
app.get('/api/backup/list', requireAdmin, async (req, res) => {
  try {
    const backups = await configBackup.listBackups();
    res.json({ backups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restore backup
app.post('/api/backup/restore/:name', requireAdmin, async (req, res) => {
  const { name } = req.params;

  try {
    await configBackup.restore(name);
    logger.info(`Backup restored: ${name} by ${req.user.username}`);
    res.json({ success: true, message: 'Backup restored. Please restart server.' });
  } catch (error) {
    logger.error('Backup restore error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== COMMAND TEMPLATES ENDPOINT =====

// Get all command templates
app.get('/api/templates', async (req, res) => {
  try {
    const { getTemplates } = await import('./commands.js');
    const templates = getTemplates();
    res.json({ templates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute template
app.post('/api/templates/execute', async (req, res) => {
  const { templateId, agentId, params } = req.body;
  
  if (!templateId || !agentId) {
    return res.status(400).json({ error: 'Missing templateId or agentId' });
  }
  
  const agentData = agents.get(agentId);
  if (!agentData) {
    return res.status(404).json({ error: 'Agent not connected' });
  }
  
  try {
    const { getTemplates } = await import('./commands.js');
    const templates = getTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    let command = template.command;
    
    // Replace parameters
    if (params) {
      Object.keys(params).forEach(key => {
        command = command.replace(`{${key}}`, params[key]);
      });
    }
    
    const validation = validateCommand(command);
    if (!validation.allowed) {
      return res.status(403).json({ error: validation.reason });
    }
    
    const commandId = `cmd-${agentId}-${Date.now()}`;
    agentData.ws.send(JSON.stringify({
      type: 'execute',
      command,
      commandId: commandId,
      requireConfirmation: false
    }));
    
    res.json({ success: true, command, commandId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== OFFLINE ALERTS =====

// Check for offline agents and send alerts
setInterval(() => {
  const now = new Date();
  
  for (const [agentId, data] of agents.entries()) {
    const secondsSinceLastSeen = (now - data.lastSeen) / 1000;
    
    if (secondsSinceLastSeen > 30 && data.status === 'online') {
      data.status = 'offline';
      logger.warn(`Agent went offline: ${data.nickname} (${agentId})`);
      
      // You can add notification logic here
      // For example, send email, webhook, etc.
    }
  }
}, 10000); // Check every 10 seconds
