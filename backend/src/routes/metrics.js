const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getSummary,
  getLeadsPerDay,
  getConversions,
  getMessagesVolume,
  getAgentDistribution,
} = require('../controllers/metricsController');

router.use(authenticate);

router.get('/summary', getSummary);
router.get('/leads-per-day', getLeadsPerDay);
router.get('/conversions', getConversions);
router.get('/messages-volume', getMessagesVolume);
router.get('/agent-distribution', getAgentDistribution);

module.exports = router;
