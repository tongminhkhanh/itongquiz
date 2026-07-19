import { describe, expect, it } from 'vitest';
import {
  buildAssignedQuizzes,
  buildAttendanceQuestionPool,
  buildPracticeCatalog,
  getAttendanceMultiplier,
  getRewardSummary,
} from '../src/features/student-dashboard/model';

describe('student dashboard assignment model', () => {
  it('keeps ready work before completed work and sorts ready work by deadline', () => {
    const assignments = [
      { id: 'completed-assignment', quizId: 'completed', quizTitle: '?? ho?n th?nh', attemptCount: 1, maxAttempts: 1, deadline: '2026-07-20T00:00:00.000Z', createdAt: '2026-07-18T00:00:00.000Z' },
      { id: 'later-assignment', quizId: 'later', quizTitle: 'N?p sau', attemptCount: 0, maxAttempts: 1, deadline: '2026-07-22T00:00:00.000Z', createdAt: '2026-07-18T00:00:00.000Z' },
      { id: 'earlier-assignment', quizId: 'earlier', quizTitle: 'N?p tr??c', attemptCount: 0, maxAttempts: 1, deadline: '2026-07-19T00:00:00.000Z', createdAt: '2026-07-18T00:00:00.000Z' },
    ] as any;

    const result = buildAssignedQuizzes(assignments, []);

    expect(result.map((quiz) => quiz.id)).toEqual(['earlier', 'later', 'completed']);
    expect(result[0]._assignmentData?.id).toBe('earlier-assignment');
  });
});

describe('student dashboard practice model', () => {
  it('groups canonical topic data by subject and keeps the configured order', () => {
    const catalog = buildPracticeCatalog([
      { name: '#phep_nhan', count: 30 },
      { name: '#phan_so', count: 20 },
      { name: '#english', count: 15 },
    ]);

    expect(catalog.subjects.map((subject) => subject.id)).toEqual([
      'toan',
      'tieng-viet',
      'tu-nhien-xa-hoi',
      'tieng-anh',
      'tin-hoc',
    ]);
    expect(catalog.subjects.find((subject) => subject.id === 'toan')).toMatchObject({
      topicCount: 2,
      questionCount: 50,
      status: 'available',
    });
    expect(catalog.subjects.find((subject) => subject.id === 'tieng-anh')).toMatchObject({
      topicCount: 1,
      questionCount: 15,
      status: 'available',
    });
    expect(catalog.comingSoonSubjects.map((subject) => subject.id)).toContain('tieng-viet');
  });
});

describe('student dashboard attendance model', () => {
  it('prefers math and Vietnamese MCQ questions and normalizes answer labels', () => {
    const pool = buildAttendanceQuestionPool([
      { id: 'science', title: 'Khoa h?c', category: 'tu-nhien-xa-hoi', questions: [{ id: 's1', type: 'MCQ', question: 'Science?', options: ['A. One', 'B. Two'], correctAnswer: 'A' }] },
      { id: 'math', title: 'To?n', category: 'toan', questions: [{ id: 'm1', type: 'MCQ', question: '1 + 1?', options: ['A. 1', 'B. 2'], correctAnswer: '2' }] },
    ] as any);

    expect(pool).toHaveLength(1);
    expect(pool[0]).toMatchObject({ id: 'math-m1', quizTitle: 'To?n', correctLabel: 'B' });
    expect(getAttendanceMultiplier(3)).toBe(2);
    expect(getAttendanceMultiplier(5)).toBe(3);
    expect(getAttendanceMultiplier(7)).toBe(5);
  });
});

describe('student dashboard reward model', () => {
  it('maps each reward type to student-facing copy', () => {
    expect(getRewardSummary({ type: 'COINS', coins: 25 } as any)?.description).toContain('+25 Xu');
    expect(getRewardSummary({ type: 'COLLECTIBLE' } as any)?.title).toBe('Vật phẩm sưu tầm');
    expect(getRewardSummary({ type: 'HINT_TOKEN', amount: 2 } as any)?.description).toContain('2 vé gợi ý');
    expect(getRewardSummary({ type: 'STREAK_SHIELD', amount: 1 } as any)?.title).toBe('Khiên giữ chuỗi');
  });
});
