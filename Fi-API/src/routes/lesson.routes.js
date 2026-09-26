const express = require('express');
const router = express.Router({ mergeParams: true });
const lessonController = require('../controllers/lesson.controller');
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');

router.use(verifyFirebaseToken);
router.use(apiRateLimiter);

router.get('/', lessonController.getLessons);
router.post('/', lessonController.createLesson);
router.get('/:lessonUID', lessonController.getLessonById);
router.put('/:lessonUID', lessonController.updateLesson);
router.delete('/:lessonUID', lessonController.deleteLesson);

module.exports = router;
