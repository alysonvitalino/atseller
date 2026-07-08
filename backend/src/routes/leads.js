const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { listLeads, getLead, createLead, updateLead, moveStage, deleteLead } = require('../controllers/leadsController');

router.use(authenticate);

router.get('/', listLeads);
router.get('/:id', getLead);
router.post('/', createLead);
router.put('/:id', updateLead);
router.patch('/:id/stage', moveStage);
router.delete('/:id', requireRole('gestor'), deleteLead);

module.exports = router;
