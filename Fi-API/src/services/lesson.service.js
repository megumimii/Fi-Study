const { db, bucket } = require('../config/firebase');
const { courseCache } = require('./cacheService');
const { sanitizeInput } = require('../utils/sanitize');
const ApiError = require('../utils/apiError');
const crypto = require('crypto');

function generateUid() {
  return crypto.randomBytes(8).toString('hex');
}

class LessonService {
  /**
   * Recalculates course counters after lesson or material change
   */
  async updateCourseCounters(userUid, courseUid) {
    const courseRef = db.ref(`courses/${userUid}/${courseUid}`);
    const lessonsSnap = await db.ref(`courses/${userUid}/${courseUid}/Lessons`).once('value');

    if (!lessonsSnap.exists()) {
      await courseRef.update({
        totalLessons: 0,
        totalCompletedLessons: 0,
        complete: false
      });
      return;
    }

    const lessons = Object.values(lessonsSnap.val());
    const totalLessons = lessons.length;
    const completedLessons = lessons.filter(l => l.complete === true).length;
    const isComplete = totalLessons > 0 && completedLessons === totalLessons;

    await courseRef.update({
      totalLessons,
      totalCompletedLessons: completedLessons,
      complete: isComplete
    });

    courseCache.delete(`courses-${userUid}`);
  }

  /**
   * Get all lessons for a course
   */
  async getLessons(userUid, courseUid) {
    const snapshot = await db.ref(`courses/${userUid}/${courseUid}/Lessons`).once('value');
    if (!snapshot.exists()) {
      return [];
    }
    return Object.values(snapshot.val());
  }

  /**
   * Get a single lesson by UID
   */
  async getLessonById(userUid, courseUid, lessonUid) {
    const snapshot = await db.ref(`courses/${userUid}/${courseUid}/Lessons/${lessonUid}`).once('value');
    if (!snapshot.exists()) {
      throw ApiError.notFound('Lesson not found');
    }
    return snapshot.val();
  }

  /**
   * Create a new lesson
   */
  async createLesson(userUid, courseUid, data) {
    const { title, description } = data;
    if (!title || !description) {
      throw ApiError.badRequest('Title and description are required');
    }

    // Verify course exists
    const courseSnap = await db.ref(`courses/${userUid}/${courseUid}`).once('value');
    if (!courseSnap.exists()) {
      throw ApiError.notFound('Course not found');
    }

    const uid = data.uid || generateUid();
    const sanitizedTitle = sanitizeInput(title);
    const sanitizedDescription = sanitizeInput(description);

    const lessonData = {
      uid,
      title: sanitizedTitle,
      description: sanitizedDescription,
      totalMaterials: 0,
      completedMaterials: 0,
      complete: false,
      createdAt: new Date().toISOString()
    };

    await db.ref(`courses/${userUid}/${courseUid}/Lessons/${uid}`).set(lessonData);
    await this.updateCourseCounters(userUid, courseUid);

    return lessonData;
  }

  /**
   * Update a lesson
   */
  async updateLesson(userUid, courseUid, lessonUid, data) {
    const lessonRef = db.ref(`courses/${userUid}/${courseUid}/Lessons/${lessonUid}`);
    const snapshot = await lessonRef.once('value');
    if (!snapshot.exists()) {
      throw ApiError.notFound('Lesson not found');
    }

    const updates = {};
    if (data.title !== undefined) updates.title = sanitizeInput(data.title);
    if (data.description !== undefined) updates.description = sanitizeInput(data.description);
    updates.updatedAt = new Date().toISOString();

    await lessonRef.update(updates);
    courseCache.delete(`courses-${userUid}`);

    const updatedSnap = await lessonRef.once('value');
    return updatedSnap.val();
  }

  /**
   * Delete a lesson
   */
  async deleteLesson(userUid, courseUid, lessonUid) {
    const lessonRef = db.ref(`courses/${userUid}/${courseUid}/Lessons/${lessonUid}`);
    const snapshot = await lessonRef.once('value');
    if (!snapshot.exists()) {
      throw ApiError.notFound('Lesson not found');
    }

    // Delete storage files under materials/userUid/courseUid/lessonUid
    try {
      if (bucket) {
        await bucket.deleteFiles({
          prefix: `materials/${userUid}/${courseUid}/${lessonUid}/`
        });
      }
    } catch (e) {
      console.warn(`Could not delete storage folder for lesson ${lessonUid}:`, e.message);
    }

    await lessonRef.remove();
    await this.updateCourseCounters(userUid, courseUid);

    return { lessonUid, deleted: true };
  }
}

module.exports = new LessonService();
