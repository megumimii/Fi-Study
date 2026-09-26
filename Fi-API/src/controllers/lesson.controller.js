const lessonService = require('../services/lesson.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

class LessonController {
  getLessons = asyncHandler(async (req, res) => {
    const lessons = await lessonService.getLessons(req.user.uid, req.params.courseUID);
    return ApiResponse.success(res, lessons, 'Lessons retrieved successfully');
  });

  getLessonById = asyncHandler(async (req, res) => {
    const lesson = await lessonService.getLessonById(req.user.uid, req.params.courseUID, req.params.lessonUID);
    return ApiResponse.success(res, lesson, 'Lesson retrieved successfully');
  });

  createLesson = asyncHandler(async (req, res) => {
    const lesson = await lessonService.createLesson(req.user.uid, req.params.courseUID, req.body);
    return ApiResponse.created(res, lesson, 'Lesson created successfully');
  });

  updateLesson = asyncHandler(async (req, res) => {
    const lesson = await lessonService.updateLesson(
      req.user.uid,
      req.params.courseUID,
      req.params.lessonUID,
      req.body
    );
    return ApiResponse.success(res, lesson, 'Lesson updated successfully');
  });

  deleteLesson = asyncHandler(async (req, res) => {
    const result = await lessonService.deleteLesson(
      req.user.uid,
      req.params.courseUID,
      req.params.lessonUID
    );
    return ApiResponse.success(res, result, 'Lesson deleted successfully');
  });
}

module.exports = new LessonController();
