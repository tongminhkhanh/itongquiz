// iTongQuiz Workers API - Main Entry Point
// Replaces Google Apps Script (gas_script.js)

import { handleCors, corsHeaders } from './middleware/cors';
import { verifyToken } from './middleware/auth';
import { jsonResponse, errorResponse } from './utils/response';
import { handleTeacherRoutes } from './routes/teachers';
import { handleQuizRoutes } from './routes/quizzes';
import { handleResultRoutes } from './routes/results';
import { handleClassroomRoutes } from './routes/classroom';
import { handleGamificationRoutes } from './routes/gamification';
import { handleAnnouncementRoutes } from './routes/announcements';
import { handleAiTutorRoutes } from './routes/aiTutor';
import { handleAiProxy } from './routes/aiProxy';
import { handlePracticeRoutes } from './routes/practice';
import { handleGiftShopRoutes } from './routes/giftShop';
import { handleGameLoopRoutes } from './routes/gameLoop';
import { handleHelpRagRoutes } from './routes/helpRag';
import { handleSystemSettingsRoutes } from './routes/systemSettings';
import { handleAnalyticsRoutes } from './routes/analytics';
import { handleTestBankRoutes } from './routes/testBank';
import { handleTeacherAiQuotaRoutes } from './routes/teacherAiQuota';
import { handleLogoutRoute } from './routes/logout';
import { Env } from './types';
import { mapQuestionForSave, mapAssignment, mapAssignments, handleValidateAnswers } from './utils/helpers';

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // Handle CORS preflight
        const corsResponse = handleCors(request);
        if (corsResponse) return corsResponse;

        // Auth check from header
        const authError = verifyToken(request, env);
        if (authError) return addCors(authError, request);

        try {
            const url = new URL(request.url);
            const path = url.pathname;
            const method = request.method;

            // ============ LEGACY GAS COMPATIBILITY MODE ============
            // Support POST with action param (same as GAS doPost)
            // This allows frontend to work WITHOUT changes initially
            if (method === 'POST' && (path === '/' || path === '/api/gas')) {
                return addCors(await handleLegacyGasRequest(request, env), request);
            }

            // ============ RESTful API ROUTES ============
            let response: Response | null = null;

            if (path.startsWith('/api/teachers') || path === '/api/login') {
                response = await handleTeacherRoutes(request, env, path, method);
            } else if (path === '/api/logout' && method === 'POST') {
                response = await handleLogoutRoute(request, env);
            } else if (path.startsWith('/api/quizzes') || path.startsWith('/api/questions')) {
                response = await handleQuizRoutes(request, env, path, method);
            } else if (path.startsWith('/api/results') || path === '/api/validate') {
                response = await handleResultRoutes(request, env, path, method);
            } else if (path.startsWith('/api/classes') || path.startsWith('/api/students') || path.startsWith('/api/assignments') || path === '/api/student-login') {
                response = await handleClassroomRoutes(request, env, path, method);
            } else if (path.startsWith('/api/pets') || path.startsWith('/api/game-state') || path.startsWith('/api/shop') || path.startsWith('/api/leaderboard')) {
                response = await handleGamificationRoutes(request, env, path, method);
            } else if (path.startsWith('/api/announcements')) {
                response = await handleAnnouncementRoutes(request, env, path, method);
            } else if (path.startsWith('/api/ai-tutor')) {
                response = await handleAiTutorRoutes(request, env, path, method);
            } else if (path.startsWith('/api/ai/')) {
                response = await handleAiProxy(request, env, path, method);
            } else if (path.startsWith('/api/practice')) {
                response = await handlePracticeRoutes(request, env, path, method);
            } else if (path.startsWith('/api/gift-shop')) {
                response = await handleGiftShopRoutes(request, env, path, method);
            } else if (path.startsWith('/api/game-loop')) {
                response = await handleGameLoopRoutes(request, env, path, method);
            } else if (path.startsWith('/api/help')) {
                response = await handleHelpRagRoutes(request, env, path, method);
            } else if (path.startsWith('/api/system-settings')) {
                response = await handleSystemSettingsRoutes(request, env, path, method);
            } else if (path.startsWith('/api/analytics')) {
                response = await handleAnalyticsRoutes(request, env, path, method);
            } else if (path.startsWith('/api/test-bank')) {
                response = await handleTestBankRoutes(request, env, path, method);
            } else if (path.startsWith('/api/teacher-ai-quota')) {
                response = await handleTeacherAiQuotaRoutes(request, env, path, method);
            } else if (path === '/api/health') {
                response = jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
            }

            if (response) return addCors(response, request);

            return addCors(errorResponse('Not found: ' + path, 404), request);
        } catch (error: any) {
            console.error('Worker error:', error);
            return addCors(errorResponse(error.message || 'Internal server error', 500), request);
        }
    },

    // Week 2: Scheduled handler for weekly leaderboard rewards
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        console.log('[Cron] Running weekly leaderboard rewards...');
        
        try {
            const db = env.DB;
            const lastWeekKey = getLastWeekKey();
            
            // Get top 3 from last week
            const topStudents = await db.prepare(`
                SELECT 
                    s.username,
                    SUM(r.score) as total_score
                FROM results r
                JOIN students s ON s.username = r.student_name
                WHERE strftime('%Y-W%W', r.submitted_at) = ?
                GROUP BY s.username
                ORDER BY total_score DESC
                LIMIT 3
            `).bind(lastWeekKey).all();
            
            if (!topStudents.results || topStudents.results.length === 0) {
                console.log('[Cron] No students found for last week');
                return;
            }
            
            const rewards = [
                { rank: 1, coins: 500, badge: 'weekly_champion_1st' },
                { rank: 2, coins: 300, badge: 'weekly_champion_2nd' },
                { rank: 3, coins: 150, badge: 'weekly_champion_3rd' },
            ];
            
            const now = new Date().toISOString();
            
            for (let i = 0; i < topStudents.results.length; i++) {
                const student = topStudents.results[i] as any;
                const reward = rewards[i];
                
                // Award coins
                await db.prepare('UPDATE students SET coins = coins + ? WHERE username = ?')
                    .bind(reward.coins, student.username).run();
                
                // Unlock badge
                const achId = `ach-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                await db.prepare(`
                    INSERT OR IGNORE INTO student_achievement_unlocks 
                    (id, username, achievement_code, unlocked_at, metadata)
                    VALUES (?, ?, ?, ?, ?)
                `).bind(
                    achId,
                    student.username,
                    reward.badge,
                    now,
                    JSON.stringify({ weekKey: lastWeekKey, rank: reward.rank })
                ).run();
                
                // Log reward history
                const rewardId = `lbrew-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                await db.prepare(`
                    INSERT INTO leaderboard_rewards_history
                    (id, username, period, period_key, rank, coins_awarded, badge_code, awarded_at)
                    VALUES (?, ?, 'weekly', ?, ?, ?, ?, ?)
                `).bind(
                    rewardId,
                    student.username,
                    lastWeekKey,
                    reward.rank,
                    reward.coins,
                    reward.badge,
                    now
                ).run();
                
                console.log(`[Cron] Awarded rank ${reward.rank} to ${student.username}: ${reward.coins} coins + ${reward.badge}`);
            }
            
        } catch (error) {
            console.error('[Cron] Error awarding weekly rewards:', error);
        }
    }
};

// Helper function for cron job
function getLastWeekKey(): string {
    const now = new Date();
    now.setDate(now.getDate() - 7); // Go back 1 week
    const year = now.getFullYear();
    const week = getWeekNumber(now);
    return `${year}-W${String(week).padStart(2, '0')}`;
}

function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Add CORS headers to any response
function addCors(response: Response, request: Request): Response {
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders(request))) {
        headers.set(key, value);
    }
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

import { handleLegacyAction } from './routes/legacy';

// ============ LEGACY GAS COMPATIBILITY ============
// This function handles the old GAS-style POST requests
// so the frontend can work WITHOUT any changes initially
async function handleLegacyGasRequest(request: Request, env: Env): Promise<Response> {
    let body: any = {};
    try {
        const text = await request.text();
        body = JSON.parse(text);
    } catch {
        return errorResponse('Invalid JSON body');
    }

    // Verify token from body (GAS style)
    if (body.token !== env.API_SECRET_TOKEN) {
        return errorResponse('Unauthorized: Invalid Token', 401);
    }

    const action = body.action;
    const db = env.DB;

    return await handleLegacyAction(db, action, body);
}
