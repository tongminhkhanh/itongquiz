import { WORKERS_API_URL } from '../config/constants';

const API_SECRET_TOKEN = import.meta.env.VITE_API_SECRET_TOKEN || '';

export interface TeacherAiQuotaData {
    username: string;
    role: 'admin' | 'teacher';
    usageDate: string;
    dailyLimit: number | null;
    usedCount: number;
    remaining: number | null;
    canGenerate: boolean;
    unlimited: boolean;
}

interface QuotaApiResponse {
    status: 'success' | 'error';
    message?: string;
    code?: string;
    data?: TeacherAiQuotaData;
}

const requestQuotaApi = async (path: string, method: 'GET' | 'POST', body?: Record<string, unknown>): Promise<QuotaApiResponse> => {
    let response: Response;
    try {
        response = await fetch(`${WORKERS_API_URL}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Token': API_SECRET_TOKEN,
            },
            body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Loi ket noi server: ${msg}`);
    }

    const payload = await response.json().catch(() => ({} as QuotaApiResponse)) as QuotaApiResponse;

    if (!response.ok) {
        throw new Error(payload?.message || `Loi ket noi server (${response.status}).`);
    }

    return payload;
};

export const getTeacherAiQuota = async (username: string): Promise<TeacherAiQuotaData> => {
    const apiPayload = await requestQuotaApi(`/api/teacher-ai-quota?username=${encodeURIComponent(username)}`, 'GET');
    if (apiPayload.status !== 'success' || !apiPayload.data) {
        throw new Error(apiPayload.message || 'Khong the lay han muc tao de AI.');
    }
    return apiPayload.data;
};

export const consumeTeacherAiQuota = async (username: string): Promise<TeacherAiQuotaData> => {
    const apiPayload = await requestQuotaApi('/api/teacher-ai-quota/consume', 'POST', { username });
    if (apiPayload.status !== 'success' || !apiPayload.data) {
        throw new Error(apiPayload.message || 'Ban da dung het luot tao de AI hom nay.');
    }
    return apiPayload.data;
};
