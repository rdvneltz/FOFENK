const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

// Backup directory
const BACKUP_DIR = path.join(__dirname, '../../backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Create a MongoDB backup
 */
const createBackup = async () => {
  try {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupName = `backup-${timestamp}`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    // MongoDB connection string from environment
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fofora-theatre';

    // Extract database name from URI
    const dbName = mongoUri.split('/').pop().split('?')[0];

    // Create backup using mongodump
    const command = `mongodump --uri="${mongoUri}" --out="${backupPath}"`;

    await execPromise(command);

    // Get backup size
    const stats = await getDirectorySize(backupPath);

    return {
      success: true,
      backupName,
      path: backupPath,
      size: stats.size,
      timestamp: new Date(),
      database: dbName
    };
  } catch (error) {
    console.error('Backup creation error:', error);
    throw new Error(`Backup failed: ${error.message}`);
  }
};

/**
 * List all backups
 */
const listBackups = async () => {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const backups = [];

    for (const file of files) {
      const backupPath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(backupPath);

      if (stats.isDirectory()) {
        const size = await getDirectorySize(backupPath);
        backups.push({
          name: file,
          path: backupPath,
          size: size.size,
          sizeFormatted: formatBytes(size.size),
          created: stats.birthtime,
          modified: stats.mtime
        });
      }
    }

    // Sort by creation date (newest first)
    backups.sort((a, b) => b.created - a.created);

    return backups;
  } catch (error) {
    console.error('List backups error:', error);
    throw new Error(`Failed to list backups: ${error.message}`);
  }
};

/**
 * Restore a backup
 */
const restoreBackup = async (backupName) => {
  try {
    const backupPath = path.join(BACKUP_DIR, backupName);

    // Check if backup exists
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup not found');
    }

    // MongoDB connection string
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fofora-theatre';
    const dbName = mongoUri.split('/').pop().split('?')[0];

    // Restore using mongorestore
    const command = `mongorestore --uri="${mongoUri}" --drop "${path.join(backupPath, dbName)}"`;

    await execPromise(command);

    return {
      success: true,
      message: 'Backup restored successfully',
      backupName,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Restore backup error:', error);
    throw new Error(`Restore failed: ${error.message}`);
  }
};

/**
 * Delete a backup
 */
const deleteBackup = async (backupName) => {
  try {
    const backupPath = path.join(BACKUP_DIR, backupName);

    // Check if backup exists
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup not found');
    }

    // Delete directory recursively
    fs.rmSync(backupPath, { recursive: true, force: true });

    return {
      success: true,
      message: 'Backup deleted successfully',
      backupName
    };
  } catch (error) {
    console.error('Delete backup error:', error);
    throw new Error(`Delete failed: ${error.message}`);
  }
};

/**
 * Schedule automatic backup (called at server startup)
 */
const scheduleAutoBackup = () => {
  // Schedule backup at 2:00 AM every day
  const schedule = () => {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(2, 0, 0, 0);

    // If 2 AM has passed today, schedule for tomorrow
    if (now > scheduledTime) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilBackup = scheduledTime - now;

    setTimeout(async () => {
      console.log('Starting scheduled backup...');
      try {
        const result = await createBackup();
        console.log('Scheduled backup completed:', result.backupName);

        // Clean up old backups (keep last 30 days)
        await cleanupOldBackups(30);

        // Schedule next backup
        schedule();
      } catch (error) {
        console.error('Scheduled backup failed:', error);
        // Still schedule next backup even if this one fails
        schedule();
      }
    }, timeUntilBackup);

    console.log(`Next automatic backup scheduled at: ${scheduledTime.toLocaleString()}`);
  };

  schedule();
};

/**
 * Clean up backups older than specified days
 */
const cleanupOldBackups = async (daysToKeep = 30) => {
  try {
    const backups = await listBackups();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    for (const backup of backups) {
      if (backup.created < cutoffDate) {
        await deleteBackup(backup.name);
        console.log(`Cleaned up old backup: ${backup.name}`);
      }
    }
  } catch (error) {
    console.error('Cleanup old backups error:', error);
  }
};

/**
 * Get directory size recursively
 */
const getDirectorySize = async (dirPath) => {
  let totalSize = 0;
  let fileCount = 0;

  const calculateSize = (itemPath) => {
    const stats = fs.statSync(itemPath);

    if (stats.isDirectory()) {
      const files = fs.readdirSync(itemPath);
      files.forEach(file => {
        calculateSize(path.join(itemPath, file));
      });
    } else {
      totalSize += stats.size;
      fileCount++;
    }
  };

  calculateSize(dirPath);

  return { size: totalSize, fileCount };
};

/**
 * Format bytes to human readable format
 */
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

module.exports = {
  createBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
  scheduleAutoBackup,
  cleanupOldBackups,
  BACKUP_DIR
};
