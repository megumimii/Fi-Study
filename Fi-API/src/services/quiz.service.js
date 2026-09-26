const axios = require('axios');
const crypto = require('crypto');
const { quizCache } = require('./cacheService');
const ApiError = require('../utils/apiError');

class QuizService {
  /**
   * Generates multiple-choice quiz questions using OpenRouter AI
   */
  async generateQuiz(materialText) {
    if (!materialText || typeof materialText !== 'string' || !materialText.trim()) {
      throw ApiError.badRequest('Missing or empty materialText');
    }

    if (materialText.trim().length < 500) {
      throw ApiError.badRequest('Not enough content for quiz generation. At least 500 characters required.');
    }

    // Compute hash for caching
    const textHash = crypto.createHash('sha256').update(materialText.trim()).digest('hex');
    const cacheKey = `quiz-${textHash}`;

    // Check cache
    const cachedQuiz = quizCache.get(cacheKey);
    if (cachedQuiz) {
      console.log(`[QuizService] Cache HIT for material hash: ${textHash.slice(0, 10)}...`);
      return cachedQuiz;
    }

    console.log(`[QuizService] Cache MISS. Requesting quiz generation from OpenRouter...`);

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw ApiError.internal('Missing OpenRouter API key in server environment');
    }

    const model = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free';

    const systemPrompt = `You are a JSON-only generator. Output a JSON object that matches this schema exactly:

{
  "questions": [
    {
      "id": 1,
      "question": "string",
      "options": ["string", "string", "string"],
      "correct_answer": "string",
      "explanation": "string"
    }
  ]
}

Example:

{
  "questions": [
    {
      "id": 1,
      "question": "What is the capital of France?",
      "options": ["London", "Paris", "Berlin"],
      "correct_answer": "Paris",
      "explanation": "Paris is the capital of France."
    },
    {
      "id": 2,
      "question": "What is the largest planet in our solar system?",
      "options": ["Mars", "Jupiter", "Saturn"],
      "correct_answer": "Jupiter",
      "explanation": "Jupiter is the largest planet in our solar system."
    }
  ]
}

Return NOTHING else (no text, no markdown, no code fences).
If you can't create questions due to the material being non-sense, return {"questions": []}.`;

    const userPrompt = `Generate 10 multiple-choice quiz questions based on this material:
${materialText}`;

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 45000
        }
      );

      let assistantMsg = response.data?.choices?.[0]?.message?.content || '{}';
      const jsonMatch = assistantMsg.match(/\{[\s\S]*\}/);
      if (jsonMatch) assistantMsg = jsonMatch[0];

      let quizJSON = {};
      try {
        quizJSON = JSON.parse(assistantMsg);
      } catch (err) {
        console.error('[QuizService] Failed to parse AI output as JSON:', assistantMsg);
        throw ApiError.internal('AI returned an invalid JSON response structure.');
      }

      if (!quizJSON || !Array.isArray(quizJSON.questions)) {
        throw ApiError.internal('Quiz generation failed: returned invalid schema or insufficient content.');
      }

      // Ensure every question has an id
      quizJSON.questions = quizJSON.questions.map((q, i) => ({
        ...q,
        id: q.id || i + 1
      }));

      // Cache for 24 hours
      quizCache.set(cacheKey, quizJSON, 24 * 60 * 60 * 1000);

      return quizJSON;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      console.error('[QuizService] OpenRouter request error:', err.response?.data || err.message);
      throw ApiError.internal(err.response?.data?.error?.message || err.message || 'Quiz generation failed');
    }
  }
}

module.exports = new QuizService();
