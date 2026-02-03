import React, { useState, useEffect, useRef } from 'react';
import { Quiz, StudentResult, Question } from '../../../types';
import { renderMathJax } from '../../../hooks/useMathJax';

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
}

export type TabType = 'overview' | 'details' | 'statistics' | 'recommendations';

const ResultScreen: React.FC<Props> = ({ quiz, result, answers, onExit }) => {
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

    // Calculate stats for tabs
    const wrongQuestions = quiz.questions.filter((q) => {
        // Logic to determine if answer is wrong - simplified
        const answer = answers[q.id];
        if (!answer) return true; // Unanswered counts as wrong
        // More complex logic will be in individual components
        return false;
    });

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
                result={result}
                quizTitle={quiz.title}
                onExit={onExit}
            />

            {/* Tab Navigation */}
            <ResultTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                hasRecommendations={result.correctCount < result.totalQuestions}
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
