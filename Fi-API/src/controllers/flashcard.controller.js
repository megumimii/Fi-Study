const flashcardService = require('../services/flashcard.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

class FlashcardController {
  generateFlashcards = asyncHandler(async (req, res) => {
    const { materialText, count = 10, forceRegenerate = false } = req.body;
    const result = await flashcardService.generateFlashcards(
      materialText,
      count,
      Boolean(forceRegenerate)
    );
    return ApiResponse.success(
      res,
      result,
      'Flashcards generated successfully'
    );
  });
}

module.exports = new FlashcardController();

