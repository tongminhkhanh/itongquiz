/**
 * @module perplexityProvider
 * Generates quiz JSON via the Perplexity Sonar API.
 */

import { callApi } from '../../apiAdapter';
import { SYSTEM_INSTRUCTION } from '../../../config/constants';
import { extractAIContent } from '../utils/aiResponseParser';
import { parseAndRepairJSON, validateAndFixQuiz } from '../utils/jsonRepair';

/**
 * Call Perplexity's Sonar model to generate a quiz.
 * Falls back to the shared callApi adapter so auth/headers are managed centrally.
 */
export const generateWithPerplexity = async (
  promptText: string,
  _apiKey: string
): Promise<unknown> => {
  const data = await callApi('ai_chat', {
    model: 'sonar',
    messages: [
      { role: 'system', content: SYSTEM_INSTRUCTION },
      { role: 'user', content: promptText },
    ],
    temperature: 0.4,
    max_tokens: 8192,
  });

  const text = extractAIContent(data);
  if (!text) throw new Error('AI không trả về kết quả nào (Định dạng phản hồi không xác định).');

  return validateAndFixQuiz(parseAndRepairJSON(text));
};
