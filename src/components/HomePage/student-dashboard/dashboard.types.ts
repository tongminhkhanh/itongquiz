import type { Assignment, Quiz } from '../../../types';

export type AssignedQuiz = Quiz & { _assignmentData?: Assignment };

export type AssignmentVisualState = 'ready' | 'completed' | 'closed';

export interface SubjectCardViewModel {
  id: string;
  title: string;
  description: string;
  icon: string;
  total: number;
  accentClass: string;
  surfaceClass: string;
}
