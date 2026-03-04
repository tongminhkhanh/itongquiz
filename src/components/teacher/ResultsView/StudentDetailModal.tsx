/**
 * Student Detail Modal Component
 * 
 * Shows detailed answers for a specific student result
 * 📸 Supports question snapshots for viewing results even when quiz is deleted
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { StudentResult, Question, QuestionSnapshot, QuestionType } from '../../../types';
import { X, CheckCircle, XCircle, Clock, Award, AlertTriangle } from 'lucide-react';
import { renderMathJax } from '../../../hooks/useMathJax';

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

        // Helper function to calculate isCorrect from answer + correctAnswer
        const calculateIsCorrect = (
            selectedAnswer: any,
            correctAnswer: any,
            questionType?: string,
            items?: any[],
            blanks?: any[],
            pairs?: any[]
        ): boolean | undefined => {
            if (selectedAnswer === undefined || selectedAnswer === null) return undefined;

            // MCQ: Simple letter comparison
            if (questionType === 'MCQ' || questionType === 'IMAGE_QUESTION') {
                if (correctAnswer === undefined || correctAnswer === null) return undefined;
                const studentVal = String(selectedAnswer).trim().toUpperCase();
                let correctVal = String(correctAnswer).trim().toUpperCase();
                // Handle full-text format like "B. Answer text" -> "B"
                const letterMatch = correctVal.match(/^([A-Z])[.)\s]/);
                if (letterMatch) correctVal = letterMatch[1];
                return studentVal === correctVal;
            }

            // SHORT_ANSWER: Case-insensitive comparison
            if (questionType === 'SHORT_ANSWER') {
                if (correctAnswer === undefined || correctAnswer === null) return undefined;
                return String(selectedAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
            }

            // MULTIPLE_SELECT: Array comparison
            if (questionType === 'MULTIPLE_SELECT') {
                if (correctAnswer === undefined || correctAnswer === null) return undefined;
                try {
                    const correctArr = Array.isArray(correctAnswer) ? correctAnswer : JSON.parse(correctAnswer);
                    const studentArr = Array.isArray(selectedAnswer) ? selectedAnswer : [];
                    return correctArr.length === studentArr.length &&
                        correctArr.every((c: string) => studentArr.includes(c));
                } catch { return undefined; }
            }

            // TRUE_FALSE: Check all items
            if (questionType === 'TRUE_FALSE' && items && Array.isArray(items)) {
                const studentItems = selectedAnswer || {};
                return items.every((item: any, i: number) => {
                    const itemKey = item.id || `item-${i}`;
                    return studentItems[itemKey] === item.isCorrect;
                });
            }

            // MATCHING: Compare pairs (student answer format: {left: right, ...})
            // Example: {"$35$":"$40$", "$26$":"$30$"}
            // pairs format: [{left: "$35$", right: "$40$"}, ...]
            if (questionType === 'MATCHING' && pairs && Array.isArray(pairs)) {
                const studentPairs = selectedAnswer || {};
                // Remove 'selectedLeft' helper key if present
                const cleanedStudentPairs = { ...studentPairs };
                delete cleanedStudentPairs.selectedLeft;

                // Check if all pairs match
                if (Object.keys(cleanedStudentPairs).length !== pairs.length) return false;

                return pairs.every((pair: any) => {
                    return cleanedStudentPairs[pair.left] === pair.right;
                });
            }

            // DRAG_DROP: Compare filled blanks with correct blanks array
            // Student format: {"1":"word1", "3":"word2", ...} (key = position index)
            // blanks format: ["word1", "word2", ...] (array of correct words)
            if (questionType === 'DRAG_DROP' && blanks && Array.isArray(blanks)) {
                const studentBlanks = selectedAnswer || {};
                const studentValues = Object.values(studentBlanks);

                // Check if number of filled blanks matches
                if (studentValues.length !== blanks.length) return false;

                // For DRAG_DROP, we need to check if filled words match the blanks array
                // The order matters based on position keys
                const sortedKeys = Object.keys(studentBlanks).sort((a, b) => Number(a) - Number(b));
                return sortedKeys.every((key, idx) => {
                    const studentWord = String(studentBlanks[key]).trim().toLowerCase();
                    const correctWord = String(blanks[idx]).trim().toLowerCase();
                    return studentWord === correctWord;
                });
            }

            // DROPDOWN: Compare selected values with correct answers in blanks
            // Student format: {"blank-1":"value1", "blank-2":"value2"}
            // blanks format: [{id: "blank-1", correctAnswer: "value1"}, ...]
            if (questionType === 'DROPDOWN' && blanks && Array.isArray(blanks)) {
                const studentDropdowns = selectedAnswer || {};

                // Check if all dropdowns are answered correctly
                return blanks.every((blank: any) => {
                    const studentVal = String(studentDropdowns[blank.id] || '').trim();
                    const correctVal = String(blank.correctAnswer || '').trim();
                    return studentVal === correctVal;
                });
            }

            // UNDERLINE: Compare selected word indexes with correctWordIndexes
            // Student format: [0, 2, 5] (array of selected word indexes)
            // correctWordIndexes format: [0, 2, 5] (array of correct indexes)
            if (questionType === 'UNDERLINE') {
                // correctAnswer may be a JSON string "[3,4,5]" or an actual array
                let correctIndexes: number[] = [];
                if (Array.isArray(correctAnswer)) {
                    correctIndexes = correctAnswer;
                } else if (typeof correctAnswer === 'string') {
                    try { correctIndexes = JSON.parse(correctAnswer); } catch { /* ignore */ }
                }
                const studentIndexes = Array.isArray(selectedAnswer) ? selectedAnswer : [];
                const sortedCorrect = correctIndexes.slice().sort((a: number, b: number) => a - b);
                const sortedStudent = studentIndexes.slice().sort((a: number, b: number) => a - b);
                return sortedCorrect.length === sortedStudent.length &&
                    sortedCorrect.every((idx: number, i: number) => idx === sortedStudent[i]);
            }

            // ORDERING: Compare student order with correctOrder
            if (questionType === 'ORDERING') {
                let oCorrect = correctAnswer;
                if (!Array.isArray(oCorrect)) {
                    try { oCorrect = JSON.parse(oCorrect); } catch { oCorrect = []; }
                }
                if (!Array.isArray(oCorrect) || oCorrect.length === 0) {
                    const itemCount = items?.length || 0;
                    oCorrect = Array.from({ length: itemCount }, (_: any, i: number) => i);
                }
                if (Array.isArray(selectedAnswer)) {
                    return selectedAnswer.length === oCorrect.length &&
                        selectedAnswer.every((val: number, idx: number) => Number(val) === Number(oCorrect[idx]));
                } else if (typeof selectedAnswer === 'object' && selectedAnswer !== null) {
                    for (let i = 0; i < oCorrect.length; i++) {
                        if (Number(selectedAnswer[oCorrect[i]]) !== i + 1) return false;
                    }
                    return oCorrect.length > 0;
                }
                return false;
            }

            // ERROR_CORRECTION: Compare wrongWord and correctWord
            if (questionType === 'ERROR_CORRECTION') {
                if (typeof selectedAnswer === 'object' && selectedAnswer !== null) {
                    const sWrong = String(selectedAnswer.wrongWord || '').trim().toLowerCase();
                    const sCorrect = String(selectedAnswer.correctWord || '').trim().toLowerCase();
                    const eCorrect = String(correctAnswer || '').trim().toLowerCase();
                    // wrongWord might not be in correctAnswer, check if both match
                    return sCorrect !== '' && sCorrect === eCorrect && sWrong !== '';
                }
                return false;
            }

            // For unknown types, return undefined
            return undefined;
        };


        // If we have answers, use them
        if (answersEntries.length > 0) {
            return answersEntries.map(([questionId, answerData], index) => {
                // Normalize answer data
                let normalized: NormalizedAnswer;

                if (answerData && typeof answerData === 'object' && 'selectedAnswer' in answerData) {
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

                const questionText = snapshot?.question || snapshot?.mainQuestion ||
                    (fromQuiz as any)?.question || (fromQuiz as any)?.mainQuestion || '';
                const options = snapshot?.options || (fromQuiz as any)?.options;
                const correctAnswer = snapshot?.correctAnswer || (fromQuiz as any)?.correctAnswer ||
                    (snapshot as any)?.correctAnswers || (fromQuiz as any)?.correctAnswers;
                const questionType = snapshot?.type || fromQuiz?.type;
                // Additional fields for special question types
                const items = snapshot?.items || (fromQuiz as any)?.items;
                const text = snapshot?.text || (fromQuiz as any)?.text;
                const blanks = snapshot?.blanks || (fromQuiz as any)?.blanks;
                const pairs = snapshot?.pairs || (fromQuiz as any)?.pairs;
                // UNDERLINE specific fields
                const words = snapshot?.words || (fromQuiz as any)?.words;
                const correctWordIndexes = snapshot?.correctWordIndexes || (fromQuiz as any)?.correctWordIndexes;
                // WORD_SCRAMBLE specific fields
                const letters = snapshot?.letters || (fromQuiz as any)?.letters;
                const correctWord = snapshot?.correctWord || (fromQuiz as any)?.correctWord;
                // RIDDLE specific fields
                const riddleLines = snapshot?.riddleLines || (fromQuiz as any)?.riddleLines;
                const answerLabel = snapshot?.answerLabel || (fromQuiz as any)?.answerLabel;
                // ORDERING specific fields
                const correctOrder = snapshot?.correctOrder || (fromQuiz as any)?.correctOrder;
                // CATEGORIZATION specific fields
                const categories = snapshot?.categories || (fromQuiz as any)?.categories;

                // 🔧 FALLBACK: If isCorrect is false but we have data to recalculate
                let finalIsCorrect = normalized.isCorrect;
                if (finalIsCorrect === false) {
                    // Trigger fallback for types that have reference data
                    const canRecalculate = correctAnswer !== undefined ||
                        (questionType === 'MATCHING' && pairs) ||
                        (questionType === 'DRAG_DROP' && blanks) ||
                        (questionType === 'DROPDOWN' && blanks) ||
                        (questionType === 'TRUE_FALSE' && items) ||
                        (questionType === 'UNDERLINE' && correctWordIndexes) ||
                        (questionType === 'ORDERING');

                    if (canRecalculate) {
                        const calculated = calculateIsCorrect(
                            normalized.selectedAnswer,
                            correctAnswer,
                            questionType,
                            items,
                            blanks,
                            pairs
                        );
                        if (calculated !== undefined) {
                            finalIsCorrect = calculated;
                        }
                    }
                }

                return {
                    id: questionId,
                    index,
                    questionText,
                    options,
                    correctAnswer,
                    questionType,
                    selectedAnswer: normalized.selectedAnswer,
                    isCorrect: finalIsCorrect,
                    timeSpent: normalized.timeSpent,
                    hasSnapshot: !!snapshot,
                    hasQuizData: !!fromQuiz,
                    // Extra fields for special types
                    items,
                    text,
                    blanks,
                    pairs,
                    words,
                    correctWordIndexes,
                    letters,
                    correctWord,
                    riddleLines,
                    answerLabel,
                    correctOrder,
                    categories
                };
            });
        }

        // Fallback: No answers stored, but we have quiz questions
        // This happens for OLD results where answers weren't saved
        if (questions.length > 0) {
            return questions.map((q, index) => ({
                id: q.id,
                index,
                questionText: (q as any).question || (q as any).mainQuestion || '',
                options: (q as any).options,
                correctAnswer: (q as any).correctAnswer,
                questionType: q.type,
                selectedAnswer: undefined, // Unknown for old results
                isCorrect: undefined,      // Unknown for old results  
                timeSpent: undefined,
                hasSnapshot: false,
                hasQuizData: true,
                items: (q as any).items,
                text: (q as any).text,
                blanks: (q as any).blanks,
                pairs: (q as any).pairs,
                words: (q as any).words,
                correctWordIndexes: (q as any).correctWordIndexes,
                letters: (q as any).letters,
                correctWord: (q as any).correctWord,
                riddleLines: (q as any).riddleLines,
                answerLabel: (q as any).answerLabel,
                correctOrder: (q as any).correctOrder,
                categories: (q as any).categories,
            }));
        }

        return [];
    }, [result, questionsMap, questions]);

    // Check if we have any data to display
    const hasAnyData = displayQuestions.some(q => q.questionText || q.options);

    // Render MathJax after content updates
    const modalRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (modalRef.current) {
            renderMathJax(modalRef.current);
        }
    }, [result, displayQuestions]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
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

                    {/* Warning if quiz was deleted and no snapshots */}
                    {!hasAnyData && (
                        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-4">
                            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                            <div>
                                <p className="font-medium text-yellow-800">Không thể hiển thị chi tiết</p>
                                <p className="text-sm text-yellow-700">
                                    Đề thi đã bị xóa và kết quả này được lưu trước khi có tính năng lưu snapshot câu hỏi.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {displayQuestions.map((item) => {
                            const { id, index, questionText, options, correctAnswer, selectedAnswer, isCorrect, timeSpent, questionType, items, text, blanks, pairs, words, correctWordIndexes, letters, correctWord, riddleLines, answerLabel, correctOrder, categories } = item;

                            return (
                                <div
                                    key={id}
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
                                            {questionText ? (
                                                <p
                                                    className="font-medium text-gray-800 mb-2"
                                                    style={{ whiteSpace: 'pre-line' }}
                                                    dangerouslySetInnerHTML={{ __html: questionText }}
                                                />
                                            ) : (
                                                <p className="font-medium text-gray-400 italic mb-2">
                                                    (Nội dung câu hỏi không khả dụng)
                                                </p>
                                            )}

                                            {/* Options */}
                                            {options && options.length > 0 && (
                                                <div className="space-y-1 mb-2">
                                                    {options.map((opt: string, optIdx: number) => {
                                                        const optionLetter = String.fromCharCode(65 + optIdx);
                                                        // Handle multiple answer formats:
                                                        // - Letter: 'A', 'B', 'C'
                                                        // - Index: 0, 1, 2 or '0', '1', '2'
                                                        // - Full text: 'Option A text'
                                                        const isSelected =
                                                            selectedAnswer === optionLetter ||
                                                            selectedAnswer === optIdx ||
                                                            selectedAnswer === String(optIdx) ||
                                                            selectedAnswer === opt ||
                                                            (typeof selectedAnswer === 'string' && opt && opt.includes(selectedAnswer));
                                                        const isCorrectOption =
                                                            correctAnswer === optionLetter ||
                                                            correctAnswer === optIdx ||
                                                            correctAnswer === String(optIdx) ||
                                                            correctAnswer === opt;

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
                                                                <span dangerouslySetInnerHTML={{ __html: opt }} />
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

                                            {/* TRUE_FALSE items render */}
                                            {questionType === 'TRUE_FALSE' && items && items.length > 0 && (
                                                <div className="space-y-1 mb-2">
                                                    {items.map((itm: any, itmIdx: number) => {
                                                        const studentAnswer = typeof selectedAnswer === 'object' ? selectedAnswer?.[itm.id ?? `item-${itmIdx}`] : undefined;
                                                        const correctVal = itm.isCorrect;
                                                        const isItemCorrect = studentAnswer === correctVal;
                                                        return (
                                                            <div key={itmIdx} className={`p-2 rounded-lg text-sm ${isItemCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                                                                <span dangerouslySetInnerHTML={{ __html: itm.statement || itm.text || '' }} />
                                                                <span className="ml-2 font-medium">
                                                                    - HS: {studentAnswer === true ? 'Đúng' : studentAnswer === false ? 'Sai' : '(chưa trả lời)'}
                                                                    {!isItemCorrect && <span className="text-green-700 ml-2">(Đáp án: {correctVal ? 'Đúng' : 'Sai'})</span>}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* DRAG_DROP / DROPDOWN / FILL_IN_BLANK render */}
                                            {(questionType === 'DRAG_DROP' || questionType === 'DROPDOWN') && (
                                                <div className="space-y-1 mb-2 text-sm">
                                                    {typeof selectedAnswer === 'object' && selectedAnswer && Object.keys(selectedAnswer).length > 0 ? (
                                                        <div className="p-2 rounded-lg bg-yellow-50 border border-yellow-200">
                                                            <p className="font-medium text-yellow-800 mb-1">Câu trả lời của học sinh:</p>
                                                            {Object.entries(selectedAnswer).map(([key, value]) => (
                                                                <div key={key} className="text-gray-700">
                                                                    <span className="font-medium">Ô {key}:</span> {String(value)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : typeof selectedAnswer === 'string' ? (
                                                        <div className="p-2 rounded-lg bg-yellow-50 border border-yellow-200">
                                                            <p className="font-medium text-yellow-800">Câu trả lời: {selectedAnswer}</p>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            )}

                                            {/* MATCHING pairs render */}
                                            {questionType === 'MATCHING' && (
                                                <div className="space-y-1 mb-2 text-sm">
                                                    {(pairs || []).length > 0 ? (
                                                        <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                                                            <p className="font-medium text-blue-800 mb-1">Chi tiết ghép nối:</p>
                                                            {pairs.map((pair: any) => {
                                                                const studentRight = (selectedAnswer || {})[pair.left];
                                                                const isPairCorrect = studentRight === pair.right;

                                                                return (
                                                                    <div key={pair.left} className={`mb-2 p-2 rounded border bg-white ${isPairCorrect ? 'border-green-200' : 'border-red-200'}`}>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="font-medium text-gray-700">{String(pair.left).replace(/^\$|\$$/g, '')}</span>
                                                                            <span className="text-gray-400">→</span>
                                                                            <span className={`font-bold ${isPairCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                                                                {studentRight ? String(studentRight).replace(/^\$|\$$/g, '') : '(Chưa nối)'}
                                                                            </span>
                                                                            {studentRight && (
                                                                                <span className="ml-1">
                                                                                    {isPairCorrect ? <CheckCircle className="w-3 h-3 text-green-600 inline" /> : <XCircle className="w-3 h-3 text-red-600 inline" />}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {!isPairCorrect && (
                                                                            <div className="text-xs text-green-700 bg-green-50 p-1 rounded">
                                                                                <span className="font-medium">Đáp án đúng:</span> {String(pair.right).replace(/^\$|\$$/g, '')}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : typeof selectedAnswer === 'object' && selectedAnswer && Object.keys(selectedAnswer).length > 0 ? (
                                                        // Fallback for old data without pairs snapshot
                                                        <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                                                            <p className="font-medium text-blue-800 mb-1">Cặp ghép của học sinh (Dữ liệu cũ):</p>
                                                            {Object.entries(selectedAnswer).map(([left, right]) => (
                                                                <div key={left} className="text-gray-700">
                                                                    <span>{String(left).replace(/^\$|\$$/g, '')}</span>
                                                                    <span className="mx-2">→</span>
                                                                    <span>{String(right).replace(/^\$|\$$/g, '')}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-200 italic text-gray-500">
                                                            Chưa có thông tin ghép nối.
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* UNDERLINE words render */}
                                            {questionType === 'UNDERLINE' && item.words && item.words.length > 0 && (() => {
                                                const words: string[] = item.words || [];
                                                // Fallback: old snapshots don't have correctWordIndexes
                                                let correctIdxs: number[] = item.correctWordIndexes || [];
                                                if (correctIdxs.length === 0 && correctAnswer) {
                                                    try {
                                                        const parsed = typeof correctAnswer === 'string'
                                                            ? JSON.parse(correctAnswer)
                                                            : correctAnswer;
                                                        if (Array.isArray(parsed)) correctIdxs = parsed;
                                                    } catch { /* ignore */ }
                                                }
                                                const studentIdxs: number[] = Array.isArray(selectedAnswer) ? selectedAnswer : [];

                                                return (
                                                    <div className="space-y-2 mb-2">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {words.map((word: string, wIdx: number) => {
                                                                const isCorrectWord = correctIdxs.includes(wIdx);
                                                                const isStudentSelected = studentIdxs.includes(wIdx);

                                                                let cls = 'px-2 py-0.5 rounded text-xs font-medium ';
                                                                let suffix = '';

                                                                if (isStudentSelected && isCorrectWord) {
                                                                    cls += 'bg-green-100 text-green-700 underline border border-green-300';
                                                                    suffix = ' ✓';
                                                                } else if (isStudentSelected && !isCorrectWord) {
                                                                    cls += 'bg-red-100 text-red-700 line-through border border-red-300';
                                                                    suffix = ' ✗';
                                                                } else if (!isStudentSelected && isCorrectWord) {
                                                                    cls += 'bg-amber-50 text-amber-700 underline decoration-dashed border border-amber-300';
                                                                    suffix = ' ⚠';
                                                                } else {
                                                                    cls += 'bg-gray-50 text-gray-400 border border-gray-200';
                                                                }

                                                                return <span key={wIdx} className={cls}>{word}{suffix}</span>;
                                                            })}
                                                        </div>
                                                        {!isCorrect && (
                                                            <div className="text-xs space-y-1">
                                                                <p className="text-red-600">
                                                                    HS gạch: {studentIdxs.length > 0 ? studentIdxs.map(i => words[i] || '').filter(Boolean).join(', ') : '(không chọn)'}
                                                                </p>
                                                                <p className="text-green-600">
                                                                    Đáp án: {correctIdxs.map(i => words[i] || '').filter(Boolean).join(', ')}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* ORDERING render */}
                                            {questionType === 'ORDERING' && items && items.length > 0 && (() => {
                                                const studentOrderInput = selectedAnswer;
                                                const correctOrd: number[] = correctOrder || [];

                                                // Normalize studentOrder (array or {index: position})
                                                let studentOrder: any[] = [];
                                                if (Array.isArray(studentOrderInput)) {
                                                    studentOrder = studentOrderInput;
                                                } else if (typeof studentOrderInput === 'object' && studentOrderInput !== null) {
                                                    const ordered = new Array(items.length).fill(null);
                                                    Object.entries(studentOrderInput).forEach(([idx, pos]: [string, any]) => {
                                                        const p = Number(pos);
                                                        if (!isNaN(p) && p > 0 && p <= items.length) {
                                                            ordered[p - 1] = items[Number(idx)];
                                                        }
                                                    });
                                                    studentOrder = ordered.filter(i => i !== null);
                                                }
                                                // Helper to extract text from item (string, {content} object, or char-index object)
                                                const getItemText = (item: any): string => {
                                                    if (typeof item === 'string') return item;
                                                    if (typeof item === 'object' && item !== null) {
                                                        if (item.content || item.text) return item.content || item.text;
                                                        const keys = Object.keys(item);
                                                        if (keys.length > 0 && keys.every((k: string) => /^\d+$/.test(k))) {
                                                            const maxIdx = Math.max(...keys.map(Number));
                                                            let r = '';
                                                            for (let i = 0; i <= maxIdx; i++) r += item[i] || '';
                                                            if (r.trim()) return r;
                                                        }
                                                    }
                                                    return String(item);
                                                };

                                                return (
                                                    <div className="space-y-1 mb-2 text-sm">
                                                        <p className="font-medium text-gray-600">Thứ tự HS sắp xếp:</p>
                                                        {studentOrder.map((item: any, idx: number) => {
                                                            let label: string;
                                                            if (typeof item === 'string') {
                                                                label = item;
                                                            } else if (typeof item === 'number') {
                                                                label = items[item] ? getItemText(items[item]) : `[${item}]`;
                                                            } else {
                                                                label = getItemText(item);
                                                            }
                                                            return (
                                                                <div key={idx} className="flex items-center gap-2 p-1.5 rounded bg-gray-100">
                                                                    <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                                                                    <span>{label}</span>
                                                                </div>
                                                            );
                                                        })}
                                                        {!isCorrect && correctOrd.length > 0 && (
                                                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                                                                <p className="text-green-700 font-medium">Thứ tự đúng:</p>
                                                                {correctOrd.map((itemIdx: number, i: number) => (
                                                                    <p key={i} className="text-green-600">{i + 1}. {items[itemIdx] ? getItemText(items[itemIdx]) : ''}</p>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* CATEGORIZATION render */}
                                            {questionType === 'CATEGORIZATION' && categories && categories.length > 0 && (() => {
                                                const studentAns = (typeof selectedAnswer === 'object' && !Array.isArray(selectedAnswer)) ? selectedAnswer : {};
                                                const catItems = items || [];

                                                return (
                                                    <div className="space-y-2 mb-2 text-sm">
                                                        {categories.map((cat: any) => (
                                                            <div key={cat.id} className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                                                                <p className="font-medium text-gray-700 mb-1">{cat.name}</p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {catItems.filter((ci: any) => studentAns[ci.id] === cat.id || ci.categoryId === cat.id).map((ci: any) => {
                                                                        const isItemCorrect = studentAns[ci.id] === ci.categoryId;
                                                                        return (
                                                                            <span key={ci.id} className={`px-2 py-0.5 rounded text-xs ${isItemCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                                {ci.content} {isItemCorrect ? '✓' : '✗'}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}

                                            {/* WORD_SCRAMBLE render */}
                                            {questionType === 'WORD_SCRAMBLE' && letters && letters.length > 0 && (() => {
                                                const studentIdxs: number[] = Array.isArray(selectedAnswer) ? selectedAnswer : [];
                                                const studentWord = studentIdxs.map((idx: number) => letters[idx] || '?').join('');

                                                return (
                                                    <div className="space-y-2 mb-2 text-sm">
                                                        <div className="p-2 bg-gray-100 rounded border border-gray-200">
                                                            <p className="text-gray-600 mb-1">Các chữ cái:</p>
                                                            <div className="flex gap-1">
                                                                {letters.map((l: string, i: number) => (
                                                                    <span key={i} className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded flex items-center justify-center font-bold text-xs">{l}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className={`p-2 rounded border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                                            <p className="text-gray-600 mb-1">HS ghép:</p>
                                                            <p className={`font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>{studentWord || '(Chưa ghép)'}</p>
                                                        </div>
                                                        {!isCorrect && correctWord && (
                                                            <div className="p-2 bg-green-50 border border-green-200 rounded">
                                                                <p className="text-gray-600 mb-1">Đáp án đúng:</p>
                                                                <p className="font-bold text-green-700">{correctWord}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* RIDDLE render */}
                                            {questionType === 'RIDDLE' && (() => {
                                                return (
                                                    <div className="space-y-2 mb-2 text-sm">
                                                        {riddleLines && riddleLines.length > 0 && (
                                                            <div className="p-2 bg-indigo-50 rounded border border-indigo-200">
                                                                {riddleLines.map((line: string, idx: number) => (
                                                                    <p key={idx} className="text-indigo-800 italic">{line}</p>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <div className={`p-2 rounded border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                                            <p className="text-gray-600 mb-1">{answerLabel || 'Đáp án'}:</p>
                                                            <p className={`font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                                                {selectedAnswer || '(Không trả lời)'}
                                                            </p>
                                                        </div>
                                                        {!isCorrect && correctAnswer && (
                                                            <div className="p-2 bg-green-50 border border-green-200 rounded">
                                                                <p className="text-gray-600 mb-1">Đáp án đúng:</p>
                                                                <p className="font-bold text-green-700">{correctAnswer}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* Answer info */}
                                            <div className="flex items-center gap-4 text-sm flex-wrap">
                                                {isCorrect !== undefined ? (
                                                    <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                                                        {isCorrect ? '✓ Đúng' : '✗ Sai'}
                                                    </span>
                                                ) : selectedAnswer === undefined ? (
                                                    <span className="text-gray-400 italic">
                                                        (Không có dữ liệu trả lời)
                                                    </span>
                                                ) : null}
                                                {/* Show student's answer explicitly */}
                                                {selectedAnswer !== undefined && !isCorrect && questionType !== 'TRUE_FALSE' && questionType !== 'MATCHING' && questionType !== 'UNDERLINE' && questionType !== 'ORDERING' && questionType !== 'CATEGORIZATION' && questionType !== 'WORD_SCRAMBLE' && questionType !== 'RIDDLE' && (
                                                    <span className="text-orange-600 font-medium">
                                                        📝 HS đã chọn: {typeof selectedAnswer === 'object' ? JSON.stringify(selectedAnswer) : String(selectedAnswer)}
                                                    </span>
                                                )}
                                                {timeSpent && (
                                                    <span className="text-gray-500">
                                                        ⏱ {timeSpent}s
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

