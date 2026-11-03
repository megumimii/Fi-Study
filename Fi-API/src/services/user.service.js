const { db, auth } = require('../config/firebase');
const { userCache } = require('./cacheService');
const { sanitizeInput } = require('../utils/sanitize');
const ApiError = require('../utils/apiError');
const crypto = require('crypto');

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

class UserService {
  /**
   * Get user profile by UID
   */
  async getProfile(userUid, tokenUser = {}) {
    const cached = userCache.get(userUid);
    if (cached) {
      return cached;
    }

    try {
      const snapshot = await db.ref(`users/${userUid}`).once('value');
      if (snapshot.exists()) {
        const userData = { uid: userUid, ...snapshot.val() };
        userCache.set(userUid, userData, 300000); // 5 minutes
        return userData;
      }
    } catch (dbErr) {
      console.warn('Notice: Could not read user profile from database in UserService:', dbErr.message);
    }

    let email = tokenUser.email || '';
    let displayName = tokenUser.name || '';
    if (!email || !displayName) {
      try {
        const authUser = await auth.getUser(userUid);
        email = email || authUser.email || '';
        displayName = displayName || authUser.displayName || '';
      } catch (e) {
        // Ignored if admin credentials not present
      }
    }

    const firstName = displayName ? displayName.split(' ')[0] : (email ? email.split('@')[0] : 'User');
    const lastName = displayName ? displayName.split(' ').slice(1).join(' ') : '';
    const defaultProfile = {
      uid: userUid,
      firstName,
      lastName,
      email,
      profilePicture: tokenUser.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}+${encodeURIComponent(lastName)}&background=10141e&color=4A8BDF&size=512`,
      createdAt: new Date().toISOString()
    };

    try {
      await db.ref(`users/${userUid}`).set(defaultProfile);
    } catch (e) {
      // Ignored if write is not permitted
    }

    userCache.set(userUid, defaultProfile, 300000);
    return defaultProfile;
  }

  /**
   * Update user profile
   */
  async updateProfile(userUid, data) {
    const userRef = db.ref(`users/${userUid}`);
    const snapshot = await userRef.once('value');

    const updates = {};
    if (data.firstName !== undefined) updates.firstName = sanitizeInput(data.firstName);
    if (data.lastName !== undefined) updates.lastName = sanitizeInput(data.lastName);
    if (data.profilePicture !== undefined) updates.profilePicture = data.profilePicture;
    if (data.coverPicture !== undefined) updates.coverPicture = data.coverPicture;
    updates.updatedAt = new Date().toISOString();

    if (snapshot.exists()) {
      await userRef.update(updates);
    } else {
      await userRef.set({
        email: data.email || '',
        ...updates,
        createdAt: new Date().toISOString()
      });
    }

    userCache.delete(userUid);

    const updatedSnap = await userRef.once('value');
    const updatedData = { uid: userUid, ...updatedSnap.val() };
    userCache.set(userUid, updatedData, 300000);
    return updatedData;
  }

  /**
   * Log a completed Pomodoro / focus study session
   */
  async logStudySession(userUid, data) {
    const durationMinutes = Number(data.durationMinutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 360) {
      throw ApiError.badRequest('Valid durationMinutes (1 to 360) is required');
    }

    const sessionId = generateId();
    const completedAt = data.completedAt || new Date().toISOString();
    const dateKey = completedAt.slice(0, 10); // YYYY-MM-DD

    const sessionRecord = {
      id: sessionId,
      durationMinutes: Math.round(durationMinutes * 10) / 10,
      courseUID: data.courseUID ? String(data.courseUID) : null,
      courseTitle: data.courseTitle ? sanitizeInput(String(data.courseTitle)) : 'General Study',
      completedAt,
      dateKey
    };

    await db.ref(`users/${userUid}/studySessions/${sessionId}`).set(sessionRecord);
    userCache.delete(userUid);

    return sessionRecord;
  }

  /**
   * Log a completed quiz attempt for real dashboard telemetry
   */
  async logQuizAttempt(userUid, data) {
    const score = Number(data.score);
    const total = Number(data.total);
    if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) {
      throw ApiError.badRequest('Valid quiz score and total are required');
    }

    const attemptId = generateId();
    const percentage = Math.round((score / total) * 1000) / 10;
    const completedAt = new Date().toISOString();

    const attemptRecord = {
      id: attemptId,
      score,
      total,
      percentage,
      passed: Boolean(data.passed),
      materialUID: data.materialUID ? String(data.materialUID) : null,
      materialTitle: data.materialTitle ? sanitizeInput(String(data.materialTitle)) : 'Quiz',
      courseUID: data.courseUID ? String(data.courseUID) : null,
      courseTitle: data.courseTitle ? sanitizeInput(String(data.courseTitle)) : null,
      completedAt
    };

    await db.ref(`users/${userUid}/quizHistory/${attemptId}`).set(attemptRecord);
    userCache.delete(userUid);

    return attemptRecord;
  }
}

module.exports = new UserService();
