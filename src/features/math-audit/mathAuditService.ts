import { getWorkersApiBaseUrl } from '../../services/api/config';
import { buildAuthHeaders } from '../../services/api/auth';
import type {
    MathAuditIssue,
    MathAuditSummary,
    MathRepairBatch,
    MathRenderEvent,
} from './mathAudit.types';

const requestJson = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${getWorkersApiBaseUrl()}${path}`, {
        ...init,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...buildAuthHeaders('session', path),
            ...init.headers,
        },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
    }
    return payload as T;
};

export const mathAuditService = {
    async listIssues(limit = 500): Promise<{ data: MathAuditIssue[]; summary: MathAuditSummary }> {
        return requestJson(`/api/admin/math-audit/issues?limit=${limit}`);
    },

    async apply(questionIds: string[]): Promise<{
        data: { batchId: string | null; repaired: number; skipped: Array<{ questionId: string; reason: string }> };
    }> {
        return requestJson('/api/admin/math-audit/apply', {
            method: 'POST',
            body: JSON.stringify({ questionIds }),
        });
    },

    async listBatches(): Promise<{ data: MathRepairBatch[] }> {
        return requestJson('/api/admin/math-audit/batches');
    },

    async rollback(batchId: string): Promise<{
        status: 'success' | 'partial';
        data: { rolledBack: number; conflicts: Array<{ questionId: string; reason: string }> };
    }> {
        return requestJson(`/api/admin/math-audit/batches/${encodeURIComponent(batchId)}/rollback`, {
            method: 'POST',
            body: '{}',
        });
    },

    async listTelemetry(days = 7): Promise<{
        data: MathRenderEvent[];
        summary: { events: number; occurrences: number; days: number };
    }> {
        return requestJson(`/api/admin/math-telemetry?days=${days}`);
    },
};
