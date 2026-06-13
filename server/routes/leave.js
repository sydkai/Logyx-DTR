const router = require('express').Router();
const ctrl   = require('../controllers/leaveController');
const { requireAuth } = require('../middleware/auth');

// Public — employees submit requests without logging in
router.post('/', ctrl.create);

// Protected — admin views and acts on requests
router.get('/',                              requireAuth, ctrl.list);
router.get('/:id',                           requireAuth, ctrl.get);
router.patch('/:id/review',                  requireAuth, ctrl.review);
router.delete('/:id',                        requireAuth, ctrl.remove);
router.get('/employee/:empId/approved',      requireAuth, ctrl.getApprovedForEmployee);

module.exports = router;
