import type { RouteRegistry } from '../types';
import { teacherRoutes } from './teachers';
import { quizRoutes } from './quizzes';
import { resultRoutes } from './results';
import { aiRoutes } from './ai';
import { practiceRoutes } from './practice';
import { classroomRoutes } from './classroom';
import { assignmentRoutes } from './assignments';
import { gamificationRoutes } from './gamification';
import { giftShopRoutes } from './giftShop';
import { phieuRoutes } from './phieu';
import { systemRoutes } from './system';
import { legacyHomeworkRoutes } from './legacyHomework';

export const routes: RouteRegistry = {
    ...teacherRoutes,
    ...quizRoutes,
    ...resultRoutes,
    ...aiRoutes,
    ...practiceRoutes,
    ...classroomRoutes,
    ...assignmentRoutes,
    ...gamificationRoutes,
    ...giftShopRoutes,
    ...phieuRoutes,
    ...systemRoutes,
    ...legacyHomeworkRoutes,
};
