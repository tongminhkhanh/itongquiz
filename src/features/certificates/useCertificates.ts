import { useState, useEffect, useCallback } from 'react';
import { Certificate } from './certificates.types';
import { WORKERS_API_URL } from '../../config/constants';

function getStudentJwt(): string {
    try {
        // Student JWT is stored in classroom-storage zustand persist
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

            const data = await res.json() as Certificate[];
            setCertificates(Array.isArray(data) ? data : []);
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
