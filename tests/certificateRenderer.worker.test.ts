import { describe, expect, it } from 'vitest';
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
    expect(svg).not.toContain('& <Bạn>');
  });
});
