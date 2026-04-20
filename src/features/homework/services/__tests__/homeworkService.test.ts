import { describe, it, expect, vi } from 'vitest';
import { homeworkService } from '../homeworkService';

// Mock the global fetch
global.fetch = vi.fn();

describe('homeworkService', () => {
  it('should correctly parse AI JSON response', async () => {
    const mockAIResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            ocrText: "Bài làm của học sinh...",
            score: 8.5,
            confidence: 0.95,
            feedback: "Làm tốt lắm!",
            criteriaBreakdown: [
              { label: "Trình bày", score: 2, maxScore: 2, comment: "Sạch sẽ" }
            ]
          })
        }
      }]
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAIResponse),
    });

    const result = await homeworkService.gradeSubmission('https://test-image.com/url');

    expect(result.score).toBe(8.5);
    expect(result.confidence).toBe(0.95);
    expect(result.criteriaBreakdown[0].label).toBe("Trình bày");
  });

  it('should handle AI formatting errors gracefully', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: "Lỗi không phải JSON" 
          }
        }]
      }),
    });

    await expect(homeworkService.gradeSubmission('...')).rejects.toThrow();
  });
});
