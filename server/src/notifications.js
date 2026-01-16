import { notificationsDb } from './database.js';

// Notification system for important events with database persistence
export class NotificationManager {
  constructor() {
    this.subscribers = new Map();
    
    // Cleanup old notifications on startup (keep last 1000)
    notificationsDb.cleanup(1000);
    console.log('✓ Notification system initialized with database persistence');
  }

  subscribe(channel, callback) {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, []);
    }
    this.subscribers.get(channel).push(callback);
  }

  notify(channel, data) {
    const notification = {
      channel,
      data,
      timestamp: new Date().toISOString()
    };

    // Save to database
    notificationsDb.add(channel, data);

    // Notify subscribers
    const callbacks = this.subscribers.get(channel) || [];
    callbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Notification callback error:', error);
      }
    });
  }

  getNotifications(channel = null, limit = 50) {
    return notificationsDb.getRecent(limit, channel);
  }

  clearAll() {
    notificationsDb.clearAll();
  }
}

// Notification channels
export const NotificationChannels = {
  AGENT_CONNECTED: 'agent.connected',
  AGENT_DISCONNECTED: 'agent.disconnected',
  COMMAND_EXECUTED: 'command.executed',
  COMMAND_FAILED: 'command.failed',
  SECURITY_ALERT: 'security.alert',
  SYSTEM_ERROR: 'system.error'
};
