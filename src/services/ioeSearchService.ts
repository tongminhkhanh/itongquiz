import { requestWorkerAiText } from './ai/workerAiClient';

const REQUEST_TIMEOUT_MS = 240_000;
const MAX_RETRIES = 2;

export interface IoeSearchResult {
  success: boolean;
  content: string;
  error?: string;
}

export async function searchIoeQuestions(classLevel: string, round: string): Promise<IoeSearchResult> {
  const roundVi = {
    school: 'v?ng tr??ng', district: 'v?ng huy?n qu?n',
    provincial: 'v?ng t?nh th?nh ph?', national: 'v?ng qu?c gia',
  }[round] || round;
  const prompt = `T?m 3 d?ng c?u h?i IOE l?p ${classLevel} ${roundVi} ph? bi?n nh?t v?i 1 v? d? m?i d?ng. Tr? l?i ng?n g?n.`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const content = await requestWorkerAiText({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'B?n l? chuy?n gia IOE. Tr? l?i ng?n g?n.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }, { timeoutMs: REQUEST_TIMEOUT_MS });
      return { success: true, content };
    } catch (error: unknown) {
      if (attempt === MAX_RETRIES) {
        console.warn('[IOE Search] B? qua t?m ki?m sau khi Worker AI th?t b?i.', error);
        return { success: true, content: '' };
      }
    }
  }
  return { success: true, content: '' };
}
