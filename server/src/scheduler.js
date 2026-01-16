import { tasksDb } from './database.js';

// Scheduled task management with database persistence
export class TaskScheduler {
  constructor() {
    this.intervals = new Map();
    this.executeCallback = null;
    
    // Load tasks from database and restart intervals
    this.loadTasks();
  }

  loadTasks() {
    const tasks = tasksDb.getAll();
    for (const task of tasks) {
      if (task.enabled) {
        this.startInterval(task);
      }
    }
    console.log(`✓ Loaded ${tasks.length} scheduled tasks from database`);
  }

  startInterval(task) {
    const intervalMs = task.interval_minutes * 60 * 1000;
    const interval = setInterval(() => {
      this.executeTask(task.id);
    }, intervalMs);
    
    this.intervals.set(task.id, interval);
  }

  // Set the callback function for executing commands
  setExecuteCallback(callback) {
    this.executeCallback = callback;
  }

  addTask(taskId, agentId, commands, intervalMinutes, description = '') {
    // Clear existing task if it exists
    if (this.intervals.has(taskId)) {
      this.removeTask(taskId);
    }

    // Add to database
    tasksDb.add(taskId, agentId, commands, intervalMinutes, description);
    
    // Get the task back from database
    const task = tasksDb.getById(taskId);
    
    // Start interval
    this.startInterval(task);
    
    return task;
  }

  removeTask(taskId) {
    const interval = this.intervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(taskId);
    }
    tasksDb.delete(taskId);
  }

  async executeTask(taskId) {
    const task = tasksDb.getById(taskId);
    if (!task || !task.enabled) return;

    const lastRun = new Date().toISOString();
    const nextRun = new Date(Date.now() + task.interval_minutes * 60 * 1000).toISOString();
    
    tasksDb.updateRunTimes(taskId, lastRun, nextRun);

    // Execute commands if callback is set
    if (this.executeCallback) {
      try {
        await this.executeCallback(task.agent_id, task.commands);
      } catch (error) {
        console.error(`Task execution error (${taskId}):`, error);
      }
    }
  }

  getTasks() {
    return tasksDb.getAll();
  }

  getTask(taskId) {
    return tasksDb.getById(taskId);
  }

  enableTask(taskId) {
    tasksDb.setEnabled(taskId, true);
    const task = tasksDb.getById(taskId);
    if (task && !this.intervals.has(taskId)) {
      this.startInterval(task);
    }
    return true;
  }

  disableTask(taskId) {
    tasksDb.setEnabled(taskId, false);
    const interval = this.intervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(taskId);
    }
    return true;
  }
}

// Example scheduled tasks
export const scheduledTaskTemplates = {
  dailyHealthCheck: {
    name: 'Daily Health Check',
    commands: ['systemInfo', 'diskSpace', 'memoryUsage'],
    intervalMinutes: 1440, // 24 hours
    description: 'Daily system health check'
  },
  hourlyNetworkCheck: {
    name: 'Hourly Network Check',
    commands: ['ipConfig', 'activeConnections'],
    intervalMinutes: 60,
    description: 'Hourly network status check'
  },
  securityAudit: {
    name: 'Security Audit',
    commands: ['firewallStatus', 'antivirusStatus', 'windowsUpdates'],
    intervalMinutes: 720, // 12 hours
    description: 'Bi-daily security audit'
  },
  diskSpaceMonitor: {
    name: 'Disk Space Monitor',
    commands: ['diskSpace'],
    intervalMinutes: 180, // 3 hours
    description: 'Monitor disk space every 3 hours'
  }
};
