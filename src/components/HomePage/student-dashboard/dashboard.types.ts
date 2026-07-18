import type { Assignment, Quiz } from '../../../types';

export type AssignedQuiz = Quiz & { _assignmentData?: Assignment };

export type AssignmentVisualState = 'ready' | 'completed' | 'closed';

export interface StudentDashboardHeaderProps {
  studentName: string;
  className?: string;
  avatarUrl: string;
  level: number;
  coins: number;
  activeSection: 'dashboard' | 'achievements';
  giftShopEnabled: boolean;
  studentId: string;
  onSelectSection: (section: 'dashboard' | 'achievements') => void;
  onOpenGiftShop: () => void;
  onOpenLiveExam: () => void;
  onOpenAvatar: () => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
}

export interface SubjectCardViewModel {
  id: string;
  title: string;
  description: string;
  icon: string;
  total: number;
  accentClass: string;
  surfaceClass: string;
}
