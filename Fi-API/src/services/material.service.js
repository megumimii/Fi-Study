const { db, bucket } = require('../config/firebase');
const { courseCache } = require('./cacheService');
const { sanitizeInput } = require('../utils/sanitize');
const ApiError = require('../utils/apiError');
const crypto = require('crypto');

function generateUid() {
  return crypto.randomBytes(8).toString('hex');
}

class MaterialService {
  /**
   * Recalculates lesson and course progress counters
   */
  async recalculateProgress(userUid, courseUid, lessonUid) {
    const lessonRef = db.ref(`courses/${userUid}/${courseUid}/Lessons/${lessonUid}`);
    const materialsSnap = await db
      .ref(`courses/${userUid}/${courseUid}/Lessons/${lessonUid}/Materials`)
      .once('value');

    const materials = materialsSnap.exists() ? Object.values(materialsSnap.val()) : [];
    const totalMaterials = materials.length;
    const completedMaterials = materials.filter((m) => m.passed === true).length;
    const isLessonComplete = totalMaterials > 0 && completedMaterials === totalMaterials;

    await lessonRef.update({
      totalMaterials,
      completedMaterials,
      complete: isLessonComplete
    });

    // Recalculate parent course counters
    const courseRef = db.ref(`courses/${userUid}/${courseUid}`);
    const lessonsSnap = await db.ref(`courses/${userUid}/${courseUid}/Lessons`).once('value');

    if (lessonsSnap.exists()) {
      const lessons = Object.values(lessonsSnap.val());
      const totalLessons = lessons.length;
      const completedLessons = lessons.filter((l) => l.complete === true).length;
      const isCourseComplete = totalLessons > 0 && completedLessons === totalLessons;

      await courseRef.update({
        totalLessons,
        totalCompletedLessons: completedLessons,
        complete: isCourseComplete
      });
    }

    courseCache.delete(`courses-${userUid}`);
  }

  /**
   * Get all materials for a lesson
   */
  async getMaterials(userUid, courseUid, lessonUid) {
    const snapshot = await db
      .ref(`courses/${userUid}/${courseUid}/Lessons/${lessonUid}/Materials`)
      .once('value');
    if (!snapshot.exists()) {
      return [];
    }
    return Object.values(snapshot.val());
  }

  /**
   * Get a single material
   */
  async getMaterialById(userUid, courseUid, lessonUid, materialUid) {
    const snapshot = await db
      .ref(`courses/${userUid}/${courseUid}/Lessons/${lessonUid}/Materials/${materialUid}`)
      .once('value');
    if (!snapshot.exists()) {
      throw ApiError.notFound('Material not found');
    }
    return snapshot.val();
  }

  /**
   * Create a new material
   */
  async createMaterial(userUid, courseUid, lessonUid, data) {
    const { title, description, fileURL, fileName, originalExtension, htmlContent } = data;
    if (!title || !description) {
      throw ApiError.badRequest('Title and description are required');
    }

    const uid = data.uid || generateUid();
    const sanitizedTitle = sanitizeInput(title);
    const sanitizedDescription = sanitizeInput(description);

    const materialData = {
      uid,
      title: sanitizedTitle,
      description: sanitizedDescription,
      fileURL: fileURL || null,
      fileName: fileName || null,
      originalExtension: originalExtension || 'docx',
      htmlContent: htmlContent || `<p>${sanitizedDescription}</p>`,
      flashcards: [],
      passed: false,
      createdAt: new Date().toISOString()
    };

    await db
      .ref(`courses/${userUid}/${courseUid}/Lessons/${lessonUid}/Materials/${uid}`)
      .set(materialData);
    await this.recalculateProgress(userUid, courseUid, lessonUid);

    return materialData;
  }

  /**
   * Update an existing material
   */
  async updateMaterial(userUid, courseUid, lessonUid, materialUid, data) {
    const matRef = db.ref(
      `courses/${userUid}/${courseUid}/Lessons/${lessonUid}/Materials/${materialUid}`
    );
    const snapshot = await matRef.once('value');
    if (!snapshot.exists()) {
      throw ApiError.notFound('Material not found');
    }

    const updates = {};
    if (data.title !== undefined) updates.title = sanitizeInput(data.title);
    if (data.description !== undefined) updates.description = sanitizeInput(data.description);
    if (data.fileURL !== undefined) updates.fileURL = data.fileURL;
    if (data.fileName !== undefined) updates.fileName = data.fileName;
    if (data.originalExtension !== undefined) updates.originalExtension = data.originalExtension;
    if (data.htmlContent !== undefined) updates.htmlContent = data.htmlContent;
    if (Array.isArray(data.flashcards)) {
      updates.flashcards = data.flashcards.map((fc, idx) => ({
        id: String(fc.id || `fc_${idx + 1}`),
        front: sanitizeInput(String(fc.front || '')),
        back: sanitizeInput(String(fc.back || '')),
        tag: sanitizeInput(String(fc.tag || 'Concept')),
        reviewed: Boolean(fc.reviewed)
      }));
    }
    if (data.passed !== undefined) updates.passed = Boolean(data.passed);
    updates.updatedAt = new Date().toISOString();

    await matRef.update(updates);

    if (data.passed !== undefined) {
      await this.recalculateProgress(userUid, courseUid, lessonUid);
    } else {
      courseCache.delete(`courses-${userUid}`);
    }

    const updatedSnap = await matRef.once('value');
    return updatedSnap.val();
  }

  /**
   * Update progress / passed status (called after passing quiz or completing flashcard deck review)
   */
  async updateProgress(userUid, courseUid, lessonUid, materialUid, passed = true) {
    const matRef = db.ref(
      `courses/${userUid}/${courseUid}/Lessons/${lessonUid}/Materials/${materialUid}`
    );
    const snapshot = await matRef.once('value');
    if (!snapshot.exists()) {
      throw ApiError.notFound('Material not found');
    }

    await matRef.update({
      passed: Boolean(passed),
      passedAt: new Date().toISOString()
    });

    await this.recalculateProgress(userUid, courseUid, lessonUid);

    const updatedSnap = await matRef.once('value');
    return updatedSnap.val();
  }

  /**
   * Delete a material and remove its file from storage
   */
  async deleteMaterial(userUid, courseUid, lessonUid, materialUid) {
    const matRef = db.ref(
      `courses/${userUid}/${courseUid}/Lessons/${lessonUid}/Materials/${materialUid}`
    );
    const snapshot = await matRef.once('value');
    if (!snapshot.exists()) {
      throw ApiError.notFound('Material not found');
    }

    const materialData = snapshot.val();

    try {
      if (bucket && materialData.fileURL) {
        const decodedUrl = decodeURIComponent(materialData.fileURL);
        const match = decodedUrl.match(/\/o\/([^?]+)/);
        if (match && match[1]) {
          const filePath = match[1];
          await bucket.file(filePath).delete().catch(() => {});
        }
      }
    } catch (e) {
      console.warn(`Could not delete storage file for material ${materialUid}:`, e.message);
    }

    await matRef.remove();
    await this.recalculateProgress(userUid, courseUid, lessonUid);

    return { materialUid, deleted: true };
  }
}

module.exports = new MaterialService();
