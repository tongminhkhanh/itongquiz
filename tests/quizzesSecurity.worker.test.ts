import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JWTPayload } from '../workers/src/utils/jwt';

let currentUser: JWTPayload | null = null;
vi.mock('../workers/src/middleware/jwtAuth', () => ({
  verifyJWTMiddleware: vi.fn(async () => currentUser
    ? { user: currentUser }
    : new Response(JSON.stringify({ status: 'error' }), { status: 401 })),
  requireAdmin: vi.fn((user: JWTPayload) => user.role === 'admin'),
  requireTeacher: vi.fn((user: JWTPayload) => user.role === 'teacher' || user.role === 'admin'),
  isStudent: vi.fn((user: JWTPayload) => user.role === 'student'),
}));

import { handleQuizRoutes, sanitizeQuestionForStudent } from '../workers/src/routes/quizzes';
import { handleResultRoutes } from '../workers/src/routes/results';

class Statement {
  bindings: unknown[] = [];
  constructor(readonly sql: string, readonly db: Database) {}
  bind(...values: unknown[]) { this.bindings = values; return this; }
  async first<T>() { this.db.executed.push(this); return this.db.first(this.sql, this.bindings) as T; }
  async all<T>() { this.db.executed.push(this); return { results: this.db.all(this.sql, this.bindings) as T[] }; }
  async run() { this.db.executed.push(this); return { success: true, meta: { changes: 1, last_row_id: 1 } }; }
}

class Database {
  executed: Statement[] = [];
  question = {
    id: 'q-1', quiz_id: 'quiz-a', type: 'TRUE_FALSE', question: 'Chọn đúng sai',
    options: '', correct_answer: 'B', items: JSON.stringify([{ id: 'i-1', statement: 'Mệnh đề', isCorrect: true }]),
    text_field: '', blanks: JSON.stringify([{ id: 'b-1', correctAnswer: 'bí mật', options: ['bí mật', 'khác'] }]),
    distractors: '', sentence: '', words: '', correct_word_indexes: '[1]', image: '', tags: '',
  };
  prepare(sql: string) { return new Statement(sql, this); }
  first(sql: string, bindings: unknown[]) {
    if (sql.includes('SELECT created_by FROM quizzes')) {
      return { created_by: bindings[0] === 'quiz-b' ? 'teacher-b' : 'teacher-a' };
    }
    if (sql.includes('SELECT * FROM quizzes WHERE id')) {
      return { id: bindings[0], title: 'Đề', created_by: bindings[0] === 'quiz-b' ? 'teacher-b' : 'teacher-a', class_level: '4', time_limit: 15 };
    }
    if (sql.includes('COUNT(*) as cnt')) return { cnt: 0 };
    return null;
  }
  all(sql: string, bindings: unknown[]) {
    if (sql.includes('FROM questions')) return [{ ...this.question, quiz_id: String(bindings[0] || 'quiz-a') }];
    return [];
  }
  async batch(statements: Statement[]) {
    for (const statement of statements) this.executed.push(statement);
    return statements.map(() => ({ success: true }));
  }
}

const env = (db: Database) => ({ DB: db, JWT_SECRET: 'test-secret' } as any);
const authRequest = (url: string, init: RequestInit = {}) => new Request(url, {
  ...init,
  headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json', ...(init.headers || {}) },
});

describe('quiz answer confidentiality and ownership', () => {
  beforeEach(() => { currentUser = null; });

  it('rejects anonymous access to question data', async () => {
    const db = new Database();
    const response = await handleQuizRoutes(new Request('https://test/api/questions?quizId=quiz-a'), env(db), '/api/questions', 'GET');
    expect(response.status).toBe(401);
  });

  it('strips direct and nested answers for a student', async () => {
    currentUser = { id: 'student-a', username: 'student-a', role: 'student', classId: 'class-a' };
    const db = new Database();
    const response = await handleQuizRoutes(authRequest('https://test/api/questions?quizId=quiz-a'), env(db), '/api/questions', 'GET');
    const rows = await response.json() as any[];
    expect(response.status).toBe(200);
    expect(rows[0]).not.toHaveProperty('correct_answer');
    expect(rows[0]).not.toHaveProperty('correct_word_indexes');
    expect(JSON.parse(rows[0].items)[0]).not.toHaveProperty('isCorrect');
    expect(JSON.parse(rows[0].blanks)[0]).not.toHaveProperty('correctAnswer');
  });

  it('keeps the authenticated student catalog contract while sanitizing every row', async () => {
    currentUser = { id: 'student-a', username: 'student-a', role: 'student', classId: 'class-a' };
    const db = new Database();
    const response = await handleQuizRoutes(authRequest('https://test/api/questions'), env(db), '/api/questions', 'GET');
    const rows = await response.json() as any[];
    expect(response.status).toBe(200);
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty('correct_answer');
    expect(JSON.parse(rows[0].items)[0]).not.toHaveProperty('isCorrect');
  });

  it('hides drag-drop order while preserving a shuffled choice pool', () => {
    const safe = sanitizeQuestionForStudent({
      id: 'drag-1',
      type: 'DRAG_DROP',
      text_field: 'Bầu trời [xanh] và mây [trắng].',
      blanks: JSON.stringify(['xanh', 'trắng']),
      distractors: JSON.stringify(['đỏ']),
      correct_answer: '',
    });
    expect(safe.text_field).toBe('Bầu trời [1] và mây [2].');
    expect(JSON.parse(safe.blanks)).toEqual([]);
    const pool = JSON.parse(safe.distractors);
    expect(pool.sort()).toEqual(['xanh', 'trắng', 'đỏ'].sort());
    expect(safe.text_field).not.toContain('xanh');
    expect(safe.text_field).not.toContain('trắng');
  });

  it('does not return correctAnswer in student validation details', async () => {
    currentUser = { id: 'student-a', username: 'student-a', role: 'student', classId: 'class-a' };
    const db = new Database();
    const response = await handleResultRoutes(authRequest('https://test/api/validate', {
      method: 'POST', body: JSON.stringify({ quizId: 'quiz-a', answers: {} }),
    }), env(db), '/api/validate', 'POST');
    const payload = await response.json() as any;
    expect(response.status).toBe(200);
    expect(payload.details[0]).not.toHaveProperty('correctAnswer');
  });

  it('rejects a body id that differs from the URL quiz id', async () => {
    currentUser = { username: 'teacher-a', role: 'teacher' };
    const db = new Database();
    const response = await handleQuizRoutes(authRequest('https://test/api/quizzes/quiz-a', {
      method: 'PUT', body: JSON.stringify({ id: 'quiz-b', title: 'Tấn công', classLevel: '4', questions: [] }),
    }), env(db), '/api/quizzes/quiz-a', 'PUT');
    expect(response.status).toBe(400);
    expect(db.executed.some(statement => statement.bindings.includes('quiz-b'))).toBe(false);
  });

  it('rejects duplicating another teacher quiz', async () => {
    currentUser = { username: 'teacher-a', role: 'teacher' };
    const db = new Database();
    const response = await handleQuizRoutes(authRequest('https://test/api/quizzes/quiz-b/duplicate', { method: 'POST' }), env(db), '/api/quizzes/quiz-b/duplicate', 'POST');
    expect(response.status).toBe(403);
  });
});
