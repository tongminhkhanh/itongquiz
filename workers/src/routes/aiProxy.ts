import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';

/**
 * AI Proxy Route Handler
 * Forwards requests to CLIProxy (api.thitong.site) to resolve CORS
 * and protect the API Key.
 */
export async function handleAiProxy(
    request: Request,
    env: Env,
    path: string,
    method: string
): Promise<Response | null> {

    // POST /api/ai/chat - Proxy for chat completions
    if (path === '/api/ai/chat' && method === 'POST') {
        try {
            const body = await request.json() as any;

            // Forward the request to CLIProxy
            const aiResponse = await fetch(`${env.CLIPROXY_API}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${env.CLIPROXY_TOKEN}`,
                },
                body: JSON.stringify({
                    ...body,
                    // Ensure we don't accidentally pass sensitive headers from client
                }),
            });

            if (!aiResponse.ok) {
                const errText = await aiResponse.text();
                const status = aiResponse.status;
                console.error(`[AI Proxy] CLIProxy downstream error (${status}):`, errText);
                return errorResponse(`AI Service Error (${status})`, status as any);
            }

            const data = await aiResponse.json();
            return jsonResponse(data);

        } catch (error: any) {
            console.error('[AI Proxy] Request error:', error);
            return errorResponse('Failed to proxy AI request: ' + (error.message || 'Unknown error'), 500);
        }
    }

    return null;
}
