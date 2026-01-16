import { groupsDb } from './database.js';
import { Mutex } from './mutex.js';

// Agent Groups Manager with Database Persistence and Concurrency Control
class GroupManager {
  constructor() {
    this.mutex = new Mutex();
    // Load existing groups from database on startup
    console.log('✓ Agent groups loaded from database');
  }

  async createGroup(name, description = '') {
    return await this.mutex.runExclusive(`group-${name}`, () => {
      return groupsDb.create(name, description);
    });
  }

  async deleteGroup(name) {
    return await this.mutex.runExclusive(`group-${name}`, () => {
      return groupsDb.delete(name);
    });
  }

  async addAgentToGroup(groupName, agentId) {
    return await this.mutex.runExclusive(`group-${groupName}`, () => {
      return groupsDb.addAgent(groupName, agentId);
    });
  }

  async removeAgentFromGroup(groupName, agentId) {
    return await this.mutex.runExclusive(`group-${groupName}`, () => {
      return groupsDb.removeAgent(groupName, agentId);
    });
  }

  getGroupAgents(groupName) {
    const members = groupsDb.getAgents(groupName);
    return members.map(m => m.agent_id);
  }

  getAllGroups() {
    const groups = groupsDb.getAll();
    const result = {};
    
    for (const group of groups) {
      const members = groupsDb.getAgents(group.name);
      result[group.name] = {
        agents: members.map(m => m.agent_id),
        description: group.description,
        createdAt: group.created_at,
        count: group.count
      };
    }
    
    return result;
  }

  getAgentGroups(agentId) {
    const groups = groupsDb.getAgentGroups(agentId);
    return groups.map(g => g.name);
  }
}

export const groupManager = new GroupManager();
