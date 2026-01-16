import fs from 'fs/promises';
import path from 'path';

// Configuration backup and restore
export class ConfigBackup {
  constructor(backupDir = './backups') {
    this.backupDir = backupDir;
  }

  async createBackup(name = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = name || `backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);

    await fs.mkdir(backupPath, { recursive: true });

    // Backup .env file
    try {
      const envContent = await fs.readFile('.env', 'utf-8');
      await fs.writeFile(
        path.join(backupPath, '.env'),
        envContent
      );
    } catch (error) {
      console.error('Failed to backup .env:', error);
    }

    // Backup logs
    try {
      await fs.cp('./logs', path.join(backupPath, 'logs'), { recursive: true });
    } catch (error) {
      console.error('Failed to backup logs:', error);
    }

    return backupPath;
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          backups.push({
            name: file,
            created: stats.birthtime,
            size: stats.size
          });
        }
      }

      return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
      return [];
    }
  }

  async restore(backupName) {
    const backupPath = path.join(this.backupDir, backupName);
    
    // Restore .env
    try {
      const envContent = await fs.readFile(
        path.join(backupPath, '.env'),
        'utf-8'
      );
      await fs.writeFile('.env', envContent);
    } catch (error) {
      throw new Error(`Failed to restore .env: ${error.message}`);
    }

    return true;
  }
}
