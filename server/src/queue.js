import { queueDb } from './database.js';
import { Mutex } from './mutex.js';

// Command Queue Manager with Database Persistence and Concurrency Control
class CommandQueue {
  constructor() {
    this.mutex = new Mutex();
    // Load existing queues from database on startup
    console.log('✓ Command queue loaded from database');
  }

  async addCommand(agentId, command, prompt) {
    return await this.mutex.runExclusive(`queue-${agentId}`, () => {
      const id = `${agentId}-${Date.now()}`;
      queueDb.add(id, agentId, command, prompt, 'pending');
      return id;
    });
  }

  getQueue(agentId) {
    return queueDb.getByAgent(agentId);
  }

  async getNextCommand(agentId) {
    return await this.mutex.runExclusive(`queue-${agentId}`, () => {
      return queueDb.getNextPending(agentId);
    });
  }

  async markExecuting(commandId) {
    return await this.mutex.runExclusive(`cmd-${commandId}`, () => {
      queueDb.markExecuting(commandId);
      return true;
    });
  }

  async markCompleted(commandId, result) {
    return await this.mutex.runExclusive(`cmd-${commandId}`, () => {
      queueDb.markCompleted(commandId, result);
      return true;
    });
  }

  async markFailed(commandId, error) {
    return await this.mutex.runExclusive(`cmd-${commandId}`, () => {
      queueDb.markFailed(commandId, error);
      return true;
    });
  }

  async clearQueue(agentId) {
    return await this.mutex.runExclusive(`queue-${agentId}`, () => {
      queueDb.clearByAgent(agentId);
    });
  }

  getAllQueues() {
    // This would require getting all unique agent IDs and their queues
    // For now, return empty object as this method isn't used
    return {};
  }

  getStats(agentId) {
    return queueDb.getStats(agentId);
  }
}

export const commandQueue = new CommandQueue();
