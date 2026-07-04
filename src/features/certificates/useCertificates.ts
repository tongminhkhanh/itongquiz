import { useState, useEffect, useCallback } from 'react';
import { Certificate } from './certificates.types';
import { WORKERS_API_URL } from '../../config/constants';

interface ApiCertificate {
    id: string;
    batch_id?: string;
    batch_title?: string;
    title?: string;
    teacher_name?: string;
    student_score?: number | null;
    quiz_title?: string | null;
    png_url?: string | null;
    issued_at?: string;
    render_status?: 'pending' | 'done' | 'error';
    error_message?: string | null;
}

function mapCertificate(cert: ApiCertificate | Certificate): Certificate {
    const maybe = cert as ApiCertificate;
    if ('pngUrl' in cert && 'issuedAt' in cert) return cert as Certificate;

    return {
        id: maybe.id,
        batchId: maybe.batch_id ?? '',
        title: maybe.batch_title ?? maybe.title ?? 'Chứng nhận thành tích',
        teacherName: maybe.teacher_name ?? '',
        studentScore: maybe.student_score ?? null,
        quizTitle: maybe.quiz_title ?? null,
        pngUrl: maybe.png_url ?? null,
        issuedAt: maybe.issued_at ?? new Date().toISOString(),
        renderStatus: maybe.render_status,
        errorMessage: maybe.error_message ?? null,
    };
}

function getStudentJwt(): string {
    try {
        const direct = localStorage.getItem('itongquiz_jwt_token');
        if (direct) return direct;

        const sessionRaw = localStorage.getItem('student_session');
        if (sessionRaw) {
            const session = JSON.parse(sessionRaw);
            if (session?.token) return session.token;
        }

        const raw = localStorage.getItem('classroom-storage');
        if (!raw) return '';
        const parsed = JSON.parse(raw);
        return parsed?.state?.studentToken || '';
    } catch {
        return '';
    }
}

export function useCertificates() {
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCertificates = useCallback(async () => {
        const token = getStudentJwt();
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const base = (WORKERS_API_URL || '').replace(/\/$/, '');
            const res = await fetch(`${base}/api/certificates/my`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                if (res.status === 404) {
                    // Endpoint chưa có → trả về mảng rỗng, không báo lỗi
                    setCertificates([]);
                    return;
                }
                throw new Error(`Lỗi tải chứng nhận: ${res.status}`);
            }

            const payload = await res.json() as { data?: ApiCertificate[] } | ApiCertificate[];
            const list = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.data)
                    ? payload.data
                    : [];
            setCertificates(list.map(mapCertificate));
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Lỗi không xác định';
            // Nếu endpoint chưa deploy → không hiện lỗi đỏ, chỉ để trống
            if (msg.includes('404') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
                setCertificates([]);
            } else {
                setError(msg);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCertificates();
    }, [fetchCertificates]);

    return { certificates, isLoading, error, refetch: fetchCertificates };
}
