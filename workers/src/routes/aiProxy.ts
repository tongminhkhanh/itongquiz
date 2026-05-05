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
 *
 * SECURITY: Only allows proxying to configured CLIPROXY_API endpoint to prevent SSRF attacks.
 * Client cannot specify arbitrary target URLs or tokens.
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

            // SECURITY: Only use server-configured API endpoint and token
            // Do NOT allow client to specify x-target-url or x-target-token to prevent SSRF
            const targetApi = env.CLIPROXY_API;
            const targetToken = env.CLIPROXY_TOKEN || '';

            if (!targetApi) {
                console.error('[AI Proxy] CLIPROXY_API not configured');
                return errorResponse('AI service not configured', 503);
            }

            const aiResponse = await fetch(`${targetApi}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${targetToken}`,
                },
                body: JSON.stringify(body),
            });

            if (!aiResponse.ok) {
                const status = aiResponse.status;
                console.error(`[AI Proxy] CLIProxy downstream error (${status})`);
                // SECURITY: Don't expose detailed upstream error messages to client
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
            // SECURITY: Don't expose internal error details to client
            return errorResponse('AI service temporarily unavailable', 500);
        }
    }

    return null;
}
