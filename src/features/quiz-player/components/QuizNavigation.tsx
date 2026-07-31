import React, { useId } from 'react';
import { Check, ListChecks } from 'lucide-react';
import { Question } from '../../../types';
import type { QuizPageChangeHandler } from '../hooks/useQuizPageNavigation';

interface QuizNavigationProps {
  questions: Question[];
  isQuestionAnswered: (question: Question) => boolean;
  activeQuestionId: string | null;
  QUESTIONS_PER_PAGE: number;
  onPageChange: QuizPageChangeHandler;
  variant?: 'sidebar' | 'mobile';
}

const QuizNavigation: React.FC<QuizNavigationProps> = ({
  questions,
  isQuestionAnswered,
  activeQuestionId,
  QUESTIONS_PER_PAGE,
  onPageChange,
  variant = 'sidebar',
}) => {
  const navigationId = useId();

  const handleQuestionClick = (question: Question, page: number) => {
    onPageChange(page, question.id);
  };

  const isMobile = variant === 'mobile';

  return (
    <nav
      aria-label="Điều hướng câu hỏi"
      className={
        isMobile
          ? 'overflow-x-auto snap-x snap-mandatory'
          : 'sticky top-24 rounded-2xl bg-white p-4 shadow-sm'
      }
    >
      {!isMobile && (
        <>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#172033]">
            <ListChecks className="h-4 w-4 text-sky-600" aria-hidden="true" />
            Danh sách câu hỏi
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#526174]">Chọn số câu để chuyển nhanh.</p>
        </>
      )}

      <div className={isMobile ? 'flex w-max gap-2 p-1' : 'mt-4 grid grid-cols-5 gap-1.5'}>
        {questions.map((question, index) => {
          const isAnswered = isQuestionAnswered(question);
          const pageOfQuestion = Math.floor(index / QUESTIONS_PER_PAGE) + 1;
          const isActive = question.id === activeQuestionId;
          const answeredDescriptionId = `${navigationId}-question-${index + 1}-answered`;
          const stateClass = isAnswered
            ? 'border-transparent bg-emerald-700 text-white hover:bg-emerald-800'
            : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200';
          const activeClass = isActive ? 'ring-1 ring-sky-500' : '';

          return (
            <button
              key={question.id}
              type="button"
              aria-label={`Đi đến câu ${index + 1}`}
              aria-describedby={isAnswered ? answeredDescriptionId : undefined}
              aria-current={isActive ? 'step' : undefined}
              onClick={() => handleQuestionClick(question, pageOfQuestion)}
              className={`relative flex h-11 min-h-11 w-11 min-w-11 snap-start items-center justify-center rounded-xl border text-sm font-semibold transition-[background-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 active:scale-[0.985] motion-reduce:transform-none motion-reduce:transition-none ${stateClass} ${activeClass}`}
            >
              {index + 1}
              {isAnswered && (
                <>
                  <span
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm"
                    aria-hidden="true"
                  >
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                  <span id={answeredDescriptionId} className="sr-only">Đã trả lời</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {!isMobile && (
        <div className="mt-5 space-y-2 pt-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-emerald-700" />
            <span>Đã trả lời</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-slate-100" />
            <span>Chưa trả lời</span>
          </div>
        </div>
      )}
    </nav>
  );
};

export default QuizNavigation;
