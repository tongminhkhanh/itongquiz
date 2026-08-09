import React from 'react';
import { Send } from 'lucide-react';

interface QuizSubmitButtonProps {
  onSubmit: () => void;
  isSubmitting: boolean;
  className?: string;
}

const QuizSubmitButton: React.FC<QuizSubmitButtonProps> = ({
  onSubmit,
  isSubmitting,
  className = '',
}) => (
  <button
    type="button"
    onClick={onSubmit}
    disabled={isSubmitting}
    className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 text-base font-semibold text-white shadow-sm transition-[background-color,box-shadow,transform] hover:bg-sky-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 disabled:shadow-none disabled:hover:bg-slate-300 motion-reduce:transform-none motion-reduce:transition-none ${className}`}
  >
    <Send className="h-4 w-4" aria-hidden="true" />
    {isSubmitting ? 'Đang nộp bài...' : 'Nộp bài'}
  </button>
);

export default QuizSubmitButton;
