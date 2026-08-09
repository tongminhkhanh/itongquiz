import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { QuizPageChangeHandler } from '../hooks/useQuizPageNavigation';
import QuizSubmitButton from './QuizSubmitButton';

interface QuizPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: QuizPageChangeHandler;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const QuizPagination: React.FC<QuizPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <div className="mt-8 flex flex-col gap-4 pb-12 pt-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center justify-between gap-2 sm:justify-start">
        <button
          type="button"
          aria-label="Trang trước"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition-[background-color,box-shadow,transform] hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-700 disabled:hover:bg-slate-200 motion-reduce:transform-none motion-reduce:transition-none"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Câu trước
        </button>

        <div
          role="status"
          aria-live="polite"
          className="px-3 py-2 text-sm font-medium text-slate-500"
        >
          Trang {currentPage} / {totalPages}
        </div>
      </div>

      {currentPage === totalPages ? (
        <QuizSubmitButton
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          className="w-full sm:w-auto lg:hidden"
        />
      ) : (
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 text-base font-semibold text-white shadow-sm transition-[background-color,box-shadow,transform] hover:bg-sky-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 active:scale-[0.985] motion-reduce:transform-none motion-reduce:transition-none sm:w-auto"
        >
          Câu tiếp theo
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default QuizPagination;
