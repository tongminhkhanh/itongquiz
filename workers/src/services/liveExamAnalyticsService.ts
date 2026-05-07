/**
 * Live Exam Analytics Service
 * 
 * Handles calculation and retrieval of analytics data for live exam sessions.
 * Provides insights on score distribution, difficult questions, and timing data.
 */

import type { D1Database } from '@cloudflare/workers-types';
import { nanoid } from 'nanoid';

export interface SessionAnalytics {
  session: {
    id: string;
    title: string;
    status: string;
    totalQuestions: number;
  };
  progress: {
    totalParticipants: number;
    submittedCount: number;
    submittedPercentage: number;
    notSubmittedStudents: Array<{
      username: string;
      joinedAt: string;
    }>;
  };
  scores: {
    distribution: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
    average: number;
    median: number;
    min: number;
    max: number;
    standardDeviation: number;
  };
  questions: Array<{
    questionIndex: number;
    questionText: string;
    correctRate: number;
    incorrectRate: number;
    avgTimeSeconds: number | null;
    minTimeSeconds: number | null;
    maxTimeSeconds: number | null;
  }>;
  topDifficultQuestions: Array<{
    questionIndex: number;
    questionText: string;
    correctRate: number;
    incorrectCount: number;
  }>;
}

/**
 * Calculate comprehensive analytics for a live exam session
 */
export async function calculateSessionAnalytics(
  db: D1Database,
  sessionId: string
): Promise<SessionAnalytics> {
  // Fetch session details
  const session = await db
    .prepare('SELECT id, title, status, quiz_id FROM live_exam_sessions WHERE id = ?')
    .bind(sessionId)
    .first<{ id: string; title: string; status: string; quiz_id: string }>();

  if (!session) {
    throw new Error('Session not found');
  }

  // Fetch quiz to get questions
  const quiz = await db
    .prepare('SELECT questions FROM quizzes WHERE id = ?')
    .bind(session.quiz_id)
    .first<{ questions: string }>();

  const questions = quiz ? JSON.parse(quiz.questions) : [];
  const totalQuestions = questions.length;

  // Calculate progress
  const progress = await calculateProgress(db, sessionId);

  // Calculate score distribution
  const scores = await calculateScoreDistribution(db, sessionId);

  // Calculate question analytics
  const questionAnalytics = await calculateQuestionAnalytics(db, sessionId, questions);

  // Get top 3 difficult questions
  const topDifficult = questionAnalytics
    .filter(q => q.correctRate < 1) // Has some incorrect answers
    .sort((a, b) => a.correctRate - b.correctRate)
    .slice(0, 3)
    .map(q => ({
      questionIndex: q.questionIndex,
      questionText: q.questionText,
      correctRate: q.correctRate,
      incorrectCount: Math.round((1 - q.correctRate) * progress.submittedCount),
    }));

  return {
    session: {
      id: session.id,
      title: session.title,
      status: session.status,
      totalQuestions,
    },
    progress,
    scores,
    questions: questionAnalytics,
    topDifficultQuestions: topDifficult,
  };
}

/**
 * Calculate exam progress (submitted vs not submitted)
 */
async function calculateProgress(db: D1Database, sessionId: string) {
  // Get all participants
  const participants = await db
    .prepare('SELECT id, username, joined_at, submitted_at FROM live_exam_participants WHERE live_exam_id = ?')
    .bind(sessionId)
    .all<{ id: string; username: string; joined_at: string; submitted_at: string | null }>();

  const totalParticipants = participants.results?.length || 0;

  // Count submitted participants (those with submitted_at timestamp)
  const submittedParticipants = (participants.results || []).filter(p => p.submitted_at);
  const submittedCount = submittedParticipants.length;

  // Find not submitted students
  const notSubmittedStudents = (participants.results || [])
    .filter(p => !p.submitted_at)
    .map(p => ({
      username: p.username,
      joinedAt: p.joined_at,
    }));

  return {
    totalParticipants,
    submittedCount,
    submittedPercentage: totalParticipants > 0 ? (submittedCount / totalParticipants) * 100 : 0,
    notSubmittedStudents,
  };
}

/**
 * Calculate score distribution and statistics
 */
async function calculateScoreDistribution(db: D1Database, sessionId: string) {
  const participants = await db
    .prepare('SELECT score FROM live_exam_participants WHERE live_exam_id = ? AND score IS NOT NULL')
    .bind(sessionId)
    .all<{ score: number }>();

  const scores = participants.results?.map(s => s.score) || [];

  if (scores.length === 0) {
    return {
      distribution: [
        { range: '0-2', count: 0, percentage: 0 },
        { range: '2-4', count: 0, percentage: 0 },
        { range: '4-6', count: 0, percentage: 0 },
        { range: '6-8', count: 0, percentage: 0 },
        { range: '8-10', count: 0, percentage: 0 },
      ],
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      standardDeviation: 0,
    };
  }

  // Calculate distribution
  const distribution = [
    { range: '0-2', count: scores.filter(s => s >= 0 && s < 2).length },
    { range: '2-4', count: scores.filter(s => s >= 2 && s < 4).length },
    { range: '4-6', count: scores.filter(s => s >= 4 && s < 6).length },
    { range: '6-8', count: scores.filter(s => s >= 6 && s < 8).length },
    { range: '8-10', count: scores.filter(s => s >= 8 && s <= 10).length },
  ].map(d => ({
    ...d,
    percentage: (d.count / scores.length) * 100,
  }));

  // Calculate statistics
  const average = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  
  const sortedScores = [...scores].sort((a, b) => a - b);
  const median = sortedScores.length % 2 === 0
    ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
    : sortedScores[Math.floor(sortedScores.length / 2)];

  const min = Math.min(...scores);
  const max = Math.max(...scores);

  const variance = scores.reduce((sum, s) => sum + Math.pow(s - average, 2), 0) / scores.length;
  const standardDeviation = Math.sqrt(variance);

  return {
    distribution,
    average: Math.round(average * 10) / 10,
    median: Math.round(median * 10) / 10,
    min,
    max,
    standardDeviation: Math.round(standardDeviation * 10) / 10,
  };
}

/**
 * Calculate per-question analytics (correct rate, timing)
 */
async function calculateQuestionAnalytics(
  db: D1Database,
  sessionId: string,
  questions: any[]
) {
  // Get all participants with answers
  const participants = await db
    .prepare('SELECT answers FROM live_exam_participants WHERE live_exam_id = ? AND answers IS NOT NULL')
    .bind(sessionId)
    .all<{ answers: string }>();

  const allAnswers = participants.results?.map(s => JSON.parse(s.answers)) || [];

  // Get timing data
  const timingData = await db
    .prepare(`
      SELECT 
        question_index,
        AVG(time_spent_seconds) as avg_time,
        MIN(time_spent_seconds) as min_time,
        MAX(time_spent_seconds) as max_time
      FROM live_exam_student_timing
      WHERE session_id = ?
      GROUP BY question_index
    `)
    .bind(sessionId)
    .all<{
      question_index: number;
      avg_time: number | null;
      min_time: number | null;
      max_time: number | null;
    }>();

  const timingMap = new Map(
    timingData.results?.map(t => [t.question_index, t]) || []
  );

  // Calculate analytics per question
  return questions.map((question, index) => {
    const answersForQuestion = allAnswers.map(answers => answers[index]).filter(Boolean);
    const correctCount = answersForQuestion.filter(a => a.isCorrect).length;
    const totalAttempts = answersForQuestion.length;
    const correctRate = totalAttempts > 0 ? correctCount / totalAttempts : 0;

    const timing = timingMap.get(index);

    return {
      questionIndex: index,
      questionText: question.question || question.text || `Question ${index + 1}`,
      correctRate: Math.round(correctRate * 100) / 100,
      incorrectRate: Math.round((1 - correctRate) * 100) / 100,
      avgTimeSeconds: timing?.avg_time || null,
      minTimeSeconds: timing?.min_time || null,
      maxTimeSeconds: timing?.max_time || null,
    };
  });
}

/**
 * Track timing data for a student's question
 */
export async function trackQuestionTiming(
  db: D1Database,
  sessionId: string,
  participantId: string,
  questionIndex: number,
  timeSpentSeconds: number
): Promise<void> {
  const id = nanoid();
  const now = new Date().toISOString();

  await db
    .prepare(`
      INSERT INTO live_exam_student_timing 
      (id, session_id, participant_id, question_index, time_spent_seconds, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .bind(id, sessionId, participantId, questionIndex, timeSpentSeconds, now)
    .run();
}

/**
 * Batch track timing data (for multiple questions at once)
 */
export async function batchTrackQuestionTiming(
  db: D1Database,
  sessionId: string,
  participantId: string,
  timings: Array<{ questionIndex: number; timeSpentSeconds: number }>
): Promise<void> {
  if (timings.length === 0) return;

  const now = new Date().toISOString();
  
  // Build batch insert
  const values = timings.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
  const params: any[] = [];
  
  for (const timing of timings) {
    params.push(
      nanoid(),
      sessionId,
      participantId,
      timing.questionIndex,
      timing.timeSpentSeconds,
      now
    );
  }

  await db
    .prepare(`
      INSERT INTO live_exam_student_timing 
      (id, session_id, participant_id, question_index, time_spent_seconds, created_at)
      VALUES ${values}
    `)
    .bind(...params)
    .run();
}
