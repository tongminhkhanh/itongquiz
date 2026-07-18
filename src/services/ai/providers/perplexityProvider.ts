/**
 * @module perplexityProvider
 * Generates quiz JSON through the authenticated Worker AI proxy.
 */

import { SYSTEM_INSTRUCTION } from '../../../config/constants';
import { parseAndRepairJSON, validateAndFixQuiz } from '../utils/jsonRepair';
import { requestWorkerAiText } from '../workerAiClient';

export const generateWithPerplexity = async (
  promptText: string,
  _apiKey: string,
): Promise<unknown> => {
  const text = await requestWorkerAiText({
    model: 'sonar',
    messages: [
      { role: 'system', content: SYSTEM_INSTRUCTION },
      { role: 'user', content: promptText },
    ],
    temperature: 0.4,
    max_tokens: 8192,
  });

  return validateAndFixQuiz(parseAndRepairJSON(text));
};
