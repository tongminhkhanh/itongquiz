import React from 'react';
import { BookOpen, CheckCircle2, Clock, Info, Timer } from 'lucide-react';
import type { HomeworkAssignment, HomeworkSubmission } from '../types';

interface StudentHomeworkCardProps {
  assignment: HomeworkAssignment;
  submission?: HomeworkSubmission;
  onClick: (assignment: HomeworkAssignment) => void;
}

export const StudentHomeworkCard: React.FC<StudentHomeworkCardProps> = ({
  assignment,
  submission,
  onClick,
}) => {
  const isSubmitted = Boolean(submission);
  const isGraded = submission?.status === 'GRADED';
  const isClosed =
    assignment.effectiveStatus === 'EXPIRED' || assignment.effectiveStatus === 'CLOSED';
  const deadlineDate = new Date(assignment.deadline);
  const isOverdue = !isSubmitted && deadlineDate < new Date();

  const status = isGraded
    ? {
        label: 'Đã chấm',
        color: 'bg-emerald-100 text-emerald-700',
        icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />,
      }
    : isSubmitted
      ? {
          label: 'Đã nộp',
          color: 'bg-blue-100 text-blue-700',
          icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" />,
        }
      : isClosed
        ? {
            label: 'Đã đóng',
            color: 'bg-rose-100 text-rose-700',
            icon: <Timer className="h-3.5 w-3.5" aria-hidden="true" />,
          }
        : {
            label: 'Mới',
            color: 'bg-orange-100 text-orange-700',
            icon: <Timer className="h-3.5 w-3.5" aria-hidden="true" />,
          };

  const actionLabel = isGraded
    ? 'Xem lỗi sai'
    : isSubmitted
      ? 'Xem bài nộp'
      : isOverdue || isClosed
        ? 'Xem đề'
        : 'Làm bài ngay';

  return (
    <article
      className={`flex h-full flex-col rounded-3xl border bg-white p-5 shadow-sm ${
        isGraded
          ? 'border-emerald-200'
          : isSubmitted
            ? 'border-blue-200'
            : isOverdue || isClosed
              ? 'border-rose-200'
              : 'border-slate-200'
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            isGraded ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
          }`}
        >
          <BookOpen className="h-6 w-6" aria-hidden="true" />
        </div>
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${status.color}`}
        >
          {status.icon}
          {status.label}
        </div>
      </div>

      <h3 className="line-clamp-2 text-lg font-black text-slate-900">{assignment.title}</h3>

      <div className="mt-3 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
          <Clock className="h-4 w-4" aria-hidden="true" />
          <span>Hạn nộp: {deadlineDate.toLocaleDateString('vi-VN')}</span>
          {isOverdue ? <span className="font-black text-rose-600">Quá hạn</span> : null}
        </div>

        {assignment.description ? (
          <div className="flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <p className="line-clamp-2">{assignment.description}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        {isGraded ? (
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-500">Điểm số:</span>
            <span className="text-lg font-black text-emerald-600">{submission?.score}/10</span>
          </div>
        ) : (
          <span className="text-xs font-bold text-slate-500">
            {isSubmitted
              ? 'Đang chờ chấm điểm'
              : isOverdue || isClosed
                ? 'Đã hết hạn nộp'
                : 'Sẵn sàng để làm bài'}
          </span>
        )}

        <button
          type="button"
          onClick={() => onClick(assignment)}
          className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-xs font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
            isGraded
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : isSubmitted
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                : isOverdue || isClosed
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {actionLabel}
        </button>
      </div>
    </article>
  );
};
