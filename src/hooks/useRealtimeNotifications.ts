import { useCallback, useEffect, useState } from 'react';
import { getWorkersApiBaseUrl } from '../services/api/config';
import type { CertificateApiSuccess, CertificateNotification } from '../../shared/certificates.contract';

const apiBase = () => getWorkersApiBaseUrl();

export function useRealtimeNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<CertificateNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${apiBase()}/api/certificates/notifications`, {
        credentials: 'include',
      });
      if (!response.ok) {
        setNotifications([]);
        return;
      }
      const payload = await response.json() as CertificateApiSuccess<CertificateNotification[]>;
      setNotifications(payload.data ?? []);
    } catch {
      // Notification polling is background-only and must never create an
      // unhandled rejection or break the student dashboard when offline.
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`${apiBase()}/api/certificates/notifications/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (response.ok) {
        setNotifications((current) => current.map((item) => (
          item.id === notificationId ? { ...item, is_read: true } : item
        )));
      }
    } catch {
      // Reading a notification is best-effort; retain the local unread state.
    }
  }, []);

  useEffect(() => {
    void refresh();
    if (!userId) return;
    const interval = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(interval);
  }, [refresh, userId]);

  return { notifications, isLoading, refresh, markAsRead };
}
