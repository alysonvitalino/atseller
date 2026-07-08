const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
  getStatus,
  connect,
  getQRCode,
  disconnect,
  reconnect,
  subscribe,
} = require('../controllers/whatsappController');

router.use(authenticate, requireRole('gestor', 'platform_admin'));

router.get('/status', getStatus);
router.get('/qr', getQRCode);
router.get('/events', subscribe);         // SSE
router.post('/connect', connect);
router.post('/disconnect', disconnect);
router.post('/reconnect', reconnect);

module.exports = router;
