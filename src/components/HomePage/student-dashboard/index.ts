export { StudentDashboardHeader } from './StudentDashboardHeader';

export {
  AssignedWorkSkeleton,
  DashboardEmptyState,
  DashboardSectionError,
  HeroSkeleton,
  ProgressSkeleton,
} from './DashboardStates';

export type {
  AssignedQuiz,
  AssignmentVisualState,
  StudentDashboardHeaderProps,
  SubjectCardViewModel,
} from './dashboard.types';

export {
  getAssignmentActionLabel,
  getAssignmentVisualState,
  getMissionProgressPercent,
  getWeeklyProgressPercent,
} from './dashboard.utils';
