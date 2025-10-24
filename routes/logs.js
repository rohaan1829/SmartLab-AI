const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { logHelpers } = require('../utils/logger');

// Log frontend activity
router.post('/activity', async (req, res) => {
  try {
    const { activity, details, timestamp, userAgent, url, userId, sessionId } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    // Log the activity
    logHelpers.logActivity('FRONTEND_ACTIVITY', {
      activity,
      details,
      timestamp,
      userAgent,
      url,
      userId,
      sessionId,
      ip
    });

    res.status(200).json({ message: 'Activity logged successfully' });
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'frontend_activity_logging',
      ip: req.ip || req.connection.remoteAddress
    });
    res.status(500).json({ message: 'Error logging activity' });
  }
});

// Get activity logs (admin only)
router.get('/activity', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50, activity, userId, startDate, endDate } = req.query;
    
    // This would typically query a database of activity logs
    // For now, we'll return a placeholder response
    res.status(200).json({
      message: 'Activity logs endpoint - implement database query',
      query: { page, limit, activity, userId, startDate, endDate }
    });
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'get_activity_logs',
      userId: req.user._id
    });
    res.status(500).json({ message: 'Error fetching activity logs' });
  }
});

module.exports = router;
