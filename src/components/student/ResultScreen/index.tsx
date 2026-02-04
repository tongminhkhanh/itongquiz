import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Quiz, StudentResult, Question } from '../../../types';
import { renderMathJax } from '../../../hooks/useMathJax';
import { exportResultToPDF, shareResult } from '../../../services/pdfExportService';

// Components
import ResultHeader from './ResultHeader';
import ResultTabs from './ResultTabs';

// Tabs
import OverviewTab from './tabs/OverviewTab';
import DetailedAnswersTab from './tabs/DetailedAnswersTab';
import StatisticsTab from './tabs/StatisticsTab';
import RecommendationsTab from './tabs/RecommendationsTab';

interface Props {
    quiz: Quiz;
    result: StudentResult;
    answers: Record<string, any>;
    onExit: () => void;
    studentName?: string;
    studentClass?: string;
}

export type TabType = 'overview' | 'details' | 'statistics' | 'recommendations';

const ResultScreen: React.FC<Props> = ({ quiz, result, answers, onExit, studentName, studentClass }) => {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const containerRef = useRef<HTMLDivElement>(null);

    // Trigger MathJax rendering when component mounts or tab changes
    useEffect(() => {
        if (containerRef.current) {
            const timeoutId = setTimeout(() => {
                renderMathJax(containerRef.current);
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [quiz, answers, activeTab]);

    // Handle PDF export
    const handleExportPDF = useCallback(async () => {
        await exportResultToPDF({
            quiz,
            result,
            answers,
            studentName,
            studentClass
        });
    }, [quiz, result, answers, studentName, studentClass]);

    // Handle share
    const handleShare = useCallback(async () => {
        return await shareResult({
            quizTitle: quiz.title,
            score: result.score,
            correctCount: result.correctCount,
            totalQuestions: result.totalQuestions,
            studentName
        });
    }, [quiz.title, result, studentName]);

    // Helper function to check if answer is correct 
    // PRIORITY: Use server validationDetails if available, fallback to local calculation
    const getAnswerStatus = (question: Question, answer: any): 'correct' | 'wrong' | 'skipped' => {
        // 1. Check server validation result first (single source of truth)
        if (result.validationDetails && result.validationDetails.length > 0) {
            const serverResult = result.validationDetails.find(d => d.questionId === question.id);
            if (serverResult) {
                if (!answer && answer !== false && answer !== 0) return 'skipped';
                return serverResult.isCorrect ? 'correct' : 'wrong';
            }
        }

        // 2. Fallback to local calculation if no server data
        if (!answer && answer !== false && answer !== 0) return 'skipped';

        switch (question.type) {
            case 'MCQ':
                return answer === (question as any).correctAnswer ? 'correct' : 'wrong';
            case 'SHORT_ANSWER':
                return String(answer).toLowerCase().trim() === String((question as any).correctAnswer).toLowerCase().trim() ? 'correct' : 'wrong';
            case 'TRUE_FALSE':
                const items = (question as any).items || [];
                const allCorrect = items.every((item: any, idx: number) => {
                    const itemKey = item.id || `item-${idx}`;
                    return answer?.[itemKey] === item.isCorrect;
                });
                return allCorrect ? 'correct' : 'wrong';
            case 'MATCHING':
                const pairs = (question as any).pairs || [];
                const matchingCorrect = pairs.every((p: any) => answer?.[p.left] === p.right);
                return matchingCorrect ? 'correct' : 'wrong';
            case 'MULTIPLE_SELECT':
                const studentAns = (answer as string[]) || [];
                const correctAns = (question as any).correctAnswers || [];
                const msCorrect = studentAns.length === correctAns.length && studentAns.every((v: string) => correctAns.includes(v));
                return msCorrect ? 'correct' : 'wrong';
            case 'WORD_SCRAMBLE':
                const letters = (question as any).letters || [];
                const studentWord = ((answer as number[]) || []).map((i: number) => letters[i]).join('');
                return studentWord.toLowerCase().replace(/\s+/g, '') === ((question as any).correctWord || '').toLowerCase().replace(/\s+/g, '') ? 'correct' : 'wrong';
            case 'RIDDLE':
                return String(answer).toLowerCase().trim() === String((question as any).correctAnswer).toLowerCase().trim() ? 'correct' : 'wrong';
            case 'DRAG_DROP':
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
            case 'DROPDOWN':
                const dropdownBlanks = (question as any).blanks || [];
                const isDropdownCorrect = dropdownBlanks.every((b: any) => answer?.[b.id] === b.correctAnswer);
                return isDropdownCorrect ? 'correct' : 'wrong';
            case 'ORDERING':
                const studentOrder = (answer as number[]) || [];
                const correctOrder = (question as any).correctOrder || [];
                if (studentOrder.length !== correctOrder.length) return 'wrong';
                const isOrderCorrect = studentOrder.every((val: number, idx: number) => val === correctOrder[idx]);
                return isOrderCorrect ? 'correct' : 'wrong';
            case 'CATEGORIZATION':
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
            case 'UNDERLINE':
                const studentIdxs = (answer as number[]) || [];
                const correctIdxs = (question as any).correctWordIndexes || [];
                if (studentIdxs.length !== correctIdxs.length) return 'wrong';
                const sSorted = [...studentIdxs].sort((a, b) => a - b);
                const cSorted = [...correctIdxs].sort((a, b) => a - b);
                const isUnderlineCorrect = sSorted.every((val, idx) => val === cSorted[idx]);
                return isUnderlineCorrect ? 'correct' : 'wrong';
            default:
                return 'wrong';
        }
    };

    // Calculate correct count based on server validation or getAnswerStatus
    const calculatedCorrectCount = useMemo(() => {
        // If server has validation details, count from there
        if (result.validationDetails && result.validationDetails.length > 0) {
            return result.validationDetails.filter(d => d.isCorrect).length;
        }
        // Fallback to local calculation
        return quiz.questions.filter(q => getAnswerStatus(q, answers[q.id]) === 'correct').length;
    }, [quiz.questions, answers, result.validationDetails]);

    // Use server correctCount if available, otherwise use calculated
    const displayResult: StudentResult = useMemo(() => ({
        ...result,
        correctCount: result.validationDetails?.length ? calculatedCorrectCount : result.correctCount,
        totalQuestions: result.validationDetails?.length ? result.validationDetails.length : result.totalQuestions
    }), [result, calculatedCorrectCount]);

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <OverviewTab
                        quiz={quiz}
                        result={result}
                        answers={answers}
                    />
                );
            case 'details':
                return (
                    <DetailedAnswersTab
                        quiz={quiz}
                        result={result}
                        answers={answers}
                    />
                );
            case 'statistics':
                return (
                    <StatisticsTab
                        quiz={quiz}
                        result={result}
                        answers={answers}
                    />
                );
            case 'recommendations':
                return (
                    <RecommendationsTab
                        quiz={quiz}
                        result={result}
                        answers={answers}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div
            ref={containerRef}
            className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50"
        >
            {/* Header with Score */}
            <ResultHeader
                result={displayResult}
                quizTitle={quiz.title}
                onExit={onExit}
                onExportPDF={handleExportPDF}
                onShare={handleShare}
            />

            {/* Tab Navigation */}
            <ResultTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                hasRecommendations={displayResult.correctCount < displayResult.totalQuestions}
            />

            {/* Tab Content */}
            <div className="max-w-5xl mx-auto px-4 pb-8">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {renderActiveTab()}
                </div>
            </div>
        </div>
    );
};

export default ResultScreen;

