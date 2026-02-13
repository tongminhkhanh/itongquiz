/**
 * Results Tab Component - Enhanced Version
 * 
 * Comprehensive results analysis with charts, filters, and detailed views
 */

import React, { useState, useMemo } from 'react';
import { Quiz, StudentResult, Question } from '../../types';
import { Card, Button } from '../common';
import {
    StatsCards,
    ResultsTable,
    ResultsAnalytics,
    DateRangeFilter,
    StudentDetailModal,
    QuestionAnalysisTable,
    DateRange
} from '../teacher/ResultsView';
import { useResults } from '../../hooks';
import { RefreshCw, Download, ChevronDown, Search, FileText, Users, BarChart } from 'lucide-react';
import {
    calculateResultsStatistics,
    analyzeQuestionDifficulty,
    filterResultsByDateRange,
    searchResultsByName
} from '../../utils/statisticsUtils';

interface ResultsTabProps {
    results: StudentResult[];
    quizzes: Quiz[];
    onRefresh?: () => Promise<StudentResult[]>;
}

const ResultsTab: React.FC<ResultsTabProps> = ({ results, quizzes, onRefresh }) => {
    // State for filters and modals
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: null,
        endDate: null,
        label: 'Tất cả'
    });
    const [searchName, setSearchName] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [activeQuizId, setActiveQuizId] = useState<string>('all');

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

    // Get questions for student detail modal
    const getQuestionsForResult = (result: StudentResult): Question[] => {
        const quiz = quizzes.find(q => q.id === result.quizId);
        return quiz?.questions || [];
    };

    return (
        <div className="space-y-6">
            {/* Top Filter Bar */}
            <div className="bg-white rounded-xl border p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Date Range Filter */}
                    <DateRangeFilter value={dateRange} onChange={setDateRange} />

                    {/* Quiz Filter */}
                    <select
                        value={activeQuizId}
                        onChange={(e) => setActiveQuizId(e.target.value)}
                        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
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
                        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                    >
                        <option value="All">Tất cả lớp</option>
                        {resultsHook.availableClasses.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                        ))}
                    </select>

                    {/* Search */}
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm học sinh..."
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
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

            {/* Analytics Charts */}
            {filteredResults.length > 0 && (
                <ResultsAnalytics statistics={statistics} />
            )}

            {/* Results Table */}
            <Card padding="none">
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Users className="w-5 h-5 text-orange-500" />
                        Danh sách kết quả ({filteredResults.length})
                    </h3>
                </div>
                <ResultsTable
                    results={filteredResults}
                    quizzes={quizzes}
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
                    onRowClick={(result) => setSelectedStudent(result)}
                />
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

            {/* Student Detail Modal */}
            {selectedStudent && (
                <StudentDetailModal
                    result={selectedStudent}
                    questions={getQuestionsForResult(selectedStudent)}
                    onClose={() => setSelectedStudent(null)}
                />
            )}
        </div>
    );
};

export default ResultsTab;
