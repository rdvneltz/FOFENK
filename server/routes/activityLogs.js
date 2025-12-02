const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');

// Get all activity logs with filtering (read-only)
router.get('/', async (req, res) => {
  try {
    const { entity, action, user, startDate, endDate } = req.query;
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;
    if (entity) filter.entity = entity;
    if (action) filter.action = action;
    if (user) filter.user = user;

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const activityLogs = await ActivityLog.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .sort({ createdAt: -1 })
      .limit(1000); // Limit to last 1000 records

    res.json(activityLogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get activity log by ID (read-only)
router.get('/:id', async (req, res) => {
  try {
    const activityLog = await ActivityLog.findById(req.params.id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate');

    if (!activityLog) {
      return res.status(404).json({ message: 'Aktivite kaydı bulunamadı' });
    }
    res.json(activityLog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get activity logs by entity (read-only)
router.get('/entity/:entityId', async (req, res) => {
  try {
    const activityLogs = await ActivityLog.find({ entityId: req.params.entityId })
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .sort({ createdAt: -1 });

    res.json(activityLogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get recent activity logs (read-only)
router.get('/recent/:limit', async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 50;
    const { institutionId, seasonId } = req.query;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

    const activityLogs = await ActivityLog.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(activityLogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
