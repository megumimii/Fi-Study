const express = require('express');
const router = express.Router({ mergeParams: true });
const materialController = require('../controllers/material.controller');
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');

router.use(verifyFirebaseToken);
router.use(apiRateLimiter);

router.get('/', materialController.getMaterials);
router.post('/', materialController.createMaterial);
router.get('/:materialUID', materialController.getMaterialById);
router.put('/:materialUID', materialController.updateMaterial);
router.patch('/:materialUID/progress', materialController.updateProgress);
router.delete('/:materialUID', materialController.deleteMaterial);

module.exports = router;
