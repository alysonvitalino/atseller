const router = require('express').Router();
const { handleWhatsApp } = require('../controllers/webhookController');

// rota pública — UazAPI não envia headers de auth, verificamos a assinatura futuramente
router.post('/whatsapp', handleWhatsApp);

module.exports = router;
