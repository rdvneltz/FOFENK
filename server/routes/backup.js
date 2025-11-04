const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const backupManager = require('../utils/backupManager');

// Create a new backup
router.post('/create', async (req, res) => {
  try {
    const result = await backupManager.createBackup();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// List all backups
router.get('/list', async (req, res) => {
  try {
    const backups = await backupManager.listBackups();
    res.json(backups);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Restore a backup
router.post('/restore/:backupName', async (req, res) => {
  try {
    const { backupName } = req.params;
    const result = await backupManager.restoreBackup(backupName);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete a backup
router.delete('/:backupName', async (req, res) => {
  try {
    const { backupName } = req.params;
    const result = await backupManager.deleteBackup(backupName);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Download a backup
router.get('/download/:backupName', async (req, res) => {
  try {
    const { backupName } = req.params;
    const backupPath = path.join(backupManager.BACKUP_DIR, backupName);

    // Check if backup exists
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    // Create a zip file of the backup
    const zipFileName = `${backupName}.zip`;

    res.attachment(zipFileName);
    res.setHeader('Content-Type', 'application/zip');

    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    archive.on('error', (err) => {
      res.status(500).json({
        success: false,
        message: err.message
      });
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add backup directory to archive
    archive.directory(backupPath, backupName);

    // Finalize the archive
    archive.finalize();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get backup settings
router.get('/settings', async (req, res) => {
  try {
    // Return current backup settings
    res.json({
      autoBackupEnabled: true,
      autoBackupTime: '02:00',
      retentionDays: 30,
      backupDirectory: backupManager.BACKUP_DIR
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
