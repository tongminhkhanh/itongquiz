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
};

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
