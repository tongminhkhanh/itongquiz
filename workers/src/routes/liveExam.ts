/**
 * Live Exam API Routes
 * 
 * Handles all Live Exam Session endpoints for teachers and students.
 * Related: CONTEXT.md, ADR-0001 (Polling), ADR-0002 (Question Order)
 */

import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { parseBody, extractIdFromPath } from '../utils/helpers';
import { verifyJWTMiddleware, requireTeacher, isStudent } from '../middleware/jwtAuth';
import { JWTPayload } from '../utils/jwt';
import * as LiveExamService from '../services/liveExamService';
import * as LiveExamAnalyticsService from '../services/liveExamAnalyticsService';
import {
    CreateLiveExamRequestSchema,
    JoinLiveExamRequestSchema,
    SubmitAnswersRequestSchema,
    UpdateActivityRequestSchema,
    TeacherControlRequestSchema,
    WaitingRoomChatMessageSchema,
    WaitingRoomChatSettingsSchema,
} from '../../../schemas/liveExam.schema';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Verify teacher owns the session
 */
async function requireTeacherForSession(
    db: D1Database,
    user: JWTPayload,
    sessionId: string
): Promise<Response | null> {
    if (!requireTeacher(user)) {
        return errorResponse('Forbidden: Teacher access required', 403);
    }

    const session = await LiveExamService.getLiveExamById(db, sessionId);
    if (!session) {
        return errorResponse('Session not found', 404);
    }

    if (session.teacherId !== user.username) {
        return errorResponse('Forbidden: You do not own this session', 403);
    }

    return null;
}

/**
 * Calculate time remaining in seconds
 */
function calculateTimeRemaining(endsAt: string): number {
    const now = new Date().getTime();
    const end = new Date(endsAt).getTime();
    const remaining = Math.max(0, Math.floor((end - now) / 1000));
    return remaining;
}

async function getAuthenticatedStudentId(db: D1Database, user: JWTPayload): Promise<string | null> {
    if (user.id !== undefined && user.id !== null) {
        return String(user.id);
    }

    const student = await db
        .prepare('SELECT id FROM students WHERE username = ?')
        .bind(user.username)
        .first<{ id: string }>();

    return student?.id || null;
}

async function requireStudentParticipant(
    db: D1Database,
    sessionId: string,
    studentId: string
): Promise<any | null> {
    return db.prepare(
        'SELECT * FROM live_exam_participants WHERE live_exam_id = ? AND student_id = ?'
    ).bind(sessionId, studentId).first<any>();
}

// ============================================================================
// Route Handler
// ============================================================================

export async function handleLiveExamRoutes(
    request: Request,
    env: Env,
    path: string,
    method: string
): Promise<Response> {
    const db = env.DB;
    const url = new URL(request.url);

    // ========================================================================
    // TEACHER ENDPOINTS
    // ========================================================================

    // POST /api/live-exam/create
    // Create a new Live Exam Session
    if (path === '/api/live-exam/create' && method === 'POST') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const user = authResult.user;

        if (!requireTeacher(user)) {
            return errorResponse('Forbidden: Teacher access required', 403);
        }

        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        // Validate request
        const validation = CreateLiveExamRequestSchema.safeParse(body);
        if (!validation.success) {
            return errorResponse(
                `Validation error: ${validation.error.issues.map((e: any) => e.message).join(', ')}`,
                400
            );
        }

        try {
            const session = await LiveExamService.createLiveExam(db, {
                ...validation.data,
                teacherId: user.username,
            });

            return jsonResponse({
                success: true,
                session,
            });
        } catch (error: any) {
            return errorResponse(error.message || 'Failed to create session', 500);
        }
    }

    // GET /api/live-exam/:id
    // Get session details (teacher only)
    if (
        method === 'GET' &&
        /^\/api\/live-exam\/[^/]+$/.test(path)
    ) {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const user = authResult.user;

        const sessionId = extractIdFromPath(path, '/api/live-exam/');
        if (!sessionId) return errorResponse('Invalid session ID');

        const authError = await requireTeacherForSession(db, user, sessionId);
        if (authError) return authError;

        try {
            const session = await LiveExamService.getLiveExamById(db, sessionId);
            return jsonResponse({ success: true, session });
        } catch (error: any) {
            return errorResponse(error.message || 'Failed to get session', 500);
        }
    }

    // POST /api/live-exam/:id/control
    // Teacher controls (open, start, end)
    if (path.match(/^\/api\/live-exam\/[^/]+\/control$/) && method === 'POST') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const user = authResult.user;

        const sessionId = path.split('/')[3];
        if (!sessionId) return errorResponse('Invalid session ID');

        const authError = await requireTeacherForSession(db, user, sessionId);
        if (authError) return authError;

        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        // Validate request
        const validation = TeacherControlRequestSchema.safeParse({
            ...body,
            liveExamId: sessionId,
            teacherId: user.username,
        });

        if (!validation.success) {
            return errorResponse(
                `Validation error: ${validation.error.issues.map((e: any) => e.message).join(', ')}`,
                400
            );
        }

        try {
            const { action } = validation.data;

            switch (action) {
                case 'open_session':
                    await LiveExamService.openSession(db, sessionId, user.username);
                    break;
                case 'start_exam':
                    await LiveExamService.startExam(db, sessionId, user.username);
                    break;
                case 'end_early':
                    await LiveExamService.endExamEarly(db, sessionId, user.username);
                    break;
                default:
                    return errorResponse('Invalid action', 400);
            }

            const session = await LiveExamService.getLiveExamById(db, sessionId);
            return jsonResponse({
                success: true,
                message: `Action ${action} completed`,
                session,
            });
        } catch (error: any) {
            return errorResponse(error.message || 'Failed to execute action', 500);
        }
    }

    // DELETE /api/live-exam/:id
    // Delete session and related data (teacher only)
    if (
        method === 'DELETE' &&
        /^\/api\/live-exam\/[^/]+$/.test(path)
    ) {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const user = authResult.user;

        const sessionId = extractIdFromPath(path, '/api/live-exam/');
        if (!sessionId) return errorResponse('Invalid session ID');

        const authError = await requireTeacherForSession(db, user, sessionId);
        if (authError) return authError;

        try {
            await LiveExamService.deleteLiveExam(db, sessionId, user.username);
            return jsonResponse({
                success: true,
                message: 'Session deleted successfully',
            });
        } catch (error: any) {
            return errorResponse(error.message || 'Failed to delete session', 500);
        }
    }

    // GET /api/live-exam/:id/participants
    // Get participants list (teacher polling endpoint)
    if (path.match(/^\/api\/live-exam\/[^/]+\/participants$/) && method === 'GET') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const user = authResult.user;

        const sessionId = path.split('/')[3];
        if (!sessionId) return errorResponse('Invalid session ID');

        const authError = await requireTeacherForSession(db, user, sessionId);
        if (authError) return authError;

        try {
            // Mark inactive participants
            await LiveExamService.markInactiveParticipants(db, sessionId);

            // Get participants
            const participants = await LiveExamService.getParticipants(db, sessionId);

            // Get activity data
            const activityRows = await db
                .prepare(`
                    SELECT * FROM live_exam_activity
                    WHERE live_exam_id = ?
                `)
                .bind(sessionId)
                .all();

            const activityMap = new Map(
                activityRows.results.map((row: any) => [
                    row.student_id,
                    {
                        currentQuestion: row.current_question,
                        answeredCount: row.answered_count,
                        isOnline: Boolean(row.is_online),
                    },
                ])
            );

            // Combine data
            const participantsWithActivity = participants.map(p => ({
                id: p.id,
                username: p.username,
                joinedAt: p.joinedAt,
                submittedAt: p.submittedAt,
                currentQuestion: activityMap.get(p.studentId)?.currentQuestion,
                answeredCount: activityMap.get(p.studentId)?.answeredCount || 0,
                isOnline: activityMap.get(p.studentId)?.isOnline || false,
            }));

            const totalCount = participants.length;
            const submittedCount = participants.filter(p => p.submittedAt).length;
            const onlineCount = participantsWithActivity.filter(p => p.isOnline).length;

            return jsonResponse({
                success: true,
                participants: participantsWithActivity,
                totalCount,
                submittedCount,
                onlineCount,
            });
        } catch (error: any) {
            return errorResponse(error.message || 'Failed to get participants', 500);
        }
    }

    // ========================================================================
    // STUDENT ENDPOINTS
    // ========================================================================

    // POST /api/live-exam/join
    // Student joins a session
    if (path === '/api/live-exam/join' && method === 'POST') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const user = authResult.user;

        if (!isStudent(user)) {
            return errorResponse('Forbidden: Student access required', 403);
        }

        const studentId = await getAuthenticatedStudentId(db, user);
        if (!studentId) return errorResponse('Student not found', 404);

        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        // Validate request
        const validation = JoinLiveExamRequestSchema.safeParse({
            ...body,
            studentId,
            username: user.username,
        });

        if (!validation.success) {
            return errorResponse(
                `Validation error: ${validation.error.issues.map((e: any) => e.message).join(', ')}`,
                400
            );
        }

        try {
            const participant = await LiveExamService.joinSession(db, validation.data);
            const session = await LiveExamService.getLiveExamById(db, participant.liveExamId);

            return jsonResponse({
                success: true,
                participant,
                session: {
                    id: session!.id,
                    title: session!.title,
                    quizId: session!.quizId,
                    duration: session!.duration,
                    status: session!.status,
                    startedAt: session!.startedAt,
                    endsAt: session!.endsAt,
                },
            });
        } catch (error: any) {
            return errorResponse(error.message || 'Failed to join session', 400);
        }
    }

    // GET /api/live-exam/:id/status
    // Student polls session status (every 3 seconds)
    if (path.match(/^\/api\/live-exam\/[^/]+\/status$/) && method === 'GET') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const user = authResult.user;

        if (!isStudent(user)) {
            return errorResponse('Forbidden: Student access required', 403);
        }

        const studentId = await getAuthenticatedStudentId(db, user);
        if (!studentId) return errorResponse('Student not found', 404);

        const sessionId = path.split('/')[3];
        if (!sessionId) return errorResponse('Invalid session ID');

        try {
            await LiveExamService.checkAndAutoCloseExpiredExams(db);

            const session = await LiveExamService.getLiveExamById(db, sessionId);
            if (!session) return errorResponse('Session not found', 404);

            // Get participant count
            const countResult = await db
                .prepare('SELECT COUNT(*) as count FROM live_exam_participants WHERE live_exam_id = ?')
                .bind(sessionId)
                .first<{ count: number }>();

            const participantCount = countResult?.count || 0;

            // Calculate time remaining if active
            let timeRemaining: number | undefined;
            if (session.status === 'active' && session.endsAt) {
                timeRemaining = calculateTimeRemaining(session.endsAt);
            }

            return jsonResponse({
                success: true,
                session: {
                    id: session.id,
                    status: session.status,
                    startedAt: session.startedAt,
                    endsAt: session.endsAt,
                    duration: session.duration,
                    chatEnabled: (session as any).chatEnabled ?? true,
                },
                participantCount,
                timeRemaining,
            });
        } catch (error: any) {
            return errorResponse(error.message || 'Failed to get status', 500);
        }
    }

    // POST /api/live-exam/:id/submit
    // Student submits answers
    if (path.match(/^\/api\/live-exam\/[^/]+\/submit$/) && method === 'POST') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const user = authResult.user;

        if (!isStudent(user)) {
            return errorResponse('Forbidden: Student access required', 403);
        }

        const studentId = await getAuthenticatedStudentId(db, user);
        if (!studentId) return errorResponse('Student not found', 404);

        const sessionId = path.split('/')[3];
        if (!sessionId) return errorResponse('Invalid session ID');

        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        // Validate request
        const validation = SubmitAnswersRequestSchema.safeParse({
            ...body,
            liveExamId: sessionId,
            studentId,
        });

        if (!validation.success) {
            return errorResponse(
                `Validation error: ${validation.error.issues.map((e: any) => e.message).join(', ')}`,
                400
            );
        }

        try {
            const submission = await LiveExamService.submitAnswers(db, validation.data);

            return jsonResponse({
                success: true,
                message: 'Answers submitted successfully',
                participant: submission,
            });
        } catch (error: any) {
            return errorResponse(error.message || 'Failed to submit answers', 500);
        }
    }

    // POST /api/live-exam/:id/activity
    // Student updates activity (sent with every poll)
    if (path.match(/^\/api\/live-exam\/[^/]+\/activity$/) && method === 'POST') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const user = authResult.user;

        if (!isStudent(user)) {
            return errorResponse('Forbidden: Student access required', 403);
        }

        const studentId = await getAuthenticatedStudentId(db, user);
        if (!studentId) return errorResponse('Student not found', 404);

        const sessionId = path.split('/')[3];
        if (!sessionId) return errorResponse('Invalid session ID');

        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        // Validate request
        const validation = UpdateActivityRequestSchema.safeParse({
            ...body,
            liveExamId: sessionId,
            studentId,
        });

        if (!validation.success) {
            return errorResponse(
                `Validation error: ${validation.error.issues.map((e: any) => e.message).join(', ')}`,
                400
            );
        }

        try {
            await LiveExamService.updateActivity(db, validation.data);

            return jsonResponse({
                success: true,
            });
        } catch (error: any) {
            return errorResponse(error.message || 'Failed to update activity', 500);
        }
    }

    // GET /api/live-exam/:id/results
    // Student gets results after session closes
    if (path.match(/^\/api\/live-exam\/[^/]+\/results$/) && method === 'GET') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const user = authResult.user;

        if (!isStudent(user)) {
            return errorResponse('Forbidden: Student access required', 403);
        }

        const studentId = await getAuthenticatedStudentId(db, user);
        if (!studentId) return errorResponse('Student not found', 404);

        const sessionId = path.split('/')[3];
        if (!sessionId) return errorResponse('Invalid session ID');

        try {
            await LiveExamService.checkAndAutoCloseExpiredExams(db);

            const session = await LiveExamService.getLiveExamById(db, sessionId);
            if (!session) return errorResponse('Session not found', 404);

            if (session.status !== 'closed') {
                return errorResponse('Results not available yet', 400);
            }

            // Get participant's result
            const participant = await db
                .prepare(`
                    SELECT * FROM live_exam_participants
                    WHERE live_exam_id = ? AND student_id = ?
                `)
                .bind(sessionId, studentId)
                .first<any>();

            if (!participant) {
                return errorResponse('Participant not found', 404);
            }

            // Get leaderboard (top 10)
            const leaderboard = await db
                .prepare(`
                    SELECT username, score, rank
                    FROM live_exam_participants
                    WHERE live_exam_id = ?
                    ORDER BY rank ASC
                    LIMIT 10
                `)
                .bind(sessionId)
                .all();

            // Calculate rewards
            const baseCoins = participant.score || 0;
            const baseXP = (participant.score || 0) * 10;
            let bonusCoins = 0;

            // Top 3 bonus
            if (participant.rank <= 3) {
                bonusCoins = [100, 75, 50][participant.rank - 1];
            }

            return jsonResponse({
                success: true,
                participant: {
                    score: participant.score || 0,
                    rank: participant.rank || 0,
                    correctCount: participant.correct_count || 0,
                    wrongCount: participant.wrong_count || 0,
                    submittedAt: participant.submitted_at,
                },
                rewards: {
                    coins: baseCoins,
                    xp: baseXP,
                    bonusCoins: bonusCoins > 0 ? bonusCoins : undefined,
                },
                leaderboard: leaderboard.results.map((row: any) => ({
                    rank: row.rank,
                    username: row.username,
                    score: row.score,
                })),
            });
        } catch (error: any) {
            return errorResponse(error.message || 'Failed to get results', 500);
        }
    }

    if (path.match(/^\/api\/live-exam\/[^/]+\/chat$/) && method === 'GET') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const user = authResult.user;
        const sessionId = path.split('/')[3];
        if (!sessionId) return errorResponse('Invalid session ID');

        const session = await LiveExamService.getLiveExamById(db, sessionId);
        if (!session) return errorResponse('Session not found', 404);

        if (isStudent(user)) {
            const studentId = await getAuthenticatedStudentId(db, user);
            if (!studentId) return errorResponse('Student not found', 404);
            const participant = await requireStudentParticipant(db, sessionId, studentId);
            if (!participant) return errorResponse('Forbidden: Join session first', 403);
            const result = await LiveExamService.getWaitingRoomChat(db, sessionId, false);
            return jsonResponse({ success: true, messages: result.messages, settings: { enabled: result.enabled } });
        }

        const authError = await requireTeacherForSession(db, user, sessionId);
        if (authError) return authError;
        const result = await LiveExamService.getWaitingRoomChat(db, sessionId, true);
        return jsonResponse({ success: true, messages: result.messages, settings: { enabled: result.enabled } });
    }

    if (path.match(/^\/api\/live-exam\/[^/]+\/chat\/message$/) && method === 'POST') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const user = authResult.user;
        if (!isStudent(user)) return errorResponse('Forbidden: Student access required', 403);
        const studentId = await getAuthenticatedStudentId(db, user);
        if (!studentId) return errorResponse('Student not found', 404);
        const sessionId = path.split('/')[3];
        if (!sessionId) return errorResponse('Invalid session ID');
        const session = await LiveExamService.getLiveExamById(db, sessionId);
        if (!session) return errorResponse('Session not found', 404);
        if (session.status !== 'waiting') return errorResponse('Chat is only available in waiting room', 400);
        if (!(session as any).chatEnabled && (session as any).chatEnabled !== undefined) return errorResponse('Chat is disabled', 403);
        const participant = await requireStudentParticipant(db, sessionId, studentId);
        if (!participant) return errorResponse('Forbidden: Join session first', 403);
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');
        const validation = WaitingRoomChatMessageSchema.safeParse(body);
        if (!validation.success) return errorResponse(validation.error.issues.map((e: any) => e.message).join(', '), 400);
        const message = await LiveExamService.createWaitingRoomChatMessage(db, {
            sessionId,
            senderRole: 'student',
            senderId: studentId,
            senderName: user.username,
            content: validation.data.content,
            kind: 'message',
        });
        return jsonResponse({ success: true, message });
    }

    if (path.match(/^\/api\/live-exam\/[^/]+\/chat\/announcement$/) && method === 'POST') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const user = authResult.user;
        const sessionId = path.split('/')[3];
        if (!sessionId) return errorResponse('Invalid session ID');
        const authError = await requireTeacherForSession(db, user, sessionId);
        if (authError) return authError;
        const session = await LiveExamService.getLiveExamById(db, sessionId);
        if (!session) return errorResponse('Session not found', 404);
        if (session.status !== 'waiting') return errorResponse('Announcements are only available in waiting room', 400);
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');
        const validation = WaitingRoomChatMessageSchema.safeParse(body);
        if (!validation.success) return errorResponse(validation.error.issues.map((e: any) => e.message).join(', '), 400);
        const message = await LiveExamService.createWaitingRoomChatMessage(db, {
            sessionId,
            senderRole: 'teacher',
            senderId: user.username,
            senderName: user.fullName || user.username,
            content: validation.data.content,
            kind: 'announcement',
        });
        return jsonResponse({ success: true, message });
    }

    if (path.match(/^\/api\/live-exam\/[^/]+\/chat\/settings$/) && method === 'PUT') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const user = authResult.user;
        const sessionId = path.split('/')[3];
        if (!sessionId) return errorResponse('Invalid session ID');
        const authError = await requireTeacherForSession(db, user, sessionId);
        if (authError) return authError;
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');
        const validation = WaitingRoomChatSettingsSchema.safeParse(body);
        if (!validation.success) return errorResponse(validation.error.issues.map((e: any) => e.message).join(', '), 400);
        await LiveExamService.updateWaitingRoomChatEnabled(db, sessionId, validation.data.enabled);
        return jsonResponse({ success: true, settings: { enabled: validation.data.enabled } });
    }

    if (path.match(/^\/api\/live-exam\/[^/]+\/chat\/[^/]+\/hide$/) && method === 'PUT') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const user = authResult.user;
        const parts = path.split('/');
        const sessionId = parts[3];
        const messageId = parts[5];
        if (!sessionId || !messageId) return errorResponse('Invalid path params');
        const authError = await requireTeacherForSession(db, user, sessionId);
        if (authError) return authError;
        await LiveExamService.hideWaitingRoomChatMessage(db, sessionId, messageId);
        return jsonResponse({ success: true });
    }

    // ========================================================================
    // GET TEACHER SESSIONS
    // GET /api/live-exam/teacher/:username/sessions
    // ========================================================================

    if (path.match(/^\/api\/live-exam\/teacher\/[^/]+\/sessions$/) && method === 'GET') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const user = authResult.user;

        const pathParts = path.split('/');
        const teacherUsername = pathParts[4]; // /api/live-exam/teacher/:username/sessions
        
        if (!requireTeacher(user)) {
            return errorResponse('Forbidden: Teacher access required', 403);
        }

        // Verify teacher is requesting their own sessions
        if (user.username !== teacherUsername) {
            return errorResponse('Forbidden: Can only view your own sessions', 403);
        }

        try {
            const sessions = await db
                .prepare(`
                    SELECT
                        id,
                        title,
                        quiz_id,
                        teacher_id,
                        class_id,
                        duration,
                        scheduled_at,
                        started_at,
                        ends_at,
                        closed_at,
                        settings,
                        status,
                        access_code,
                        created_at,
                        updated_at
                    FROM live_exam_sessions
                    WHERE teacher_id = ?
                    ORDER BY created_at DESC
                `)
                .bind(user.username)
                .all();

            const mappedSessions = (sessions.results || []).map((row: any) => ({
                id: row.id,
                title: row.title,
                quizId: row.quiz_id,
                teacherId: row.teacher_id,
                classId: row.class_id || undefined,
                duration: row.duration,
                scheduledAt: row.scheduled_at || undefined,
                startedAt: row.started_at || undefined,
                endsAt: row.ends_at || undefined,
                closedAt: row.closed_at || undefined,
                settings: row.settings ? JSON.parse(row.settings) : {},
                status: row.status,
                accessCode: row.access_code,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            }));

            return jsonResponse(mappedSessions);
        } catch (error: any) {
            return errorResponse(error.message || 'Failed to get sessions', 500);
        }
    }

    // ========================================================================
    // ANALYTICS ENDPOINTS
    // ========================================================================

    // GET /api/live-exam/:id/analytics
    // Get comprehensive analytics for a session (teacher only)
    if (path.match(/^\/api\/live-exam\/[^/]+\/analytics$/) && method === 'GET') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const user = authResult.user;

        const sessionId = path.split('/')[3];
        if (!sessionId) return errorResponse('Invalid session ID');

        const authError = await requireTeacherForSession(db, user, sessionId);
        if (authError) return authError;

        try {
            const analytics = await LiveExamAnalyticsService.calculateSessionAnalytics(db, sessionId);
            return jsonResponse({
                success: true,
                analytics,
            });
        } catch (error: any) {
            return errorResponse(error.message || 'Failed to get analytics', 500);
        }
    }

    // POST /api/live-exam/:id/track-timing
    // Track time spent on a question (student only)
    if (path.match(/^\/api\/live-exam\/[^/]+\/track-timing$/) && method === 'POST') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const user = authResult.user;

        if (!isStudent(user)) {
            return errorResponse('Forbidden: Student access required', 403);
        }

        const studentId = await getAuthenticatedStudentId(db, user);
        if (!studentId) return errorResponse('Student not found', 404);

        const sessionId = path.split('/')[3];
        if (!sessionId) return errorResponse('Invalid session ID');

        // Verify student is participant
        const participant = await requireStudentParticipant(db, sessionId, studentId);
        if (!participant) {
            return errorResponse('Forbidden: Join session first', 403);
        }

        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        // Support both single and batch timing
        if (Array.isArray(body.timings)) {
            // Batch timing
            try {
                await LiveExamAnalyticsService.batchTrackQuestionTiming(
                    db,
                    sessionId,
                    participant.id,
                    body.timings
                );
                return jsonResponse({ success: true });
            } catch (error: any) {
                return errorResponse(error.message || 'Failed to track timing', 500);
            }
        } else {
            // Single timing
            const { questionIndex, timeSpentSeconds } = body;
            if (typeof questionIndex !== 'number' || typeof timeSpentSeconds !== 'number') {
                return errorResponse('Invalid timing data', 400);
            }

            try {
                await LiveExamAnalyticsService.trackQuestionTiming(
                    db,
                    sessionId,
                    participant.id,
                    questionIndex,
                    timeSpentSeconds
                );
                return jsonResponse({ success: true });
            } catch (error: any) {
                return errorResponse(error.message || 'Failed to track timing', 500);
            }
        }
    }

    // ========================================================================
    // NOT FOUND
    // ========================================================================

    return errorResponse('Live Exam endpoint not found', 404);
}
