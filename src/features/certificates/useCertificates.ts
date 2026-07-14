import { useState, useEffect, useCallback } from 'react';
import type { Certificate } from './certificates.types';
import { WORKERS_API_URL } from '../../config/constants';
import type {
    CertificateApiError,
    CertificateApiSuccess,
    StudentCertificateItem,
} from '../../../shared/certificates.contract';

function mapCertificate(certificate: StudentCertificateItem): Certificate {
    return {
        id: certificate.id,
        batchId: certificate.batch_id,
        title: certificate.title,
        teacherName: certificate.teacher_name,
        studentScore: certificate.student_score,
        quizTitle: certificate.quiz_title,
        pngUrl: certificate.image_url,
        issuedAt: certificate.issued_at,
        renderStatus: certificate.status,
        errorMessage: null,
        isRevoked: certificate.status === 'revoked',
    };
}

export function getStudentJwt(): string {
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

export async function fetchCertificateImageBlob(imagePath: string): Promise<Blob> {
    const token = getStudentJwt();
    if (!token) throw new Error('Phiên đăng nhập học sinh đã hết hạn');
    const base = (WORKERS_API_URL || '').replace(/\/$/, '');
    const url = imagePath.startsWith('http') ? imagePath : `${base}${imagePath}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Không thể tải ảnh chứng nhận (${response.status})`);
    return response.blob();
}

export function useCertificates() {
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCertificates = useCallback(async () => {
        const token = getStudentJwt();
        if (!token) {
            setCertificates([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const base = (WORKERS_API_URL || '').replace(/\/$/, '');
            const res = await fetch(`${base}/api/certificates/my`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                const payload = await res.json().catch(() => null) as CertificateApiError | null;
                throw new Error(payload?.error?.message ?? `Lỗi tải chứng nhận: ${res.status}`);
            }

            const payload = await res.json() as CertificateApiSuccess<StudentCertificateItem[]>;
            setCertificates((payload.data ?? []).map(mapCertificate));
        } catch (e: unknown) {
            setCertificates([]);
            setError(e instanceof Error ? e.message : 'Lỗi không xác định');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCertificates();
    }, [fetchCertificates]);

    return { certificates, isLoading, error, refetch: fetchCertificates };
}
