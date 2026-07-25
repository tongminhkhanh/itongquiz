import React, { useEffect, useState } from 'react';
import { Check, Circle, Loader2, XCircle } from 'lucide-react';
import type { GenerationStep } from '../domain/quizCreation.types';

const STEP_COPY: Record<GenerationStep, string> = {
  idle: '',
  reading_document: 'Đang đọc và nhận dạng tài liệu',
  generating: 'AI đang tạo câu hỏi',
  validating: 'Đang kiểm tra cấu trúc và đáp án',
  repairing: 'Đang sửa đúng các câu chưa đạt',
  reviewing: 'Đang kiểm tra nâng cao bằng AI',
  generating_images: 'Đang hoàn thiện hình ảnh',
  completed: 'Đã hoàn thành',
  cancelled: 'Đã hủy yêu cầu',
};

const ORDERED_STEPS: GenerationStep[] = [
  'reading_document',
  'generating',
  'validating',
  'repairing',
  'reviewing',
  'generating_images',
  'completed',
];

interface GenerationProgressPanelProps {
  step: GenerationStep;
  startedAt: number | null;
  questionCount: number;
  onCancel: () => void;
}

const elapsedFrom = (startedAt: number | null): number => (
  startedAt === null ? 0 : Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
);

const GenerationProgressPanel: React.FC<GenerationProgressPanelProps> = ({
  step,
  startedAt,
  questionCount,
  onCancel,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(() => elapsedFrom(startedAt));

  useEffect(() => {
    setElapsedSeconds(elapsedFrom(startedAt));
    if (startedAt === null || ['completed', 'cancelled'].includes(step)) return undefined;
    const interval = window.setInterval(() => {
      setElapsedSeconds(elapsedFrom(startedAt));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [startedAt, step]);

  if (step === 'idle') return null;

  const currentIndex = ORDERED_STEPS.indexOf(step);
  const canCancel = !['completed', 'cancelled'].includes(step);

  return (
    <section
      aria-live="polite"
      className="rounded-2xl border border-blue-200 bg-white p-4 shadow-lg"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Tiến trình tạo đề</p>
          <p className="mt-1 text-base font-bold text-gray-900">{STEP_COPY[step]}</p>
          {startedAt !== null && (
            <p className="mt-1 text-xs text-slate-500">
              Đã chờ {elapsedSeconds} giây · Mục tiêu {questionCount} câu
            </p>
          )}
        </div>
        {canCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
          >
            <XCircle className="h-4 w-4" />
            Hủy tạo đề
          </button>
        )}
      </div>

      {step === 'cancelled' ? (
        <p className="mt-3 text-sm text-gray-600">Thông tin đã nhập vẫn được giữ lại để bạn chỉnh sửa hoặc tạo lại.</p>
      ) : (
        <ol className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-7">
          {ORDERED_STEPS.map((item, index) => {
            const completed = step === 'completed' || (currentIndex >= 0 && index < currentIndex);
            const current = item === step;
            const label = STEP_COPY[item];
            return (
              <li
                key={item}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                  current
                    ? 'border-blue-400 bg-blue-50 text-blue-800'
                    : completed
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-gray-200 bg-gray-50 text-gray-500'
                }`}
              >
                {current && item !== 'completed' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : completed ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
                <span>{label}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};

export { STEP_COPY };
export default GenerationProgressPanel;
