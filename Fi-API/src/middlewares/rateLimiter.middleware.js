const { apiLimiter, quizLimiter, publicLimiter } = require('../services/rateLimitService');
const ApiError = require('../utils/apiError');

/**
 * Standard API rate limiter (uses authenticated UID, fallback to IP)
 */
const apiRateLimiter = (req, res, next) => {
  const identifier = req.user?.uid || req.userDetails?.uid || req.ip || 'anonymous';
  const key = `api-${identifier}`;

  if (!apiLimiter.isAllowed(key)) {
    return next(ApiError.tooManyRequests('Too many requests. Please slow down and try again later.'));
  }
  next();
};

/**
 * Strict rate limiter for AI quiz generation to prevent quota burnout
 */
const quizRateLimiter = (req, res, next) => {
  const identifier = req.user?.uid || req.ip || 'anonymous';
  const key = `quiz-${identifier}`;

  if (!quizLimiter.isAllowed(key)) {
    return next(ApiError.tooManyRequests('Rate limit exceeded for quiz generation. Please wait 5 minutes before trying again.'));
  }
  next();
};

/**
 * Public endpoint rate limiter (uses IP)
 */
const publicRateLimiter = (req, res, next) => {
  const key = `public-${req.ip || 'anonymous'}`;

  if (!publicLimiter.isAllowed(key)) {
    return next(ApiError.tooManyRequests('Too many requests. Please try again later.'));
  }
  next();
};

module.exports = {
  apiRateLimiter,
  quizRateLimiter,
  publicRateLimiter
};
