import { Env } from '../types';
import { errorResponse } from '../utils/response';
import { corsHeaders } from '../middleware/cors';

/**
 * AI Proxy Route Handler - STREAMING MODE
 * 
 * Forwards requests to CLIProxy (api.thitong.site) with stream:true enabled.
 * Pipes SSE (Server-Sent Events) chunks directly from upstream to browser.
 * 
 * This prevents Cloudflare Worker timeout (524) because data flows continuously
 * instead of waiting for the full AI response to complete.
 */
export async function handleAiProxy(
    request: Request,
    env: Env,
    path: string,
    method: string
): Promise<Response | null> {

    // POST /api/ai/chat - Streaming proxy for chat completions
    if (path === '/api/ai/chat' && method === 'POST') {
        try {
            const body = await request.json() as any;

            // ⚡ FORCE stream:true to prevent timeout
            body.stream = true;

            const targetApi = request.headers.get('x-target-url') || env.CLIPROXY_API;
            const targetToken = request.headers.get('x-target-token') || env.CLIPROXY_TOKEN || '';

            const aiResponse = await fetch(`${targetApi}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${targetToken}`,
                },
                body: JSON.stringify(body),
            });

            if (!aiResponse.ok) {
                const errText = await aiResponse.text();
                const status = aiResponse.status;
                console.error(`[AI Proxy] CLIProxy downstream error (${status}):`, errText);
                return errorResponse(`AI Service Error (${status})`, status as any);
            }

            // ⚡ STREAM: Pipe SSE response body directly to browser
            const cors = corsHeaders(request);
            return new Response(aiResponse.body, {
                status: 200,
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    ...cors,
                },
            });

        } catch (error: any) {
            console.error('[AI Proxy] Request error:', error);
            return errorResponse('Failed to proxy AI request: ' + (error.message || 'Unknown error'), 500);
        }
    }

    return null;
}
