// Simple mutex implementation for concurrency control
export class Mutex {
  constructor() {
    this.locks = new Map();
    this.queue = new Map();
  }

  async acquire(key) {
    // If lock exists, wait for it
    while (this.locks.has(key)) {
      await new Promise(resolve => {
        if (!this.queue.has(key)) {
          this.queue.set(key, []);
        }
        this.queue.get(key).push(resolve);
      });
    }

    // Acquire lock
    this.locks.set(key, true);
  }

  release(key) {
    // Release lock
    this.locks.delete(key);

    // Notify next waiter
    const waiters = this.queue.get(key);
    if (waiters && waiters.length > 0) {
      const resolve = waiters.shift();
      resolve();
      
      if (waiters.length === 0) {
        this.queue.delete(key);
      }
    }
  }

  async runExclusive(key, callback) {
    await this.acquire(key);
    try {
      return await callback();
    } finally {
      this.release(key);
    }
  }
}

// Global mutex instance
export const globalMutex = new Mutex();
