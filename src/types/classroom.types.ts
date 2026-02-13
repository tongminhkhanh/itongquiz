/**
 * Classroom Types
 *
 * Types for Virtual Classroom feature: Classes, Students, Assignments.
 */

// --- Class ---

export interface Classroom {
    id: string;
    name: string;              // e.g., "Lớp 5A"
    teacherUsername: string;    // Username of the teacher who created the class
    createdAt: string;         // ISO timestamp
}

export interface CreateClassPayload {
    name: string;
    teacherUsername: string;
}

// --- Student ---

export interface Student {
    id: string;
    fullName: string;
    username: string;          // Unique login identifier (e.g., "an.nguyen.001")
    classId: string;           // Foreign key to Classroom.id
    parentPhone?: string;      // Only visible to teacher
    createdAt?: string;
}

export interface CreateStudentPayload {
    fullName: string;
    username: string;
    password: string;          // Plain text input, will be hashed on server
    classId: string;
    parentPhone?: string;
}

export interface StudentLoginPayload {
    username: string;
    password: string;          // Plain text input, verified against hash on server
}

export interface StudentSession {
    studentId: string;
    fullName: string;
    username: string;
    classId: string;
    className?: string;
}

// --- Assignment ---

export type AssignmentStatus = 'OPEN' | 'CLOSED';

export interface Assignment {
    id: string;
    quizId: string;
    classId: string;
    deadline: string;           // ISO timestamp
    maxAttempts: number;        // Max times a student can take this quiz
    status: AssignmentStatus;
    createdAt: string;
    // Computed / joined fields (from server)
    quizTitle?: string;
    className?: string;
    submittedCount?: number;    // How many students submitted
    totalStudents?: number;     // Total students in class
    attemptCount?: number;      // How many times current student has submitted
}

export interface CreateAssignmentPayload {
    quizId: string;
    classId: string;
    deadline: string;           // ISO timestamp
    maxAttempts: number;        // Max times a student can take this quiz (default: 1)
}

// --- API Response ---

export interface ClassroomApiResponse<T> {
    status: 'success' | 'error';
    data?: T;
    message?: string;
}
