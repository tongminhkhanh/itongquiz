import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    SmartAssignmentRecommendedQuiz,
    SmartAssignmentWarning,
} from '../types/classroom.types';

export type TeacherDashboardTab =
    | 'overview'
    | 'results'
    | 'manage'
    | 'create'
    | 'ioe'
    | 'ioe-manage'
    | 'ioe-results'
    | 'announcements'
    | 'classes'
    | 'assignments'
    | 'teachers'
    | 'gift-shop'
    | 'homework'
    | 'live-exam'
    | 'certificates'
    | 'admin-templates'
    | 'personal-settings';

export type AssignmentComposerDraft = {
    source: 'smart-preview' | 'manual';
    sourceResultId?: string;
    studentName?: string;
    className?: string;
    classId: string;
    studentId?: string;
    quizId: string;
    deadline: string;
    maxAttempts: number;
    weaknessSummary?: {
        skillCode: string;
        skillLabel: string;
        subskillCode?: string;
        subskillLabel?: string;
        status: 'weak' | 'needs_practice' | 'stable';
        accuracy: number;
        coveragePercent: number;
        targetDifficulty?: 1 | 2 | 3;
    };
    recommendedQuizzes?: SmartAssignmentRecommendedQuiz[];
    warnings?: SmartAssignmentWarning[];
    createdAt: string;
};

interface TeacherDashboardUIState {
    activeTab: TeacherDashboardTab;
    assignmentComposerDraft: AssignmentComposerDraft | null;
    setActiveTab: (tab: TeacherDashboardTab) => void;
    openAssignmentComposerWithDraft: (draft: AssignmentComposerDraft) => void;
    clearAssignmentComposerDraft: () => void;
}

export const useTeacherDashboardUIStore = create<TeacherDashboardUIState>()(persist((set) => ({
    activeTab: 'overview',
    assignmentComposerDraft: null,
    setActiveTab: (tab) => set({ activeTab: tab }),
    openAssignmentComposerWithDraft: (draft) => set({
        assignmentComposerDraft: draft,
        activeTab: 'assignments',
    }),
    clearAssignmentComposerDraft: () => set({ assignmentComposerDraft: null }),
}), {
    name: 'itongquiz_teacher_dashboard_ui',
    partialize: (state) => ({ activeTab: state.activeTab }),
}));
