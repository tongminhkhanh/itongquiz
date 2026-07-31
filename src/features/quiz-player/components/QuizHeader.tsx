import React from 'react';
import { CircleCheckBig, Timer } from 'lucide-react';

interface QuizHeaderProps {
  title: string;
  timeLeft: number;
  totalQuestions: number;
  answeredCount: number;
  isPractice: boolean;
  studentName?: string;
  avatar?: string | null;
}

const QuizHeader: React.FC<QuizHeaderProps> = ({
  title,
  timeLeft,
  totalQuestions,
  answeredCount,
  isPractice,
  studentName,
}) => {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const progressPercentage = totalQuestions > 0
    ? Math.min(100, Math.max(0, (answeredCount / totalQuestions) * 100))
    : 0;

  return (
    <header className="sticky top-0 z-30 bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="mx-auto max-w-[1180px] px-4 py-3 sm:px-5 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-[#172033] sm:text-lg">{title}</h1>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-[#526174]">
                <CircleCheckBig className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                <span className="truncate">
                  {studentName ? `${studentName} · ` : ''}Đã làm {answeredCount}/{totalQuestions} câu
                </span>
              </p>
            </div>
          </div>

          {!isPractice ? (
            <div
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-sm font-semibold shadow-sm ${
                timeLeft < 60
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-sky-50 text-sky-700'
              }`}
              aria-label={`Thời gian còn lại ${formatTime(timeLeft)}`}
            >
              <Timer className="h-5 w-5" aria-hidden="true" />
              <span className="font-mono text-lg tracking-wide sm:text-xl">{formatTime(timeLeft)}</span>
            </div>
          ) : (
            <span className="shrink-0 text-sm font-medium text-slate-500">Luyện tập</span>
          )}
        </div>

        <div
          role="progressbar"
          aria-label="Tiến độ trả lời"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, totalQuestions)}
          aria-valuenow={Math.min(Math.max(0, answeredCount), Math.max(0, totalQuestions))}
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-sky-100"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-400 transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </header>
  );
};

export default QuizHeader;
