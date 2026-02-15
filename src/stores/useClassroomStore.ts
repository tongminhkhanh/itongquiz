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
    fetchClasses: (teacherUsername: string) => Promise<void>;
    addClass: (payload: CreateClassPayload) => Promise<Classroom | null>;
    removeClass: (classId: string) => Promise<boolean>;

    // Student actions
    fetchStudents: (classId: string) => Promise<void>;
    addStudent: (payload: CreateStudentPayload) => Promise<Student | null>;
    removeStudent: (studentId: string, classId: string) => Promise<boolean>;
    resetPassword: (studentId: string) => Promise<string | null>;

    // Assignment actions
    fetchAssignments: (classId: string) => Promise<void>;
    fetchTeacherAssignments: (teacherUsername: string) => Promise<void>;
    addAssignment: (payload: CreateAssignmentPayload) => Promise<Assignment | null>;
    removeAssignment: (assignmentId: string) => Promise<boolean>;

    // Student portal actions
    loginStudent: (payload: StudentLoginPayload) => Promise<boolean>;
    logoutStudent: () => void;
    restoreStudentSession: () => void;
    fetchStudentAssignments: (studentId: string) => Promise<void>;
    startAssignmentAttempt: (assignmentId: string, studentId: string) => Promise<boolean>;

    // Utilities
    clearError: () => void;
}

// --- Constants ---

const STUDENT_SESSION_KEY = 'itongquiz_student_session';

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

    resetPassword: async (studentId) => {
        set({ isLoading: true, error: null });
        try {
            const newPassword = await classroomService.resetStudentPassword(studentId);
            set({ isLoading: false });
            return newPassword;
        } catch (err) {
            set({ error: 'Lỗi khi đặt lại mật khẩu.', isLoading: false });
            return null;
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

    // ==========================================
    // STUDENT PORTAL ACTIONS
    // ==========================================

    loginStudent: async (payload) => {
        set({ isLoading: true, error: null });
        try {
            const session = await classroomService.studentLogin(payload);
            if (session) {
                localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(session));
                set({ studentSession: session, isLoading: false });
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
        localStorage.removeItem(STUDENT_SESSION_KEY);
        set({ studentSession: null, assignments: [] });
    },

    restoreStudentSession: () => {
        try {
            const saved = localStorage.getItem(STUDENT_SESSION_KEY);
            if (saved) {
                const session: StudentSession = JSON.parse(saved);
                set({ studentSession: session });
            }
        } catch {
            localStorage.removeItem(STUDENT_SESSION_KEY);
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
}));
