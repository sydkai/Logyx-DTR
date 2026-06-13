const router = require('express').Router();
const ctrl   = require('../controllers/recordsController');
const { requireAuth } = require('../middleware/auth');

router.get('/today',              requireAuth, ctrl.todaySummary);
router.get('/',                   requireAuth, ctrl.list);
router.get('/export/:kind',       requireAuth, ctrl.exportExcel);
router.post('/',                  requireAuth, ctrl.create);
router.put('/:id',                requireAuth, ctrl.update);
router.delete('/:id',             requireAuth, ctrl.remove);
router.get('/:id/audit',          requireAuth, ctrl.getAuditTrail);

module.exports = router;




