import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { Quiz, QuestionType, StudentResult, Question } from '../../../../types';
import { formatMathText } from '../../../../utils/formatters';
import { renderMathJax } from '../../../../hooks/useMathJax';
import QuestionFilter, { FilterType } from '../components/QuestionFilter';
import AnswerCard, { AnswerStatus } from '../components/AnswerCard';
import { ChevronLeft, ChevronRight, Check, X, HelpCircle, Lightbulb, Bot } from 'lucide-react';
import { MathSpan, ExplanationContent } from '../../../common';
import ExplanationModal from '../../../ExplanationModal';

interface Props {
    quiz: Quiz;
    result: StudentResult;
    answers: Record<string, any>;
}

const DetailedAnswersTab: React.FC<Props> = ({ quiz, result, answers }) => {
    // Helper: resolve correctWordIndexes from multiple sources
    // Priority: quiz object → quiz.correctAnswer → snapshot → validationDetails
    const resolveCorrectWordIndexes = (question: any): number[] => {
        // 1. Direct from quiz object (available when not stripped)
        if (question.correctWordIndexes?.length > 0) return question.correctWordIndexes;
        // 2. Parse from quiz.correctAnswer
        if (question.correctAnswer) {
            try {
                const parsed = typeof question.correctAnswer === 'string'
                    ? JSON.parse(question.correctAnswer) : question.correctAnswer;
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch { /* ignore */ }
        }
        // 3. From result.answers snapshot (saved during submission)
        const snapshot = result.answers?.[question.id]?.questionSnapshot;
        if (snapshot?.correctWordIndexes?.length > 0) return snapshot.correctWordIndexes;
        if (snapshot?.correctAnswer) {
            try {
                const parsed = typeof snapshot.correctAnswer === 'string'
                    ? JSON.parse(snapshot.correctAnswer) : snapshot.correctAnswer;
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch { /* ignore */ }
        }
        // 4. From server validationDetails
        const vd = result.validationDetails?.find(d => d.questionId === question.id);
        if (vd?.correctAnswer) {
            try {
                const parsed = typeof vd.correctAnswer === 'string'
                    ? JSON.parse(vd.correctAnswer) : vd.correctAnswer;
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch { /* ignore */ }
        }
        return [];
    };

    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

    // AI Tutor modal state
    const [aiTutorQuestion, setAiTutorQuestion] = useState<Question | null>(null);
    const [aiTutorUserAnswer, setAiTutorUserAnswer] = useState<string>('');
    const [aiTutorCorrectAnswer, setAiTutorCorrectAnswer] = useState<string>('');

    // Helper function to check if answer is correct
    // PRIORITY: Use server validationDetails if available, fallback to local calculation
    const getAnswerStatus = (question: any, answer: any): AnswerStatus => {
        // 1. Check server validation result first (single source of truth)
        if (result.validationDetails && result.validationDetails.length > 0) {
            const serverResult = result.validationDetails.find(d => d.questionId === question.id);
            if (serverResult) {
                if (!answer && answer !== false && answer !== 0) return 'skipped';
                // 🔧 Override: Server has bugs for ORDERING and UNDERLINE.
                // When server says wrong for these types, fall through to local comparison
                if (!serverResult.isCorrect && (
                    question.type === QuestionType.ORDERING ||
                    question.type === QuestionType.UNDERLINE ||
                    question.type === QuestionType.ERROR_CORRECTION
                )) {
                    // Fall through to local validation below
                } else {
                    return serverResult.isCorrect ? 'correct' : 'wrong';
                }
            }
        }

        // 2. Fallback to local calculation if no server data
        if (!answer && answer !== false && answer !== 0) return 'skipped';

        switch (question.type) {
            case QuestionType.MCQ:
                return answer === question.correctAnswer ? 'correct' : 'wrong';
            case QuestionType.SHORT_ANSWER:
                return String(answer).toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim() ? 'correct' : 'wrong';
            case QuestionType.TRUE_FALSE:
                const items = question.items || [];
                const allCorrect = items.every((item: any, idx: number) => {
                    const itemKey = item.id || `item-${idx}`;
                    return answer?.[itemKey] === item.isCorrect;
                });
                return allCorrect ? 'correct' : 'wrong';
            case QuestionType.MATCHING:
                const pairs = question.pairs || [];
                const matchingCorrect = pairs.every((p: any) => answer?.[p.left] === p.right);
                return matchingCorrect ? 'correct' : 'wrong';
            case QuestionType.MULTIPLE_SELECT:
                const studentAns = (answer as string[]) || [];
                const correctAns = question.correctAnswers || [];
                const msCorrect = studentAns.length === correctAns.length && studentAns.every((v: string) => correctAns.includes(v));
                return msCorrect ? 'correct' : 'wrong';
            case QuestionType.WORD_SCRAMBLE:
                const letters = question.letters || [];
                const studentWord = ((answer as number[]) || []).map((i: number) => letters[i]).join('');
                return studentWord.toLowerCase().replace(/\s+/g, '') === (question.correctWord || '').toLowerCase().replace(/\s+/g, '') ? 'correct' : 'wrong';
            case QuestionType.RIDDLE:
                return String(answer).toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim() ? 'correct' : 'wrong';
            case QuestionType.DRAG_DROP:
                const ddText = (question as any).text || "";
                const ddParts = ddText.split(/(\[.*?\])/g);
                let ddBlankIndex = 0;
                let isDDCorrect = true;
                ddParts.forEach((part: string, partIdx: number) => {
                    if (part.startsWith('[') && part.endsWith(']')) {
                        const correctWord = (question as any).blanks?.[ddBlankIndex];
                        const studentWord = answer?.[partIdx];
                        if (studentWord !== correctWord) isDDCorrect = false;
                        ddBlankIndex++;
                    }
                });
                return isDDCorrect ? 'correct' : 'wrong';
            case QuestionType.DROPDOWN:
                const dropdownBlanks = (question as any).blanks || [];
                const isDropdownCorrect = dropdownBlanks.every((b: any) => answer?.[b.id] === b.correctAnswer);
                return isDropdownCorrect ? 'correct' : 'wrong';
            case QuestionType.ORDERING:
                let oCorrect = (question as any).correctOrder || [];
                if (!Array.isArray(oCorrect) || oCorrect.length === 0) {
                    if ((question as any).correctAnswer) {
                        try { oCorrect = JSON.parse((question as any).correctAnswer); } catch { }
                    }
                }
                const oItems = (question as any).items || [];
                if (!Array.isArray(oCorrect) || oCorrect.length === 0) {
                    oCorrect = Array.from({ length: oItems.length }, (_: any, i: number) => i);
                }
                // Handle both formats: array [idx, idx] or object {itemIndex: position}
                if (Array.isArray(answer)) {
                    if (answer.length !== oCorrect.length) return 'wrong';
                    return answer.every((val: number, idx: number) => Number(val) === Number(oCorrect[idx])) ? 'correct' : 'wrong';
                } else if (typeof answer === 'object' && answer !== null) {
                    // Object format: {itemIndex: position(1-indexed)}
                    // correctOrder[i] = itemIndex that should be at position i+1
                    let allMatch = true;
                    for (let i = 0; i < oCorrect.length; i++) {
                        const expectedIdx = oCorrect[i];
                        if (Number(answer[expectedIdx]) !== i + 1) {
                            allMatch = false;
                            break;
                        }
                    }
                    return (allMatch && oCorrect.length > 0) ? 'correct' : 'wrong';
                }
                return 'wrong';
            case QuestionType.CATEGORIZATION:
                const catItems = (question as any).items || [];
                const isCatCorrect = catItems.every((item: any) => {
                    const studentCatId = answer?.[item.id];
                    const correctCatId = item.categoryId;
                    if (correctCatId) {
                        return studentCatId === correctCatId;
                    } else {
                        return !studentCatId;
                    }
                });
                return isCatCorrect ? 'correct' : 'wrong';
            case QuestionType.UNDERLINE:
                const studentIdxs = (answer as number[]) || [];
                const correctIdxs = resolveCorrectWordIndexes(question);
                if (studentIdxs.length !== correctIdxs.length) return 'wrong';
                const sSorted = [...studentIdxs].sort((a, b) => a - b);
                const cSorted = [...correctIdxs].sort((a, b) => a - b);
                const isUnderlineCorrect = sSorted.every((val, idx) => val === cSorted[idx]);
                return isUnderlineCorrect ? 'correct' : 'wrong';
            case QuestionType.ERROR_CORRECTION:
                const ecAnswer = answer as { wrongWord?: string; correctWord?: string } || {};
                const ecWrongMatch = String(ecAnswer.wrongWord || '').toLowerCase().trim() === String((question as any).wrongWord || '').toLowerCase().trim();
                const ecCorrectMatch = String(ecAnswer.correctWord || '').toLowerCase().trim() === String((question as any).correctWord || '').toLowerCase().trim();
                return (ecWrongMatch && ecCorrectMatch) ? 'correct' : 'wrong';
            default:
                return 'wrong';
        }
    };

    // Calculate counts for filter
    const counts = useMemo(() => {
        const result = { all: 0, correct: 0, wrong: 0, skipped: 0 };
        quiz.questions.forEach(q => {
            result.all++;
            const status = getAnswerStatus(q, answers[q.id]);
            result[status]++;
        });
        return result;
    }, [quiz.questions, answers]);

    // Filter and search questions
    const filteredQuestions = useMemo(() => {
        return quiz.questions.filter(q => {
            const status = getAnswerStatus(q, answers[q.id]);
            if (filter !== 'all' && status !== filter) return false;

            if (searchQuery) {
                const questionText = q.type === QuestionType.TRUE_FALSE
                    ? (q as any).mainQuestion || ''
                    : (q as any).question || '';
                if (!questionText.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            }

            return true;
        });
    }, [quiz.questions, answers, filter, searchQuery]);

    const selectedQuestion = selectedQuestionId
        ? quiz.questions.find(q => q.id === selectedQuestionId)
        : null;

    // Ref for the detail panel container
    const detailPanelRef = useRef<HTMLDivElement>(null);

    // Trigger MathJax when selected question changes
    useEffect(() => {
        if (selectedQuestionId && detailPanelRef.current) {
            // Small delay to ensure DOM is updated
            const timer = setTimeout(() => {
                renderMathJax(detailPanelRef.current);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [selectedQuestionId]);


    // Render detailed view for selected question
    const renderDetailedAnswer = (q: any) => {
        const answer = answers[q.id];
        const status = getAnswerStatus(q, answer);

        return (
            <div className="p-6 space-y-4">
                {/* Question header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-full ${status === 'correct' ? 'bg-green-100' : status === 'wrong' ? 'bg-red-100' : 'bg-gray-100'}`}>
                        {status === 'correct' ? <Check className="w-5 h-5 text-green-600" /> :
                            status === 'wrong' ? <X className="w-5 h-5 text-red-600" /> :
                                <HelpCircle className="w-5 h-5 text-gray-500" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">Câu {quiz.questions.indexOf(q) + 1}</h3>
                        <span className={`text-sm px-2 py-0.5 rounded-full ${status === 'correct' ? 'bg-green-100 text-green-700' :
                            status === 'wrong' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-600'
                            }`}>
                            {status === 'correct' ? '✓ Đúng' : status === 'wrong' ? '✗ Sai' : '○ Bỏ qua'}
                        </span>
                    </div>
                </div>

                {/* Question content */}
                <div className="bg-gray-50 rounded-xl p-4">
                    <MathSpan content={q.type === QuestionType.TRUE_FALSE ? q.mainQuestion : (q as any).question} className="text-gray-800 font-medium mb-3" />
                    {q.image && (
                        <img src={q.image} alt="Hình minh họa" className="max-h-48 rounded-lg border border-gray-200 object-contain" />
                    )}
                </div>

                {/* Answer details based on question type */}
                <div className="space-y-3">
                    {/* MCQ */}
                    {q.type === QuestionType.MCQ && (
                        <div className="space-y-2">
                            {q.options.map((opt: string, idx: number) => {
                                const letter = ['A', 'B', 'C', 'D'][idx];
                                const isSelected = answer === letter;
                                const isCorrectOption = q.correctAnswer === letter;

                                return (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-lg border-2 flex items-center gap-3 ${isCorrectOption ? 'border-green-500 bg-green-50' :
                                            isSelected && !isCorrectOption ? 'border-red-500 bg-red-50' :
                                                'border-gray-200 bg-white'
                                            }`}
                                    >
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${isCorrectOption ? 'bg-green-500 text-white' :
                                            isSelected ? 'bg-red-500 text-white' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                            {letter}
                                        </span>
                                        <MathSpan content={opt} className="flex-1" />
                                        {isSelected && <span className="text-sm font-medium">{isCorrectOption ? '✓ Em chọn (đúng)' : '✗ Em chọn'}</span>}
                                        {isCorrectOption && !isSelected && <span className="text-green-600 text-sm font-medium">✓ Đáp án đúng</span>}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* SHORT_ANSWER */}
                    {q.type === QuestionType.SHORT_ANSWER && (
                        <div className="space-y-3">
                            <div className={`p-3 rounded-lg ${status === 'correct' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                <p className="text-sm text-gray-600 mb-1">Em trả lời:</p>
                                <p className={`font-bold ${status === 'correct' ? 'text-green-700' : 'text-red-700'}`}>
                                    {answer || '(Không trả lời)'}
                                </p>
                            </div>
                            {status !== 'correct' && (
                                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                                    <p className="text-sm text-gray-600 mb-1">Đáp án đúng:</p>
                                    <p className="font-bold text-green-700">{q.correctAnswer}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TRUE_FALSE */}
                    {q.type === QuestionType.TRUE_FALSE && (
                        <div className="space-y-2">
                            {(q.items || []).map((item: any, idx: number) => {
                                const itemKey = item.id || `item-${idx}`;
                                const studentVal = answer?.[itemKey];
                                const isCorrect = studentVal === item.isCorrect;

                                return (
                                    <div key={itemKey} className={`p-3 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                        <MathSpan content={item.statement} className="text-gray-800 mb-2" />
                                        <div className="flex gap-4 text-sm">
                                            <span className={studentVal === true ? (isCorrect ? 'font-bold text-green-600' : 'font-bold text-red-600') : 'text-gray-400'}>
                                                ◉ Đúng {studentVal === true && (isCorrect ? '✓' : '✗')}
                                            </span>
                                            <span className={studentVal === false ? (isCorrect ? 'font-bold text-green-600' : 'font-bold text-red-600') : 'text-gray-400'}>
                                                ◉ Sai {studentVal === false && (isCorrect ? '✓' : '✗')}
                                            </span>
                                            {!isCorrect && <span className="text-green-600 ml-auto">→ Đáp án: {item.isCorrect ? 'ĐÚNG' : 'SAI'}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* MATCHING */}
                    {q.type === QuestionType.MATCHING && (
                        <div className="space-y-2">
                            {(q.pairs || []).map((pair: any) => {
                                const studentRight = answer?.[pair.left];
                                const isCorrect = studentRight === pair.right;

                                return (
                                    <div key={pair.left} className={`p-3 rounded-lg border flex items-center ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                        <MathSpan content={pair.left} className="font-medium flex-1" />
                                        <span className="mx-4 text-gray-400">→</span>
                                        <MathSpan content={studentRight || 'Chưa nối'} className={`font-bold flex-1 ${isCorrect ? 'text-green-700' : 'text-red-700'}`} />
                                        {!isCorrect && <span className="text-green-600 text-sm ml-2">({pair.right})</span>}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* MULTIPLE_SELECT */}
                    {q.type === QuestionType.MULTIPLE_SELECT && (
                        <div className="space-y-2">
                            {q.options.map((opt: string, idx: number) => {
                                const letter = ['A', 'B', 'C', 'D'][idx];
                                const isSelected = (answer || []).includes(letter);
                                const shouldBeSelected = (q.correctAnswers || []).includes(letter);
                                const isCorrectChoice = isSelected === shouldBeSelected;

                                return (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-lg border-2 flex items-center gap-3 ${shouldBeSelected ? 'border-green-500 bg-green-50' :
                                            isSelected && !shouldBeSelected ? 'border-red-500 bg-red-50' :
                                                'border-gray-200 bg-white'
                                            }`}
                                    >
                                        <span className={`w-6 h-6 rounded border-2 flex items-center justify-center ${isSelected ? (isCorrectChoice ? 'bg-green-500 border-green-500' : 'bg-red-500 border-red-500') : 'border-gray-300'
                                            }`}>
                                            {isSelected && <Check className="w-4 h-4 text-white" />}
                                        </span>
                                        <MathSpan content={opt} className="flex-1" />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* DRAG_DROP */}
                    {q.type === QuestionType.DRAG_DROP && (
                        <div className="space-y-3">
                            {/* Show the full text with blanks */}
                            {q.text && (
                                <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                                    <p className="text-sm text-gray-600 mb-1">Đoạn văn:</p>
                                    <MathSpan content={q.text} className="text-gray-800" />
                                </div>
                            )}
                            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                                <p className="text-sm text-gray-600 mb-1">Em trả lời:</p>
                                <p className={`font-medium ${status === 'correct' ? 'text-green-700' : 'text-red-700'}`}>
                                    {answer ? (typeof answer === 'object' ? Object.entries(answer).map(([k, v]) => `${v}`).join(', ') : answer) : '(Không trả lời)'}
                                </p>
                            </div>
                            {status !== 'correct' && q.blanks && (
                                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                                    <p className="text-sm text-gray-600 mb-1">Đáp án đúng:</p>
                                    <p className="font-bold text-green-700">{q.blanks.join(', ')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* DROPDOWN */}
                    {q.type === QuestionType.DROPDOWN && (
                        <div className="space-y-3">
                            {(q as any).image && (
                                <img src={(q as any).image} alt="Question" className="max-h-48 rounded-lg object-contain border border-gray-200" />
                            )}
                            {/* Show the full text with blanks */}
                            {q.text && (
                                <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                                    <p className="text-sm text-gray-600 mb-1">Đoạn văn:</p>
                                    <MathSpan content={q.text} className="text-gray-800" />
                                </div>
                            )}
                            {(q.blanks || []).map((blank: any, idx: number) => {
                                const studentVal = answer?.[blank.id];
                                const isCorrect = studentVal === blank.correctAnswer;
                                return (
                                    <div key={blank.id || idx} className={`p-3 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                        <p className="text-sm text-gray-600 mb-1">Ô {idx + 1}:</p>
                                        <p className={`font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                            Em chọn: {studentVal || '(Chưa chọn)'}
                                        </p>
                                        {!isCorrect && (
                                            <p className="text-green-600 text-sm mt-1">→ Đáp án: {blank.correctAnswer}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ORDERING */}
                    {q.type === QuestionType.ORDERING && (
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600 mb-2">Thứ tự em sắp xếp:</p>
                            {(() => {
                                // Safe normalize ordering answer (could be array or object {index: position})
                                let displayItems: any[] = [];
                                if (Array.isArray(answer)) {
                                    displayItems = answer;
                                } else if (typeof answer === 'object' && answer !== null) {
                                    // Convert {originalIndex: position} to ordered items array
                                    const items = q.items || [];
                                    const ordered = new Array(items.length).fill(null);
                                    Object.entries(answer).forEach(([origIdx, pos]: [string, any]) => {
                                        const position = Number(pos);
                                        const originalIndex = Number(origIdx);
                                        if (!isNaN(position) && position > 0 && position <= items.length && items[originalIndex]) {
                                            ordered[position - 1] = items[originalIndex];
                                        }
                                    });
                                    displayItems = ordered.filter(i => i !== null);
                                }

                                return displayItems.map((item: any, idx: number) => {
                                    // Reconstruct text: handle string, {content} object, or char-index object
                                    const itemText = (() => {
                                        if (!item) return '';
                                        if (typeof item === 'string') return item;
                                        if (typeof item === 'object') {
                                            if (item.content || item.text) return item.content || item.text;
                                            const keys = Object.keys(item);
                                            if (keys.length > 0 && keys.every((k: string) => /^\d+$/.test(k))) {
                                                const maxIdx = Math.max(...keys.map(Number));
                                                let r = '';
                                                for (let ci = 0; ci <= maxIdx; ci++) r += item[ci] || '';
                                                if (r.trim()) return r;
                                            }
                                        }
                                        return String(item);
                                    })();
                                    return (
                                        <div key={idx} className="p-2 rounded-lg bg-gray-100 border border-gray-200 flex items-center gap-2">
                                            <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold">{idx + 1}</span>
                                            <MathSpan content={itemText} className="flex-1" />
                                        </div>
                                    );
                                });
                            })()}
                            {status !== 'correct' && (() => {
                                // Fallback: If correctOrder is missing but we have items, assume items are stored in correct order [0, 1, 2...]
                                let correctOrder = q.correctOrder;
                                if (!correctOrder || correctOrder.length === 0) {
                                    correctOrder = Array.from({ length: q.items?.length || 0 }, (_, i) => i);
                                }

                                if (correctOrder && Array.isArray(correctOrder)) {
                                    return (
                                        <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200">
                                            <p className="text-sm text-green-600 mb-1">Thứ tự đúng:</p>
                                            {correctOrder.map((orderIdx: number, i: number) => {
                                                const rawItem = q.items?.[orderIdx];
                                                const itemText = (() => {
                                                    if (!rawItem) return '';
                                                    if (typeof rawItem === 'string') return rawItem;
                                                    if (typeof rawItem === 'object') {
                                                        if (rawItem.content || rawItem.text) return rawItem.content || rawItem.text;
                                                        const keys = Object.keys(rawItem);
                                                        if (keys.length > 0 && keys.every((k: string) => /^\d+$/.test(k))) {
                                                            const maxIdx = Math.max(...keys.map(Number));
                                                            let r = '';
                                                            for (let i = 0; i <= maxIdx; i++) r += rawItem[i] || '';
                                                            if (r.trim()) return r;
                                                        }
                                                    }
                                                    return String(rawItem);
                                                })();
                                                return (
                                                    <p key={i} className="text-green-700">{i + 1}. {itemText}</p>
                                                );
                                            })}
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    )}
                    {/* CATEGORIZATION */}
                    {q.type === QuestionType.CATEGORIZATION && (
                        <div className="space-y-3">
                            {(q.categories || []).map((cat: any) => (
                                <div key={cat.id} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                                    <p className="font-medium text-gray-700 mb-2">{cat.name}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {(q.items || []).filter((item: any) => answer?.[item.id] === cat.id || item.categoryId === cat.id).map((item: any) => {
                                            const studentChoice = answer?.[item.id];
                                            const isCorrect = studentChoice === item.categoryId;
                                            return (
                                                <span key={item.id} className={`px-2 py-1 rounded text-sm ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {item.content} {isCorrect ? '✓' : '✗'}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* UNDERLINE */}
                    {q.type === QuestionType.UNDERLINE && (() => {
                        const words: string[] = q.words || [];
                        // Use helper to resolve correctWordIndexes from all sources
                        // (quiz object may be stripped by anti-cheat)
                        const correctIndexes: number[] = resolveCorrectWordIndexes(q);
                        const selectedIndexes: number[] = answer || [];

                        return (
                            <div className="space-y-3">
                                <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                                    <p className="text-sm text-gray-600 mb-1">Câu:</p>
                                    <p className="text-gray-800">{q.sentence}</p>
                                </div>

                                {/* Word chips with clear status */}
                                <div className="flex flex-wrap gap-2">
                                    {words.map((word: string, idx: number) => {
                                        const isCorrectWord = correctIndexes.includes(idx);
                                        const isStudentSelected = selectedIndexes.includes(idx);

                                        // 4 states:
                                        // 1. Selected + Correct = green underline ✓
                                        // 2. Selected + Wrong = red line-through ✗
                                        // 3. Not selected + Should be correct = amber dashed underline (missed)
                                        // 4. Not selected + Not correct = neutral gray

                                        let chipClass = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-all ';
                                        let icon = '';

                                        if (isStudentSelected && isCorrectWord) {
                                            // Correct selection
                                            chipClass += 'bg-green-100 text-green-700 underline decoration-2 decoration-green-500 border border-green-300';
                                            icon = ' ✓';
                                        } else if (isStudentSelected && !isCorrectWord) {
                                            // Wrong selection
                                            chipClass += 'bg-red-100 text-red-700 line-through decoration-2 decoration-red-400 border border-red-300';
                                            icon = ' ✗';
                                        } else if (!isStudentSelected && isCorrectWord) {
                                            // Missed correct word
                                            chipClass += 'bg-amber-50 text-amber-700 underline decoration-dashed decoration-2 decoration-amber-400 border border-amber-300';
                                            icon = ' ⚠';
                                        } else {
                                            // Neutral
                                            chipClass += 'bg-gray-50 text-gray-500 border border-gray-200';
                                        }

                                        return (
                                            <span key={idx} className={chipClass}>
                                                {word}{icon}
                                            </span>
                                        );
                                    })}
                                </div>

                                {/* Legend */}
                                <div className="flex flex-wrap gap-3 text-xs text-gray-500 px-1">
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 border border-green-400"></span> Gạch đúng</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 border border-red-400"></span> Gạch sai</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-400"></span> Bỏ sót</span>
                                </div>

                                {/* Summary: student answer vs correct answer */}
                                {status !== 'correct' && (
                                    <div className="space-y-2">
                                        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                                            <p className="text-sm text-gray-600 mb-1">Em gạch chân:</p>
                                            <p className="font-medium text-red-700">
                                                {selectedIndexes.length > 0
                                                    ? selectedIndexes.map(i => words[i] || '').filter(Boolean).join(', ')
                                                    : '(Không gạch từ nào)'}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                                            <p className="text-sm text-gray-600 mb-1">Đáp án đúng:</p>
                                            <p className="font-bold text-green-700">
                                                {correctIndexes.map(i => words[i] || '').filter(Boolean).join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* RIDDLE */}
                    {q.type === QuestionType.RIDDLE && (
                        <div className="space-y-3">
                            {q.riddleLines && (
                                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                    {q.riddleLines.map((line: string, idx: number) => (
                                        <p key={idx} className="text-indigo-800 italic">{line}</p>
                                    ))}
                                </div>
                            )}
                            <div className={`p-3 rounded-lg ${status === 'correct' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                <p className="text-sm text-gray-600 mb-1">{q.answerLabel || 'Đáp án'}:</p>
                                <p className={`font-bold ${status === 'correct' ? 'text-green-700' : 'text-red-700'}`}>
                                    {answer || '(Không trả lời)'}
                                </p>
                            </div>
                            {status !== 'correct' && (
                                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                                    <p className="text-sm text-gray-600 mb-1">Đáp án đúng:</p>
                                    <p className="font-bold text-green-700">{q.correctAnswer}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* WORD_SCRAMBLE */}
                    {q.type === QuestionType.WORD_SCRAMBLE && (
                        <div className="space-y-3">
                            <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                                <p className="text-sm text-gray-600 mb-1">Các chữ cái:</p>
                                <div className="flex flex-wrap gap-2">
                                    {(q.letters || []).map((letter: string, idx: number) => (
                                        <span key={idx} className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded flex items-center justify-center font-bold">{letter}</span>
                                    ))}
                                </div>
                            </div>
                            <div className={`p-3 rounded-lg ${status === 'correct' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                <p className="text-sm text-gray-600 mb-1">Em trả lời:</p>
                                <p className={`font-bold ${status === 'correct' ? 'text-green-700' : 'text-red-700'}`}>
                                    {Array.isArray(answer)
                                        ? answer.map((idx: number) => (q.letters || [])[idx] || '?').join('')
                                        : (answer || '(Không trả lời)')}
                                </p>
                            </div>
                            {status !== 'correct' && (
                                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                                    <p className="text-sm text-gray-600 mb-1">Đáp án đúng:</p>
                                    <p className="font-bold text-green-700">{q.correctWord}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ERROR_CORRECTION */}
                    {q.type === QuestionType.ERROR_CORRECTION && (
                        <div className="space-y-3">
                            {/* Passage */}
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-blue-900 whitespace-pre-line">{(q as any).passage}</p>
                            </div>
                            {/* Student answer */}
                            <div className={`p-3 rounded-lg ${status === 'correct' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                <p className="text-sm text-gray-600 mb-1">Em trả lời:</p>
                                <div className="flex gap-4">
                                    <p className={`font-bold ${status === 'correct' ? 'text-green-700' : 'text-red-700'}`}>
                                        Từ sai: {(answer as any)?.wrongWord || '(Không trả lời)'}
                                    </p>
                                    <p className={`font-bold ${status === 'correct' ? 'text-green-700' : 'text-red-700'}`}>
                                        Sửa lại: {(answer as any)?.correctWord || '(Không trả lời)'}
                                    </p>
                                </div>
                            </div>
                            {status !== 'correct' && (
                                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                                    <p className="text-sm text-gray-600 mb-1">Đáp án đúng:</p>
                                    <div className="flex gap-4">
                                        <p className="font-bold text-green-700">Từ sai: {(q as any).wrongWord}</p>
                                        <p className="font-bold text-green-700">Sửa lại: {(q as any).correctWord}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Explanation section */}
                    {status !== 'correct' && (q as any).explanation && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="w-5 h-5 text-blue-600" />
                                <span className="font-bold text-blue-800">Hướng dẫn giải</span>
                            </div>
                            <ExplanationContent content={(q as any).explanation} className="text-blue-700" />
                        </div>
                    )}

                    {/* AI Tutor button - show for wrong answers */}
                    {status !== 'correct' && (
                        <button
                            onClick={() => {
                                setAiTutorQuestion(q as Question);
                                setAiTutorUserAnswer(String(answer || 'Không trả lời'));
                                setAiTutorCorrectAnswer(String(q.correctAnswer || q.correctAnswers?.[0] || ''));
                            }}
                            className="w-full p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl flex items-center justify-center gap-2 hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                        >
                            <Bot className="w-5 h-5" />
                            <span className="font-semibold">🤖 Hỏi Gia sư AI giải thích</span>
                        </button>
                    )}
                </div>
            </div >
        );
    };

    return (
        <div className="flex flex-col lg:flex-row min-h-[500px]">
            {/* Left panel - Question list */}
            <div className={`lg:w-1/2 border-r ${selectedQuestion ? 'hidden lg:block' : ''}`}>
                <QuestionFilter
                    filter={filter}
                    onFilterChange={setFilter}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    counts={counts}
                />

                <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                    {filteredQuestions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>Không tìm thấy câu hỏi nào</p>
                        </div>
                    ) : (
                        filteredQuestions.map((q, idx) => (
                            <AnswerCard
                                key={q.id}
                                question={q}
                                questionNumber={quiz.questions.indexOf(q) + 1}
                                status={getAnswerStatus(q, answers[q.id])}
                                studentAnswer={answers[q.id]}
                                onClick={() => setSelectedQuestionId(q.id)}
                                isExpanded={selectedQuestionId === q.id}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Right panel - Question detail (split-screen) */}
            <div className={`lg:w-1/2 ${!selectedQuestion ? 'hidden lg:flex items-center justify-center text-gray-400' : ''}`}>
                {selectedQuestion ? (
                    <div ref={detailPanelRef} className="h-full overflow-y-auto">
                        {/* Mobile back button */}
                        <button
                            onClick={() => setSelectedQuestionId(null)}
                            className="lg:hidden flex items-center gap-2 p-4 text-indigo-600 font-medium border-b"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            Quay lại danh sách
                        </button>

                        {renderDetailedAnswer(selectedQuestion)}

                        {/* Navigation buttons */}
                        <div className="flex justify-between p-4 border-t bg-gray-50">
                            <button
                                onClick={() => {
                                    const currentIdx = quiz.questions.findIndex(q => q.id === selectedQuestionId);
                                    if (currentIdx > 0) setSelectedQuestionId(quiz.questions[currentIdx - 1].id);
                                }}
                                disabled={quiz.questions.findIndex(q => q.id === selectedQuestionId) === 0}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Câu trước
                            </button>
                            <button
                                onClick={() => {
                                    const currentIdx = quiz.questions.findIndex(q => q.id === selectedQuestionId);
                                    if (currentIdx < quiz.questions.length - 1) setSelectedQuestionId(quiz.questions[currentIdx + 1].id);
                                }}
                                disabled={quiz.questions.findIndex(q => q.id === selectedQuestionId) === quiz.questions.length - 1}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Câu sau
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-8">
                        <HelpCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Chọn một câu hỏi để xem chi tiết</p>
                    </div>
                )}
            </div>

            {/* AI Tutor Modal */}
            {aiTutorQuestion && (
                <ExplanationModal
                    isOpen={!!aiTutorQuestion}
                    onClose={() => setAiTutorQuestion(null)}
                    question={aiTutorQuestion}
                    userAnswer={aiTutorUserAnswer}
                    correctAnswer={aiTutorCorrectAnswer}
                />
            )}
        </div>
    );
};

export default DetailedAnswersTab;
