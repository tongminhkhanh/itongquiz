import { AIResult } from '../types';
import { HOMEWORK_API, AI_PROMPTS } from '../homework.constants';

/**
 * Service to handle AI-powered grading logic
 */
export const homeworkService = {
  /**
   * Sends student submission image to AI for grading
   * @param imageUrl The secure URL from Cloudinary
   * @param rubrics Optional grading criteria or sample answers
   */
  async gradeSubmission(imageUrl: string, rubrics?: string): Promise<AIResult> {
    try {
      const prompt = rubrics 
        ? `${AI_PROMPTS.GRADING}\n\nĐÁP ÁN MẪU/TIÊU CHÍ: ${rubrics}`
        : AI_PROMPTS.GRADING;

      const response = await fetch(`${HOMEWORK_API.BASE_URL}${HOMEWORK_API.ENDPOINTS.VISION}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HOMEWORK_API.TOKEN}`,
        },
        body: JSON.stringify({
          model: 'gemini-1.5-pro', // The proxy will map this correctly
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Grading failed: ${errorText}`);
      }

      const data = await response.json();
      const aiContent = data.choices[0].message.content;
      
      // Parse JSON from AI response
      const result: AIResult = JSON.parse(aiContent);
      
      return result;
    } catch (error) {
      console.error('Error in gradeSubmission:', error);
      throw error;
    }
  },

  /**
   * Utility to bóc tách text từ tài liệu (giáo viên upload đề bài)
   */
  async performOCR(imageUrl: string): Promise<string> {
    try {
      const response = await fetch(`${HOMEWORK_API.BASE_URL}${HOMEWORK_API.ENDPOINTS.VISION}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HOMEWORK_API.TOKEN}`,
        },
        body: JSON.stringify({
          model: 'gemini-1.5-pro',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Hãy trích xuất toàn bộ văn bản từ hình ảnh này một cách chính xác nhất.' },
                {
                  type: 'image_url',
                  image_url: { url: imageUrl },
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error in performOCR:', error);
      throw error;
    }
  }
};
