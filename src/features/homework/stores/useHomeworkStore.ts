import { create } from 'zustand';
import { HomeworkAssignment, HomeworkSubmission } from '../types';
import { homeworkBackendService } from '../services/homeworkBackendService';

interface HomeworkState {
  assignments: HomeworkAssignment[];
  submissions: HomeworkSubmission[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTeacherAssignments: (teacherId: string) => Promise<void>;
  fetchClassAssignments: (classId: string) => Promise<void>;
  fetchStudentSubmissions: (studentId: string) => Promise<void>;
  addAssignment: (assignment: Partial<HomeworkAssignment>) => Promise<void>;
  updateAssignment: (id: string, updates: Partial<HomeworkAssignment>) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  submitHomework: (submission: Partial<HomeworkSubmission>) => Promise<void>;
  getAssignment: (id: string) => HomeworkAssignment | undefined;
  getSubmission: (assignmentId: string) => HomeworkSubmission | undefined;
  resetStore: () => void;
}

export const useHomeworkStore = create<HomeworkState>((set, get) => ({
  assignments: [],
  submissions: [],
  isLoading: false,
  error: null,

  fetchTeacherAssignments: async (teacherId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await homeworkBackendService.getTeacherAssignments(teacherId);
      set({ assignments: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Không thể tải danh sách bài tập', isLoading: false });
    }
  },

  fetchClassAssignments: async (classId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await homeworkBackendService.getAssignments(classId);
      set({ assignments: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Không thể tải danh sách bài tập', isLoading: false });
    }
  },

  fetchStudentSubmissions: async (studentId) => {
    set({ isLoading: true, error: null });
    try {
      // Since there is no global 'get_all_student_submissions' yet, we fetch them for currently loaded assignments
      const assignments = get().assignments;
      const submissionPromises = assignments.map(a => 
        homeworkBackendService.getStudentSubmission(a.id, studentId)
      );
      const results = await Promise.all(submissionPromises);
      const activeSubmissions = results.filter((s): s is HomeworkSubmission => s !== null);
      set({ submissions: activeSubmissions, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Không thể tải lịch sử nộp bài', isLoading: false });
    }
  },

  submitHomework: async (data) => {
    set({ isLoading: true, error: null });
    try {
      if (!data.assignment_id || !data.student_id) throw new Error('Thiếu thông tin nộp bài');
      
      // Check if already submitted (Single submission rule)
      const existing = get().submissions.find(s => s.assignment_id === data.assignment_id);
      if (existing) throw new Error('Em đã nộp bài này rồi!');

      const id = await homeworkBackendService.submitHomework(data);
      
      // Fetch the full submission object after submit to update local state
      const newSubmission = await homeworkBackendService.getStudentSubmission(data.assignment_id, data.student_id);
      if (newSubmission) {
        set((state) => ({ 
          submissions: [...state.submissions, newSubmission],
          isLoading: false 
        }));
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message || 'Không thể nộp bài', isLoading: false });
      throw err; // Re-throw to handle in UI
    }
  },

  addAssignment: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const id = await homeworkBackendService.saveAssignment(data);
      // Refresh list after add
      if (data.teacher_id) {
        const updated = await homeworkBackendService.getTeacherAssignments(data.teacher_id);
        set({ assignments: updated, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message || 'Không thể lưu bài tập', isLoading: false });
    }
  },

  updateAssignment: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await homeworkBackendService.saveAssignment({ ...updates, id });
      set((state) => ({
        assignments: state.assignments.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.message || 'Không thể cập nhật bài tập', isLoading: false });
    }
  },

  deleteAssignment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await homeworkBackendService.deleteAssignment(id);
      set((state) => ({
        assignments: state.assignments.filter((a) => a.id !== id),
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.message || 'Không thể xoá bài tập', isLoading: false });
    }
  },

  getAssignment: (id) => {
    return get().assignments.find((a) => a.id === id);
  },

  getSubmission: (assignmentId) => {
    return get().submissions.find((s) => s.assignment_id === assignmentId);
  },

  resetStore: () => {
    set({
      assignments: [],
      submissions: [],
      isLoading: false,
      error: null
    });
  },
}));
