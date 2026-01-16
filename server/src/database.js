// Database module - using mock implementation until better-sqlite3 can be compiled
// To use real SQLite: Install Windows SDK and rebuild better-sqlite3

console.warn('⚠ Using mock database (in-memory only)');
console.warn('⚠ Data will not persist across server restarts');
console.warn('⚠ To enable persistence: Install Windows SDK 10.0.19041.0 and run: npm install better-sqlite3');

// Re-export everything from mock
export * from './database-mock.js';
