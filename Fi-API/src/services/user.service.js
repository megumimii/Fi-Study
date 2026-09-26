const { db, auth } = require('../config/firebase');
const { userCache } = require('./cacheService');
const { sanitizeInput } = require('../utils/sanitize');
const ApiError = require('../utils/apiError');

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
      profilePicture: tokenUser.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}+${encodeURIComponent(lastName)}&background=0D8ABC&color=fff&size=512`,
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

    // Invalidate cache
    userCache.delete(userUid);

    const updatedSnap = await userRef.once('value');
    const updatedData = { uid: userUid, ...updatedSnap.val() };
    userCache.set(userUid, updatedData, 300000);
    return updatedData;
  }
}

module.exports = new UserService();
