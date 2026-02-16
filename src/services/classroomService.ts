/**
 * Classroom Service
 *
 * API calls to Google Apps Script for Virtual Classroom features:
 * Classes, Students, Assignments.
 */

import { GOOGLE_SCRIPT_URL } from '../config/constants';
import {
    Classroom,
    CreateClassPayload,
    Student,
    CreateStudentPayload,
    StudentLoginPayload,
    StudentSession,
    Assignment,
    CreateAssignmentPayload,
    ClassroomApiResponse,
} from '../types/classroom.types';

// Security: API token for GAS authentication
const API_SECRET_TOKEN = import.meta.env.VITE_API_SECRET_TOKEN || '';

/**
 * Helper to call GAS API (same pattern as googleSheetService)
 */
const callGasApi = async <T = any>(action: string, payload: Record<string, any> = {}): Promise<ClassroomApiResponse<T>> => {
    if (!GOOGLE_SCRIPT_URL) {
        console.error('[ClassroomService] GOOGLE_SCRIPT_URL is not defined');
        return { status: 'error', message: 'Script URL not configured' };
    }

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                ...payload,
                action,
                token: API_SECRET_TOKEN,
            }),
        });

        const data = await response.json();

        if (data.status === 'error') {
            console.error(`[ClassroomService] API Error [${action}]:`, data.message);
            return { status: 'error', message: data.message || 'Unknown API error' };
        }

        return { status: 'success', data: data.data ?? data };
    } catch (error) {
        console.error(`[ClassroomService] Network Error [${action}]:`, error);
        return { status: 'error', message: 'Network error. Please check your connection.' };
    }
};

// ==========================================
// CLASS MANAGEMENT
// ==========================================

/**
 * Get all classes for a teacher
 */
export const getClasses = async (teacherUsername: string): Promise<Classroom[]> => {
    const res = await callGasApi<Classroom[]>('get_classes', { teacherUsername });
    if (res.status === 'success' && Array.isArray(res.data)) {
        return res.data;
    }
    return [];
};

/**
 * Create a new class
 */
export const createClass = async (payload: CreateClassPayload): Promise<Classroom | null> => {
    const res = await callGasApi<Classroom>('create_class', payload);
    if (res.status === 'success' && res.data) {
        return res.data;
    }
    console.error('[ClassroomService] createClass failed:', res.message);
    return null;
};

/**
 * Delete a class (and optionally its students)
 */
export const deleteClass = async (classId: string): Promise<boolean> => {
    const res = await callGasApi('delete_class', { classId });
    return res.status === 'success';
};

// ==========================================
// STUDENT MANAGEMENT
// ==========================================

/**
 * Get students in a class
 * - Teacher role: returns all fields including parentPhone
 * - Student role: omits parentPhone
 */
export const getStudents = async (classId: string, role: 'teacher' | 'student' = 'teacher'): Promise<Student[]> => {
    const res = await callGasApi<Student[]>('get_students', { classId, role });
    if (res.status === 'success' && Array.isArray(res.data)) {
        return res.data;
    }
    return [];
};

/**
 * Add a student to a class (password will be hashed on GAS side)
 */
export const addStudent = async (payload: CreateStudentPayload): Promise<Student | null> => {
    const res = await callGasApi<Student>('add_student', payload);
    if (res.status === 'success' && res.data) {
        return res.data;
    }
    console.error('[ClassroomService] addStudent failed:', res.message);
    return null;
};

/**
 * Delete a student
 */
export const deleteStudent = async (studentId: string): Promise<boolean> => {
    const res = await callGasApi('delete_student', { studentId });
    return res.status === 'success';
};

/**
 * Reset student password (generates new random password, hashes & stores, returns plain text)
 */
export const resetStudentPassword = async (studentId: string): Promise<string | null> => {
    const res = await callGasApi<{ newPassword: string }>('reset_student_password', { studentId });
    if (res.status === 'success' && res.data) {
        return res.data.newPassword;
    }
    return null;
};

/**
 * Student login (password verified against hash on server side)
 */
export const studentLogin = async (payload: StudentLoginPayload): Promise<StudentSession | null> => {
    const res = await callGasApi<StudentSession>('student_login', payload);
    if (res.status === 'success' && res.data) {
        return res.data;
    }
    return null;
};

// ==========================================
// ASSIGNMENT MANAGEMENT
// ==========================================

/**
 * Get assignments for a class (auto-closes expired ones server-side)
 */
export const getAssignments = async (classId: string): Promise<Assignment[]> => {
    const res = await callGasApi<Assignment[]>('get_assignments', { classId });
    if (res.status === 'success' && Array.isArray(res.data)) {
        return res.data;
    }
    return [];
};

/**
 * Get all assignments for a teacher (across all their classes)
 */
export const getTeacherAssignments = async (teacherUsername: string): Promise<Assignment[]> => {
    const res = await callGasApi<Assignment[]>('get_teacher_assignments', { teacherUsername });
    if (res.status === 'success' && Array.isArray(res.data)) {
        return res.data;
    }
    return [];
};

/**
 * Create a new assignment (deadline enforced server-side)
 */
export const createAssignment = async (payload: CreateAssignmentPayload): Promise<Assignment | null> => {
    const res = await callGasApi<Assignment>('create_assignment', payload);
    if (res.status === 'success' && res.data) {
        return res.data;
    }
    console.error('[ClassroomService] createAssignment failed:', res.message);
    return null;
};

/**
 * Delete an assignment
 */
export const deleteAssignment = async (assignmentId: string): Promise<boolean> => {
    const res = await callGasApi('delete_assignment', { assignmentId });
    return res.status === 'success';
};

/**
 * Get student assignments (for student portal dashboard)
 */
export const getStudentAssignments = async (studentId: string): Promise<Assignment[]> => {
    const res = await callGasApi<Assignment[]>('get_student_assignments', { studentId });
    if (res.status === 'success' && Array.isArray(res.data)) {
        return res.data;
    }
    return [];
};

/**
 * Get ALL assignments (for "Bài Tập Lớp" category on HomePage)
 */
export const getAllAssignments = async (): Promise<Assignment[]> => {
    const res = await callGasApi<Assignment[]>('get_all_assignments', {});
    if (res.status === 'success' && Array.isArray(res.data)) {
        return res.data;
    }
    return [];
};

/**
 * Start an assignment attempt (tracks attempt count & creates initial result)
 */
export const startAssignmentAttempt = async (assignmentId: string, studentId: string): Promise<boolean> => {
    const res = await callGasApi('start_assignment_attempt', { assignmentId, studentId });
    return res.status === 'success';
};

/**
 * Update student avatar
 */
export const updateStudentAvatar = async (studentId: string, avatar: string): Promise<boolean> => {
    const res = await callGasApi('update_student_avatar', { studentId, avatar });
    return res.status === 'success';
};
