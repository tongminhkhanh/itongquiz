import { describe, expect, it } from 'vitest';
import { loadFont } from '../workers/src/services/fontLoader';
import { buildCertificateSvg } from '../workers/src/services/certificateSvg';

describe('certificate SVG renderer', () => {
  it('keeps Vietnamese, score zero, long text constraints, and escapes XML', () => {
    const svg = buildCertificateSvg('data:image/png;base64,AA==', [
      { key: 'student_name', x: 100, y: 100, fontSize: 36, maxWidth: 420 },
      { key: 'score', x: 100, y: 160, fontSize: 24 },
      { key: 'quiz_title', x: 100, y: 220, fontSize: 20, maxWidth: 500 },
    ], {
      student_name: 'Nguyễn Việt Anh & <Bạn>', score: '0/10',
      quiz_title: 'Bài kiểm tra tiếng Việt rất dài '.repeat(20),
      date: '14/07/2026', teacher_name: 'Cô Nguyễn', custom_note: '',
    }, 1200, 848);

    expect(svg).toContain('Nguyễn Việt Anh &amp; &lt;Bạn&gt;');
    expect(svg).toContain('0/10');
    expect(svg).toContain('textLength="420"');
    expect(svg).toContain('font-family="Roboto"');
    expect(svg).not.toContain('& <Bạn>');
  });

  it('fails closed when the R2 font is missing or invalid', async () => {
    await expect(loadFont({}, 'Missing-Binding')).rejects.toThrow('CERT_IMAGES binding is required');
    await expect(loadFont({ CERT_IMAGES: { get: async () => null } }, 'Missing-Object'))
      .rejects.toThrow('Certificate font not found in R2');
    await expect(loadFont({
      CERT_IMAGES: { get: async () => ({ arrayBuffer: async () => new ArrayBuffer(12) }) },
    }, 'Invalid-Object')).rejects.toThrow('Invalid certificate font in R2');
  });

  it('returns an isolated copy when a cached font buffer is reused', async () => {
    const bytes = new Uint8Array(12);
    bytes.set([0x00, 0x01, 0x00, 0x00]);
    const get = async () => ({ arrayBuffer: async () => bytes.buffer.slice(0) });
    const env = { CERT_IMAGES: { get } };

    const first = await loadFont(env, 'Cache-Isolation');
    new Uint8Array(first)[4] = 0xff;
    const second = await loadFont(env, 'Cache-Isolation');

    expect(new Uint8Array(second)[4]).toBe(0);
  });
});
