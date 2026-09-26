const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');

router.use(verifyFirebaseToken);
router.use(apiRateLimiter);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

module.exports = router;
