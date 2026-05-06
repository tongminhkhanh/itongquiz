/**
 * Live Exam Service
 * 
 * Core business logic for Live Exam Sessions.
 * Handles session lifecycle, participant management, and scoring.
 * 
 * Related: CONTEXT.md, ADR-0001 (Polling), ADR-0002 (Question Order)
 */

import type { D1Database } from '@cloudflare/workers-types';
import type {
    LiveExamSession,
    LiveExamParticipant,
    LiveExamActivity,
    LiveExamSettings,
    StudentAnswers,
    LiveExamStatus,
} from '../../../src/types/liveExam.types';

// ============================================================================
// Types
// ============================================================================

export interface CreateLiveExamParams {
    title: string;
    quizId: string;
    teacherId: string;
    classId?: string;
    duration: number;
    scheduledAt?: string;
    settings: LiveExamSettings;
}

export interface JoinSessionParams {
    accessCode: string;
    studentId: string;
    username: string;
}

export interface SubmitAnswersParams {
    liveExamId: string;
    studentId: string;
    answers: StudentAnswers;
}

export interface UpdateActivityParams {
    liveExamId: string;
    studentId: string;
    currentQuestion?: number;
    answeredCount: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique 6-character access code
 * Format: ABC123 (uppercase letters and numbers)
 */
export function generateAccessCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Generate unique ID for database records
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current ISO timestamp
 */
function now(): string {
    return new Date().toISOString();
}

/**
 * Calculate end time based on start time and duration
 */
function calculateEndTime(startedAt: string, durationMinutes: number): string {
    const start = new Date(startedAt);
    start.setMinutes(start.getMinutes() + durationMinutes);
    return start.toISOString();
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Create a new Live Exam Session
 */
export async function createLiveExam(
    db: D1Database,
    params: CreateLiveExamParams
): Promise<LiveExamSession> {
    const id = generateId();
    const accessCode = generateAccessCode();
    const timestamp = now();

    // Verify quiz exists
    const quiz = await db
        .prepare('SELECT id, title FROM quizzes WHERE id = ?')
        .bind(params.quizId)
        .first();

    if (!quiz) {
        throw new Error('Quiz not found');
    }

    // Verify teacher exists. Teacher IDs in this project are usernames.
    const teacher = await db
        .prepare('SELECT username FROM teachers WHERE username = ?')
        .bind(params.teacherId)
        .first();

    if (!teacher) {
        throw new Error('Teacher not found');
    }

    // Insert session
    await db
        .prepare(`
            INSERT INTO live_exam_sessions (
                id, title, quiz_id, teacher_id, class_id,
                duration, scheduled_at, settings, status, access_code,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
            id,
            params.title,
            params.quizId,
            params.teacherId,
            params.classId || null,
            params.duration,
            params.scheduledAt || null,
            JSON.stringify(params.settings),
            'scheduled',
            accessCode,
            timestamp,
            timestamp
        )
        .run();

    return {
        id,
        title: params.title,
        quizId: params.quizId,
        teacherId: params.teacherId,
        classId: params.classId,
        duration: params.duration,
        scheduledAt: params.scheduledAt,
        settings: params.settings,
        status: 'scheduled' as LiveExamStatus,
        accessCode,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}

/**
 * Get Live Exam Session by ID
 */
export async function getLiveExamById(
    db: D1Database,
    sessionId: string
): Promise<LiveExamSession | null> {
    const row = await db
        .prepare('SELECT * FROM live_exam_sessions WHERE id = ?')
        .bind(sessionId)
        .first();

    if (!row) return null;

    return {
        id: row.id as string,
        title: row.title as string,
        quizId: row.quiz_id as string,
        teacherId: row.teacher_id as string,
        classId: row.class_id as string | undefined,
        duration: row.duration as number,
        scheduledAt: row.scheduled_at as string | undefined,
        startedAt: row.started_at as string | undefined,
        endsAt: row.ends_at as string | undefined,
        closedAt: row.closed_at as string | undefined,
        settings: JSON.parse(row.settings as string),
        status: row.status as LiveExamStatus,
        accessCode: row.access_code as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    };
}

/**
 * Get Live Exam Session by access code
 */
export async function getLiveExamByAccessCode(
    db: D1Database,
    accessCode: string
): Promise<LiveExamSession | null> {
    const row = await db
        .prepare('SELECT * FROM live_exam_sessions WHERE access_code = ?')
        .bind(accessCode)
        .first();

    if (!row) return null;

    return {
        id: row.id as string,
        title: row.title as string,
        quizId: row.quiz_id as string,
        teacherId: row.teacher_id as string,
        classId: row.class_id as string | undefined,
        duration: row.duration as number,
        scheduledAt: row.scheduled_at as string | undefined,
        startedAt: row.started_at as string | undefined,
        endsAt: row.ends_at as string | undefined,
        closedAt: row.closed_at as string | undefined,
        settings: JSON.parse(row.settings as string),
        status: row.status as LiveExamStatus,
        accessCode: row.access_code as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    };
}

/**
 * Open session (scheduled → waiting)
 * Generates access code and allows students to join
 */
export async function openSession(
    db: D1Database,
    sessionId: string,
    teacherId: string
): Promise<void> {
    const session = await getLiveExamById(db, sessionId);
    
    if (!session) {
        throw new Error('Session not found');
    }
    
    if (session.teacherId !== teacherId) {
        throw new Error('Unauthorized');
    }
    
    if (session.status !== 'scheduled') {
        throw new Error(`Cannot open session in status: ${session.status}`);
    }

    await db
        .prepare(`
            UPDATE live_exam_sessions
            SET status = 'waiting', updated_at = ?
            WHERE id = ?
        `)
        .bind(now(), sessionId)
        .run();
}

/**
 * Start exam (waiting → active)
 * Timer begins, students can start answering
 */
export async function startExam(
    db: D1Database,
    sessionId: string,
    teacherId: string
): Promise<void> {
    const session = await getLiveExamById(db, sessionId);
    
    if (!session) {
        throw new Error('Session not found');
    }
    
    if (session.teacherId !== teacherId) {
        throw new Error('Unauthorized');
    }
    
    if (session.status !== 'waiting') {
        throw new Error(`Cannot start exam in status: ${session.status}`);
    }

    const startedAt = now();
    const endsAt = calculateEndTime(startedAt, session.duration);

    await db
        .prepare(`
            UPDATE live_exam_sessions
            SET status = 'active', started_at = ?, ends_at = ?, updated_at = ?
            WHERE id = ?
        `)
        .bind(startedAt, endsAt, now(), sessionId)
        .run();
}

/**
 * End exam early (active → scoring)
 * Teacher manually ends the exam before time expires
 */
export async function endExamEarly(
    db: D1Database,
    sessionId: string,
    teacherId: string
): Promise<void> {
    const session = await getLiveExamById(db, sessionId);
    
    if (!session) {
        throw new Error('Session not found');
    }
    
    if (session.teacherId !== teacherId) {
        throw new Error('Unauthorized');
    }
    
    if (session.status !== 'active') {
        throw new Error(`Cannot end exam in status: ${session.status}`);
    }

    // Auto-submit all incomplete answers
    await autoSubmitIncompleteAnswers(db, sessionId);

    // Move to scoring state
    await db
        .prepare(`
            UPDATE live_exam_sessions
            SET status = 'scoring', updated_at = ?
            WHERE id = ?
        `)
        .bind(now(), sessionId)
        .run();

    // Calculate scores and close
    await calculateScoresAndClose(db, sessionId);
}

/**
 * Auto-submit incomplete answers when time expires
 */
async function autoSubmitIncompleteAnswers(
    db: D1Database,
    sessionId: string
): Promise<void> {
    const timestamp = now();

    await db
        .prepare(`
            UPDATE live_exam_participants
            SET submitted_at = ?
            WHERE live_exam_id = ? AND submitted_at IS NULL
        `)
        .bind(timestamp, sessionId)
        .run();
}

// ============================================================================
// Participant Management
// ============================================================================

/**
 * Student joins a Live Exam Session
 */
export async function joinSession(
    db: D1Database,
    params: JoinSessionParams
): Promise<LiveExamParticipant> {
    // Get session by access code
    const session = await getLiveExamByAccessCode(db, params.accessCode);
    
    if (!session) {
        throw new Error('Invalid access code');
    }

    // Check if session allows joining
    if (session.status === 'closed') {
        throw new Error('Session is closed');
    }

    if (session.status === 'active' && !session.settings.allowLateJoin) {
        throw new Error('Late join not allowed');
    }

    // Check if student already joined
    const existing = await db
        .prepare(`
            SELECT id FROM live_exam_participants
            WHERE live_exam_id = ? AND student_id = ?
        `)
        .bind(session.id, params.studentId)
        .first();

    if (existing) {
        throw new Error('Already joined this session');
    }

    // Create participant record
    const id = generateId();
    const timestamp = now();

    await db
        .prepare(`
            INSERT INTO live_exam_participants (
                id, live_exam_id, student_id, username,
                joined_at, tab_switches, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        `)
        .bind(
            id,
            session.id,
            params.studentId,
            params.username,
            timestamp,
            timestamp,
            timestamp
        )
        .run();

    return {
        id,
        liveExamId: session.id,
        studentId: params.studentId,
        username: params.username,
        joinedAt: timestamp,
        tabSwitches: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}

/**
 * Get all participants for a session
 */
export async function getParticipants(
    db: D1Database,
    sessionId: string
): Promise<LiveExamParticipant[]> {
    const rows = await db
        .prepare(`
            SELECT * FROM live_exam_participants
            WHERE live_exam_id = ?
            ORDER BY joined_at ASC
        `)
        .bind(sessionId)
        .all();

    return rows.results.map((row: any) => ({
        id: row.id,
        liveExamId: row.live_exam_id,
        studentId: row.student_id,
        username: row.username,
        joinedAt: row.joined_at,
        startedAt: row.started_at || undefined,
        submittedAt: row.submitted_at || undefined,
        answers: row.answers ? JSON.parse(row.answers) : undefined,
        score: row.score || undefined,
        correctCount: row.correct_count || undefined,
        wrongCount: row.wrong_count || undefined,
        rank: row.rank || undefined,
        tabSwitches: row.tab_switches || 0,
        warnings: row.warnings ? JSON.parse(row.warnings) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }));
}

/**
 * Submit answers for a participant
 */
export async function submitAnswers(
    db: D1Database,
    params: SubmitAnswersParams
): Promise<void> {
    const timestamp = now();

    await db
        .prepare(`
            UPDATE live_exam_participants
            SET answers = ?, submitted_at = ?, updated_at = ?
            WHERE live_exam_id = ? AND student_id = ?
        `)
        .bind(
            JSON.stringify(params.answers),
            timestamp,
            timestamp,
            params.liveExamId,
            params.studentId
        )
        .run();
}

/**
 * Update participant activity (for polling)
 */
export async function updateActivity(
    db: D1Database,
    params: UpdateActivityParams
): Promise<void> {
    const timestamp = now();

    // Upsert activity record
    await db
        .prepare(`
            INSERT INTO live_exam_activity (
                live_exam_id, student_id, current_question,
                answered_count, last_activity, is_online
            ) VALUES (?, ?, ?, ?, ?, 1)
            ON CONFLICT(live_exam_id, student_id) DO UPDATE SET
                current_question = excluded.current_question,
                answered_count = excluded.answered_count,
                last_activity = excluded.last_activity,
                is_online = 1
        `)
        .bind(
            params.liveExamId,
            params.studentId,
            params.currentQuestion || null,
            params.answeredCount,
            timestamp
        )
        .run();
}

/**
 * Mark inactive participants as offline
 * Called periodically to update is_online status
 */
export async function markInactiveParticipants(
    db: D1Database,
    sessionId: string
): Promise<void> {
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();

    await db
        .prepare(`
            UPDATE live_exam_activity
            SET is_online = 0
            WHERE live_exam_id = ? AND last_activity < ?
        `)
        .bind(sessionId, tenSecondsAgo)
        .run();
}

// ============================================================================
// Scoring
// ============================================================================

/**
 * Calculate scores for all participants and close session
 */
export async function calculateScoresAndClose(
    db: D1Database,
    sessionId: string
): Promise<void> {
    const session = await getLiveExamById(db, sessionId);
    if (!session) throw new Error('Session not found');

    // Get quiz questions with correct answers
    const questions = await db
        .prepare(`
            SELECT id, correct_answer, points
            FROM questions
            WHERE quiz_id = ?
        `)
        .bind(session.quizId)
        .all();

    const questionMap = new Map(
        questions.results.map((q: any) => [q.id, { correctAnswer: q.correct_answer, points: q.points || 1 }])
    );

    // Get all participants
    const participants = await getParticipants(db, sessionId);

    // Calculate scores
    const scoredParticipants = participants.map(p => {
        if (!p.answers) {
            return { ...p, score: 0, correctCount: 0, wrongCount: 0 };
        }

        let totalScore = 0;
        let correctCount = 0;
        let wrongCount = 0;

        for (const [questionId, answer] of Object.entries(p.answers)) {
            const question = questionMap.get(questionId);
            if (question) {
                if (answer === question.correctAnswer) {
                    totalScore += question.points;
                    correctCount++;
                } else {
                    wrongCount++;
                }
            }
        }

        return { ...p, score: totalScore, correctCount, wrongCount };
    });

    // Sort by score (descending) and assign ranks
    scoredParticipants.sort((a, b) => (b.score || 0) - (a.score || 0));
    scoredParticipants.forEach((p, index) => {
        p.rank = index + 1;
    });

    // Update all participants with scores and ranks
    for (const p of scoredParticipants) {
        await db
            .prepare(`
                UPDATE live_exam_participants
                SET score = ?, correct_count = ?, wrong_count = ?, rank = ?, updated_at = ?
                WHERE id = ?
            `)
            .bind(p.score, p.correctCount, p.wrongCount, p.rank, now(), p.id)
            .run();
    }

    // Close session
    await db
        .prepare(`
            UPDATE live_exam_sessions
            SET status = 'closed', closed_at = ?, updated_at = ?
            WHERE id = ?
        `)
        .bind(now(), now(), sessionId)
        .run();
}

/**
 * Check if exam time has expired and auto-close if needed
 * Should be called periodically (e.g., every minute)
 */
export async function checkAndAutoCloseExpiredExams(
    db: D1Database
): Promise<void> {
    const currentTime = now();

    // Find all active exams that have expired
    const expiredSessions = await db
        .prepare(`
            SELECT id FROM live_exam_sessions
            WHERE status = 'active' AND ends_at <= ?
        `)
        .bind(currentTime)
        .all();

    // Auto-close each expired session
    for (const session of expiredSessions.results) {
        const sessionId = session.id as string;
        
        // Auto-submit incomplete answers
        await autoSubmitIncompleteAnswers(db, sessionId);
        
        // Move to scoring
        await db
            .prepare(`
                UPDATE live_exam_sessions
                SET status = 'scoring', updated_at = ?
                WHERE id = ?
            `)
            .bind(now(), sessionId)
            .run();
        
        // Calculate scores and close
        await calculateScoresAndClose(db, sessionId);
    }
}
