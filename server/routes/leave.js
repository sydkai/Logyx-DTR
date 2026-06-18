const router = require('express').Router();
const ctrl   = require('../controllers/leaveController');
const { requireAuth } = require('../middleware/auth');

// Public — employees submit from any PC on the office network (no login)
router.post('/', ctrl.create);

// Public read — scanner kiosk shows approved leaves without login
router.get('/', ctrl.list);

// Admin only — approve / reject / delete
router.get('/:id',                      requireAuth, ctrl.get);
router.patch('/:id/review',             requireAuth, ctrl.review);
router.delete('/:id',                   requireAuth, ctrl.remove);
router.get('/employee/:empId/approved', requireAuth, ctrl.getApprovedForEmployee);

module.exports = router;
