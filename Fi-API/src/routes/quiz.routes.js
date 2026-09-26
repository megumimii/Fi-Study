const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quiz.controller');
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');
const { quizRateLimiter } = require('../middlewares/rateLimiter.middleware');

// Quiz generation requires authentication and the strict quiz rate limiter
router.post('/generate', verifyFirebaseToken, quizRateLimiter, quizController.generateQuiz);

module.exports = router;
