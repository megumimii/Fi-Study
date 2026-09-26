const express = require('express');
const router = express.Router();

const courseRoutes = require('./course.routes');
const lessonRoutes = require('./lesson.routes');
const materialRoutes = require('./material.routes');
const userRoutes = require('./user.routes');
const quizRoutes = require('./quiz.routes');

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Fi-API'
  });
});

// Domain routes
router.use('/courses', courseRoutes);
router.use('/courses/:courseUID/lessons', lessonRoutes);
router.use('/courses/:courseUID/lessons/:lessonUID/materials', materialRoutes);
router.use('/users', userRoutes);
router.use('/quiz', quizRoutes);

module.exports = router;
