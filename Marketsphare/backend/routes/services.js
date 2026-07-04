'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/servicesController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/',          optionalAuth, ctrl.getServices);
router.get('/mine',      protect, ctrl.getMyServices);
router.get('/:id',       optionalAuth, ctrl.getServiceById);
router.post('/',         protect, ctrl.createService);
router.put('/:id',       protect, ctrl.updateService);
router.delete('/:id',    protect, ctrl.deleteService);
router.post('/:id/review', protect, ctrl.addReview);

module.exports = router;
