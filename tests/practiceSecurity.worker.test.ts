// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';
import { handlePracticeRoutes } from '../workers/src/routes/practice';
import {
  signPracticeAttemptToken,
  verifyPracticeAttemptToken,
} from '../workers/src/services/practiceAttemptToken';
import { signJWT } from '../workers/src/utils/jwt';

interface QuestionRow {
  id: string;
  quiz_id: string;
  type: string;
  question: string;
  options: string;
  correct_answer: string;
  items: string;
  text_field: string;
  blanks: string;
  distractors: string;
  sentence: string;
  words: string;
  correct_word_indexes: string;
  image: string;
  tags: string;
  pairs?: string;
  correctHint?: string;
}

class Statement {
  bindings: unknown[] = [];

  constructor(readonly sql: string, private readonly db: PracticeDatabase) {}

  bind(...values: unknown[]) {
    this.bindings = values;
    return this;
  }

  async first<T>() {
    return this.db.first(this.sql, this.bindings) as T;
  }

  async all<T>() {
    return { results: this.db.all(this.sql, this.bindings) as T[] };
  }

  async run() {
    return { success: true, meta: { changes: 1 } };
  }
}

class PracticeDatabase {
  rateCount = 1;
  failTopics = false;
  failQuestions = false;
  student = {
    id: 'student-a',
    username: 'student-a',
    token_version: 0,
    archived_at: '',
    class_archived_at: '',
  };
  questions: QuestionRow[] = [
    {
      id: 'q-1',
      quiz_id: 'quiz-a',
      type: 'MCQ',
      question: '2 + 3 = ?',
      options: 'A. 4|B. 5|C. 6',
      correct_answer: 'B',
      items: JSON.stringify([{ id: 'hint-1', label: 'Gợi ý', isCorrect: true, correctHint: 'ẩn' }]),
      text_field: '',
      blanks: JSON.stringify([{ id: 'blank-1', correctAnswer: 'bí mật', correctRule: 'ẩn' }]),
      distractors: JSON.stringify([{ id: 'd-1', label: 'Nhiễu', correctChoice: 'ẩn' }]),
      sentence: '',
      words: '',
      correct_word_indexes: '[1]',
      image: '',
      tags: '#Toan #Phep_Cong',
    },
    {
      id: 'q-2',
      quiz_id: 'quiz-b',
      type: 'MCQ',
      question: 'Câu không thuộc tag chính xác',
      options: 'A|B',
      correct_answer: 'A',
      items: '[]',
      text_field: '',
      blanks: '[]',
      distractors: '',
      sentence: '',
      words: '',
      correct_word_indexes: '[]',
      image: '',
      tags: '#Toan_Hoc',
    },
    {
      id: 'q-3',
      quiz_id: 'quiz-c',
      type: 'MATCHING',
      question: 'Nối thủ đô với quốc gia',
      options: '',
      correct_answer: '',
      items: '[]',
      pairs: JSON.stringify([{ left: 'Hà Nội', right: 'Việt Nam' }]),
      correctHint: 'Không được gửi trước khi nộp',
      text_field: '',
      blanks: '[]',
      distractors: '',
      sentence: '',
      words: '',
      correct_word_indexes: '[]',
      image: '',
      tags: '#Noi',
    },
  ];

  prepare(sql: string) {
    return new Statement(sql, this);
  }

  first(sql: string, _bindings: unknown[]) {
    if (sql.includes('INSERT INTO rate_limits')) {
      return { count: this.rateCount, window_start: new Date().toISOString() };
    }
    if (sql.includes('FROM students')) return this.student;
    return null;
  }

  all(sql: string, bindings: unknown[]) {
    if (sql.includes('SELECT tags FROM questions')) {
      if (this.failTopics) throw new Error('topics unavailable');
      return this.questions.map(({ tags }) => ({ tags }));
    }
    if (sql.includes('FROM questions') && sql.includes('WHERE id IN')) {
      if (this.failQuestions) throw new Error('questions unavailable');
      const ids = new Set(bindings.map(String));
      return this.questions.filter(question => ids.has(question.id));
    }
    if (sql.includes('FROM questions')) {
      if (this.failQuestions) throw new Error('questions unavailable');
      return this.questions;
    }
    return [];
  }
}

const secret = 'practice-test-secret-that-is-long-enough';
const env = (db: PracticeDatabase) => ({
  DB: db,
  JWT_SECRET: secret,
  AUTH_MIGRATION_MODE: 'compat',
} as any);

const studentRequest = async (
  url: string,
  init: RequestInit = {},
  identity: { id: string; username: string; role?: 'student' | 'teacher' } = {
    id: 'student-a',
    username: 'student-a',
  },
) => {
  const token = await signJWT({
    id: identity.id,
    username: identity.username,
    role: identity.role || 'student',
    tokenVersion: 0,
  }, secret);
  return new Request(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
};

describe('practice API security contract', () => {
  let db: PracticeDatabase;

  beforeEach(() => {
    db = new PracticeDatabase();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects anonymous topic access', async () => {
    const response = await handlePracticeRoutes(
      new Request('https://api.test/api/practice/topics'),
      env(db),
      '/api/practice/topics',
      'GET',
    );

    expect(response.status).toBe(401);
  });

  it.each(['-1', '0', '51', 'NaN', '1.5'])('rejects an invalid limit: %s', async (limit) => {
    const request = await studentRequest(`https://api.test/api/practice?topic=%23Toan&limit=${limit}`);
    const response = await handlePracticeRoutes(request, env(db), '/api/practice', 'GET');

    expect(response.status).toBe(400);
  });

  it.each(['#%', '#Toan%', '#Toan Hoc', '#Toan/../../'])('rejects an invalid topic: %s', async (topic) => {
    const request = await studentRequest(
      `https://api.test/api/practice?topic=${encodeURIComponent(topic)}&limit=10`,
    );
    const response = await handlePracticeRoutes(request, env(db), '/api/practice', 'GET');

    expect(response.status).toBe(400);
  });

  it('accepts 80 topic characters and rejects 81', async () => {
    const accepted = await studentRequest(
      `https://api.test/api/practice?topic=${'a'.repeat(80)}&limit=10`,
    );
    const rejected = await studentRequest(
      `https://api.test/api/practice?topic=${'a'.repeat(81)}&limit=10`,
    );

    expect((await handlePracticeRoutes(accepted, env(db), '/api/practice', 'GET')).status).toBe(404);
    expect((await handlePracticeRoutes(rejected, env(db), '/api/practice', 'GET')).status).toBe(400);
  });

  it('lists normalized topics for authenticated students', async () => {
    db.questions.push({ ...db.questions[0], id: 'q-3', tags: '#Toan #Toan' });
    const request = await studentRequest('https://api.test/api/practice/topics');
    const response = await handlePracticeRoutes(request, env(db), '/api/practice/topics', 'GET');

    await expect(response.json()).resolves.toEqual({
      topics: [
        { name: '#Noi', count: 1 },
        { name: '#Phep_Cong', count: 1 },
        { name: '#Toan', count: 2 },
        { name: '#Toan_Hoc', count: 1 },
      ],
    });
  });

  it('accepts a topic without the hash and applies the default limit', async () => {
    const request = await studentRequest('https://api.test/api/practice?topic=Toan');
    const response = await handlePracticeRoutes(request, env(db), '/api/practice', 'GET');
    expect(response.status).toBe(200);
  });

  it('rejects non-student identities', async () => {
    const request = await studentRequest(
      'https://api.test/api/practice/topics',
      {},
      { id: 'teacher-a', username: 'teacher-a', role: 'teacher' },
    );
    const teacherDb = new PracticeDatabase();
    (teacherDb as any).first = (sql: string) => sql.includes('FROM teachers')
      ? { status: 'ACTIVE', token_version: 0, must_change_password: 0 }
      : null;
    const response = await handlePracticeRoutes(request, env(teacherDb), '/api/practice/topics', 'GET');
    expect(response.status).toBe(403);
  });

  it('returns a service error when signing is unavailable', async () => {
    const request = await studentRequest('https://api.test/api/practice?topic=Toan');
    const response = await handlePracticeRoutes(
      request,
      { ...env(db), JWT_SECRET: '' },
      '/api/practice',
      'GET',
    );
    expect(response.status).toBe(503);
  });

  it('returns not found when an exact topic has no questions', async () => {
    const request = await studentRequest('https://api.test/api/practice?topic=KhongCo');
    const response = await handlePracticeRoutes(request, env(db), '/api/practice', 'GET');
    expect(response.status).toBe(404);
  });

  it.each([
    ['/api/practice/topics', 'GET', 'failTopics'],
    ['/api/practice?topic=Toan', 'GET', 'failQuestions'],
  ] as const)('uses a generic response when a practice query fails: %s', async (url, method, flag) => {
    db[flag] = true;
    const request = await studentRequest(`https://api.test${url}`);
    const path = new URL(request.url).pathname;
    const response = await handlePracticeRoutes(request, env(db), path, method);
    expect(response.status).toBe(400);
  });

  it('returns only exact-tag sanitized questions and a signed attempt token', async () => {
    const request = await studentRequest('https://api.test/api/practice?topic=%23Toan&limit=10');
    const response = await handlePracticeRoutes(request, env(db), '/api/practice', 'GET');
    const quiz = await response.json() as any;

    expect(response.status).toBe(200);
    expect(quiz.practiceAttemptToken).toEqual(expect.any(String));
    expect(quiz.questions.map((question: any) => question.id)).toEqual(['q-1']);
    expect(quiz.questions[0]).not.toHaveProperty('correct_answer');
    expect(quiz.questions[0]).not.toHaveProperty('correctAnswer');
    expect(quiz.questions[0]).not.toHaveProperty('correctWordIndexes');
    expect(quiz.questions[0].items[0]).not.toHaveProperty('isCorrect');
    expect(quiz.questions[0].items[0]).not.toHaveProperty('correctHint');
    expect(quiz.questions[0].blanks[0]).not.toHaveProperty('correctAnswer');
    expect(quiz.questions[0].blanks[0]).not.toHaveProperty('correctRule');
    expect(quiz.questions[0].distractors[0]).not.toHaveProperty('correctChoice');
  });

  it('separates matching columns without leaking pairs and grades them after submission', async () => {
    const quizRequest = await studentRequest('https://api.test/api/practice?topic=%23Noi&limit=10');
    const quizResponse = await handlePracticeRoutes(quizRequest, env(db), '/api/practice', 'GET');
    const quiz = await quizResponse.json() as any;
    const question = quiz.questions[0];

    expect(question.pairs).toEqual([]);
    expect(question.leftItems).toEqual([{ id: 'Hà Nội', content: 'Hà Nội' }]);
    expect(question.rightItems).toEqual([{ id: 'Việt Nam', content: 'Việt Nam' }]);
    expect(question).not.toHaveProperty('correctHint');

    const submitRequest = await studentRequest('https://api.test/api/practice/submissions', {
      method: 'POST',
      body: JSON.stringify({
        attemptToken: quiz.practiceAttemptToken,
        answers: { 'q-3': { 'Hà Nội': 'Việt Nam' } },
      }),
    });
    const submitResponse = await handlePracticeRoutes(
      submitRequest,
      env(db),
      '/api/practice/submissions',
      'POST',
    );
    const result = await submitResponse.json() as any;

    expect(result).toMatchObject({ status: 'success', score: 10, correctCount: 1, total: 1 });
    expect(result.reviewQuestions[0].pairs).toEqual([{ left: 'Hà Nội', right: 'Việt Nam' }]);
  });

  it('grades only questions in the signed attempt and returns review data after submission', async () => {
    const quizRequest = await studentRequest('https://api.test/api/practice?topic=%23Toan&limit=10');
    const quizResponse = await handlePracticeRoutes(quizRequest, env(db), '/api/practice', 'GET');
    const quiz = await quizResponse.json() as any;

    const submitRequest = await studentRequest('https://api.test/api/practice/submissions', {
      method: 'POST',
      body: JSON.stringify({
        attemptToken: quiz.practiceAttemptToken,
        answers: { 'q-1': 'B', 'q-2': 'A' },
      }),
    });
    const submitResponse = await handlePracticeRoutes(
      submitRequest,
      env(db),
      '/api/practice/submissions',
      'POST',
    );
    const result = await submitResponse.json() as any;

    expect(submitResponse.status).toBe(200);
    expect(result).toMatchObject({ status: 'success', score: 10, correctCount: 1, total: 1 });
    expect(result.details).toEqual([{ questionId: 'q-1', isCorrect: true }]);
    expect(result.reviewQuestions).toHaveLength(1);
    expect(result.reviewQuestions[0]).toMatchObject({ id: 'q-1', correctAnswer: 'B' });
  });

  it.each([
    {},
    { attemptToken: 42, answers: {} },
    { attemptToken: 'token', answers: [] },
    { attemptToken: 'token' },
  ])('rejects malformed practice submissions', async (body) => {
    const request = await studentRequest('https://api.test/api/practice/submissions', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const response = await handlePracticeRoutes(request, env(db), '/api/practice/submissions', 'POST');
    expect(response.status).toBe(400);
  });

  it('rejects a tampered attempt without exposing signature details', async () => {
    const token = await signPracticeAttemptToken({
      studentId: 'student-a',
      topic: '#Toan',
      questionIds: ['q-1'],
    }, secret);
    const [header, payload, signature] = token.split('.');
    const tamperedSignature = `${signature.startsWith('a') ? 'b' : 'a'}${signature.slice(1)}`;
    const tampered = `${header}.${payload}.${tamperedSignature}`;
    const request = await studentRequest('https://api.test/api/practice/submissions', {
      method: 'POST',
      body: JSON.stringify({ attemptToken: tampered, answers: {} }),
    });
    const response = await handlePracticeRoutes(request, env(db), '/api/practice/submissions', 'POST');
    await expect(response.json()).resolves.toMatchObject({ message: 'Invalid practice attempt' });
  });

  it('rejects an attempt owned by another student', async () => {
    const token = await signPracticeAttemptToken({
      studentId: 'student-b',
      topic: '#Toan',
      questionIds: ['q-1'],
    }, secret);
    const request = await studentRequest('https://api.test/api/practice/submissions', {
      method: 'POST',
      body: JSON.stringify({ attemptToken: token, answers: {} }),
    });
    const response = await handlePracticeRoutes(request, env(db), '/api/practice/submissions', 'POST');
    expect(response.status).toBe(403);
  });

  it('rejects an attempt if any issued question no longer exists', async () => {
    const token = await signPracticeAttemptToken({
      studentId: 'student-a',
      topic: '#Toan',
      questionIds: ['q-1', 'missing-question'],
    }, secret);
    const request = await studentRequest('https://api.test/api/practice/submissions', {
      method: 'POST',
      body: JSON.stringify({ attemptToken: token, answers: {} }),
    });
    const response = await handlePracticeRoutes(request, env(db), '/api/practice/submissions', 'POST');
    expect(response.status).toBe(400);
  });

  it('returns the stable 410 contract for an expired attempt', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-26T00:00:00.000Z'));
    const token = await signPracticeAttemptToken({
      studentId: 'student-a',
      topic: '#Toan',
      questionIds: ['q-1'],
    }, secret);
    vi.setSystemTime(new Date('2026-07-26T02:00:01.000Z'));
    const request = await studentRequest('https://api.test/api/practice/submissions', {
      method: 'POST',
      body: JSON.stringify({ attemptToken: token, answers: {} }),
    });
    const response = await handlePracticeRoutes(request, env(db), '/api/practice/submissions', 'POST');
    await expect(response.json()).resolves.toMatchObject({ code: 'PRACTICE_ATTEMPT_EXPIRED' });
    expect(response.status).toBe(410);
  });

  it('returns 404 for unsupported practice paths', async () => {
    const request = await studentRequest('https://api.test/api/practice/unknown');
    const response = await handlePracticeRoutes(request, env(db), '/api/practice/unknown', 'GET');
    expect(response.status).toBe(404);
  });

  it('fails closed when a student exceeds the practice rate limit', async () => {
    db.rateCount = 121;
    const request = await studentRequest('https://api.test/api/practice/topics');
    const response = await handlePracticeRoutes(request, env(db), '/api/practice/topics', 'GET');

    expect(response.status).toBe(429);
  });
});

describe('practice attempt token validation', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    { studentId: '', topic: '#Toan', questionIds: ['q-1'] },
    { studentId: 'student-a', topic: '', questionIds: ['q-1'] },
    { studentId: 'student-a', topic: '#Toan', questionIds: [] },
    { studentId: 'student-a', topic: '#Toan', questionIds: Array.from({ length: 51 }, (_, index) => `q-${index}`) },
  ])('refuses to sign invalid claims', async (claims) => {
    await expect(signPracticeAttemptToken(claims, secret)).rejects.toThrow('Invalid practice attempt claims');
  });

  it.each([
    { purpose: 'wrong', topic: '#Toan', questionIds: ['q-1'] },
    { purpose: 'practice_attempt', topic: '#Toan', questionIds: [] },
    { purpose: 'practice_attempt', topic: '#Toan', questionIds: ['q-1', 'q-1'] },
    { purpose: 'practice_attempt', topic: '#Toan', questionIds: [''] },
    { purpose: 'practice_attempt', topic: '#Toan', questionIds: ['x'.repeat(129)] },
  ])('rejects signed tokens with invalid isolated claims', async (payload) => {
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'practice+jwt' })
      .setSubject('student-a')
      .setIssuer('itongquiz-practice')
      .setAudience('itongquiz-practice-web')
      .setExpirationTime('2h')
      .sign(new TextEncoder().encode(secret));

    await expect(verifyPracticeAttemptToken(token, secret)).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });
  });
});
