import React from 'react';
import { Pin } from 'lucide-react';
import { Question } from '../../../types';
import type { QuizPageChangeHandler } from '../hooks/useQuizPageNavigation';

interface QuizNavigationProps {
    questions: Question[];
    isQuestionAnswered: (q: Question) => boolean;
    activeQuestionId: string | null;
    QUESTIONS_PER_PAGE: number;
    onPageChange: QuizPageChangeHandler;
}

const QuizNavigation: React.FC<QuizNavigationProps> = ({
    questions,
    isQuestionAnswered,
    activeQuestionId,
    QUESTIONS_PER_PAGE,
    onPageChange,
}) => {
    const handleQuestionClick = (q: Question, page: number) => {
        onPageChange(page, q.id);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm h-fit sticky top-24">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <Pin aria-hidden="true" className="size-4 text-blue-600" />
                Danh sách câu hỏi
            </h3>

            <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                    const isAnswered = isQuestionAnswered(q);
                    const pageOfQuestion = Math.floor(idx / QUESTIONS_PER_PAGE) + 1;
                    const isActive = q.id === activeQuestionId;

                    return (
                        <button
                            key={q.id}
                            type="button"
                            aria-label={`Đi đến câu ${idx + 1}`}
                            aria-current={isActive ? 'step' : undefined}
                            onClick={() => handleQuestionClick(q, pageOfQuestion)}
                            className={`
                                w-full aspect-square flex items-center justify-center rounded-lg text-sm font-bold transition-all
                                ${isAnswered
                                    ? 'bg-green-500 text-white shadow-md shadow-green-200 hover:bg-green-600'
                                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 border border-gray-100'}
                                ${isActive ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
                            `}
                        >
                            {idx + 1}
                        </button>
                    );
                })}
            </div>

            <div className="mt-6 space-y-2 border-t border-gray-50 pt-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-3 h-3 bg-green-500 rounded-sm" />
                    <span>Đã trả lời</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded-sm" />
                    <span>Chưa trả lời</span>
                </div>
            </div>
        </div>
    );
};

export default QuizNavigation;
