import { describe, expect, it } from 'vitest';
import { resolveAiTimeoutMs } from '../src/services/ai/aiTimeoutPolicy';

describe('AI timeout policy', () => {
  it('uses a shorter timeout for repair than generation', () => {
    expect(resolveAiTimeoutMs('GENERATE')).toBe(120_000);
    expect(resolveAiTimeoutMs('REPAIR')).toBe(60_000);
  });

  it('honors an explicit timeout override', () => {
    expect(resolveAiTimeoutMs('REVIEW', 12_345)).toBe(12_345);
  });
});
