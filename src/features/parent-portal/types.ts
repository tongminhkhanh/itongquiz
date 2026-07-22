export type {
  ParentApiError,
  ParentApiSuccess,
  ParentCertificateHistoryItem,
  ParentDashboardPayload,
  ParentHistoryPage,
  ParentHomeworkHistoryItem,
  ParentNotificationItem,
  ParentNotificationKind,
  ParentResultHistoryItem,
  ParentStudentProfile,
} from '../../../shared/parent-portal.contract';

import type {
  ParentNotificationItem,
  ParentStudentProfile,
} from '../../../shared/parent-portal.contract';

export interface ParentSessionResponse {
  student: ParentStudentProfile;
  accessCodeMasked?: string;
}

export interface ParentActivationPreview {
  student: Omit<ParentStudentProfile, 'id'>;
  expiresAt: string;
}

export interface ParentNotificationPage {
  items: ParentNotificationItem[];
  nextCursor: string | null;
  unreadCount: number;
}

export interface ParentLinkSafeView {
  id: string;
  studentId: string;
  accessCode: string;
  status: 'PENDING' | 'ACTIVE' | 'REVOKED';
  tokenVersion: number;
  createdBy: string;
  createdAt: string;
  activatedAt: string | null;
  revokedAt: string | null;
  lastAccessedAt: string | null;
}
