/**
 * Activity Feed Module
 * Tracks all agent activities for real-time monitoring
 */

class ActivityFeed {
  constructor(maxEntries = 500) {
    this.activities = [];
    this.maxEntries = maxEntries;
  }

  /**
   * Add activity entry
   */
  add(agentId, type, data) {
    const entry = {
      id: Date.now() + Math.random(),
      agentId,
      type, // 'command', 'connection', 'heartbeat', 'error', 'system_info'
      data,
      timestamp: new Date().toISOString()
    };

    this.activities.unshift(entry);

    // Keep only recent entries
    if (this.activities.length > this.maxEntries) {
      this.activities = this.activities.slice(0, this.maxEntries);
    }

    return entry;
  }

  /**
   * Get recent activities
   */
  getRecent(limit = 100, agentId = null) {
    let filtered = this.activities;

    if (agentId) {
      filtered = filtered.filter(a => a.agentId === agentId);
    }

    return filtered.slice(0, limit);
  }

  /**
   * Get activities by type
   */
  getByType(type, limit = 100) {
    return this.activities
      .filter(a => a.type === type)
      .slice(0, limit);
  }

  /**
   * Clear old activities
   */
  clear(olderThanMs = 3600000) { // Default 1 hour
    const cutoff = Date.now() - olderThanMs;
    this.activities = this.activities.filter(a => 
      new Date(a.timestamp).getTime() > cutoff
    );
  }
}

export default new ActivityFeed();
