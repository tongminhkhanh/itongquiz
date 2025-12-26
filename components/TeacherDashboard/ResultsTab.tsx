import React from 'react';
import { Quiz, StudentResult } from '../../types';
import { Card, Button } from '../../src/components/common';
import { StatsCards, ResultsTable } from '../../src/components/teacher/ResultsView';
import { useResults } from '../../src/hooks';
import { RefreshCw, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface ResultsTabProps {
    results: StudentResult[];
    quizzes: Quiz[];
    onRefresh?: () => Promise<StudentResult[]>;
}

// Helper function for score distribution chart
const getScoreDistribution = (results: StudentResult[]) => {
    const ranges = ['0-2', '3-4', '5-6', '7-8', '9-10'];
    const counts = [0, 0, 0, 0, 0];

    results.forEach(r => {
        if (r.score <= 2) counts[0]++;
        else if (r.score <= 4) counts[1]++;
        else if (r.score <= 6) counts[2]++;
        else if (r.score <= 8) counts[3]++;
        else counts[4]++;
    });

    return ranges.map((range, i) => ({ range, count: counts[i] }));
};

const ResultsTab: React.FC<ResultsTabProps> = ({ results, quizzes, onRefresh }) => {
    // Use custom hooks for results
    const resultsHook = useResults({
        results: results,
        onRefresh: onRefresh,
    });

    // Export to Excel
    const exportExcel = () => {
        const data = resultsHook.filteredResults.map(r => ({
            'Học sinh': r.studentName,
            'Lớp': r.studentClass,
            'Điểm': r.score,
            'Số câu đúng': r.correctCount,
            'Tổng câu': r.totalQuestions,
            'Thời gian (phút)': r.timeTaken,
            'Ngày nộp': new Date(r.submittedAt).toLocaleString('vi-VN'),
        }));

        // Simple CSV export
        const headers = Object.keys(data[0] || {}).join(',');
        const rows = data.map(row => Object.values(row).join(',')).join('\n');
        const csv = `${headers}\n${rows}`;

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ket-qua-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <StatsCards stats={resultsHook.stats} />

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <select
                    value={resultsHook.filterClass}
                    onChange={(e) => resultsHook.setFilterClass(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                    <option value="All">Tất cả lớp</option>
                    {resultsHook.availableClasses.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                    ))}
                </select>

                <Button
                    onClick={resultsHook.handleRefresh}
                    loading={resultsHook.isRefreshing}
                    variant="secondary"
                    icon={<RefreshCw className="w-4 h-4" />}
                >
                    Làm mới
                </Button>

                <Button
                    onClick={exportExcel}
                    variant="success"
                    icon={<Download className="w-4 h-4" />}
                >
                    Xuất Excel
                </Button>
            </div>

            {/* Results Table */}
            <Card padding="none">
                <ResultsTable
                    results={resultsHook.filteredResults}
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
                />
            </Card>

            {/* Chart */}
            {resultsHook.filteredResults.length > 0 && (
                <Card title="Phân bố điểm số">
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getScoreDistribution(resultsHook.filteredResults)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="range" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default ResultsTab;
