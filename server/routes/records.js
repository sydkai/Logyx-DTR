const router = require('express').Router();
const ctrl   = require('../controllers/recordsController');
const { requireAuth } = require('../middleware/auth');

// Public — scanner kiosk (no login required)
router.get('/today',              ctrl.todaySummary);
router.post('/',                  ctrl.create);

router.get('/',                   requireAuth, ctrl.list);
router.get('/export/:kind',       requireAuth, ctrl.exportExcel);
router.put('/:id',                requireAuth, ctrl.update);
router.delete('/:id',             requireAuth, ctrl.remove);
router.get('/:id/audit',          requireAuth, ctrl.getAuditTrail);

module.exports = router;




