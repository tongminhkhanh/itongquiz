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

export interface StudentDashboardHeroProps {
  firstName: string;
  hasReadyAssignment: boolean;
  attendanceClaimed: boolean;
  attendanceLabel: string;
  attendanceAvailable: boolean;
  onPrimaryAction: () => void;
  onAttendance: () => void;
}

export interface AssignedWorkSectionProps {
  quizzes: AssignedQuiz[];
  isLoading: boolean;
  errorMessage?: string | null;
  page: number;
  totalPages: number;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onStartQuiz: (quiz: AssignedQuiz) => void;
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
