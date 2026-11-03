const axios = require('axios');
const crypto = require('crypto');
const { quizCache } = require('./cacheService');
const ApiError = require('../utils/apiError');

class FlashcardService {
  /**
   * Generates comprehension-focused study flashcards using OpenRouter AI.
   * @param {string} materialText
   * @param {number} count
   * @param {boolean} forceRegenerate
   */
  async generateFlashcards(materialText, count = 10, forceRegenerate = false) {
    if (!materialText || typeof materialText !== 'string' || !materialText.trim()) {
      throw ApiError.badRequest('Missing or empty materialText');
    }

    if (materialText.trim().length < 200) {
      throw ApiError.badRequest(
        'Not enough content for flashcard generation. At least 200 characters required.'
      );
    }

    const parsedCount = parseInt(count, 10);
    const validCount = Number.isNaN(parsedCount)
      ? 10
      : Math.min(Math.max(parsedCount, 3), 25);

    const textHash = crypto
      .createHash('sha256')
      .update(materialText.trim())
      .digest('hex');
    const cacheKey = `flashcards-${validCount}-${textHash}`;

    if (!forceRegenerate) {
      const cachedDeck = quizCache.get(cacheKey);
      if (cachedDeck) {
        console.log(
          `[FlashcardService] Cache HIT for material hash: ${textHash.slice(0, 10)} (count=${validCount})`
        );
        return cachedDeck;
      }
    }

    console.log(
      `[FlashcardService] Requesting ${validCount} flashcards from OpenRouter...`
    );

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw ApiError.internal('Missing OpenRouter API key in server environment');
    }

    const model =
      process.env.OPENROUTER_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free';

    const systemPrompt = `You are an expert academic study deck designer and JSON-only generator.
Generate high-comprehension, non-repetitive flashcards from the user's study material.
Avoid generic or trivial questions. Test conceptual understanding, key definitions, mechanisms, comparisons, and practical applications.

Output a JSON object that matches this schema exactly:
{
  "flashcards": [
    {
      "id": "fc_1",
      "front": "Clear, specific question or active-recall prompt",
      "back": "Concise, accurate, well-structured answer explaining the concept",
      "tag": "Concept | Definition | Mechanism | Application"
    }
  ]
}

Return NOTHING else (no markdown, no code fences, no extra commentary).
If the material is unreadable gibberish, return {"flashcards": []}.`;

    const userPrompt = `Generate exactly ${validCount} distinct, meaningful study flashcards based on this material:\n\n${materialText}`;

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.65
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

      let parsedJSON = {};
      try {
        parsedJSON = JSON.parse(assistantMsg);
      } catch (err) {
        console.error(
          '[FlashcardService] Failed to parse AI output as JSON:',
          assistantMsg
        );
        throw ApiError.internal('AI returned an invalid JSON response structure.');
      }

      if (!parsedJSON || !Array.isArray(parsedJSON.flashcards)) {
        throw ApiError.internal(
          'Flashcard generation failed: returned invalid schema or insufficient content.'
        );
      }

      parsedJSON.flashcards = parsedJSON.flashcards
        .filter((c) => c && c.front && c.back)
        .map((c, idx) => ({
          id: c.id || `fc_${Date.now()}_${idx + 1}`,
          front: String(c.front).trim(),
          back: String(c.back).trim(),
          tag: String(c.tag || 'Concept').trim(),
          reviewed: false
        }));

      if (parsedJSON.flashcards.length === 0) {
        throw ApiError.badRequest(
          'Could not extract meaningful flashcards from this material. Please add more detailed notes.'
        );
      }

      quizCache.set(cacheKey, parsedJSON, 24 * 60 * 60 * 1000);
      return parsedJSON;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      console.error(
        '[FlashcardService] OpenRouter request error:',
        err.response?.data || err.message
      );
      throw ApiError.internal(
        err.response?.data?.error?.message ||
          err.message ||
          'Flashcard generation failed'
      );
    }
  }
}

module.exports = new FlashcardService();

