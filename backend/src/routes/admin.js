const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { list, getOne, create, update, setStatus } = require('../controllers/companiesController');
const { list: listUsers } = require('../controllers/usersController');
const { impersonate, getAuditLogs } = require('../controllers/adminController');

router.use(authenticate, requireRole('platform_admin'));

// empresas
router.get('/companies', list);
router.get('/companies/:id', getOne);
router.post('/companies', create);
router.put('/companies/:id', update);
router.patch('/companies/:id/status', setStatus);

// usuários por empresa
router.get('/companies/:companyId/users', listUsers);

// impersonate
router.post('/impersonate/:userId', impersonate);

// auditoria
router.get('/audit', getAuditLogs);

module.exports = router;
