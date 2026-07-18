export { AssignedWorkSection } from './AssignedWorkSection';
export { StudentDashboardHeader } from './StudentDashboardHeader';
export { StudentDashboardHero } from './StudentDashboardHero';

export {
  AssignedWorkSkeleton,
  DashboardEmptyState,
  DashboardSectionError,
  HeroSkeleton,
  ProgressSkeleton,
} from './DashboardStates';

export type {
  AssignedQuiz,
  AssignedWorkSectionProps,
  AssignmentVisualState,
  StudentDashboardHeaderProps,
  StudentDashboardHeroProps,
  SubjectCardViewModel,
} from './dashboard.types';

export {
  getAssignmentActionLabel,
  getAssignmentVisualState,
  getMissionProgressPercent,
  getWeeklyProgressPercent,
} from './dashboard.utils';
