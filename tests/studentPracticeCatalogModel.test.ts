import { describe, expect, it } from 'vitest';
import { SUBJECT_CONFIG, SUBJECT_ORDER } from '../src/features/student-dashboard/model/dashboardConstants';

describe('practice subject metadata', () => {
  it('uses canonical subject ids and non-ligature icon keys', () => {
    expect(SUBJECT_ORDER).toEqual([
      'toan',
      'tieng-viet',
      'tu-nhien-xa-hoi',
      'tieng-anh',
      'tin-hoc',
    ]);
    expect(SUBJECT_CONFIG['tu-nhien-xa-hoi'].aliases).toContain('#tn_xh');
    expect(Object.values(SUBJECT_CONFIG).map(subject => subject.icon)).toEqual([
      'calculator',
      'book-open',
      'earth',
      'languages',
      'monitor',
    ]);
    expect(Object.values(SUBJECT_CONFIG).map(subject => subject.icon)).not.toContain('calculate');
  });
});
