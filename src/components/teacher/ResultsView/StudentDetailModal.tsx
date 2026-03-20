/**
 * Student Detail Modal Component
 * 
 * Shows detailed answers for a specific student result
 * 📸 Supports question snapshots for viewing results even when quiz is deleted
 */

import React, { useRef, useMemo, useState } from 'react';
import { StudentResult, Question, QuestionSnapshot, QuestionType, Quiz } from '../../../types';
import { Clock, CheckCircle, XCircle, AlertCircle, Filter, User, Award } from 'lucide-react';
import { QuestionReview } from '../../common';
import { checkAnswer, AnswerStatus } from '../../../utils/question/scoring.util';

interface StudentDetailModalProps {
    result: StudentResult;
    questions: Question[];
    onClose: () => void;
}

// Helper to normalize answer detail (support both old and new format)
interface NormalizedAnswer {
    selectedAnswer: any;
    isCorrect: boolean;
    timeSpent?: number;
    snapshot?: QuestionSnapshot;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
    result,
    questions,
    onClose,
}) => {
    // Map questions by ID for fallback lookup
    const questionsMap = useMemo(() => {
        const map: Record<string, Question> = {};
        questions.forEach(q => { map[q.id] = q; });
        return map;
    }, [questions]);

    // Build displayable questions list
    // Priority: answers with snapshots > answers with quiz fallback > questions prop only
    const displayQuestions = useMemo(() => {
        const answersEntries = Object.entries(result.answers || {});

        // If we have answers, use them
        if (answersEntries.length > 0) {
            const qEntries = Object.entries(result.answers || {}).filter(([key]) => !key.startsWith('_'));
            return qEntries.map(([questionId, answerData], index) => {
                // Normalize answer data
                let normalized: NormalizedAnswer;

                if (answerData && typeof answerData === 'object' && ('selectedAnswer' in answerData || 'questionSnapshot' in answerData)) {
                    // New format with snapshot
                    normalized = {
                        selectedAnswer: answerData.selectedAnswer,
                        isCorrect: answerData.isCorrect ?? false,
                        timeSpent: answerData.timeSpent,
                        snapshot: answerData.questionSnapshot
                    };
                } else {
                    // Old format - just the answer value
                    const validation = result.validationDetails?.find(v => v.questionId === questionId);
                    normalized = {
                        selectedAnswer: answerData,
                        isCorrect: validation?.isCorrect ?? false,
                        snapshot: undefined
                    };
                }

                // Get question data: prefer snapshot, fallback to questionsMap
                const fromQuiz = questionsMap[questionId];
                const snapshot = normalized.snapshot;

                // FINAL STANDARDIZED OBJECT (Smart Merge)
                // This ensures all metadata (items, pairs, blanks, etc.) is preserved
                const standardizedQuestion = {
                    ...(fromQuiz || {}),
                    ...(snapshot || {}),
                    ...normalized,
                    id: questionId,
                    index,
                    // Map legacy/mismatched fields to standard ones for QuestionReview
                    type: snapshot?.type || fromQuiz?.type || (normalized as any).questionType,
                    question: snapshot?.question || snapshot?.mainQuestion || (fromQuiz as any)?.question || (fromQuiz as any)?.mainQuestion || '',
                };

                // Final correctness check using Scoring Util as second source of truth
                let finalIsCorrect = normalized.isCorrect;
                // If we have question data, re-verify using Scoring Util
                if (standardizedQuestion.type) {
                    const { status } = checkAnswer(standardizedQuestion as any, normalized.selectedAnswer);
                    finalIsCorrect = status === 'correct';
                }

                return {
                    ...standardizedQuestion,
                    isCorrect: finalIsCorrect
                };
            });
        }

        // Fallback: No answers stored, but we have quiz questions
        if (questions.length > 0) {
            return questions.map((q, index) => ({
                ...q, // Spread full question object to keep all metadata (items, pairs, etc.)
                index,
                selectedAnswer: undefined,
                isCorrect: undefined,
                timeSpent: undefined,
            }));
        }

        return [];
    }, [result, questionsMap, questions]);

    // Check if we have any data to display (question text or options/items)
    const hasAnyData = displayQuestions.some(q => q.question || q.mainQuestion || q.text || q.options || q.items);

    // Filter state: 'all' | 'correct' | 'wrong'
    const [filterMode, setFilterMode] = useState<'all' | 'correct' | 'wrong'>('all');

    // Filtered questions based on filter mode
    const filteredQuestions = useMemo(() => {
        if (filterMode === 'all') return displayQuestions;
        if (filterMode === 'correct') return displayQuestions.filter(q => q.isCorrect === true);
        return displayQuestions.filter(q => q.isCorrect === false);
    }, [displayQuestions, filterMode]);

    // Stats for filter badges
    const correctCount = displayQuestions.filter(q => q.isCorrect === true).length;
    const wrongCount = displayQuestions.filter(q => q.isCorrect === false).length;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header - Blue Theme */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* Score Badge */}
                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex flex-col items-center justify-center border-2 border-white/40">
                                <span className="text-2xl font-bold leading-none">{result.score}</span>
                                <span className="text-[10px] text-blue-100 leading-none">/10</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{result.studentName}</h2>
                                <p className="text-blue-200 text-sm">
                                    {result.studentClass} • {result.quizTitle || 'Bài kiểm tra'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <XCircle className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-6 mt-4 text-sm">
                        <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                            <CheckCircle className="w-4 h-4 text-green-300" />
                            <span>{result.correctCount}/{result.totalQuestions} câu đúng</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                            <Clock className="w-4 h-4 text-blue-200" />
                            <span>{result.timeTaken} phút</span>
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex items-center gap-2 px-6 py-3 border-b bg-gray-50">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <button
                        onClick={() => setFilterMode('all')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterMode === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                    >
                        Tất cả ({displayQuestions.length})
                    </button>
                    <button
                        onClick={() => setFilterMode('correct')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterMode === 'correct'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                    >
                        ✅ Đúng ({correctCount})
                    </button>
                    <button
                        onClick={() => setFilterMode('wrong')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterMode === 'wrong'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                    >
                        ❌ Sai ({wrongCount})
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Warning if quiz was deleted and no snapshots */}
                    {!hasAnyData && (
                        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-4">
                            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                            <div>
                                <p className="font-medium text-yellow-800">Không thể hiển thị chi tiết</p>
                                <p className="text-sm text-yellow-700">
                                    Đề thi đã bị xóa và kết quả này được lưu trước khi có tính năng lưu snapshot câu hỏi.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Empty filter state */}
                    {filteredQuestions.length === 0 && displayQuestions.length > 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <p className="text-lg">Không có câu hỏi nào phù hợp bộ lọc</p>
                            <button
                                onClick={() => setFilterMode('all')}
                                className="mt-2 text-blue-600 hover:underline text-sm"
                            >
                                Xem tất cả
                            </button>
                        </div>
                    )}

                    <div className="space-y-4">
                        {filteredQuestions.map((item) => {
                            const { id, index, selectedAnswer, isCorrect, timeSpent } = item;

                            return (
                                <div key={id} className="space-y-2">
                                    <QuestionReview
                                        index={index}
                                        question={item}
                                        studentAnswer={selectedAnswer}
                                        status={isCorrect === true ? 'correct' : isCorrect === false ? 'wrong' : 'skipped'}
                                        showExplanation={true}
                                    />
                                    {timeSpent && (
                                        <div className="flex justify-end px-2">
                                            <span className="text-xs text-gray-400">⏱ {timeSpent}s</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t p-4 bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentDetailModal;
