/**
 * Student Detail Modal Component
 * 
 * Shows detailed answers for a specific student result
 */

import React from 'react';
import { StudentResult, Question } from '../../../types';
import { X, CheckCircle, XCircle, Clock, Award } from 'lucide-react';

interface StudentDetailModalProps {
    result: StudentResult;
    questions: Question[];
    onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
    result,
    questions,
    onClose,
}) => {
    // Map questions by ID for easy lookup
    const questionsMap = React.useMemo(() => {
        const map: Record<string, Question> = {};
        questions.forEach(q => { map[q.id] = q; });
        return map;
    }, [questions]);

    // Get answer details
    const getAnswerDetail = (questionId: string) => {
        if (!result.answers) return null;
        return result.answers[questionId];
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">{result.studentName}</h2>
                            <p className="text-orange-100">
                                {result.studentClass} • {result.quizTitle || 'Bài kiểm tra'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-yellow-300" />
                            <span className="text-2xl font-bold">{result.score}</span>
                            <span className="text-orange-200">/10 điểm</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-300" />
                            <span>{result.correctCount}/{result.totalQuestions} câu đúng</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-300" />
                            <span>{result.timeTaken} phút</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Chi tiết câu trả lời</h3>

                    <div className="space-y-4">
                        {questions.map((question, index) => {
                            const answer = getAnswerDetail(question.id);
                            const isCorrect = answer?.isCorrect;

                            return (
                                <div
                                    key={question.id}
                                    className={`p-4 rounded-xl border-2 ${isCorrect === true
                                            ? 'border-green-200 bg-green-50'
                                            : isCorrect === false
                                                ? 'border-red-200 bg-red-50'
                                                : 'border-gray-200 bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isCorrect === true
                                                ? 'bg-green-500 text-white'
                                                : isCorrect === false
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-gray-400 text-white'
                                            }`}>
                                            {index + 1}
                                        </div>

                                        <div className="flex-1">
                                            <p className="font-medium text-gray-800 mb-2">
                                                {question.question}
                                            </p>

                                            {/* Options */}
                                            {question.options && (
                                                <div className="space-y-1 mb-2">
                                                    {question.options.map((opt, optIdx) => {
                                                        const optionLetter = String.fromCharCode(65 + optIdx);
                                                        const isSelected = answer?.selectedAnswer === optionLetter;
                                                        const isCorrectOption = question.correctAnswer === optionLetter;

                                                        return (
                                                            <div
                                                                key={optIdx}
                                                                className={`flex items-center gap-2 p-2 rounded-lg text-sm ${isCorrectOption
                                                                        ? 'bg-green-100 text-green-800 font-medium'
                                                                        : isSelected
                                                                            ? 'bg-red-100 text-red-800'
                                                                            : 'text-gray-600'
                                                                    }`}
                                                            >
                                                                <span className="font-bold">{optionLetter}.</span>
                                                                <span>{opt}</span>
                                                                {isCorrectOption && (
                                                                    <CheckCircle className="w-4 h-4 ml-auto text-green-600" />
                                                                )}
                                                                {isSelected && !isCorrectOption && (
                                                                    <XCircle className="w-4 h-4 ml-auto text-red-600" />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Answer info */}
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                                                    {isCorrect ? '✓ Đúng' : '✗ Sai'}
                                                </span>
                                                {answer?.timeSpent && (
                                                    <span className="text-gray-500">
                                                        ⏱ {answer.timeSpent}s
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t p-4 bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentDetailModal;
