/**
 * Results Tab Component - Enhanced Version
 * 
 * Comprehensive results analysis with charts, filters, and detailed views
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Quiz, StudentResult, Question } from '../../types';
import { showError } from '../../utils/toast';
import { Card, Button } from '../common';
import {
    StatsCards,
    ResultsTable,
    ResultsAnalytics,
    DateRangeFilter,
    QuestionAnalysisTable,
    DateRange
} from '../teacher/ResultsView';
import { useResults } from '../../hooks';
import { useQuizStore } from '../../../stores/quizStore';
import { fetchResultAnswers } from '../../services/googleSheetService';
import { RefreshCw, Download, ChevronDown, Search, FileText, Users, BarChart } from 'lucide-react';
import { checkAnswer } from '../../utils/question/scoring.util';
import {
    calculateResultsStatistics,
    analyzeQuestionDifficulty,
    filterResultsByDateRange,
    searchResultsByName
} from '../../utils/statisticsUtils';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { useNavigate } from 'react-router-dom';

interface ResultsTabProps {
    results: StudentResult[];
    quizzes: Quiz[];
    onRefresh?: () => Promise<StudentResult[]>;
}

interface ResultDisplayOverride {
    correctCount: number;
    totalQuestions: number;
    score: number;
}

const ResultsTab: React.FC<ResultsTabProps> = ({ results, quizzes, onRefresh }) => {
    const { isMobile } = useResponsiveLayout();
    const navigate = useNavigate();
    const PAGE_SIZE = 5;

    // State for filters and modals
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: null,
        endDate: null,
        label: 'Tất cả'
    });
    const [searchName, setSearchName] = useState('');
    const [isNavigatingDetail, setIsNavigatingDetail] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [activeQuizId, setActiveQuizId] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [resultOverrides, setResultOverrides] = useState<Record<string, ResultDisplayOverride>>({});

    const isAnswerSkipped = (value: any): boolean => (
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0)
    );

    const calculateOverrideFromAnswers = useCallback((result: StudentResult, answers: Record<string, any>): ResultDisplayOverride | null => {
        const answerEntries = Object.entries(answers || {}).filter(([key]) => !key.startsWith('_'));
        if (answerEntries.length === 0) return null;

        let correctedCount = 0;
        answerEntries.forEach(([questionId, answerData]) => {
            if (answerData && typeof answerData === 'object' && ('selectedAnswer' in answerData || 'questionSnapshot' in answerData)) {
                const selectedAnswer = (answerData as any).selectedAnswer;
                if (isAnswerSkipped(selectedAnswer)) return;

                const snapshot = (answerData as any).questionSnapshot;
                if (snapshot?.type) {
                    const { status } = checkAnswer(snapshot as any, selectedAnswer);
                    if (status === 'correct') correctedCount++;
                    return;
                }

                if ((answerData as any).isCorrect === true) {
                    correctedCount++;
                }
                return;
            }

            if (isAnswerSkipped(answerData)) return;
            const validation = result.validationDetails?.find(v => v.questionId === questionId);
            if (validation?.isCorrect) correctedCount++;
        });

        const totalQuestions = result.totalQuestions && result.totalQuestions > 0 ? result.totalQuestions : answerEntries.length;
        const score = totalQuestions > 0 ? Math.round((correctedCount / totalQuestions) * 100) / 10 : result.score;

        return {
            correctCount: correctedCount,
            totalQuestions,
            score,
        };
    }, []);

    // Use custom hooks for results
    const resultsHook = useResults({
        results: results,
        onRefresh: onRefresh,
    });

    // Filtered results by date range and search
    const filteredResults = useMemo(() => {
        let filtered = resultsHook.filteredResults;

        // Filter by date range
        if (dateRange.startDate || dateRange.endDate) {
            filtered = filterResultsByDateRange(
                filtered,
                dateRange.startDate ?? undefined,
                dateRange.endDate ?? undefined
            );
        }

        // Filter by search name
        if (searchName.trim()) {
            filtered = searchResultsByName(filtered, searchName);
        }

        // Filter by quiz
        if (activeQuizId !== 'all') {
            filtered = filtered.filter(r => r.quizId === activeQuizId);
        }

        return filtered;
    }, [resultsHook.filteredResults, dateRange, searchName, activeQuizId]);

    const totalPages = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));

    const paginatedResults = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredResults.slice(start, start + PAGE_SIZE);
    }, [filteredResults, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [dateRange, searchName, activeQuizId, resultsHook.filterClass, resultsHook.sortField, resultsHook.sortOrder]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    // Fetch answers for visible rows to recalculate correct/total from source data
    useEffect(() => {
        const missingRows = paginatedResults.filter(r => !resultOverrides[String(r.id)]);
        if (missingRows.length === 0) return;

        let cancelled = false;

        const loadOverrides = async () => {
            const resolved = await Promise.all(
                missingRows.map(async (result) => {
                    try {
                        const answers = await fetchResultAnswers(result.id);
                        const override = calculateOverrideFromAnswers(result, answers);
                        if (!override) return null;
                        return { id: String(result.id), override };
                    } catch {
                        return null;
                    }
                })
            );

            if (cancelled) return;

            setResultOverrides((prev) => {
                let changed = false;
                const next = { ...prev };

                resolved.forEach((item) => {
                    if (!item) return;
                    const existing = next[item.id];
                    if (
                        !existing ||
                        existing.correctCount !== item.override.correctCount ||
                        existing.totalQuestions !== item.override.totalQuestions ||
                        existing.score !== item.override.score
                    ) {
                        next[item.id] = item.override;
                        changed = true;
                    }
                });

                return changed ? next : prev;
            });
        };

        loadOverrides();

        return () => {
            cancelled = true;
        };
    }, [paginatedResults, resultOverrides, calculateOverrideFromAnswers]);

    // Calculate statistics
    const statistics = useMemo(() => {
        return calculateResultsStatistics(filteredResults);
    }, [filteredResults]);

    // Get questions for the selected quiz (for question analysis)
    const selectedQuizQuestions = useMemo(() => {
        if (activeQuizId === 'all') {
            // Get all questions from all quizzes
            return quizzes.flatMap(q => q.questions);
        }
        const quiz = quizzes.find(q => q.id === activeQuizId);
        return quiz?.questions || [];
    }, [activeQuizId, quizzes]);

    // Analyze question difficulty
    const questionAnalysis = useMemo(() => {
        if (selectedQuizQuestions.length === 0 || filteredResults.length === 0) {
            return [];
        }
        // Helper to get question text regardless of question type
        const getQuestionText = (q: Question): string => {
            if ('mainQuestion' in q) {
                return q.mainQuestion; // TrueFalseQuestion
            }
            if ('question' in q) {
                return q.question; // Most question types
            }
            return 'Unknown question';
        };

        // Map questions with all necessary fields for fallback calculation
        const questionsWithData = selectedQuizQuestions.map(q => ({
            id: q.id,
            question: getQuestionText(q),
            type: q.type,
            correctAnswer: 'correctAnswer' in q ? q.correctAnswer : undefined,
            correctAnswers: 'correctAnswers' in q ? (q as any).correctAnswers : undefined,
            items: 'items' in q ? (q as any).items : undefined,
            blanks: 'blanks' in q ? (q as any).blanks : undefined,
            pairs: 'pairs' in q ? (q as any).pairs : undefined,
            options: 'options' in q ? (q as any).options : undefined,
        }));

        return analyzeQuestionDifficulty(filteredResults, questionsWithData);
    }, [filteredResults, selectedQuizQuestions]);

    // Get unique quizzes from results
    const availableQuizzes = useMemo(() => {
        const quizMap = new Map<string, { id: string; title: string }>();
        results.forEach(r => {
            if (!quizMap.has(r.quizId)) {
                const quiz = quizzes.find(q => q.id === r.quizId);
                quizMap.set(r.quizId, {
                    id: r.quizId,
                    title: quiz?.title || r.quizTitle || 'Unknown Quiz'
                });
            }
        });
        return Array.from(quizMap.values());
    }, [results, quizzes]);

    // Export functions
    const exportCSV = () => {
        const data = filteredResults.map(r => ({
            'Học sinh': r.studentName,
            'Lớp': r.studentClass,
            'Điểm': r.score,
            'Số câu đúng': r.correctCount,
            'Tổng câu': r.totalQuestions,
            'Thời gian (phút)': r.timeTaken,
            'Ngày nộp': new Date(r.submittedAt).toLocaleString('vi-VN'),
        }));

        const headers = Object.keys(data[0] || {}).join(',');
        const rows = data.map(row => Object.values(row).join(',')).join('\n');
        const csv = `${headers}\n${rows}`;

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ket-qua-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        setShowExportMenu(false);
    };

    const exportSummaryReport = () => {
        const report = `
BÁO CÁO TỔNG HỢP KẾT QUẢ
========================
Ngày xuất: ${new Date().toLocaleString('vi-VN')}

THỐNG KÊ CHUNG
--------------
Tổng số bài làm: ${statistics.totalResults}
Điểm trung bình: ${statistics.mean}
Điểm trung vị: ${statistics.median}
Độ lệch chuẩn: ${statistics.stdDev}
Điểm cao nhất: ${statistics.max}
Điểm thấp nhất: ${statistics.min}

TỶ LỆ ĐẠT/KHÔNG ĐẠT
-------------------
Đạt (≥5đ): ${statistics.passCount} học sinh (${statistics.passRate}%)
Không đạt (<5đ): ${statistics.failCount} học sinh

PHÂN BỐ ĐIỂM SỐ
---------------
${statistics.scoreDistribution.map(d => `${d.range}: ${d.count} học sinh (${d.percentage.toFixed(1)}%)`).join('\n')}
        `;

        const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bao-cao-tong-hop-${new Date().toISOString().slice(0, 10)}.txt`;
        link.click();
        setShowExportMenu(false);
    };

    const handleViewDetail = useCallback((result: StudentResult) => {
        setIsNavigatingDetail(true);
        navigate(`/teacher/results/${encodeURIComponent(String(result.id))}`);
    }, [navigate]);

    return (
        <div className="space-y-6">
            {/* Top Filter Bar */}
            <div className="bg-white rounded-xl border p-3 md:p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                    {/* Date Range Filter */}
                    <DateRangeFilter value={dateRange} onChange={setDateRange} />

                    {/* Quiz Filter */}
                    <select
                        value={activeQuizId}
                        onChange={(e) => setActiveQuizId(e.target.value)}
                        className="px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 text-sm w-full sm:w-auto"
                    >
                        <option value="all">Tất cả bài kiểm tra</option>
                        {availableQuizzes.map(quiz => (
                            <option key={quiz.id} value={quiz.id}>
                                {quiz.title}
                            </option>
                        ))}
                    </select>

                    {/* Class Filter */}
                    <select
                        value={resultsHook.filterClass}
                        onChange={(e) => resultsHook.setFilterClass(e.target.value)}
                        className="px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 text-sm w-full sm:w-auto"
                    >
                        <option value="All">Tất cả lớp</option>
                        {resultsHook.availableClasses.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                        ))}
                    </select>

                    {/* Search */}
                    <div className="relative w-full sm:flex-1 sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm học sinh..."
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                        />
                    </div>

                    <div className={`flex items-center gap-2 ${isMobile ? 'w-full justify-end' : 'ml-auto'}`}>
                        {/* Refresh Button */}
                        <Button
                            onClick={resultsHook.handleRefresh}
                            loading={resultsHook.isRefreshing}
                            variant="secondary"
                            icon={<RefreshCw className="w-4 h-4" />}
                        >
                            Làm mới
                        </Button>

                        {/* Export Dropdown */}
                        <div className="relative">
                            <Button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                variant="success"
                                icon={<Download className="w-4 h-4" />}
                            >
                                Xuất <ChevronDown className="w-4 h-4 ml-1" />
                            </Button>
                            {showExportMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowExportMenu(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border shadow-lg z-50">
                                        <button
                                            onClick={exportCSV}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-xl"
                                        >
                                            <FileText className="w-4 h-4 text-green-600" />
                                            Xuất Excel (CSV)
                                        </button>
                                        <button
                                            onClick={exportSummaryReport}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                                        >
                                            <BarChart className="w-4 h-4 text-purple-600" />
                                            Báo cáo tổng hợp
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Active filters display */}
                {(dateRange.label !== 'Tất cả' || searchName || activeQuizId !== 'all') && (
                    <div className="mt-3 pt-3 border-t flex flex-wrap gap-2 items-center text-sm">
                        <span className="text-gray-500">Đang lọc:</span>
                        {dateRange.label !== 'Tất cả' && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                📅 {dateRange.label}
                            </span>
                        )}
                        {activeQuizId !== 'all' && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                                📝 {availableQuizzes.find(q => q.id === activeQuizId)?.title}
                            </span>
                        )}
                        {searchName && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                🔍 "{searchName}"
                            </span>
                        )}
                        <button
                            onClick={() => {
                                setDateRange({ startDate: null, endDate: null, label: 'Tất cả' });
                                setSearchName('');
                                setActiveQuizId('all');
                            }}
                            className="text-red-600 hover:text-red-700 ml-2"
                        >
                            Xóa bộ lọc
                        </button>
                    </div>
                )}
            </div>

            {/* Results Table */}
            <Card padding="none">
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Users className="w-5 h-5 text-orange-500" />
                        Danh sách kết quả ({filteredResults.length})
                    </h3>
                </div>
                <ResultsTable
                    results={paginatedResults}
                    quizzes={quizzes}
                    resultOverrides={resultOverrides}
                    sortField={resultsHook.sortField}
                    sortOrder={resultsHook.sortOrder}
                    onSortChange={(field) => {
                        if (field === resultsHook.sortField) {
                            resultsHook.setSortOrder(resultsHook.sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                            resultsHook.setSortField(field);
                            resultsHook.setSortOrder('desc');
                        }
                    }}
                    onRowClick={handleViewDetail}
                    isLoading={isNavigatingDetail}
                    onDeleteClick={async (result) => {
                        try {
                            await useQuizStore.getState().removeResult(result.id);
                        } catch (err: unknown) {
                            const normalizedError = err instanceof Error ? err : new Error(String(err));
                            showError('Loi: ' + normalizedError.message);
                        }
                    }}
                />

                {filteredResults.length > PAGE_SIZE && (
                    <div className="p-4 border-t flex items-center justify-between bg-gray-50">
                        <p className="text-sm text-gray-600">
                            Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredResults.length)} / {filteredResults.length} kết quả
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 text-sm border rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Trước
                            </button>
                            <span className="text-sm font-medium text-gray-700">
                                Trang {currentPage}/{totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 text-sm border rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Question Analysis */}
            {activeQuizId !== 'all' && questionAnalysis.length > 0 && (
                <QuestionAnalysisTable analysis={questionAnalysis} showTopMissed={5} />
            )}

            {/* Empty State */}
            {filteredResults.length === 0 && (
                <Card>
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">📊</div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                            Chưa có kết quả
                        </h3>
                        <p className="text-gray-500">
                            Chưa có học sinh nào làm bài hoặc không tìm thấy kết quả phù hợp với bộ lọc.
                        </p>
                    </div>
                </Card>
            )}

        </div>
    );
};

export default ResultsTab;
