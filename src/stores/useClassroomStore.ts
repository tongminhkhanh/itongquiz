/**
 * Classroom Store
 *
 * Zustand store for Virtual Classroom state management:
 * Classes, Students, Assignments, and Student session.
 */

import { create } from 'zustand';
import {
    Classroom,
    Student,
    Assignment,
    StudentSession,
    CreateClassPayload,
    CreateStudentPayload,
    CreateAssignmentPayload,
    StudentLoginPayload,
} from '../types/classroom.types';
import * as classroomService from '../services/classroomService';
import { useGamificationStore, restoreGamificationData } from './useGamificationStore';
import { PetData, ShopItem } from '../types/gamification.types';
import { StorageKeys } from '../constants/storageKeys';

// --- Store Interface ---

interface ClassroomStore {
    // State
    classes: Classroom[];
    students: Record<string, Student[]>;  // keyed by classId
    assignments: Assignment[];
    studentSession: StudentSession | null; // Logged-in student session
    isLoading: boolean;
    error: string | null;

    // Class actions
    fetchClasses: (teacherUsername?: string) => Promise<void>;
    addClass: (payload: CreateClassPayload) => Promise<Classroom | null>;
    removeClass: (classId: string) => Promise<boolean>;

    // Student actions
    fetchStudents: (classId: string) => Promise<void>;
    addStudent: (payload: CreateStudentPayload) => Promise<Student | null>;
    addStudentsBulk: (payloads: CreateStudentPayload[], classId: string) => Promise<classroomService.BatchStudentResult | null>;
    removeStudent: (studentId: string, classId: string) => Promise<boolean>;
    resetPassword: (studentId: string, newPassword: string, actorUsername: string) => Promise<boolean>;
    changeMyPassword: (studentId: string, currentPassword: string, newPassword: string) => Promise<boolean>;

    // Assignment actions
    fetchAssignments: (classId: string) => Promise<void>;
    fetchTeacherAssignments: (teacherUsername: string) => Promise<void>;
    fetchAllAssignments: () => Promise<void>;
    addAssignment: (payload: CreateAssignmentPayload) => Promise<Assignment | null>;
    removeAssignment: (assignmentId: string) => Promise<boolean>;
    updateAssignmentDeadline: (assignmentId: string, newDeadline: string) => Promise<boolean>;
    updateAssignmentStatus: (assignmentId: string, newStatus: 'OPEN' | 'CLOSED') => Promise<boolean>;

    // Student portal actions
    loginStudent: (payload: StudentLoginPayload) => Promise<boolean>;
    logoutStudent: () => void;
    restoreStudentSession: () => void;
    fetchStudentAssignments: (studentId: string) => Promise<void>;
    startAssignmentAttempt: (assignmentId: string, studentId: string) => Promise<boolean>;
    updateAvatar: (studentId: string, avatar: string) => Promise<boolean>;

    // Utilities
    clearError: () => void;
}

// --- Store ---

export const useClassroomStore = create<ClassroomStore>((set, get) => ({
    classes: [],
    students: {},
    assignments: [],
    studentSession: null,
    isLoading: false,
    error: null,

    // ==========================================
    // CLASS ACTIONS
    // ==========================================

    fetchClasses: async (teacherUsername) => {
        set({ isLoading: true, error: null });
        try {
            const classes = await classroomService.getClasses(teacherUsername);
            set({ classes, isLoading: false });
        } catch (err) {
            set({ error: 'Không thể tải danh sách lớp.', isLoading: false });
        }
    },

    addClass: async (payload) => {
        set({ isLoading: true, error: null });
        try {
            const newClass = await classroomService.createClass(payload);
            if (newClass) {
                set((s) => ({ classes: [...s.classes, newClass], isLoading: false }));
                return newClass;
            }
            set({ error: 'Không thể tạo lớp.', isLoading: false });
            return null;
        } catch (err) {
            set({ error: 'Lỗi khi tạo lớp.', isLoading: false });
            return null;
        }
    },

    removeClass: async (classId) => {
        set({ isLoading: true, error: null });
        try {
            const ok = await classroomService.deleteClass(classId);
            if (ok) {
                set((s) => ({
                    classes: s.classes.filter((c) => c.id !== classId),
                    isLoading: false,
                }));
            }
            return ok;
        } catch (err) {
            set({ error: 'Lỗi khi xóa lớp.', isLoading: false });
            return false;
        }
    },

    // ==========================================
    // STUDENT ACTIONS
    // ==========================================

    fetchStudents: async (classId) => {
        set({ isLoading: true, error: null });
        try {
            const students = await classroomService.getStudents(classId, 'teacher');
            set((s) => ({
                students: { ...s.students, [classId]: students },
                isLoading: false,
            }));
        } catch (err) {
            set({ error: 'Không thể tải danh sách học sinh.', isLoading: false });
        }
    },

    addStudent: async (payload) => {
        set({ isLoading: true, error: null });
        try {
            const student = await classroomService.addStudent(payload);
            if (student) {
                set((s) => {
                    const existing = s.students[payload.classId] || [];
                    return {
                        students: {
                            ...s.students,
                            [payload.classId]: [...existing, student],
                        },
                        isLoading: false,
                    };
                });
                return student;
            }
            set({ error: 'Không thể thêm học sinh.', isLoading: false });
            return null;
        } catch (err) {
            set({ error: 'Lỗi khi thêm học sinh.', isLoading: false });
            return null;
        }
    },

    addStudentsBulk: async (payloads, classId) => {
        set({ isLoading: true, error: null });
        try {
            const result = await classroomService.addStudentsBatch(payloads);
            if (result && result.successes.length > 0) {
                set((s) => {
                    const existing = s.students[classId] || [];
                    return {
                        students: {
                            ...s.students,
                            [classId]: [...existing, ...result.successes],
                        },
                        isLoading: false,
                    };
                });
                return result;
            }
            if (result && result.successes.length === 0) {
                set({ isLoading: false });
                return result;
            }
            set({ error: 'Không thể thêm học sinh hàng loạt.', isLoading: false });
            return null;
        } catch (err: any) {
            set({ error: err.message || 'Lỗi khi thêm học sinh hàng loạt.', isLoading: false });
            return null;
        }
    },

    removeStudent: async (studentId, classId) => {
        set({ isLoading: true, error: null });
        try {
            const ok = await classroomService.deleteStudent(studentId);
            if (ok) {
                set((s) => ({
                    students: {
                        ...s.students,
                        [classId]: (s.students[classId] || []).filter((st) => st.id !== studentId),
                    },
                    isLoading: false,
                }));
            }
            return ok;
        } catch (err) {
            set({ error: 'Lỗi khi xóa học sinh.', isLoading: false });
            return false;
        }
    },

    resetPassword: async (studentId, newPassword, actorUsername) => {
        set({ isLoading: true, error: null });
        try {
            const ok = await classroomService.resetStudentPassword(studentId, newPassword, actorUsername);
            if (!ok) {
                set({ isLoading: false, error: 'Không thể đặt lại mật khẩu.' });
                return false;
            }
            set({ isLoading: false });
            return true;
        } catch (err: any) {
            set({ error: err?.message || 'Lỗi khi đặt lại mật khẩu.', isLoading: false });
            return false;
        }
    },

    changeMyPassword: async (studentId, currentPassword, newPassword) => {
        set({ isLoading: true, error: null });
        try {
            const ok = await classroomService.changeStudentPassword(studentId, currentPassword, newPassword);
            if (!ok) {
                set({ isLoading: false, error: 'Không thể đổi mật khẩu.' });
                return false;
            }
            set({ isLoading: false });
            return true;
        } catch (err: any) {
            set({ error: err?.message || 'Lỗi khi đổi mật khẩu.', isLoading: false });
            return false;
        }
    },

    // ==========================================
    // ASSIGNMENT ACTIONS
    // ==========================================

    fetchAssignments: async (classId) => {
        set({ isLoading: true, error: null });
        try {
            const assignments = await classroomService.getAssignments(classId);
            set({ assignments, isLoading: false });
        } catch (err) {
            set({ error: 'Không thể tải danh sách bài tập.', isLoading: false });
        }
    },

    fetchTeacherAssignments: async (teacherUsername) => {
        set({ isLoading: true, error: null });
        try {
            const assignments = await classroomService.getTeacherAssignments(teacherUsername);
            set({ assignments, isLoading: false });
        } catch (err) {
            set({ error: 'Không thể tải danh sách bài giao.', isLoading: false });
        }
    },

    fetchAllAssignments: async () => {
        set({ isLoading: true, error: null });
        try {
            const assignments = await classroomService.getAllAssignments();
            set({ assignments, isLoading: false });
        } catch (err) {
            set({ error: 'Khong the tai toan bo danh sach bai giao.', isLoading: false });
        }
    },

    addAssignment: async (payload) => {
        set({ isLoading: true, error: null });
        try {
            const assignment = await classroomService.createAssignment(payload);
            if (assignment) {
                set((s) => ({ assignments: [...s.assignments, assignment], isLoading: false }));
                return assignment;
            }
            set({ error: 'Không thể giao bài.', isLoading: false });
            return null;
        } catch (err) {
            set({ error: 'Lỗi khi giao bài.', isLoading: false });
            return null;
        }
    },

    removeAssignment: async (assignmentId) => {
        set({ isLoading: true, error: null });
        try {
            const ok = await classroomService.deleteAssignment(assignmentId);
            if (ok) {
                set((s) => ({
                    assignments: s.assignments.filter((a) => a.id !== assignmentId),
                    isLoading: false,
                }));
            }
            return ok;
        } catch (err) {
            set({ error: 'Lỗi khi xóa bài tập.', isLoading: false });
            return false;
        }
    },

    updateAssignmentDeadline: async (assignmentId, newDeadline) => {
        set({ isLoading: true, error: null });
        try {
            const ok = await classroomService.updateAssignmentDeadline(assignmentId, newDeadline);
            if (ok) {
                // Update local state
                const newStatus = new Date(newDeadline) > new Date() ? 'OPEN' : 'CLOSED';
                set((s) => ({
                    assignments: s.assignments.map((a) =>
                        a.id === assignmentId
                            ? { ...a, deadline: newDeadline, status: newStatus as 'OPEN' | 'CLOSED' }
                            : a
                    ),
                    isLoading: false,
                }));
            } else {
                set({ error: 'Không thể cập nhật hạn nộp.', isLoading: false });
            }
            return ok;
        } catch (err) {
            set({ error: 'Lỗi khi cập nhật hạn nộp.', isLoading: false });
            return false;
        }
    },

    updateAssignmentStatus: async (assignmentId, newStatus) => {
        set({ isLoading: true, error: null });
        try {
            const ok = await classroomService.updateAssignmentStatus(assignmentId, newStatus);
            if (ok) {
                set((s) => ({
                    assignments: s.assignments.map((a) =>
                        a.id === assignmentId ? { ...a, status: newStatus } : a
                    ),
                    isLoading: false,
                }));
            } else {
                set({ error: 'Không thể cập nhật trạng thái.', isLoading: false });
            }
            return ok;
        } catch (err) {
            set({ error: 'Lỗi khi cập nhật trạng thái.', isLoading: false });
            return false;
        }
    },

    // ==========================================
    // STUDENT PORTAL ACTIONS
    // ==========================================

    loginStudent: async (payload) => {
        set({ isLoading: true, error: null });
        try {
            const session = await classroomService.studentLogin(payload);
            if (session) {
                localStorage.setItem(StorageKeys.STUDENT_SESSION, JSON.stringify(session));
                set({ studentSession: session, isLoading: false });

                // Initialize gamification data from login response
                if (session.pet || session.coins !== undefined) {
                    useGamificationStore.getState().initFromLoginData(
                        session.pet as PetData | null,
                        session.coins || 0,
                        (session.shopItems || []) as ShopItem[]
                    );
                }

                return true;
            }
            set({ error: 'Sai tên đăng nhập hoặc mật khẩu.', isLoading: false });
            return false;
        } catch (err) {
            set({ error: 'Lỗi khi đăng nhập.', isLoading: false });
            return false;
        }
    },

    startAssignmentAttempt: async (assignmentId: string, studentId: string) => {
        try {
            await classroomService.startAssignmentAttempt(assignmentId, studentId);
            // Optionally refresh assignments to update attempt counts, but not strictly necessary for UX
            return true;
        } catch (err) {
            console.error('Failed to start assignment attempt', err);
            return false;
        }
    },

    logoutStudent: () => {
        localStorage.removeItem(StorageKeys.STUDENT_SESSION);
        set({ studentSession: null, assignments: [] });
        // Clear gamification data on logout
        useGamificationStore.getState().clearGamification();
    },

    restoreStudentSession: () => {
        try {
            const saved = localStorage.getItem(StorageKeys.STUDENT_SESSION);
            if (saved) {
                const session: StudentSession = JSON.parse(saved);
                set({ studentSession: session });
                // Also restore gamification data from localStorage
                restoreGamificationData();
            }
        } catch {
            localStorage.removeItem(StorageKeys.STUDENT_SESSION);
        }
    },

    fetchStudentAssignments: async (studentId) => {
        set({ isLoading: true, error: null });
        try {
            const assignments = await classroomService.getStudentAssignments(studentId);
            set({ assignments, isLoading: false });
        } catch (err) {
            set({ error: 'Không thể tải bài tập.', isLoading: false });
        }
    },

    // ==========================================
    // UTILITIES
    // ==========================================

    clearError: () => set({ error: null }),

    updateAvatar: async (studentId: string, avatar: string) => {
        try {
            const ok = await classroomService.updateStudentAvatar(studentId, avatar);
            if (ok) {
                const session = get().studentSession;
                if (session) {
                    const updatedSession = { ...session, avatar };
                    localStorage.setItem(StorageKeys.STUDENT_SESSION, JSON.stringify(updatedSession));
                    set({ studentSession: updatedSession });
                }
                return true;
            }
            return false;
        } catch (err) {
            console.error('Failed to update avatar', err);
            return false;
        }
    },
}));
