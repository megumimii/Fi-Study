const { auth, db } = require('../config/firebase');
const { userCache } = require('../services/cacheService');
const ApiError = require('../utils/apiError');

/**
 * Middleware to verify Firebase ID token in Authorization header
 */
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(ApiError.unauthorized('Missing or invalid Authorization header'));
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    if (!idToken) {
      return next(ApiError.unauthorized('Bearer token cannot be empty'));
    }

    // Verify token with Firebase Admin SDK
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Check user cache first
    let userDetails = userCache.get(uid);

    if (!userDetails) {
      try {
        // Query RTDB for user details
        const userSnap = await db.ref(`users/${uid}`).once('value');
        if (userSnap.exists()) {
          userDetails = { uid, ...userSnap.val() };
          userCache.set(uid, userDetails);
        } else {
          userDetails = { uid, email: decodedToken.email };
        }
      } catch (dbErr) {
        console.warn('Notice: Could not load user details from database in auth middleware:', dbErr.message);
        const nameParts = (decodedToken.name || '').split(' ');
        userDetails = {
          uid,
          email: decodedToken.email || '',
          firstName: nameParts[0] || 'User',
          lastName: nameParts.slice(1).join(' ') || '',
          profilePicture: decodedToken.picture || ''
        };
      }
    }

    req.user = decodedToken;
    req.userDetails = userDetails;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error.message || error);
    return next(ApiError.unauthorized('Unauthorized: Invalid or expired token'));
  }
};

module.exports = {
  verifyFirebaseToken
};
