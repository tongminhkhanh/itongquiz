import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Quiz, StudentResult, Question } from '../../../types';

import { Home } from 'lucide-react';

// Components
// ResultTabs import removed

// Tabs
import OverviewTab from './tabs/OverviewTab';

interface Props {
    quiz: Quiz;
    result: StudentResult;
    answers: Record<string, any>;
    onExit: () => void;
    studentName?: string;
    studentClass?: string;
}

export type TabType = 'overview';

const ResultScreen: React.FC<Props> = ({ quiz, result, answers, onExit, studentName, studentClass }) => {
    const containerRef = useRef<HTMLDivElement>(null);



    // Helper function to check if answer is correct 
    // PRIORITY: Use server validationDetails if available, fallback to local calculation
    const getAnswerStatus = (question: Question, answer: any): 'correct' | 'wrong' | 'skipped' => {
        // 1. Check server validation result first (single source of truth)
        if (result.validationDetails && result.validationDetails.length > 0) {
            const serverResult = result.validationDetails.find(d => d.questionId === question.id);
            if (serverResult) {
                if (!answer && answer !== false && answer !== 0) return 'skipped';
                // Override: Server has bugs for ORDERING and UNDERLINE → fall through to local
                if (!serverResult.isCorrect && (
                    question.type === 'ORDERING' || question.type === 'UNDERLINE' ||
                    question.type === 'ERROR_CORRECTION'
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
            case 'MCQ': {
                return answer === (question as any).correctAnswer ? 'correct' : 'wrong';
            }
            case 'SHORT_ANSWER': {
                return String(answer ?? '').replace(/^'/, '').toLowerCase().trim() === String((question as any).correctAnswer ?? '').replace(/^'/, '').toLowerCase().trim() ? 'correct' : 'wrong';
            }
            case 'TRUE_FALSE': {
                const items = (question as any).items || [];
                const allCorrect = items.every((item: any, idx: number) => {
                    const itemKey = item.id || `item-${idx}`;
                    return answer?.[itemKey] === item.isCorrect;
                });
                return allCorrect ? 'correct' : 'wrong';
            }
            case 'MATCHING': {
                const pairs = (question as any).pairs || [];
                const matchingCorrect = pairs.every((p: any) => answer?.[p.left] === p.right);
                return matchingCorrect ? 'correct' : 'wrong';
            }
            case 'MULTIPLE_SELECT': {
                const studentAns = (answer as string[]) || [];
                const correctAns = (question as any).correctAnswers || [];
                const msCorrect = studentAns.length === correctAns.length && studentAns.every((v: string) => correctAns.includes(v));
                return msCorrect ? 'correct' : 'wrong';
            }
            case 'WORD_SCRAMBLE': {
                const letters = (question as any).letters || [];
                const studentWord = ((answer as number[]) || []).map((i: number) => letters[i]).join('');
                return studentWord.toLowerCase().replace(/\s+/g, '') === ((question as any).correctWord || '').toLowerCase().replace(/\s+/g, '') ? 'correct' : 'wrong';
            }
            case 'RIDDLE': {
                return String(answer ?? '').replace(/^'/, '').toLowerCase().trim() === String((question as any).correctAnswer ?? '').replace(/^'/, '').toLowerCase().trim() ? 'correct' : 'wrong';
            }
            case 'DRAG_DROP': {
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
            }
            case 'DROPDOWN': {
                const dropdownBlanks = (question as any).blanks || [];
                const isDropdownCorrect = dropdownBlanks.every((b: any) => answer?.[b.id] === b.correctAnswer);
                return isDropdownCorrect ? 'correct' : 'wrong';
            }
            case 'ORDERING': {
                let studentIndices: number[] = [];
                const rawAnswer = answer;

                // Hydrate correctOrder safely (handle if it's stringified JSON or missing)
                let correctOrder = (question as any).correctOrder;
                if (!Array.isArray(correctOrder) && correctOrder) {
                    try { correctOrder = JSON.parse(correctOrder); } catch { }
                }
                if (!Array.isArray(correctOrder) && (question as any).correctAnswer) {
                    try { correctOrder = JSON.parse((question as any).correctAnswer); } catch { }
                }

                // If correctOrder is strict array
                correctOrder = Array.isArray(correctOrder) ? correctOrder : [];

                const itemsCount = (question as any).items?.length || 0;

                // Fallback: If correctOrder is missing but we have items, assume items are stored in correct order [0, 1, 2...]
                if (correctOrder.length === 0 && itemsCount > 0) {
                    correctOrder = Array.from({ length: itemsCount }, (_, i) => i);
                }

                // Normalize answer: Could be array of indices (if changed later) or object {originalIndex: position}
                if (Array.isArray(rawAnswer)) {
                    studentIndices = rawAnswer;
                } else if (typeof rawAnswer === 'object' && rawAnswer !== null) {
                    // Convert {originalIndex: position} -> [originalIndex at pos 1, originalIndex at pos 2...]
                    const tempOrdered = new Array(Math.max(itemsCount, correctOrder.length)).fill(-1);
                    Object.entries(rawAnswer).forEach(([origIdx, pos]) => {
                        const position = Number(pos);
                        const originalIndex = Number(origIdx);
                        if (!isNaN(position) && position > 0) {
                            tempOrdered[position - 1] = originalIndex;
                        }
                    });
                    studentIndices = tempOrdered;
                }

                if (studentIndices.length !== correctOrder.length) {
                    return 'wrong';
                }

                const isOrderCorrect = studentIndices.every((val: number, idx: number) => {
                    return Number(val) === Number(correctOrder[idx]);
                });
                return isOrderCorrect ? 'correct' : 'wrong';
            }
            case 'CATEGORIZATION': {
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
            }
            case 'UNDERLINE': {
                const studentIdxs = (answer as number[]) || [];
                // Resolve correctWordIndexes: quiz object → snapshot → validationDetails
                let correctIdxs = (question as any).correctWordIndexes || [];
                if (correctIdxs.length === 0) {
                    // Try parse from quiz.correctAnswer
                    if ((question as any).correctAnswer) {
                        try { const p = JSON.parse((question as any).correctAnswer); if (Array.isArray(p)) correctIdxs = p; } catch { }
                    }
                    // Try from result snapshot
                    if (correctIdxs.length === 0) {
                        const snap = result.answers?.[question.id]?.questionSnapshot;
                        if (snap?.correctWordIndexes?.length > 0) { correctIdxs = snap.correctWordIndexes; }
                        else if (snap?.correctAnswer) {
                            try { const p = JSON.parse(snap.correctAnswer); if (Array.isArray(p)) correctIdxs = p; } catch { }
                        }
                    }
                    // Try from validationDetails
                    if (correctIdxs.length === 0) {
                        const vd = result.validationDetails?.find(d => d.questionId === question.id);
                        if (vd?.correctAnswer) {
                            try { const p = typeof vd.correctAnswer === 'string' ? JSON.parse(vd.correctAnswer) : vd.correctAnswer; if (Array.isArray(p)) correctIdxs = p; } catch { }
                        }
                    }
                }
                if (studentIdxs.length !== correctIdxs.length) return 'wrong';
                const sSorted = [...studentIdxs].sort((a, b) => a - b);
                const cSorted = [...correctIdxs].sort((a, b) => a - b);
                const isUnderlineCorrect = sSorted.every((val, idx) => val === cSorted[idx]);
                return isUnderlineCorrect ? 'correct' : 'wrong';
            }
            case 'ERROR_CORRECTION': {
                const ecAns = answer as { wrongWord?: string; correctWord?: string } || {};
                const ecWrong = String(ecAns.wrongWord || '').toLowerCase().trim();
                const ecCorrect = String(ecAns.correctWord || '').toLowerCase().trim();
                const ecExpWrong = String((question as any).wrongWord || (question as any).distractors || '').toLowerCase().trim();
                const ecExpCorrect = String((question as any).correctWord || (question as any).correctAnswer || '').toLowerCase().trim();
                return (ecWrong && ecCorrect && ecWrong === ecExpWrong && ecCorrect === ecExpCorrect) ? 'correct' : 'wrong';
            }
            default:
                return 'wrong';
        }
    };

    // Calculate correct count using getAnswerStatus (which has local overrides for buggy server types)
    const calculatedCorrectCount = useMemo(() => {
        return quiz.questions.filter(q => getAnswerStatus(q, answers[q.id]) === 'correct').length;
    }, [quiz.questions, answers, result.validationDetails]);

    // Always use recalculated correct count for consistent display
    const displayResult: StudentResult = useMemo(() => {
        const total = quiz.questions.length;
        const recalcScore = total > 0 ? parseFloat(((calculatedCorrectCount / total) * 10).toFixed(1)) : 0;
        return {
            ...result,
            correctCount: calculatedCorrectCount,
            totalQuestions: total,
            score: recalcScore
        };
    }, [result, calculatedCorrectCount, quiz.questions.length]);


    return (
        <div
            ref={containerRef}
            className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50"
        >
            {/* Minimal Top Navigation */}
            <div className="max-w-5xl mx-auto px-4 pt-6 pb-2 flex justify-between items-center">
                <button
                    onClick={onExit}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 hover:bg-indigo-50 hover:shadow-md rounded-full transition-all shadow-sm border border-indigo-100 font-medium"
                >
                    <Home className="w-5 h-5" />
                    <span>Về trang chủ</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="max-w-5xl mx-auto px-4 pb-8">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <OverviewTab
                        quiz={quiz}
                        result={result}
                        answers={answers}
                        studentUsername={studentName}
                    />
                </div>
            </div>
        </div>
    );
};

export default ResultScreen;

