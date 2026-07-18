import { Env } from '../types';
import { errorResponse } from '../utils/response';
import { corsHeaders } from '../middleware/cors';
import { verifyJWTMiddleware } from '../middleware/jwtAuth';

const ALLOWED_MODELS = new Set([
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3-flash-preview',
    'gemini-3-pro-preview',
    'gemini-3-pro-image-preview',
    'gpt-4o',
    'sonar',
]);

export async function handleAiProxy(
    request: Request,
    env: Env,
    path: string,
    method: string,
): Promise<Response | null> {
    if (path !== '/api/ai/chat' || method !== 'POST') return null;

    const authResult = await verifyJWTMiddleware(request, env);
    if (authResult instanceof Response) return authResult;

    try {
        const body = await request.json() as Record<string, any>;
        const model = String(body.model || '').trim();
        if (!ALLOWED_MODELS.has(model)) return errorResponse('AI model is not allowed', 400);
        if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 100) {
            return errorResponse('Invalid AI messages payload', 400);
        }

        const serializedLength = JSON.stringify(body).length;
        if (serializedLength > 12 * 1024 * 1024) return errorResponse('AI request is too large', 413);
        if (!env.CLIPROXY_API || !env.CLIPROXY_TOKEN) return errorResponse('AI service not configured', 503);

        const isImageModel = model.includes('image');
        const upstreamBody = {
            ...body,
            stream: isImageModel ? false : true,
        };

        const aiResponse = await fetch(`${env.CLIPROXY_API.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${env.CLIPROXY_TOKEN}`,
            },
            body: JSON.stringify(upstreamBody),
        });

        if (!aiResponse.ok) {
            console.error(`[AI Proxy] Downstream error (${aiResponse.status})`);
            return errorResponse(`AI service error (${aiResponse.status})`, aiResponse.status as any);
        }

        const upstreamType = aiResponse.headers.get('content-type') || '';
        const isSse = upstreamType.includes('text/event-stream');
        return new Response(aiResponse.body, {
            status: 200,
            headers: {
                'Content-Type': isSse ? 'text/event-stream' : (upstreamType || 'application/json'),
                'Cache-Control': 'no-store',
                ...(isSse ? { Connection: 'keep-alive' } : {}),
                ...corsHeaders(request),
            },
        });
    } catch (error) {
        console.error('[AI Proxy] Request failed:', error);
        return errorResponse('AI service temporarily unavailable', 500);
    }
}
