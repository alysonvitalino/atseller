const router = require('express').Router();
const multer = require('multer');
const { authenticate, requireRole } = require('../middleware/auth');
const { list, getOne, create, update, remove, getAvailableTools } = require('../controllers/agentsController');
const { listDocuments, uploadDocument, deleteDocument, semanticSearch } = require('../controllers/knowledgeController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const byExt = file.originalname.match(/\.(pdf|docx|txt)$/i);
    if (allowed.includes(file.mimetype) || byExt) cb(null, true);
    else cb(new Error('Tipo de arquivo não suportado. Use PDF, DOCX ou TXT.'));
  },
});

router.use(authenticate, requireRole('gestor', 'platform_admin'));

// agentes
router.get('/', list);
router.get('/tools', getAvailableTools);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

// base de conhecimento
router.get('/:agentId/documents', listDocuments);
router.post('/:agentId/documents', upload.single('file'), uploadDocument);
router.delete('/:agentId/documents/:docId', deleteDocument);

// busca semântica (usada internamente pelo engine de fluxo)
router.post('/:agentId/search', semanticSearch);

module.exports = router;
