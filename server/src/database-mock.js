// Mock database for when better-sqlite3 can't be compiled
// This provides in-memory storage as a fallback

console.warn('⚠ Using mock database (in-memory only) - better-sqlite3 not available');
console.warn('⚠ Data will not persist across server restarts');

// In-memory storage
const storage = {
  queue: [],
  groups: [],
  groupMembers: [],
  history: [],
  tasks: [],
  notifications: []
};

// Mock queue operations
export const queueDb = {
  add(id, agentId, command, prompt, status) {
    storage.queue.push({ id, agent_id: agentId, command, prompt, status, added_at: new Date().toISOString() });
  },
  getByAgent(agentId) {
    return storage.queue.filter(q => q.agent_id === agentId);
  },
  getNextPending(agentId) {
    return storage.queue.find(q => q.agent_id === agentId && q.status === 'pending');
  },
  markExecuting(commandId) {
    const cmd = storage.queue.find(q => q.id === commandId);
    if (cmd) {
      cmd.status = 'executing';
      cmd.executed_at = new Date().toISOString();
    }
  },
  markCompleted(commandId, result) {
    const cmd = storage.queue.find(q => q.id === commandId);
    if (cmd) {
      cmd.status = 'completed';
      cmd.result = JSON.stringify(result);
    }
  },
  markFailed(commandId, error) {
    const cmd = storage.queue.find(q => q.id === commandId);
    if (cmd) {
      cmd.status = 'failed';
      cmd.result = error;
    }
  },
  clearByAgent(agentId) {
    storage.queue = storage.queue.filter(q => q.agent_id !== agentId);
  },
  getStats(agentId) {
    const queue = storage.queue.filter(q => q.agent_id === agentId);
    return {
      total: queue.length,
      pending: queue.filter(q => q.status === 'pending').length,
      executing: queue.filter(q => q.status === 'executing').length,
      completed: queue.filter(q => q.status === 'completed').length,
      failed: queue.filter(q => q.status === 'failed').length
    };
  }
};

// Mock groups operations
export const groupsDb = {
  create(name, description) {
    if (storage.groups.find(g => g.name === name)) {
      return { success: false, error: 'Group already exists' };
    }
    storage.groups.push({ name, description, created_at: new Date().toISOString() });
    return { success: true };
  },
  delete(name) {
    storage.groups = storage.groups.filter(g => g.name !== name);
    storage.groupMembers = storage.groupMembers.filter(m => m.group_name !== name);
    return { success: true };
  },
  addAgent(groupName, agentId) {
    if (!storage.groupMembers.find(m => m.group_name === groupName && m.agent_id === agentId)) {
      storage.groupMembers.push({ group_name: groupName, agent_id: agentId, added_at: new Date().toISOString() });
    }
    return { success: true };
  },
  removeAgent(groupName, agentId) {
    storage.groupMembers = storage.groupMembers.filter(m => !(m.group_name === groupName && m.agent_id === agentId));
    return { success: true };
  },
  getAgents(groupName) {
    return storage.groupMembers.filter(m => m.group_name === groupName);
  },
  getAll() {
    return storage.groups.map(g => ({
      ...g,
      count: storage.groupMembers.filter(m => m.group_name === g.name).length
    }));
  },
  getAgentGroups(agentId) {
    return storage.groupMembers
      .filter(m => m.agent_id === agentId)
      .map(m => storage.groups.find(g => g.name === m.group_name))
      .filter(g => g);
  }
};

// Mock history operations
export const historyDb = {
  add(id, agentId, prompt, command, success, output, commandId) {
    storage.history.push({
      id,
      agent_id: agentId,
      prompt,
      command,
      success: success ? 1 : 0,
      output,
      timestamp: new Date().toISOString(),
      command_id: commandId
    });
  },
  getRecent(agentId, limit) {
    let filtered = storage.history;
    if (agentId) {
      filtered = filtered.filter(h => h.agent_id === agentId);
    }
    return filtered.slice(-limit).reverse();
  },
  getStats(agentId) {
    let filtered = storage.history;
    if (agentId) {
      filtered = filtered.filter(h => h.agent_id === agentId);
    }
    const total = filtered.length;
    const successful = filtered.filter(h => h.success).length;
    return {
      total,
      successful,
      failed: total - successful,
      successRate: total > 0 ? (successful / total) * 100 : 0
    };
  },
  search(query) {
    return storage.history.filter(h =>
      h.command.toLowerCase().includes(query.toLowerCase()) ||
      (h.prompt && h.prompt.toLowerCase().includes(query.toLowerCase()))
    );
  }
};

// Mock tasks operations
export const tasksDb = {
  add(id, agentId, commands, intervalMinutes, description) {
    storage.tasks.push({
      id,
      agent_id: agentId,
      commands: JSON.stringify(commands),
      interval_minutes: intervalMinutes,
      description,
      next_run: new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString(),
      enabled: 1,
      created_at: new Date().toISOString()
    });
  },
  getAll() {
    return storage.tasks.map(t => ({
      ...t,
      commands: JSON.parse(t.commands),
      enabled: Boolean(t.enabled)
    }));
  },
  getById(id) {
    const task = storage.tasks.find(t => t.id === id);
    if (task) {
      return {
        ...task,
        commands: JSON.parse(task.commands),
        enabled: Boolean(task.enabled)
      };
    }
    return null;
  },
  updateRunTimes(id, lastRun, nextRun) {
    const task = storage.tasks.find(t => t.id === id);
    if (task) {
      task.last_run = lastRun;
      task.next_run = nextRun;
    }
  },
  setEnabled(id, enabled) {
    const task = storage.tasks.find(t => t.id === id);
    if (task) {
      task.enabled = enabled ? 1 : 0;
    }
  },
  delete(id) {
    storage.tasks = storage.tasks.filter(t => t.id !== id);
  }
};

// Mock notifications operations
export const notificationsDb = {
  add(channel, data) {
    storage.notifications.push({
      id: storage.notifications.length + 1,
      channel,
      data: JSON.stringify(data),
      timestamp: new Date().toISOString()
    });
  },
  getRecent(limit, channel) {
    let filtered = storage.notifications;
    if (channel) {
      filtered = filtered.filter(n => n.channel === channel);
    }
    return filtered.slice(-limit).reverse().map(n => ({
      ...n,
      data: JSON.parse(n.data)
    }));
  },
  cleanup(keepLast) {
    if (storage.notifications.length > keepLast) {
      storage.notifications = storage.notifications.slice(-keepLast);
    }
  },
  clearAll() {
    storage.notifications = [];
  }
};

export function getDatabaseStats() {
  return {
    queueSize: storage.queue.length,
    groupsCount: storage.groups.length,
    historySize: storage.history.length,
    tasksCount: storage.tasks.length,
    notificationsCount: storage.notifications.length,
    databaseSize: 0
  };
}

export function closeDatabase() {
  // No-op for mock
}

console.log('✓ Mock database initialized (in-memory only)');
