import { callApi } from '../../../services/apiAdapter';
import { HomeworkAssignment, HomeworkSubmission } from '../types';

/**
 * Service for interacting with the Homework Center D1 Backend
 */
export const homeworkBackendService = {
  /**
   * Get all homework assignments for a class
   */
  async getAssignments(classId: string): Promise<HomeworkAssignment[]> {
    const response = await callApi('get_hw_assignments', { classId });
    if (response.status === 'success') {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch assignments');
  },

  /**
   * Get all homework assignments created by a teacher
   */
  async getTeacherAssignments(teacherId: string): Promise<HomeworkAssignment[]> {
    const response = await callApi('get_hw_assignments', { teacherId });
    if (response.status === 'success') {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch teacher assignments');
  },

  /**
   * Save (create or update) a homework assignment
   */
  async saveAssignment(assignment: Partial<HomeworkAssignment>): Promise<string> {
    const response = await callApi('save_hw_assignment', assignment);
    if (response.status === 'success') {
      return response.data.id;
    }
    throw new Error(response.message || 'Failed to save assignment');
  },

  /**
   * Delete a homework assignment
   */
  async deleteAssignment(assignmentId: string): Promise<void> {
    const response = await callApi('delete_hw_assignment', { assignmentId });
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to delete assignment');
    }
  },

  /**
   * Submit student homework
   */
  async submitHomework(submission: Partial<HomeworkSubmission>): Promise<string> {
    const response = await callApi('submit_hw', submission);
    if (response.status === 'success') {
      return response.data.id;
    }
    throw new Error(response.message || 'Failed to submit homework');
  },

  /**
   * Get submissions for an assignment
   */
  async getSubmissions(assignmentId: string): Promise<HomeworkSubmission[]> {
    const response = await callApi('get_hw_submissions', { assignmentId });
    if (response.status === 'success') {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch submissions');
  },

  /**
   * Get submission for a specific student for an assignment
   */
  async getStudentSubmission(assignmentId: string, studentId: string): Promise<HomeworkSubmission | null> {
    const response = await callApi('get_hw_submissions', { assignmentId, studentId });
    if (response.status === 'success' && response.data.length > 0) {
      return response.data[0];
    }
    return null;
  }
};
