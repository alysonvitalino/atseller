const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { listFlows, getFlow, createFlow, updateFlow, toggleActive, deleteFlow } = require('../controllers/flowsController');

router.use(authenticate);

router.get('/', listFlows);
router.get('/:id', getFlow);
router.post('/', requireRole('gestor'), createFlow);
router.put('/:id', requireRole('gestor'), updateFlow);
router.patch('/:id/toggle-active', requireRole('gestor'), toggleActive);
router.delete('/:id', requireRole('gestor'), deleteFlow);

module.exports = router;
