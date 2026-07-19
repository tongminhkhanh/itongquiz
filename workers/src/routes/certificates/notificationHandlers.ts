import { verifyJWTMiddleware } from '../../middleware/jwtAuth';
import type { Env } from '../../types';
import { certificateError, certificateSuccess } from './responses';

export async function handleGetNotifications(request: Request, env: Env): Promise<Response> {
  const authResult = await verifyJWTMiddleware(request, env);
  if (authResult instanceof Response) return authResult;

  const userId = authResult.user.id ?? authResult.user.username;
  const { results } = await env.DB.prepare(`
    SELECT id, type, title, body, data, is_read, created_at
    FROM notifications
    WHERE user_id = ? AND user_role = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).bind(userId, authResult.user.role).all<{
    id: string;
    type: string;
    title: string;
    body: string | null;
    data: string;
    is_read: number;
    created_at: string;
  }>();

  return certificateSuccess(results.map((notification) => {
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(notification.data || '{}') as Record<string, unknown>;
    } catch {
      data = {};
    }
    return { ...notification, data, is_read: notification.is_read === 1 };
  }));
}

// PATCH /api/certificates/notifications/:id/read
export async function handleMarkNotificationRead(
  request: Request,
  env: Env,
  notificationId: string,
): Promise<Response> {
  const authResult = await verifyJWTMiddleware(request, env);
  if (authResult instanceof Response) return authResult;

  const userId = authResult.user.id ?? authResult.user.username;
  const notification = await env.DB.prepare(`
    SELECT id FROM notifications WHERE id = ? AND user_id = ? AND user_role = ?
  `).bind(notificationId, userId, authResult.user.role).first();
  if (!notification) {
    return certificateError('NOTIFICATION_NOT_FOUND', 'Notification not found', 404);
  }

  await env.DB.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ?`)
    .bind(notificationId).run();
  return certificateSuccess({ id: notificationId, is_read: true });
}
