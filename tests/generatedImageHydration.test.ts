import { describe, expect, it, vi } from 'vitest';
import {
  hydrateGeneratedImages,
  prepareGeneratedImageJobs,
} from '../src/services/ai/generatedImageHydration';

describe('generated image hydration', () => {
  it('returns placeholders immediately and runs at most two jobs concurrently', async () => {
    const prepared = prepareGeneratedImageJobs({
      questions: [
        { type: 'IMAGE_QUESTION', image: 'IMAGE_PROMPT: hình 1' },
        { type: 'IMAGE_QUESTION', image: 'IMAGE_PROMPT: hình 2' },
        { type: 'IMAGE_QUESTION', image: 'IMAGE_PROMPT: hình 3' },
      ],
    });

    expect(prepared.jobs).toHaveLength(3);
    expect(prepared.quiz.questions[0].image).toContain('placehold.co');

    let active = 0;
    let maxActive = 0;
    const releases: Array<() => void> = [];
    const generate = vi.fn(async (prompt: string) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise<void>((resolve) => releases.push(resolve));
      active -= 1;
      return `https://img.test/${encodeURIComponent(prompt)}`;
    });
    const onResolved = vi.fn();
    const hydration = hydrateGeneratedImages(prepared.jobs, {
      concurrency: 2,
      generate,
      onResolved,
    });

    await vi.waitFor(() => expect(generate).toHaveBeenCalledTimes(2));
    expect(maxActive).toBe(2);
    releases.shift()?.();
    await vi.waitFor(() => expect(generate).toHaveBeenCalledTimes(3));
    releases.splice(0).forEach((release) => release());
    await hydration;

    expect(maxActive).toBe(2);
    expect(onResolved).toHaveBeenCalledTimes(3);
  });

  it('caps generated image jobs at ten per action', () => {
    const prepared = prepareGeneratedImageJobs({
      questions: Array.from({ length: 12 }, (_, index) => ({
        type: 'IMAGE_QUESTION',
        image: `IMAGE_PROMPT: hình ${index + 1}`,
      })),
    });

    expect(prepared.jobs).toHaveLength(10);
  });
});
