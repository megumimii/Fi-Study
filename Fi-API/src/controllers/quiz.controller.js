const quizService = require('../services/quiz.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

class QuizController {
  generateQuiz = asyncHandler(async (req, res) => {
    const { materialText } = req.body;
    const quiz = await quizService.generateQuiz(materialText);
    return ApiResponse.success(res, { quiz }, 'Quiz generated successfully');
  });
}

module.exports = new QuizController();
