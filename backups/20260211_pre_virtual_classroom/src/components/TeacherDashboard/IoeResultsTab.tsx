import React, { useState, useEffect, useMemo } from 'react';
import { StudentResult } from '../../types';
import { Card, Button } from '../common';
import { fetchIoeResults } from '../../services/ioeSheetService';
import { RefreshCw, Download, Globe, Users, Award, TrendingUp, ChevronUp, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const IoeResultsTab: React.FC = () => {
    // State
    const [results, setResults] = useState<StudentResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterClass, setFilterClass] = useState('All');
    const [sortField, setSortField] = useState<'submittedAt' | 'score' | 'studentName'>('submittedAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Load results on mount
    useEffect(() => {
        loadResults();
    }, []);

    const loadResults = async () => {
        setIsLoading(true);
        try {
            const data = await fetchIoeResults();
            setResults(data);
        } catch (error) {
            console.error('[IOE ResultsTab] Error loading results:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Get available classes
    const availableClasses = useMemo(() => {
        const classes = new Set(results.map(r => r.studentClass));
        return Array.from(classes).sort();
    }, [results]);

    // Filter and sort results
    const filteredResults = useMemo(() => {
        let filtered = results.filter(r => {
            return filterClass === 'All' || r.studentClass === filterClass;
        });

        // Sort
        filtered.sort((a, b) => {
            let valueA: any, valueB: any;
            switch (sortField) {
                case 'score':
                    valueA = a.score;
                    valueB = b.score;
                    break;
                case 'studentName':
                    valueA = a.studentName.toLowerCase();
                    valueB = b.studentName.toLowerCase();
                    break;
                case 'submittedAt':
                default:
                    valueA = new Date(a.submittedAt).getTime();
                    valueB = new Date(b.submittedAt).getTime();
            }

            if (sortOrder === 'asc') {
                return valueA > valueB ? 1 : -1;
            } else {
                return valueA < valueB ? 1 : -1;
            }
        });

        return filtered;
    }, [results, filterClass, sortField, sortOrder]);

    // Calculate stats
    const stats = useMemo(() => {
        if (filteredResults.length === 0) {
            return { total: 0, average: 0, passRate: 0, highest: 0 };
        }

        const scores = filteredResults.map(r => r.score);
        const total = filteredResults.length;
        const average = scores.reduce((a, b) => a + b, 0) / total;
        const passCount = scores.filter(s => s >= 5).length;
        const passRate = (passCount / total) * 100;
        const highest = Math.max(...scores);

        return { total, average, passRate, highest };
    }, [filteredResults]);

    // Score distribution for chart
    const scoreDistribution = useMemo(() => {
        const ranges = ['0-2', '3-4', '5-6', '7-8', '9-10'];
        const counts = [0, 0, 0, 0, 0];

        filteredResults.forEach(r => {
            if (r.score <= 2) counts[0]++;
            else if (r.score <= 4) counts[1]++;
            else if (r.score <= 6) counts[2]++;
            else if (r.score <= 8) counts[3]++;
            else counts[4]++;
        });

        return ranges.map((range, i) => ({ range, count: counts[i] }));
    }, [filteredResults]);

    // Handle sort
    const handleSort = (field: typeof sortField) => {
        if (field === sortField) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    // Export to CSV
    const exportExcel = () => {
        if (filteredResults.length === 0) return;

        const data = filteredResults.map(r => ({
            'Học sinh': r.studentName,
            'Lớp': r.studentClass,
            'Đề thi': r.quizTitle,
            'Điểm': r.score,
            'Số câu đúng': r.correctCount,
            'Tổng câu': r.totalQuestions,
            'Ngày nộp': new Date(r.submittedAt).toLocaleString('vi-VN'),
        }));

        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).join(',')).join('\n');
        const csv = `${headers}\n${rows}`;

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ioe-ket-qua-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    // Sort icon
    const SortIcon = ({ field }: { field: typeof sortField }) => {
        if (sortField !== field) return null;
        return sortOrder === 'asc'
            ? <ChevronUp className="w-4 h-4 inline" />
            : <ChevronDown className="w-4 h-4 inline" />;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-xl">
                        <Globe className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Kết quả IOE</h2>
                        <p className="text-sm text-gray-500">{results.length} bài làm</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-blue-600">Tổng bài làm</p>
                            <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-green-600">Điểm TB</p>
                            <p className="text-2xl font-bold text-green-800">{stats.average.toFixed(1)}</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500 rounded-lg">
                            <Award className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-purple-600">Tỉ lệ đạt</p>
                            <p className="text-2xl font-bold text-purple-800">{stats.passRate.toFixed(0)}%</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500 rounded-lg">
                            <Award className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-orange-600">Điểm cao nhất</p>
                            <p className="text-2xl font-bold text-orange-800">{stats.highest}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                >
                    <option value="All">Tất cả lớp</option>
                    {availableClasses.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                    ))}
                </select>

                <Button
                    onClick={loadResults}
                    loading={isLoading}
                    variant="secondary"
                    icon={<RefreshCw className="w-4 h-4" />}
                >
                    Làm mới
                </Button>

                <Button
                    onClick={exportExcel}
                    disabled={filteredResults.length === 0}
                    variant="success"
                    icon={<Download className="w-4 h-4" />}
                >
                    Xuất Excel
                </Button>
            </div>

            {/* Results Table */}
            {isLoading ? (
                <div className="text-center py-12">
                    <RefreshCw className="w-8 h-8 text-green-500 animate-spin mx-auto mb-2" />
                    <p className="text-gray-500">Đang tải kết quả IOE...</p>
                </div>
            ) : filteredResults.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Chưa có kết quả IOE nào.</p>
                </div>
            ) : (
                <>
                    <Card padding="none">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">#</th>
                                        <th
                                            className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                                            onClick={() => handleSort('studentName')}
                                        >
                                            Học sinh <SortIcon field="studentName" />
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Lớp</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Đề thi</th>
                                        <th
                                            className="px-4 py-3 text-center text-sm font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                                            onClick={() => handleSort('score')}
                                        >
                                            Điểm <SortIcon field="score" />
                                        </th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Số câu đúng</th>
                                        <th
                                            className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                                            onClick={() => handleSort('submittedAt')}
                                        >
                                            Thời gian nộp <SortIcon field="submittedAt" />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredResults.map((result, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                                            <td className="px-4 py-3 font-medium text-gray-800">{result.studentName}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{result.studentClass}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{result.quizTitle}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold ${result.score >= 8 ? 'bg-green-100 text-green-700' :
                                                        result.score >= 5 ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                    }`}>
                                                    {result.score}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-600">
                                                {result.correctCount}/{result.totalQuestions}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {new Date(result.submittedAt).toLocaleString('vi-VN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Chart */}
                    <Card title="📊 Phân bố điểm IOE">
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={scoreDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="range" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};

export default IoeResultsTab;
