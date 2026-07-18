export { AssignedWorkSection } from './AssignedWorkSection';
export { LearningProgressPanel } from './LearningProgressPanel';
export { StudentDashboardHeader } from './StudentDashboardHeader';
export { StudentDashboardHero } from './StudentDashboardHero';
export { WeeklyQuestsPanel } from './WeeklyQuestsPanel';

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
  LearningProgressPanelProps,
  StudentDashboardHeaderProps,
  StudentDashboardHeroProps,
  SubjectCardViewModel,
  WeeklyQuestsPanelProps,
  WeeklyQuestViewModel,
} from './dashboard.types';

export {
  getAssignmentActionLabel,
  getAssignmentVisualState,
  getMissionProgressPercent,
  getWeeklyProgressPercent,
} from './dashboard.utils';
