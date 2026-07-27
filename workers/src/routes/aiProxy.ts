import { corsHeaders } from '../middleware/cors';
import { requireTeacher, verifyJWTMiddleware } from '../middleware/jwtAuth';
import { rateLimit } from '../middleware/rateLimit';
import {
    AiRequestPolicyError,
    authorizeAiStage,
    parseAiRequestMeta,
    recordAiStageSuccess,
    type AiRequestMeta,
    type AiStage,
} from '../services/aiRequestPolicy';
import {
    AiQuotaError,
    failAiAction,
    finalizeQuizCreateAction,
    reserveAiAction,
    succeedAiAction,
} from '../services/teacherAiQuotaLedger';
import { recordAiStageMetric } from '../services/aiPerformanceTelemetry';
import { Env } from '../types';
import { errorResponse, jsonResponse } from '../utils/response';

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

const QUOTA_COMPLETION_STAGES = new Set<AiStage>(['REGENERATE', 'GENERIC']);
const QUOTA_RELEASE_STAGES = new Set<AiStage>(['OCR', 'GENERATE', 'REGENERATE', 'GENERIC']);
const AI_ACTION_ID = /^ai-[a-z0-9-]{20,80}$/i;
const CLIENT_FAILURE_CODES = new Set([
    'CLIENT_SCHEMA_INVALID',
    'CLIENT_VALIDATION_FAILED',
    'CLIENT_GENERATION_FAILED',
    'CLIENT_ABORTED',
]);

const codedErrorResponse = (code: string, message: string, status: number): Response => jsonResponse({
    status: 'error',
    code,
    message,
}, status);

const getClientRateLimitPart = (request: Request): string => (
    request.headers.get('CF-Connecting-IP')?.trim() || 'unknown'
);

const shouldReleaseQuota = (meta: AiRequestMeta): boolean => QUOTA_RELEASE_STAGES.has(meta.stage);

const releaseFailedAction = async (
    env: Env,
    meta: AiRequestMeta,
    username: string,
    failureCode: string,
): Promise<void> => {
    if (!shouldReleaseQuota(meta)) return;
    await failAiAction(env.DB, meta.actionId, username, failureCode);
};

const policyErrorResponse = (error: AiRequestPolicyError): Response => {
    const status = error.code === 'AI_STAGE_CONFLICT' ? 409 : 400;
    return codedErrorResponse(error.code, error.message, status);
};

const quotaErrorResponse = (error: AiQuotaError): Response => {
    const status = error.code === 'AI_DAILY_LIMIT_REACHED' ? 429 : 409;
    return codedErrorResponse(error.code, error.message, status);
};

const handleAiActionFinalization = async (
    request: Request,
    env: Env,
    username: string,
): Promise<Response> => {
    let body: Record<string, unknown>;
    try {
        body = await request.json() as Record<string, unknown>;
    } catch {
        return codedErrorResponse('AI_FINALIZE_INVALID', 'Dữ liệu hoàn tất tác vụ AI không hợp lệ.', 400);
    }

    const actionId = typeof body.actionId === 'string' ? body.actionId.trim() : '';
    const outcome = body.outcome;
    const failureCode = typeof body.failureCode === 'string' ? body.failureCode.trim() : '';
    if (!AI_ACTION_ID.test(actionId)
        || (outcome !== 'SUCCEEDED' && outcome !== 'FAILED')
        || (outcome === 'FAILED' && !CLIENT_FAILURE_CODES.has(failureCode))) {
        return codedErrorResponse('AI_FINALIZE_INVALID', 'Dữ liệu hoàn tất tác vụ AI không hợp lệ.', 400);
    }

    const actionStatus = await finalizeQuizCreateAction(env.DB, {
        actionId,
        username,
        outcome,
        ...(outcome === 'FAILED' ? { failureCode } : {}),
    });
    if (!actionStatus) {
        return codedErrorResponse(
            'AI_FINALIZE_CONFLICT',
            'Tác vụ AI không tồn tại hoặc chưa sẵn sàng để hoàn tất.',
            409,
        );
    }

    return jsonResponse({ status: 'success', actionStatus });
};

export async function handleAiProxy(
    request: Request,
    env: Env,
    path: string,
    method: string,
    ctx?: ExecutionContext,
): Promise<Response | null> {
    const isChatRequest = path === '/api/ai/chat' && method === 'POST';
    const isFinalizeRequest = path === '/api/ai/actions/finalize' && method === 'POST';
    if (!isChatRequest && !isFinalizeRequest) return null;

    const authResult = await verifyJWTMiddleware(request, env);
    if (authResult instanceof Response) return authResult;
    if (!requireTeacher(authResult.user)) {
        return codedErrorResponse('AI_ROLE_FORBIDDEN', 'Tài khoản không có quyền sử dụng chức năng AI này.', 403);
    }

    const role = authResult.user.role === 'admin' ? 'admin' : 'teacher';
    const rateLimitResponse = await rateLimit(request, env, {
        windowMs: 60 * 1000,
        maxRequests: isFinalizeRequest ? 60 : 20,
        failureMode: 'closed',
        keyGenerator: (rateLimitedRequest) => {
            const requestPath = new URL(rateLimitedRequest.url).pathname;
            return `ratelimit:ai:${role}:${requestPath}:${getClientRateLimitPart(rateLimitedRequest)}`;
        },
    });
    if (rateLimitResponse) return rateLimitResponse;
    if (isFinalizeRequest) {
        return handleAiActionFinalization(request, env, authResult.user.username);
    }

    let body: Record<string, unknown>;
    try {
        body = await request.json() as Record<string, unknown>;
    } catch {
        return codedErrorResponse('AI_REQUEST_INVALID', 'Dữ liệu yêu cầu AI không hợp lệ.', 400);
    }

    const model = typeof body.model === 'string' ? body.model.trim() : '';
    if (!ALLOWED_MODELS.has(model)) return errorResponse('AI model is not allowed', 400);
    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 100) {
        return errorResponse('Invalid AI messages payload', 400);
    }

    const serializedLength = JSON.stringify(body).length;
    if (serializedLength > 12 * 1024 * 1024) return errorResponse('AI request is too large', 413);
    if (!env.CLIPROXY_API || !env.CLIPROXY_TOKEN) return errorResponse('AI service not configured', 503);

    let meta: AiRequestMeta;
    try {
        meta = parseAiRequestMeta(body._meta);
    } catch (error) {
        if (error instanceof AiRequestPolicyError) return policyErrorResponse(error);
        return codedErrorResponse('AI_META_INVALID', 'Thông tin định danh thao tác AI không hợp lệ.', 400);
    }

    try {
        await reserveAiAction(env.DB, {
            actionId: meta.actionId,
            username: authResult.user.username,
            role,
            workflow: meta.workflow,
        });
        await authorizeAiStage(env.DB, authResult.user.username, meta);
    } catch (error) {
        if (error instanceof AiQuotaError) return quotaErrorResponse(error);
        if (error instanceof AiRequestPolicyError) return policyErrorResponse(error);
        console.error('[AI Proxy] Policy storage unavailable');
        return codedErrorResponse('AI_POLICY_UNAVAILABLE', 'Không thể xác minh yêu cầu AI lúc này.', 503);
    }

    const { _meta: _internalMeta, ...providerPayload } = body;
    const isImageModel = model.includes('image');
    const upstreamBody = {
        ...providerPayload,
        stream: isImageModel ? false : true,
    };

    const upstreamJson = JSON.stringify(upstreamBody);
    const requestBytes = new TextEncoder().encode(upstreamJson).byteLength;
    const upstreamStartedAt = Date.now();
    const scheduleMetric = (
        status: 'SUCCEEDED' | 'FAILED',
        ttfbMs: number | null,
        errorCode?: string,
    ): void => {
        const metricPromise = recordAiStageMetric(env.DB, {
            actionId: meta.actionId,
            username: authResult.user.username,
            workflow: meta.workflow,
            stage: meta.stage,
            model,
            status,
            requestBytes,
            ttfbMs,
            errorCode,
            createdAt: new Date().toISOString(),
        }).catch(() => console.error('[AI Proxy] Failed to persist performance metric'));
        if (ctx) ctx.waitUntil(metricPromise);
        else void metricPromise;
    };

    let aiResponse: Response;
    try {
        aiResponse = await fetch(`${env.CLIPROXY_API.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${env.CLIPROXY_TOKEN}`,
            },
            body: upstreamJson,
        });
    } catch {
        scheduleMetric('FAILED', null, 'UPSTREAM_NETWORK_ERROR');
        try {
            await releaseFailedAction(env, meta, authResult.user.username, 'UPSTREAM_NETWORK_ERROR');
        } catch {
            console.error('[AI Proxy] Failed to release quota after network error');
        }
        return codedErrorResponse('AI_UPSTREAM_UNAVAILABLE', 'Dịch vụ AI tạm thời không khả dụng.', 503);
    }

    const ttfbMs = Date.now() - upstreamStartedAt;
    scheduleMetric(
        aiResponse.ok ? 'SUCCEEDED' : 'FAILED',
        ttfbMs,
        aiResponse.ok ? undefined : `UPSTREAM_${aiResponse.status}`,
    );

    if (!aiResponse.ok) {
        try {
            await releaseFailedAction(
                env,
                meta,
                authResult.user.username,
                `UPSTREAM_${aiResponse.status}`,
            );
        } catch {
            console.error('[AI Proxy] Failed to release quota after upstream error');
        }
        console.error(`[AI Proxy] Downstream error (${aiResponse.status})`);
        return errorResponse(`AI service error (${aiResponse.status})`, aiResponse.status);
    }

    try {
        await recordAiStageSuccess(env.DB, authResult.user.username, meta);
        if (QUOTA_COMPLETION_STAGES.has(meta.stage)) {
            await succeedAiAction(env.DB, meta.actionId, authResult.user.username);
        }
        if (meta.promptVersion) {
            console.info('[AI Proxy] Stage completed', {
                workflow: meta.workflow,
                stage: meta.stage,
                promptVersion: meta.promptVersion,
                blueprintVersion: meta.blueprintVersion,
                slotCount: meta.slotCount,
            });
        }
    } catch (error) {
        if (error instanceof AiRequestPolicyError) return policyErrorResponse(error);
        console.error('[AI Proxy] Failed to persist successful AI stage');
        return codedErrorResponse('AI_STAGE_PERSIST_FAILED', 'Không thể ghi nhận kết quả AI lúc này.', 503);
    }

    const upstreamType = aiResponse.headers.get('content-type') || '';
    const isSse = upstreamType.includes('text/event-stream');
    return new Response(aiResponse.body, {
        status: 200,
        headers: {
            'Content-Type': isSse ? 'text/event-stream' : (upstreamType || 'application/json'),
            'Cache-Control': 'no-store',
            'Server-Timing': `ai-upstream;dur=${ttfbMs}`,
            'X-AI-Stage': meta.stage,
            ...(isSse ? { Connection: 'keep-alive' } : {}),
            ...corsHeaders(request, env),
        },
    });
}
