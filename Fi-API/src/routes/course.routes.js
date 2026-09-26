const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');

// All course routes require authentication and rate limiting
router.use(verifyFirebaseToken);
router.use(apiRateLimiter);

router.get('/', courseController.getCourses);
router.post('/', courseController.createCourse);
router.get('/:courseUID', courseController.getCourseById);
router.put('/:courseUID', courseController.updateCourse);
router.delete('/:courseUID', courseController.deleteCourse);

module.exports = router;
