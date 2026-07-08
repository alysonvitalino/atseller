const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  me,
} = require('../controllers/authController');

router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, me);

module.exports = router;
