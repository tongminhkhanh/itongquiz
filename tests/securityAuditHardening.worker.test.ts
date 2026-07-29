import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  user: {
    id: 'student-a',
    username: 'student-a',
    role: 'student' as 'student' | 'teacher' | 'admin',
    classId: 'class-a',
  },
}));

vi.mock('../workers/src/middleware/jwtAuth', () => ({
  verifyJWTMiddleware: vi.fn(async () => ({ user: authState.user })),
  requireAdmin: (user: { role: string }) => user.role === 'admin',
  requireTeacher: (user: { role: string }) => user.role === 'admin' || user.role === 'teacher',
  requireOwnership: (user: { role: string; username: string }, owner: string) => (
    user.role === 'admin' || user.username === owner
  ),
  isStudent: (user: { role: string }) => user.role === 'student',
}));

import { handleAiTutorRoutes } from '../workers/src/routes/aiTutor';
import { handleHelpRagRoutes } from '../workers/src/routes/helpRag';
import { handleQuizRoutes } from '../workers/src/routes/quizzes';
import { handleResultRoutes } from '../workers/src/routes/results';

type StatementResult = {
  first?: unknown;
  all?: unknown[];
};

function createDb(
  resolve: (sql: string, bindings: unknown[]) => StatementResult,
  captured: Array<{ sql: string; bindings: unknown[] }> = [],
) {
  return {
    prepare(sql: string) {
      let bindings: unknown[] = [];
      const statement = {
        bind(...values: unknown[]) {
          bindings = values;
          captured.push({ sql, bindings: values });
          return statement;
        },
        async first<T>() {
          return (resolve(sql, bindings).first ?? null) as T | null;
        },
        async all<T>() {
          return { results: (resolve(sql, bindings).all ?? []) as T[] };
        },
        async run() {
          return { success: true, meta: { changes: 1, last_row_id: 1 } };
        },
      };
      return statement;
    },
  };
}

const env = (db: unknown) => ({
  DB: db,
  JWT_SECRET: 'unit-test-secret',
  CLIPROXY_API: 'https://ai.example.test/v1',
  CLIPROXY_TOKEN: 'upstream-secret-token',
}) as any;

describe('local security audit regression cases', () => {
  beforeEach(() => {
    authState.user = {
      id: 'student-a',
      username: 'student-a',
      role: 'student',
      classId: 'class-a',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps a malicious quizId in D1 bindings instead of SQL text', async () => {
    authState.user = {
      id: 'admin-a',
      username: 'admin-a',
      role: 'admin',
      classId: '',
    };
    const captured: Array<{ sql: string; bindings: unknown[] }> = [];
    const db = createDb((sql) => (
      sql.includes('COUNT(*)')
        ? { first: { total: 0 } }
        : { all: [] }
    ), captured);
    const payload = `quiz-a' OR 1=1 --`;
    const request = new Request(
      `https://test/api/results?quizId=${encodeURIComponent(payload)}`,
      { method: 'GET' },
    );

    const response = await handleResultRoutes(request, env(db), '/api/results', 'GET');

    expect(response.status).toBe(200);
    expect(captured.length).toBeGreaterThanOrEqual(2);
    expect(captured.every(({ sql }) => !sql.includes(payload))).toBe(true);
    expect(captured.some(({ bindings }) => bindings.includes(payload))).toBe(true);
  });

  it('does not trust a client-forged isCorrect value when saving a result', async () => {
    const captured: Array<{ sql: string; bindings: unknown[] }> = [];
    const db = createDb((sql) => {
      if (sql.includes('FROM students') && sql.includes('students.username = ?')) {
        return {
          first: {
            id: 'student-a',
            username: 'student-a',
            full_name: 'Student',
            class_id: 'class-a',
            class_name: '4A',
          },
        };
      }
      if (sql.includes('SELECT * FROM questions WHERE quiz_id = ?')) {
        return {
          all: [{
            id: 'q1',
            quiz_id: 'quiz-a',
            type: 'MCQ',
            question: '1 + 1 = ?',
            correct_answer: 'B',
          }],
        };
      }
      return { first: null, all: [] };
    }, captured);
    const response = await handleResultRoutes(
      new Request('https://test/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: 'quiz-a',
          quizTitle: 'Quiz',
          studentName: 'Student',
          studentClass: '4A',
          totalQuestions: 1,
          score: 10,
          correctCount: 1,
          answers: {
            q1: {
              selectedAnswer: 'A',
              isCorrect: true,
            },
          },
        }),
      }),
      env(db),
      '/api/results',
      'POST',
    );
    const insert = captured.find(({ sql }) => sql.includes('INSERT INTO results'));

    expect(response.status).toBe(200);
    expect(insert).toBeDefined();
    expect(insert?.bindings[6]).toBe(0);
    expect(insert?.bindings[7]).toBe(0);
    expect(JSON.parse(String(insert?.bindings[11])).q1.isCorrect).toBe(false);
  });

  it('rejects a student reading questions from a private unassigned quiz', async () => {
    const db = createDb((sql) => {
      if (sql.includes('FROM questions')) {
        return {
          all: [{
            id: 'private-q1',
            quiz_id: 'private-quiz',
            type: 'MULTIPLE_CHOICE',
            question: 'Private exam content',
            options: '["A","B"]',
            correct_answer: 'A',
          }],
        };
      }
      return { first: null, all: [] };
    });
    const request = new Request(
      'https://test/api/questions?quizId=private-quiz',
      { method: 'GET' },
    );

    const response = await handleQuizRoutes(request, env(db), '/api/questions', 'GET');

    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain('Private exam content');
  });

  it('scopes the student quiz catalog to public or assigned quizzes', async () => {
    const captured: Array<{ sql: string; bindings: unknown[] }> = [];
    const db = createDb(() => ({ all: [] }), captured);
    const response = await handleQuizRoutes(
      new Request('https://test/api/quizzes'),
      env(db),
      '/api/quizzes',
      'GET',
    );
    const catalogQuery = captured.find(({ sql }) => sql.includes('FROM quizzes z'));

    expect(response.status).toBe(200);
    expect(catalogQuery?.sql).toContain('show_on_home');
    expect(catalogQuery?.sql).toContain('FROM assignments');
    expect(catalogQuery?.bindings).toEqual(['student-a']);
  });

  it('allows sanitized questions from an assigned quiz', async () => {
    const db = createDb((sql) => {
      if (sql.includes('SELECT 1 AS allowed')) return { first: { allowed: 1 } };
      if (sql.includes('FROM questions')) {
        return {
          all: [{
            id: 'assigned-q1',
            quiz_id: 'assigned-quiz',
            type: 'MULTIPLE_CHOICE',
            question: 'Assigned exam content',
            options: '["A","B"]',
            correct_answer: 'A',
          }],
        };
      }
      return { first: null, all: [] };
    });
    const response = await handleQuizRoutes(
      new Request('https://test/api/questions?quizId=assigned-quiz'),
      env(db),
      '/api/questions',
      'GET',
    );
    const payload = await response.json() as any[];

    expect(response.status).toBe(200);
    expect(payload[0].question).toBe('Assigned exam content');
    expect(payload[0]).not.toHaveProperty('correct_answer');
  });

  it('rejects result access when another student has the same name and class', async () => {
    const db = createDb((sql) => {
      if (sql.includes('FROM results WHERE id = ?')) {
        return {
          first: {
            id: 'result-victim',
            student_id: 'student-b',
            student_name: 'Nguyen Van An',
            class_name: '4A',
            quiz_id: 'quiz-a',
            quiz_title: 'Private result',
            score: 9,
            correct_count: 9,
            total_questions: 10,
            time_taken: 100,
            submitted_at: '2026-07-29T00:00:00.000Z',
            answers: '{"private":"answer"}',
          },
        };
      }
      if (sql.includes('FROM students') && sql.includes('students.username = ?')) {
        return {
          first: {
            id: 'student-a',
            username: 'student-a',
            full_name: 'Nguyen Van An',
            class_id: 'class-a',
            class_name: '4A',
          },
        };
      }
      if (sql.includes('SELECT answers FROM results')) {
        return { first: { answers: '{"private":"answer"}' } };
      }
      return { first: null, all: [] };
    });
    const request = new Request(
      'https://test/api/results/result-victim/answers',
      { method: 'GET' },
    );

    const response = await handleResultRoutes(
      request,
      env(db),
      '/api/results/result-victim/answers',
      'GET',
    );

    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain('private');
  });

  it('allows a student to read their own canonical result', async () => {
    const db = createDb((sql) => {
      if (sql.includes('FROM results WHERE id = ?')) {
        return {
          first: {
            id: 'result-own',
            student_id: 'student-a',
            student_name: 'Nguyen Van An',
            class_name: '4A',
            quiz_id: 'quiz-a',
            answers: '{"q1":{"isCorrect":false}}',
          },
        };
      }
      if (sql.includes('FROM students') && sql.includes('students.username = ?')) {
        return {
          first: {
            id: 'student-a',
            username: 'student-a',
            full_name: 'Nguyen Van An',
            class_id: 'class-a',
            class_name: '4A',
          },
        };
      }
      if (sql.includes('SELECT answers FROM results')) {
        return { first: { answers: '{"q1":{"isCorrect":false}}' } };
      }
      return { first: null, all: [] };
    });
    const response = await handleResultRoutes(
      new Request('https://test/api/results/result-own/answers'),
      env(db),
      '/api/results/result-own/answers',
      'GET',
    );

    expect(response.status).toBe(200);
    const payload = await response.json() as { answers: string };
    expect(JSON.parse(payload.answers)).toHaveProperty('q1');
  });

  it('rejects AI Tutor access to questions without a student-owned wrong result', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            diagnosis: 'diagnosis',
            explanation: 'explanation',
            practiceQuestions: [],
          }),
        },
      }],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchSpy);
    const db = createDb((sql) => {
      if (sql.includes('FROM questions')) {
        return {
          all: [{
            id: 'private-q1',
            quiz_id: 'private-quiz',
            question: 'Private exam content',
            options: '["A","B"]',
            correct_answer: 'A',
          }],
        };
      }
      return { first: null, all: [] };
    });
    const request = new Request('https://test/api/ai-tutor/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quizId: 'private-quiz',
        wrongQuestionIds: ['private-q1'],
      }),
    });

    const response = await handleAiTutorRoutes(
      request,
      env(db),
      '/api/ai-tutor/diagnose',
      'POST',
    );

    expect(response?.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('allows AI Tutor for a question proven wrong in the student result', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            diagnosis: 'diagnosis',
            explanation: 'explanation',
            practiceQuestions: [],
          }),
        },
      }],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchSpy);
    const db = createDb((sql) => {
      if (sql.includes('FROM results')) {
        return { all: [{ answers: '{"q1":{"isCorrect":false}}' }] };
      }
      if (sql.includes('FROM questions')) {
        return {
          all: [{
            id: 'q1',
            quiz_id: 'quiz-a',
            question: 'Question',
            options: '["A","B"]',
            correct_answer: 'A',
          }],
        };
      }
      return { first: null, all: [] };
    });
    const response = await handleAiTutorRoutes(
      new Request('https://test/api/ai-tutor/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: 'quiz-a', wrongQuestionIds: ['q1'] }),
      }),
      env(db),
      '/api/ai-tutor/diagnose',
      'POST',
    );

    expect(response?.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('does not expose an upstream secret in AI Tutor responses or logs', async () => {
    authState.user = {
      id: 'admin-a',
      username: 'admin-a',
      role: 'admin',
      classId: '',
    };
    const secret = 'upstream-secret-token';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      `Authorization: Bearer ${secret}`,
      { status: 500 },
    )));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const db = createDb((sql) => (
      sql.includes('FROM questions')
        ? {
          all: [{
            id: 'q1',
            quiz_id: 'quiz-a',
            question: 'Question',
            options: '["A","B"]',
            correct_answer: 'A',
          }],
        }
        : { first: null, all: [] }
    ));
    const request = new Request('https://test/api/ai-tutor/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId: 'quiz-a', wrongQuestionIds: ['q1'] }),
    });

    const response = await handleAiTutorRoutes(
      request,
      env(db),
      '/api/ai-tutor/diagnose',
      'POST',
    );
    const responseBody = await response!.text();
    const logged = JSON.stringify(errorSpy.mock.calls);

    expect(response?.status).toBe(503);
    expect(responseBody).not.toContain(secret);
    expect(logged).not.toContain(secret);
  });

  it('does not expose an upstream secret in Help RAG responses or logs', async () => {
    const secret = 'upstream-secret-token';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      `Authorization: Bearer ${secret}`,
      { status: 500 },
    )));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const rows = [
      {
        chunk_id: 'chunk-1',
        source_path: '/guide/one',
        title: 'Guide',
        section_title: 'One',
        content: 'A'.repeat(320),
      },
      {
        chunk_id: 'chunk-2',
        source_path: '/guide/two',
        title: 'Guide',
        section_title: 'Two',
        content: 'B'.repeat(320),
      },
    ];
    const db = createDb((sql) => (
      sql.includes('FROM rag_chunks_fts')
        ? { all: rows }
        : { first: null, all: [] }
    ));
    const response = await handleHelpRagRoutes(
      new Request('https://test/api/help/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'cach tao de thi' }),
      }),
      env(db),
      '/api/help/ask',
      'POST',
    );
    const responseBody = await response!.text();
    const logged = JSON.stringify(errorSpy.mock.calls);

    expect(response?.status).toBe(503);
    expect(responseBody).not.toContain(secret);
    expect(logged).not.toContain(secret);
  });
});
