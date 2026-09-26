const { db, bucket } = require('../config/firebase');
const { courseCache } = require('./cacheService');
const { sanitizeInput } = require('../utils/sanitize');
const ApiError = require('../utils/apiError');
const crypto = require('crypto');

function generateUid() {
  return crypto.randomBytes(8).toString('hex');
}

class CourseService {
  /**
   * Get all courses for a user
   */
  async getCourses(userUid) {
    const cacheKey = `courses-${userUid}`;
    const cached = courseCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const snapshot = await db.ref(`courses/${userUid}`).once('value');
    if (!snapshot.exists()) {
      courseCache.set(cacheKey, []);
      return [];
    }

    const coursesObj = snapshot.val();
    const courses = Object.values(coursesObj);
    courseCache.set(cacheKey, courses, 60000); // 1 minute
    return courses;
  }

  /**
   * Get single course by UID
   */
  async getCourseById(userUid, courseUid) {
    const snapshot = await db.ref(`courses/${userUid}/${courseUid}`).once('value');
    if (!snapshot.exists()) {
      throw ApiError.notFound('Course not found');
    }
    return snapshot.val();
  }

  /**
   * Create a new course
   */
  async createCourse(userUid, data) {
    const { title, description, color } = data;
    if (!title || !description) {
      throw ApiError.badRequest('Title and description are required');
    }

    const uid = data.uid || generateUid();
    const sanitizedTitle = sanitizeInput(title);
    const sanitizedDescription = sanitizeInput(description);
    const sanitizedColor = color || '#FFFFFF';

    const courseData = {
      uid,
      title: sanitizedTitle,
      description: sanitizedDescription,
      color: sanitizedColor,
      totalLessons: 0,
      totalCompletedLessons: 0,
      createdAt: new Date().toISOString()
    };

    await db.ref(`courses/${userUid}/${uid}`).set(courseData);

    // Invalidate user course cache
    courseCache.delete(`courses-${userUid}`);

    return courseData;
  }

  /**
   * Update an existing course
   */
  async updateCourse(userUid, courseUid, data) {
    const courseRef = db.ref(`courses/${userUid}/${courseUid}`);
    const snapshot = await courseRef.once('value');
    if (!snapshot.exists()) {
      throw ApiError.notFound('Course not found');
    }

    const updates = {};
    if (data.title !== undefined) updates.title = sanitizeInput(data.title);
    if (data.description !== undefined) updates.description = sanitizeInput(data.description);
    if (data.color !== undefined) updates.color = data.color;
    if (data.icon !== undefined) updates.icon = data.icon;
    updates.updatedAt = new Date().toISOString();

    await courseRef.update(updates);

    // Invalidate user course cache
    courseCache.delete(`courses-${userUid}`);

    const updatedSnap = await courseRef.once('value');
    return updatedSnap.val();
  }

  /**
   * Delete a course and its associated files
   */
  async deleteCourse(userUid, courseUid) {
    const courseRef = db.ref(`courses/${userUid}/${courseUid}`);
    const snapshot = await courseRef.once('value');
    if (!snapshot.exists()) {
      throw ApiError.notFound('Course not found');
    }

    // Delete associated files in Firebase Storage under materials/userUid/courseUid
    try {
      if (bucket) {
        await bucket.deleteFiles({
          prefix: `materials/${userUid}/${courseUid}/`
        });
      }
    } catch (e) {
      console.warn(`Could not delete storage folder for course ${courseUid}:`, e.message);
    }

    // Delete database node
    await courseRef.remove();

    // Invalidate cache
    courseCache.delete(`courses-${userUid}`);

    return { courseUid, deleted: true };
  }
}

module.exports = new CourseService();
