import { useState, useEffect, useCallback } from 'react';
import { WORKERS_API_URL } from '../../config/constants';

function getTeacherJwt(): string {
    try {
        const direct = localStorage.getItem('itongquiz_jwt_token');
        if (direct) return direct;
        const raw = localStorage.getItem('auth-storage');
        if (!raw) return '';
        return JSON.parse(raw)?.state?.token || '';
    } catch {
        return '';
    }
}

export interface BatchStudent {
    student_id: string;
    student_name: string;
    student_score?: number | null;
    quiz_title?: string | null;
}

export interface BatchRecord {
    id: string;
    title: string;
    custom_note: string | null;
    status: 'draft' | 'sending' | 'sent' | 'error';
    template_name: string | null;
    total_certs: number;
    done_certs: number;
    created_at: string;
}

export interface TemplateOption {
    id: string;
    name: string;
    is_active: number;
}

const base = () => (WORKERS_API_URL || '').replace(/\/$/, '');

function authHeaders(): HeadersInit {
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getTeacherJwt()}`,
    };
}

export function useBatches() {
    const [batches, setBatches] = useState<BatchRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBatches = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${base()}/api/certificate-batches`, {
                headers: authHeaders(),
            });
            if (!res.ok) throw new Error(`Lỗi ${res.status}`);
            const json = await res.json() as { data: BatchRecord[] };
            setBatches(json.data ?? []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Lỗi không xác định');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchBatches(); }, [fetchBatches]);

    const createBatch = useCallback(async (payload: {
        template_id: string;
        title: string;
        custom_note?: string;
        quiz_id?: string;
        class_id?: string;
        students: BatchStudent[];
    }): Promise<{ batch_id: string }> => {
        const res = await fetch(`${base()}/api/certificate-batches`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(payload),
        });
        const json = await res.json() as { data?: { batch_id: string }; error?: string };
        if (!res.ok) throw new Error(json.error ?? `Lỗi ${res.status}`);
        return json.data!;
    }, []);

    return { batches, isLoading, error, refetch: fetchBatches, createBatch };
}

export async function fetchTemplateOptions(): Promise<TemplateOption[]> {
    try {
        const res = await fetch(`${base()}/api/admin/certificate-templates`, {
            headers: authHeaders(),
        });
        if (!res.ok) return [];
        const json = await res.json() as { data: TemplateOption[] };
        return (json.data ?? []).filter((t) => t.is_active);
    } catch {
        return [];
    }
}
