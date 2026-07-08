const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  listConversations,
  getConversation,
  assumeConversation,
  returnToAI,
  closeConversation,
  sendMessage,
} = require('../controllers/conversationsController');

router.use(authenticate);

router.get('/', listConversations);
router.get('/:id', getConversation);
router.post('/:id/assume', assumeConversation);
router.post('/:id/return-to-ai', returnToAI);
router.post('/:id/close', closeConversation);
router.post('/:id/messages', sendMessage);

module.exports = router;
