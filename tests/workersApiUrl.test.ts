import { describe, expect, it } from 'vitest';

import { normalizeWorkersApiUrl } from '../src/config/constants';

describe('normalizeWorkersApiUrl', () => {
  it('removes literal escaped line endings from deployment environment values', () => {
    expect(normalizeWorkersApiUrl('https://phieu.thitong.site\\r\\n')).toBe(
      'https://phieu.thitong.site',
    );
  });

  it('removes real line endings, whitespace, and trailing slashes', () => {
    expect(normalizeWorkersApiUrl('  https://phieu.thitong.site/\r\n')).toBe(
      'https://phieu.thitong.site',
    );
  });
});
