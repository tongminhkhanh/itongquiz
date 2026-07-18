import type { Quiz } from '@/src/types';
import type { SubjectCardViewModel } from '@/src/components/HomePage/student-dashboard';
import { SUBJECT_CARD_STYLES, SUBJECT_CONFIG } from './dashboardConstants';

export const buildSubjectCards = (quizzes: Quiz[]): SubjectCardViewModel[] =>
  Object.keys(SUBJECT_CONFIG)
    .filter((category) => SUBJECT_CONFIG[category].showOnHome !== false)
    .map((category, index) => {
      const config = SUBJECT_CONFIG[category];
      return {
        id: category,
        title: config.title,
        description: config.desc,
        icon: config.icon,
        total: quizzes.filter(
          (quiz) => (quiz.category || 'class') === category && quiz.showOnHome !== false,
        ).length,
        ...SUBJECT_CARD_STYLES[index % SUBJECT_CARD_STYLES.length],
      };
    });
