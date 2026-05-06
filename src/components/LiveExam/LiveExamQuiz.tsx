/**
 * Live Exam Quiz Component
 * 
 * Student takes the exam with real-time timer and activity tracking.
 * Simplified version that works with actual API.
 */

import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useLiveExamTimer, useLiveExamActivity } from '../../hooks';
import { submitAnswers } from '../../services/liveExamService';
import type { StudentAnswers } from '../../types/liveExam.types';

interface QuizQuestion {
    id: string;
    text: string;
    imageUrl?: string;
    answers: Array<{ id: string; text: string }>;
}

interface LiveExamQuizProps {
    sessionId: string;
    questions: QuizQuestion[];
    duration: number;
    endsAt: string;
    onComplete: () => void;
}

export const LiveExamQuiz: React.FC<LiveExamQuizProps> = ({
    sessionId,
    questions,
    duration,
    endsAt,
    onComplete,
}) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const { timeRemaining, isExpired } = useLiveExamTimer({
        endsAt,
    });

    // Track activity
    const { updateActivity } = useLiveExamActivity({
        sessionId,
    });

    const currentQuestion = questions[currentQuestionIndex];
    const totalQuestions = questions.length;
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

    // Auto-submit when time expires
    useEffect(() => {
        if (isExpired && !isSubmitting) {
            handleSubmit();
        }
    }, [isExpired, isSubmitting]);

    const handleAnswerSelect = (answerId: string) => {
        setAnswers({ ...answers, [currentQuestion.id]: answerId });
    };

    const handleNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError('');

        try {
            await submitAnswers(sessionId, answers as StudentAnswers);
            onComplete();
        } catch (err: any) {
            setError(err.message || 'Không thể nộp bài');
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!currentQuestion) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header with Timer */}
                <div className="bg-white rounded-2xl shadow-xl p-4 mb-4 sticky top-4 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-slate-600">
                                Câu {currentQuestionIndex + 1}/{totalQuestions}
                            </div>
                            <div className="h-2 w-48 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-600 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                        <div
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold ${
                                timeRemaining <= 60
                                    ? 'bg-red-100 text-red-600'
                                    : timeRemaining <= 300
                                    ? 'bg-yellow-100 text-yellow-600'
                                    : 'bg-green-100 text-green-600'
                            }`}
                        >
                            <Clock size={20} />
                            <span className="text-lg">{formatTime(timeRemaining)}</span>
                        </div>
                    </div>
                </div>

                {/* Question Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-4">
                    <div className="mb-6">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                                {currentQuestionIndex + 1}
                            </div>
                            <h2 className="text-xl font-semibold text-slate-800 flex-1">
                                {currentQuestion.text}
                            </h2>
                        </div>

                        {currentQuestion.imageUrl && (
                            <img
                                src={currentQuestion.imageUrl}
                                alt="Question"
                                className="max-w-full h-auto rounded-lg mb-4"
                            />
                        )}
                    </div>

                    {/* Answer Options */}
                    <div className="space-y-3">
                        {currentQuestion.answers.map((answer) => {
                            const isSelected = answers[currentQuestion.id] === answer.id;
                            return (
                                <button
                                    key={answer.id}
                                    onClick={() => handleAnswerSelect(answer.id)}
                                    disabled={isSubmitting}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                                        isSelected
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                                isSelected
                                                    ? 'border-blue-600 bg-blue-600'
                                                    : 'border-slate-300'
                                            }`}
                                        >
                                            {isSelected && <CheckCircle size={16} className="text-white" />}
                                        </div>
                                        <span className={`flex-1 ${isSelected ? 'font-semibold text-blue-900' : 'text-slate-700'}`}>
                                            {answer.text}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Navigation */}
                <div className="bg-white rounded-2xl shadow-xl p-4">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-4">
                        <button
                            onClick={handlePrevious}
                            disabled={currentQuestionIndex === 0 || isSubmitting}
                            className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ← Câu trước
                        </button>

                        <div className="text-center text-sm text-slate-600">
                            Đã trả lời: {Object.keys(answers).length}/{totalQuestions}
                        </div>

                        {currentQuestionIndex < totalQuestions - 1 ? (
                            <button
                                onClick={handleNext}
                                disabled={isSubmitting}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                            >
                                Câu sau →
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-slate-300 flex items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Đang nộp bài...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={20} />
                                        Nộp bài
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Question Navigator */}
                <div className="mt-4 bg-white rounded-2xl shadow-xl p-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Danh sách câu hỏi:</h3>
                    <div className="grid grid-cols-10 gap-2">
                        {questions.map((q, index) => {
                            const isAnswered = answers[q.id] !== undefined;
                            const isCurrent = index === currentQuestionIndex;
                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIndex(index)}
                                    disabled={isSubmitting}
                                    className={`aspect-square rounded-lg font-semibold text-sm transition-all ${
                                        isCurrent
                                            ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                                            : isAnswered
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    } disabled:opacity-50`}
                                >
                                    {index + 1}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
