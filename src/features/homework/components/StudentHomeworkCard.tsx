import React from 'react';
import { HomeworkAssignment, HomeworkSubmission } from '../types';
import { BookOpen, Clock, CheckCircle2, Timer, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface StudentHomeworkCardProps {
  assignment: HomeworkAssignment;
  submission?: HomeworkSubmission;
  onClick: (assignment: HomeworkAssignment) => void;
}

export const StudentHomeworkCard: React.FC<StudentHomeworkCardProps> = ({ 
  assignment, 
  submission, 
  onClick 
}) => {
  const isSubmitted = !!submission;
  const isGraded = submission?.status === 'GRADED';
  
  const getStatusDisplay = () => {
    if (isGraded) return { label: 'Đã chấm', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
    if (isSubmitted) return { label: 'Đã nộp', color: 'bg-blue-100 text-blue-700', icon: <Clock className="w-3.5 h-3.5" /> };
    return { label: 'Mới', color: 'bg-orange-100 text-orange-700', icon: <Timer className="w-3.5 h-3.5" /> };
  };

  const status = getStatusDisplay();
  const deadlineDate = new Date(assignment.deadline);
  const isOverdue = !isSubmitted && deadlineDate < new Date();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl p-5 border-2 transition-all cursor-pointer hover:shadow-md ${
        isGraded ? 'border-emerald-100' : isSubmitted ? 'border-blue-100' : isOverdue ? 'border-red-100' : 'border-slate-100 hover:border-indigo-200'
      }`}
      onClick={() => onClick(assignment)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isGraded ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-500'
        }`}>
          <BookOpen className="w-6 h-6" />
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${status.color}`}>
          {status.icon}
          {status.label}
        </div>
      </div>

      <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-2">
        {assignment.title}
      </h3>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <Clock className="w-4 h-4" />
          <span>Hạn nộp: {deadlineDate.toLocaleDateString('vi-VN')}</span>
          {isOverdue && <span className="text-red-500 font-bold ml-1">(Quá hạn)</span>}
        </div>
        
        {assignment.description && (
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg italic">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className="line-clamp-2">{assignment.description}</p>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-50">
        {isGraded ? (
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-400">Điểm số:</span>
            <span className="text-lg font-black text-emerald-600">{submission.score}/10</span>
          </div>
        ) : (
          <span className="text-xs font-bold text-slate-400">
            {isSubmitted ? 'Đang chờ chấm điểm' : 'Nhấn để xem đề bài'}
          </span>
        )}
        
        <button 
          className={`text-xs font-black px-4 py-2 rounded-xl transition-all ${
            isGraded 
              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
              : isSubmitted 
                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
          }`}
        >
          {isGraded ? 'Xem lỗi sai' : isSubmitted ? 'Xem bài nộp' : 'Làm bài ngay'}
        </button>
      </div>
    </motion.div>
  );
};
