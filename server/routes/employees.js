const router = require('express').Router();
const multer = require('multer');
const ctrl   = require('../controllers/employeesController');
const { requireAuth } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname);
    cb(ok ? null : new Error('Only .xlsx or .xls files are allowed.'), ok);
  },
});

// Company settings
router.get('/settings',         requireAuth, ctrl.getSettings);
router.put('/settings',         requireAuth, ctrl.updateSettings);

function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

// Import / export — before /:empId
router.post('/import',          requireAuth, handleUpload, ctrl.importExcel);
router.get('/export/excel',     requireAuth, ctrl.exportExcel);

// Public — scanner needs employee lookup without login
router.get('/',                 ctrl.list);

// Employee CRUD — write operations require auth
router.get('/:empId',          requireAuth, ctrl.get);
router.post('/',               requireAuth, ctrl.create);
router.put('/:empId',          requireAuth, ctrl.update);
router.delete('/:empId',       requireAuth, ctrl.remove);

module.exports = router;
