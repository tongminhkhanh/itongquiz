import type { D1Database } from '@cloudflare/workers-types';
import type { LiveExamSession, LiveExamStatus } from '../../../../src/types/liveExam.types';
import { LiveExamServiceError } from './errors';
import type { CreateLiveExamParams } from './types';
import { generateAccessCode, generateId, now } from './utils';

export async function createLiveExam(
  db: D1Database,
  params: CreateLiveExamParams,
): Promise<LiveExamSession> {
  const id = generateId();
  const accessCode = generateAccessCode();
  const timestamp = now();

  const quiz = await db
    .prepare('SELECT id, title, created_by FROM quizzes WHERE id = ?')
    .bind(params.quizId)
    .first<{ id: string; title: string; created_by: string | null }>();
  if (!quiz) throw new LiveExamServiceError('Quiz not found', 404);
  if (params.actorRole !== 'admin' && quiz.created_by !== params.teacherId) {
    throw new LiveExamServiceError('Forbidden: You do not own this quiz', 403);
  }

  const teacher = await db
    .prepare('SELECT username FROM teachers WHERE username = ?')
    .bind(params.teacherId)
    .first();
  if (!teacher) throw new LiveExamServiceError('Teacher not found', 404);

  const classroom = await db
    .prepare('SELECT id, name, teacher_username FROM classes WHERE id = ? AND archived_at IS NULL')
    .bind(params.classId)
    .first<{ id: string; name: string; teacher_username: string }>();
  if (!classroom) throw new LiveExamServiceError('Class not found or archived', 404);
  if (params.actorRole !== 'admin' && classroom.teacher_username !== params.teacherId) {
    throw new LiveExamServiceError('Forbidden: You do not own this class', 403);
  }

  await db.prepare(`
    INSERT INTO live_exam_sessions (
      id, title, quiz_id, teacher_id, class_id,
      duration, scheduled_at, settings, status, access_code,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    params.title,
    params.quizId,
    params.teacherId,
    params.classId,
    params.duration,
    params.scheduledAt || null,
    JSON.stringify({ ...params.settings, randomizeAnswers: false }),
    'scheduled',
    accessCode,
    timestamp,
    timestamp,
  ).run();

  return {
    id,
    title: params.title,
    quizId: params.quizId,
    quizTitle: quiz.title,
    teacherId: params.teacherId,
    classId: params.classId,
    className: classroom.name,
    duration: params.duration,
    scheduledAt: params.scheduledAt,
    settings: { ...params.settings, randomizeAnswers: false },
    status: 'scheduled' as LiveExamStatus,
    accessCode,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
