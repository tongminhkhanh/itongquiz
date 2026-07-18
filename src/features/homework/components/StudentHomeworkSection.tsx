import React, { useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import {
  AssignedWorkSkeleton,
  DashboardEmptyState,
  DashboardSectionError,
} from '../../../components/HomePage/student-dashboard';
import { useHomeworkStore } from '../stores/useHomeworkStore';
import type { HomeworkAssignment } from '../types';
import { StudentHomeworkCard } from './StudentHomeworkCard';

interface StudentHomeworkSectionProps {
  studentId: string;
  classId: string;
  onSelectAssignment: (assignment: HomeworkAssignment) => void;
}

export const StudentHomeworkSection: React.FC<StudentHomeworkSectionProps> = ({
  studentId,
  classId,
  onSelectAssignment,
}) => {
  const {
    assignments,
    submissions,
    isLoading,
    error,
    fetchClassAssignments,
    fetchStudentSubmissions,
  } = useHomeworkStore();

  const loadData = async () => {
    await fetchClassAssignments(classId);
    await fetchStudentSubmissions(studentId);
  };

  useEffect(() => {
    if (classId && studentId) {
      loadData();
    }
  }, [classId, studentId, fetchClassAssignments, fetchStudentSubmissions]);

  return (
    <section aria-labelledby="student-homework-title" className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-100 text-indigo-700">
          <BookOpen className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id="student-homework-title" className="text-2xl font-black tracking-tight text-slate-900">
            Bài tập tự luận
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Luyện viết, nộp bài và xem phản hồi từ giáo viên.
            {assignments.length > 0 ? ` · ${assignments.length} bài tập` : ''}
          </p>
        </div>
      </div>

      {isLoading && assignments.length === 0 ? <AssignedWorkSkeleton count={3} /> : null}

      {!isLoading && error ? (
        <DashboardSectionError message={error} onRetry={() => void loadData()} />
      ) : null}

      {!isLoading && !error && assignments.length === 0 ? (
        <DashboardEmptyState
          title="Hiện chưa có bài tập tự luận nào."
          description="Thầy cô sẽ giao bài tại đây khi có nhiệm vụ mới cho lớp."
        />
      ) : null}

      {assignments.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {assignments.map((assignment) => (
            <StudentHomeworkCard
              key={assignment.id}
              assignment={assignment}
              submission={submissions.find(
                (submission) => submission.assignment_id === assignment.id,
              )}
              onClick={onSelectAssignment}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
};
