const courseService = require('../services/course.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

class CourseController {
  getCourses = asyncHandler(async (req, res) => {
    const courses = await courseService.getCourses(req.user.uid);
    return ApiResponse.success(res, courses, 'Courses retrieved successfully');
  });

  getCourseById = asyncHandler(async (req, res) => {
    const course = await courseService.getCourseById(req.user.uid, req.params.courseUID);
    return ApiResponse.success(res, course, 'Course retrieved successfully');
  });

  createCourse = asyncHandler(async (req, res) => {
    const course = await courseService.createCourse(req.user.uid, req.body);
    return ApiResponse.created(res, course, 'Course created successfully');
  });

  updateCourse = asyncHandler(async (req, res) => {
    const course = await courseService.updateCourse(req.user.uid, req.params.courseUID, req.body);
    return ApiResponse.success(res, course, 'Course updated successfully');
  });

  deleteCourse = asyncHandler(async (req, res) => {
    const result = await courseService.deleteCourse(req.user.uid, req.params.courseUID);
    return ApiResponse.success(res, result, 'Course deleted successfully');
  });
}

module.exports = new CourseController();
