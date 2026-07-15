/**
 * Live Exam Service
 * 
 * Core business logic for Live Exam Sessions.
 * Handles session lifecycle, participant management, and scoring.
 * 
 * Related: CONTEXT.md, ADR-0001 (Polling), ADR-0002 (Question Order)
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { Quiz } from '../../../src/types';
import { calculateStudentScore } from '../../../src/features/quiz-player/utils/quizScoring';
import { mapLiveExamQuestionRow } from './liveExamQuestionMapper';
import type {
    LiveExamSession,
    LiveExamParticipant,
    LiveExamActivity,
    LiveExamSettings,
    StudentAnswers,
    LiveExamStatus,
    WaitingRoomChatMessage,
} from '../../../src/types/liveExam.types';

// ============================================================================
// Types
// ============================================================================

export interface CreateLiveExamParams {
    title: string;
    quizId: string;
    teacherId: string;
    classId: string;
    actorRole: 'teacher' | 'admin';
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

export interface SubmissionScoreSummary {
    score: number;
    correctCount: number;
    wrongCount: number;
    submittedAt: string;
}

export interface UpdateActivityParams {
    liveExamId: string;
    studentId: string;
    currentQuestion?: number;
    answeredCount: number;
}

export class LiveExamServiceError extends Error {
    constructor(message: string, public readonly status: number = 400) {
        super(message);
        this.name = 'LiveExamServiceError';
    }
}

function getChangedRows(result: unknown): number {
    const candidate = result as any;
    return Number(candidate?.meta?.changes ?? candidate?.changes ?? 0);
}

async function loadLiveExamQuiz(db: D1Database, session: LiveExamSession): Promise<Quiz> {
    const quizRow = await db
        .prepare('SELECT id, title, class_level, time_limit, created_at, created_by FROM quizzes WHERE id = ?')
        .bind(session.quizId)
        .first<any>();
    if (!quizRow) throw new LiveExamServiceError('Quiz not found', 404);

    const questionRows = await db.prepare(`
        SELECT id, type, question, options, correct_answer, items, text_field, blanks,
               distractors, sentence, words, correct_word_indexes, image, difficulty
        FROM questions
        WHERE quiz_id = ?
        ORDER BY rowid ASC
    `).bind(session.quizId).all<any>();

    return {
        id: String(quizRow.id),
        title: String(quizRow.title || session.title),
        classLevel: String(quizRow.class_level || ''),
        timeLimit: Number(quizRow.time_limit || session.duration),
        createdAt: String(quizRow.created_at || session.createdAt),
        createdBy: String(quizRow.created_by || ''),
        questions: (questionRows.results || []).map(mapLiveExamQuestionRow),
    };
}

export interface WaitingRoomChatMessageParams {
    sessionId: string;
    senderRole: 'student' | 'teacher' | 'system';
    senderId: string;
    senderName: string;
    content: string;
    kind?: 'message' | 'announcement';
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

function mapSessionRow(row: any): LiveExamSession & { chatEnabled?: boolean } {
    return {
        id: String(row.id),
        title: String(row.title),
        quizId: String(row.quiz_id),
        quizTitle: row.quiz_title ? String(row.quiz_title) : undefined,
        teacherId: String(row.teacher_id),
        classId: String(row.class_id || ''),
        className: row.class_name ? String(row.class_name) : undefined,
        participantCount: row.participant_count === undefined ? undefined : Number(row.participant_count),
        submittedCount: row.submitted_count === undefined ? undefined : Number(row.submitted_count),
        averageScore: row.average_score === null || row.average_score === undefined ? undefined : Number(row.average_score),
        duration: Number(row.duration),
        scheduledAt: row.scheduled_at || undefined,
        startedAt: row.started_at || undefined,
        endsAt: row.ends_at || undefined,
        closedAt: row.closed_at || undefined,
        settings: row.settings ? JSON.parse(String(row.settings)) : {},
        status: row.status as LiveExamStatus,
        accessCode: String(row.access_code),
        chatEnabled: Boolean(row.chat_enabled ?? 1),
        archivedAt: row.archived_at || undefined,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
    };
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

/**
 * Get Live Exam Session by ID
 */
export async function getLiveExamById(
    db: D1Database,
    sessionId: string
): Promise<LiveExamSession | null> {
    const row = await db.prepare(`
        SELECT s.*, q.title AS quiz_title, c.name AS class_name
        FROM live_exam_sessions s
        LEFT JOIN quizzes q ON q.id = s.quiz_id
        LEFT JOIN classes c ON c.id = s.class_id
        WHERE s.id = ?
    `).bind(sessionId).first<any>();
    return row ? mapSessionRow(row) : null;
}

/**
 * Get Live Exam Session by access code
 */
export async function getLiveExamByAccessCode(
    db: D1Database,
    accessCode: string
): Promise<LiveExamSession | null> {
    const row = await db.prepare(`
        SELECT s.*, q.title AS quiz_title, c.name AS class_name
        FROM live_exam_sessions s
        LEFT JOIN quizzes q ON q.id = s.quiz_id
        LEFT JOIN classes c ON c.id = s.class_id
        WHERE s.access_code = ? AND s.archived_at IS NULL
    `).bind(accessCode).first<any>();
    return row ? mapSessionRow(row) : null;
}

export async function getWaitingRoomChat(
    db: D1Database,
    sessionId: string,
    includeHidden = false
): Promise<{ messages: WaitingRoomChatMessage[]; enabled: boolean }> {
    const sessionRow = await db
        .prepare('SELECT chat_enabled FROM live_exam_sessions WHERE id = ?')
        .bind(sessionId)
        .first<{ chat_enabled: number }>();

    const messagesQuery = includeHidden
        ? `SELECT * FROM live_exam_chat_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 50`
        : `SELECT * FROM live_exam_chat_messages WHERE session_id = ? AND is_hidden = 0 ORDER BY created_at DESC LIMIT 50`;

    const rows = await db.prepare(messagesQuery).bind(sessionId).all<any>();

    return {
        enabled: Boolean(sessionRow?.chat_enabled ?? 1),
        messages: (rows.results || []).reverse().map((row: any) => ({
            id: row.id,
            sessionId: row.session_id,
            senderRole: row.sender_role,
            senderId: row.sender_id,
            senderName: row.sender_name,
            content: row.content,
            kind: row.message_kind,
            isHidden: Boolean(row.is_hidden),
            createdAt: row.created_at,
        })),
    };
}

export async function createWaitingRoomChatMessage(
    db: D1Database,
    params: WaitingRoomChatMessageParams
): Promise<WaitingRoomChatMessage> {
    const id = generateId();
    const createdAt = now();
    const kind = params.kind || 'message';

    await db.prepare(
        `INSERT INTO live_exam_chat_messages
         (id, session_id, sender_role, sender_id, sender_name, content, message_kind, is_hidden, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).bind(
        id,
        params.sessionId,
        params.senderRole,
        params.senderId,
        params.senderName,
        params.content,
        kind,
        createdAt
    ).run();

    return {
        id,
        sessionId: params.sessionId,
        senderRole: params.senderRole,
        senderId: params.senderId,
        senderName: params.senderName,
        content: params.content,
        kind,
        isHidden: false,
        createdAt,
    };
}

export async function updateWaitingRoomChatEnabled(
    db: D1Database,
    sessionId: string,
    enabled: boolean
): Promise<void> {
    await db.prepare(
        'UPDATE live_exam_sessions SET chat_enabled = ?, updated_at = ? WHERE id = ?'
    ).bind(enabled ? 1 : 0, now(), sessionId).run();
}

export async function hideWaitingRoomChatMessage(
    db: D1Database,
    sessionId: string,
    messageId: string
): Promise<void> {
    await db.prepare(
        'UPDATE live_exam_chat_messages SET is_hidden = 1 WHERE id = ? AND session_id = ?'
    ).bind(messageId, sessionId).run();
}

/**
 * Open session (scheduled → waiting)
 * Generates access code and allows students to join
 */
export async function openSession(
    db: D1Database,
    sessionId: string,
    teacherId: string,
    isAdmin = false
): Promise<void> {
    const session = await getLiveExamById(db, sessionId);
    
    if (!session) {
        throw new LiveExamServiceError('Session not found', 404);
    }
    
    if (!isAdmin && session.teacherId !== teacherId) {
        throw new LiveExamServiceError('Forbidden: You do not own this session', 403);
    }

    if (session.archivedAt) {
        throw new LiveExamServiceError('Session is archived', 409);
    }
    
    if (session.status !== 'scheduled') {
        throw new LiveExamServiceError(`Cannot open session in status: ${session.status}`, 409);
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
    teacherId: string,
    isAdmin = false
): Promise<void> {
    const session = await getLiveExamById(db, sessionId);
    
    if (!session) {
        throw new LiveExamServiceError('Session not found', 404);
    }
    
    if (!isAdmin && session.teacherId !== teacherId) {
        throw new LiveExamServiceError('Forbidden: You do not own this session', 403);
    }

    if (session.archivedAt) {
        throw new LiveExamServiceError('Session is archived', 409);
    }
    
    if (session.status !== 'waiting') {
        throw new LiveExamServiceError(`Cannot start exam in status: ${session.status}`, 409);
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
    teacherId: string,
    isAdmin = false
): Promise<void> {
    const session = await getLiveExamById(db, sessionId);
    
    if (!session) {
        throw new LiveExamServiceError('Session not found', 404);
    }
    
    if (!isAdmin && session.teacherId !== teacherId) {
        throw new LiveExamServiceError('Forbidden: You do not own this session', 403);
    }

    if (session.archivedAt) {
        throw new LiveExamServiceError('Session is archived', 409);
    }
    
    if (session.status !== 'active') {
        throw new LiveExamServiceError(`Cannot end exam in status: ${session.status}`, 409);
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
 * Archive a live exam without destroying participants or results.
 */
export async function deleteLiveExam(
    db: D1Database,
    sessionId: string,
    teacherId: string,
    isAdmin = false
): Promise<void> {
    const session = await getLiveExamById(db, sessionId);
    if (!session) throw new LiveExamServiceError('Session not found', 404);
    if (!isAdmin && session.teacherId !== teacherId) {
        throw new LiveExamServiceError('Forbidden: You do not own this session', 403);
    }
    if (session.archivedAt) return;
    if (session.status === 'waiting' || session.status === 'active' || session.status === 'scoring') {
        throw new LiveExamServiceError('Cannot archive a session that is waiting, active, or scoring', 409);
    }

    await db.prepare(`
        UPDATE live_exam_sessions
        SET archived_at = ?, updated_at = ?
        WHERE id = ? AND archived_at IS NULL
    `).bind(now(), now(), sessionId).run();
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
    const session = await getLiveExamByAccessCode(db, params.accessCode);
    if (!session) throw new LiveExamServiceError('Invalid access code', 404);
    if (!session.classId) throw new LiveExamServiceError('Session class is not configured', 409);

    const mayJoinWaiting = session.status === 'waiting';
    const mayJoinActive = session.status === 'active' && session.settings.allowLateJoin;
    if (!mayJoinWaiting && !mayJoinActive) {
        if (session.status === 'active') throw new LiveExamServiceError('Late join not allowed', 409);
        throw new LiveExamServiceError(`Session is not open for joining (${session.status})`, 409);
    }

    const student = await db.prepare(`
        SELECT id, class_id FROM students
        WHERE id = ? AND archived_at IS NULL
    `).bind(params.studentId).first<{ id: string; class_id: string }>();
    if (!student) throw new LiveExamServiceError('Student not found or archived', 404);
    if (student.class_id !== session.classId) {
        throw new LiveExamServiceError('Forbidden: Student is not in the assigned class', 403);
    }

    // Check if student already joined
    const existing = await db
        .prepare(`
            SELECT * FROM live_exam_participants
            WHERE live_exam_id = ? AND student_id = ?
        `)
        .bind(session.id, params.studentId)
        .first<any>();

    if (existing) {
        return {
            id: existing.id,
            liveExamId: existing.live_exam_id,
            studentId: existing.student_id,
            username: existing.username,
            joinedAt: existing.joined_at,
            startedAt: existing.started_at || undefined,
            submittedAt: existing.submitted_at || undefined,
            answers: existing.answers ? JSON.parse(existing.answers) : undefined,
            score: existing.score || undefined,
            correctCount: existing.correct_count || undefined,
            wrongCount: existing.wrong_count || undefined,
            rank: existing.rank || undefined,
            tabSwitches: existing.tab_switches || 0,
            warnings: existing.warnings ? JSON.parse(existing.warnings) : undefined,
            createdAt: existing.created_at,
            updatedAt: existing.updated_at,
        };
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
): Promise<SubmissionScoreSummary> {
    const timestamp = now();
    const session = await getLiveExamById(db, params.liveExamId);
    if (!session || session.archivedAt) throw new LiveExamServiceError('Session not found', 404);
    if (session.status !== 'active') {
        throw new LiveExamServiceError('Exam is not active', 409);
    }
    if (!session.endsAt || Date.parse(session.endsAt) <= Date.now()) {
        throw new LiveExamServiceError('Exam time has ended', 409);
    }

    const participant = await db.prepare(`
        SELECT id, submitted_at FROM live_exam_participants
        WHERE live_exam_id = ? AND student_id = ?
    `).bind(params.liveExamId, params.studentId).first<{ id: string; submitted_at: string | null }>();
    if (!participant) throw new LiveExamServiceError('Forbidden: Join session first', 403);
    if (participant.submitted_at) throw new LiveExamServiceError('Answers already submitted', 409);

    const quiz = await loadLiveExamQuiz(db, session);
    const grading = calculateStudentScore(quiz, params.answers || {});
    const wrongCount = Math.max(0, grading.totalItems - grading.correctCount);

    const result = await db.prepare(`
        UPDATE live_exam_participants
        SET answers = ?, submitted_at = ?, score = ?, correct_count = ?, wrong_count = ?, updated_at = ?
        WHERE live_exam_id = ? AND student_id = ? AND submitted_at IS NULL
    `).bind(
        JSON.stringify(params.answers || {}),
        timestamp,
        grading.score,
        grading.correctCount,
        wrongCount,
        timestamp,
        params.liveExamId,
        params.studentId,
    ).run();

    if (getChangedRows(result) !== 1) {
        throw new LiveExamServiceError('Answers already submitted', 409);
    }

    return {
        score: grading.score,
        correctCount: grading.correctCount,
        wrongCount,
        submittedAt: timestamp,
    };
}

/**
 * Update participant activity (for polling)
 */
export async function updateActivity(
    db: D1Database,
    params: UpdateActivityParams
): Promise<void> {
    const timestamp = now();
    const session = await getLiveExamById(db, params.liveExamId);
    if (!session || session.archivedAt) throw new LiveExamServiceError('Session not found', 404);
    if (session.status !== 'active' || !session.endsAt || Date.parse(session.endsAt) <= Date.now()) {
        throw new LiveExamServiceError('Exam is not active', 409);
    }
    const participant = await db.prepare(
        'SELECT submitted_at FROM live_exam_participants WHERE live_exam_id = ? AND student_id = ?'
    ).bind(params.liveExamId, params.studentId).first<{ submitted_at: string | null }>();
    if (!participant) throw new LiveExamServiceError('Forbidden: Join session first', 403);
    if (participant.submitted_at) throw new LiveExamServiceError('Answers already submitted', 409);

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
    if (!session) throw new LiveExamServiceError('Session not found', 404);
    const quiz = await loadLiveExamQuiz(db, session);
    const participants = await getParticipants(db, sessionId);

    const scoredParticipants = participants.map((participant) => {
        const grading = calculateStudentScore(quiz, participant.answers || {});
        return {
            ...participant,
            score: grading.score,
            correctCount: grading.correctCount,
            wrongCount: Math.max(0, grading.totalItems - grading.correctCount),
        };
    });

    scoredParticipants.sort((a, b) => {
        const scoreDifference = Number(b.score || 0) - Number(a.score || 0);
        if (scoreDifference !== 0) return scoreDifference;
        return Date.parse(a.submittedAt || a.joinedAt) - Date.parse(b.submittedAt || b.joinedAt);
    });

    let previousScore: number | null = null;
    let previousRank = 0;
    scoredParticipants.forEach((participant, index) => {
        const currentScore = Number(participant.score || 0);
        participant.rank = previousScore !== null && currentScore === previousScore ? previousRank : index + 1;
        previousScore = currentScore;
        previousRank = participant.rank;
    });

    for (const participant of scoredParticipants) {
        await db.prepare(`
            UPDATE live_exam_participants
            SET score = ?, correct_count = ?, wrong_count = ?, rank = ?, updated_at = ?
            WHERE id = ?
        `).bind(
            participant.score,
            participant.correctCount,
            participant.wrongCount,
            participant.rank,
            now(),
            participant.id,
        ).run();
    }

    await db.prepare(`
        UPDATE live_exam_sessions
        SET status = 'closed', closed_at = ?, updated_at = ?
        WHERE id = ?
    `).bind(now(), now(), sessionId).run();
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
            WHERE status = 'active' AND archived_at IS NULL AND ends_at <= ?
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
