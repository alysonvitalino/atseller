const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { list, getOne, create, update, resetPassword } = require('../controllers/usersController');

router.use(authenticate, requireRole('gestor', 'platform_admin'));

router.get('/', list);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.patch('/:id/reset-password', resetPassword);

module.exports = router;
