import { Env } from '../types';
import { isStudent, verifyJWTMiddleware } from '../middleware/jwtAuth';
import { rateLimit } from '../middleware/rateLimit';
import { sanitizeQuestionForStudent } from './quizzes';
import { handleValidateAnswers, parseBody } from '../utils/helpers';
import { errorResponse, jsonResponse } from '../utils/response';
import {
  signPracticeAttemptToken,
  verifyPracticeAttemptToken,
} from '../services/practiceAttemptToken';

const MAX_PRACTICE_LIMIT = 50;
const MAX_TOPIC_LENGTH = 80;

const parseJson = (value: unknown, fallback: unknown) => {
  if (typeof value !== 'string') return value ?? fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const parseTags = (value: unknown): string[] => String(value || '')
  .split(/[\s,]+/u)
  .map(tag => tag.trim())
  .filter(Boolean);

const normalizeTopic = (value: string | null): string | null => {
  if (!value) return null;
  const name = value.startsWith('#') ? value.slice(1) : value;
  if (name.length < 1 || name.length > MAX_TOPIC_LENGTH) return null;
  const topic = `#${name}`;
  return /^#[\p{L}\p{N}_-]+$/u.test(topic) ? topic : null;
};

const parseLimit = (value: string | null): number | null => {
  if (value === null) return 10;
  if (!/^\d+$/u.test(value)) return null;
  const limit = Number(value);
  return Number.isInteger(limit) && limit >= 1 && limit <= MAX_PRACTICE_LIMIT ? limit : null;
};

const escapeLike = (value: string): string => value.replace(/[\\%_]/gu, match => `\\${match}`);

const shuffle = <T>(values: T[]): T[] => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

const mapQuestionForClient = (question: any, sanitize: boolean): any => {
  const source = sanitize ? sanitizeQuestionForStudent(question) : { ...question };
  const mapped: any = { ...source };
  mapped.items = parseJson(source.items, []);
  mapped.pairs = parseJson(source.pairs, []);
  mapped.leftItems = parseJson(source.left_items ?? source.leftItems, []);
  mapped.rightItems = parseJson(source.right_items ?? source.rightItems, []);
  mapped.categories = parseJson(source.categories, []);
  mapped.blanks = parseJson(source.blanks, []);
  mapped.distractors = parseJson(source.distractors, []);
  mapped.options = typeof source.options === 'string' ? source.options.split('|') : (source.options || []);
  mapped.words = parseJson(source.words, []);
  mapped.letters = parseJson(source.letters, []);
  mapped.riddleLines = parseJson(source.riddleLines, []);
  mapped.optionImages = parseJson(source.option_images ?? source.optionImages, []);
  mapped.questionContent = parseJson(source.question_content_json ?? source.questionContent, null);
  mapped.explanationContent = parseJson(source.explanation_content_json ?? source.explanationContent, null);
  mapped.quizId = source.quiz_id;
  mapped.mainQuestion = source.question;
  mapped.text = source.text_field;
  mapped.sentence = source.sentence || source.text_field || '';
  if (!sanitize) {
    mapped.correctAnswer = parseJson(source.correct_answer, source.correct_answer ?? '');
    mapped.correctAnswers = parseJson(source.correct_answers, source.correct_answers ?? []);
    mapped.correctWord = source.correct_word;
    mapped.correctWordIndexes = parseJson(source.correct_word_indexes, []);
    mapped.correctOrder = parseJson(source.correct_order, []);
  }
  return mapped;
};

const requirePracticeStudent = async (request: Request, env: Env) => {
  const authResult = await verifyJWTMiddleware(request, env);
  if (authResult instanceof Response) return authResult;
  if (!isStudent(authResult.user) || !authResult.user.id) {
    return errorResponse('Forbidden: Student access required', 403);
  }
  return authResult.user;
};

const practiceRateLimit = (
  request: Request,
  env: Env,
  studentId: string,
  maxRequests: number,
) => rateLimit(request, env, {
  windowMs: 60 * 1000,
  maxRequests,
  failureMode: 'closed',
  keyGenerator: () => `ratelimit:practice:${new URL(request.url).pathname}:${studentId}`,
});

const loadAttemptQuestions = async (db: D1Database, questionIds: string[]) => {
  const placeholders = questionIds.map(() => '?').join(', ');
  const rows = await db.prepare(
    `SELECT * FROM questions WHERE id IN (${placeholders})`
  ).bind(...questionIds).all<any>();
  const byId = new Map(rows.results.map(question => [String(question.id), question]));
  return questionIds.map(id => byId.get(id)).filter(Boolean);
};

export async function handlePracticeRoutes(
  request: Request,
  env: Env,
  path: string,
  method: string,
): Promise<Response> {
  const auth = await requirePracticeStudent(request, env);
  if (auth instanceof Response) return auth;
  const db = env.DB;

  if (path === '/api/practice/topics' && method === 'GET') {
    const limited = await practiceRateLimit(request, env, auth.id!, 120);
    if (limited) return limited;
    try {
      const rows = await db.prepare(
        'SELECT tags FROM questions WHERE tags IS NOT NULL AND tags != ""'
      ).all<{ tags: string }>();
      const topicMap = new Map<string, number>();
      rows.results.forEach(row => {
        new Set(parseTags(row.tags).filter(tag => tag.startsWith('#'))).forEach(tag => {
          topicMap.set(tag, (topicMap.get(tag) || 0) + 1);
        });
      });
      const topics = Array.from(topicMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return jsonResponse({ topics }, 200, 60);
    } catch (error) {
      console.error('[GET /api/practice/topics] Error:', error);
      return errorResponse('Failed to fetch practice topics');
    }
  }

  if (path === '/api/practice' && method === 'GET') {
    const limited = await practiceRateLimit(request, env, auth.id!, 20);
    if (limited) return limited;
    const url = new URL(request.url);
    const topic = normalizeTopic(url.searchParams.get('topic'));
    const limit = parseLimit(url.searchParams.get('limit'));
    if (!topic) return errorResponse('Invalid topic parameter', 400);
    if (limit === null) return errorResponse('Invalid limit parameter', 400);
    if (!env.JWT_SECRET) return errorResponse('Authentication service unavailable', 503);

    try {
      const rows = await db.prepare(`
        SELECT *
        FROM questions
        WHERE tags LIKE ? ESCAPE '\\'
        LIMIT 500
      `).bind(`%${escapeLike(topic)}%`).all<any>();
      const selected = shuffle(
        rows.results.filter(question => parseTags(question.tags).includes(topic))
      ).slice(0, limit);
      if (selected.length === 0) return errorResponse('No practice questions found', 404);

      const practiceAttemptToken = await signPracticeAttemptToken({
        studentId: auth.id!,
        topic,
        questionIds: selected.map(question => String(question.id)),
      }, env.JWT_SECRET);
      return jsonResponse({
        id: `practice_${crypto.randomUUID()}`,
        title: `Ôn tập: ${topic.slice(1).replace(/_/g, ' ')}`,
        classLevel: 'Tự do',
        category: 'Luyện tập',
        timeLimit: 0,
        isPractice: true,
        createdAt: new Date().toISOString(),
        practiceAttemptToken,
        questions: selected.map(question => mapQuestionForClient(question, true)),
      });
    } catch (error) {
      console.error('[GET /api/practice] Error:', error);
      return errorResponse('Failed to fetch practice quiz');
    }
  }

  if (path === '/api/practice/submissions' && method === 'POST') {
    const limited = await practiceRateLimit(request, env, auth.id!, 30);
    if (limited) return limited;
    if (!env.JWT_SECRET) return errorResponse('Authentication service unavailable', 503);
    const body = await parseBody(request);
    if (!body || typeof body.attemptToken !== 'string'
      || !body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) {
      return errorResponse('Invalid practice submission', 400);
    }

    const verification = await verifyPracticeAttemptToken(body.attemptToken, env.JWT_SECRET);
    if (!verification.ok) {
      if (verification.reason === 'expired') {
        return jsonResponse({
          status: 'error',
          code: 'PRACTICE_ATTEMPT_EXPIRED',
          message: 'Lượt luyện tập đã hết hạn. Em hãy tải một lượt mới.',
        }, 410);
      }
      return errorResponse('Invalid practice attempt', 400);
    }
    if (verification.claims.studentId !== auth.id) {
      return errorResponse('Forbidden: Practice attempt belongs to another student', 403);
    }

    const questions = await loadAttemptQuestions(db, verification.claims.questionIds);
    if (questions.length !== verification.claims.questionIds.length) {
      return errorResponse('Invalid practice attempt', 400);
    }
    const gradingResponse = await handleValidateAnswers(db, { answers: body.answers }, {
      questionIds: verification.claims.questionIds,
    });
    const grading = await gradingResponse.json<any>();
    if (gradingResponse.status !== 200 || grading.status === 'error') return gradingResponse;

    return jsonResponse({
      ...grading,
      reviewQuestions: questions.map(question => mapQuestionForClient(question, false)),
    });
  }

  return errorResponse(`Not found: ${path}`, 404);
}
