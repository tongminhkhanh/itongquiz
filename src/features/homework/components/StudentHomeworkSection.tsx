import React, { useEffect } from 'react';
import { useHomeworkStore } from '../stores/useHomeworkStore';
import { StudentHomeworkCard } from './StudentHomeworkCard';
import { BookOpen, Sparkles, Loader2 } from 'lucide-react';
import { HomeworkAssignment } from '../types';

interface StudentHomeworkSectionProps {
  studentId: string;
  classId: string;
  onSelectAssignment: (assignment: HomeworkAssignment) => void;
}

export const StudentHomeworkSection: React.FC<StudentHomeworkSectionProps> = ({ 
  studentId, 
  classId,
  onSelectAssignment
}) => {
  const { assignments, submissions, isLoading, fetchClassAssignments, fetchStudentSubmissions } = useHomeworkStore();

  useEffect(() => {
    const loadData = async () => {
      // Clear current assignments first if needed or just fetch
      await fetchClassAssignments(classId);
      await fetchStudentSubmissions(studentId);
    };
    if (classId && studentId) {
      loadData();
    }
  }, [classId, studentId, fetchClassAssignments, fetchStudentSubmissions]);

  if (isLoading && assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium italic">Đang chuẩn bị bài tập AI cho em...</p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-200">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Trung tâm Bài tập Tự luận</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              Luyện tập & Tự động chấm điểm
              <span className="inline-block w-1 h-1 bg-slate-300 rounded-full"></span>
              {assignments.length} bài tập
            </p>
          </div>
        </div>
        
        {/* <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100 shadow-sm">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-[11px] font-black text-amber-700 uppercase tracking-wider">Công nghệ AI mới</span>
        </div> */}
      </div>

      {assignments.length === 0 ? (
        <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-50">
            <BookOpen className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">Hiện chưa có bài tập nào</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed"> Thầy cô sẽ sớm giao bài tập AI cho em tại đây. Hãy chăm chỉ luyện tập nhé!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map(assignment => (
            <StudentHomeworkCard 
              key={assignment.id}
              assignment={assignment}
              submission={submissions.find(s => s.assignment_id === assignment.id)}
              onClick={onSelectAssignment}
            />
          ))}
        </div>
      )}
    </section>
  );
};
