import { historyDb } from './database.js';

// Command execution history tracking with Database Persistence
export class CommandHistory {
  constructor() {
    console.log('✓ Command history loaded from database');
  }

  async load() {
    // No longer needed - data is in database
  }

  async save() {
    // No longer needed - data is in database
  }

  addEntry(entry) {
    const id = entry.id || `hist-${Date.now()}`;
    historyDb.add(
      id,
      entry.agentId,
      entry.prompt,
      entry.command,
      entry.success,
      entry.output,
      entry.commandId
    );
  }

  getHistory(agentId = null, limit = 50) {
    if (agentId) {
      return historyDb.getByAgent(agentId, limit);
    }
    return historyDb.getAll(limit);
  }

  getStats(agentId = null) {
    const stats = historyDb.getStats(agentId);
    return {
      total: stats.total || 0,
      successful: stats.successful || 0,
      failed: stats.failed || 0,
      lastExecution: null // Would need separate query for this
    };
  }

  search(query) {
    return historyDb.search(query);
  }
}
