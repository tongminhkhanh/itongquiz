import { useCallback, useEffect, useState } from 'react';
import { WORKERS_API_URL } from '../config/constants';
import type { CertificateApiSuccess, CertificateNotification } from '../../shared/certificates.contract';
import { getStudentJwt } from '../features/certificates/useCertificates';

const apiBase = () => (WORKERS_API_URL || '').replace(/\/$/, '');

export function useRealtimeNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<CertificateNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    const token = getStudentJwt();
    if (!userId || !token) {
      setNotifications([]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${apiBase()}/api/certificates/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const payload = await response.json() as CertificateApiSuccess<CertificateNotification[]>;
      setNotifications(payload.data ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const token = getStudentJwt();
    if (!token) return;
    const response = await fetch(`${apiBase()}/api/certificates/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      setNotifications((current) => current.map((item) => (
        item.id === notificationId ? { ...item, is_read: true } : item
      )));
    }
  }, []);

  useEffect(() => {
    refresh();
    if (!userId) return;
    const interval = window.setInterval(refresh, 30000);
    return () => window.clearInterval(interval);
  }, [refresh, userId]);

  return { notifications, isLoading, refresh, markAsRead };
}
