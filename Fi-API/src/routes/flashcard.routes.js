const express = require('express');
const router = express.Router();
const flashcardController = require('../controllers/flashcard.controller');
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');
const { quizRateLimiter } = require('../middlewares/rateLimiter.middleware');

router.post(
  '/generate',
  verifyFirebaseToken,
  quizRateLimiter,
  flashcardController.generateFlashcards
);

module.exports = router;

