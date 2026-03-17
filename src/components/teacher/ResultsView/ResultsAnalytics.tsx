/**
 * Results Analytics Component
 * 
 * Displays charts and statistics for quiz results
 */

import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Target, Users, Award, Clock } from 'lucide-react';
import { ResultsStatistics } from '../../../utils/statisticsUtils';

interface ResultsAnalyticsProps {
    statistics: ResultsStatistics;
    hideStats?: boolean;
}

// Colors for charts
const COLORS = {
    pass: '#22c55e',
    fail: '#ef4444',
    histogram: ['#fbbf24', '#f97316', '#22c55e', '#3b82f6', '#8b5cf6'],
};

export const ResultsAnalytics: React.FC<ResultsAnalyticsProps> = ({ statistics, hideStats = false }) => {
    // Pie chart data for pass/fail
    const passFailData = [
        { name: 'Đạt (≥5đ)', value: statistics.passCount, color: COLORS.pass },
        { name: 'Không đạt (<5đ)', value: statistics.failCount, color: COLORS.fail },
    ].filter(d => d.value > 0);

    // Histogram data
    const histogramData = statistics.scoreDistribution.map((item, idx) => ({
        ...item,
        fill: COLORS.histogram[idx],
    }));

    return (
        <div className="space-y-6">
            {/* Enhanced Stats Cards */}
            {!hideStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <StatCard
                        icon={<Users className="w-5 h-5 text-blue-600" />}
                        label="Tổng bài làm"
                        value={statistics.totalResults}
                        className="bg-blue-50 border-blue-200"
                    />
                    <StatCard
                        icon={<Target className="w-5 h-5 text-orange-600" />}
                        label="Điểm TB"
                        value={statistics.mean}
                        suffix="điểm"
                        className="bg-orange-50 border-orange-200"
                    />
                    <StatCard
                        icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
                        label="Trung vị"
                        value={statistics.median}
                        suffix="điểm"
                        className="bg-purple-50 border-purple-200"
                    />
                    <StatCard
                        icon={<Award className="w-5 h-5 text-green-600" />}
                        label="Tỷ lệ đạt"
                        value={statistics.passRate}
                        suffix="%"
                        className="bg-green-50 border-green-200"
                        trend={statistics.passRate >= 70 ? 'up' : statistics.passRate >= 50 ? 'neutral' : 'down'}
                    />
                    <StatCard
                        icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
                        label="Điểm cao nhất"
                        value={statistics.max}
                        className="bg-emerald-50 border-emerald-200"
                    />
                    <StatCard
                        icon={<TrendingDown className="w-5 h-5 text-red-600" />}
                        label="Điểm thấp nhất"
                        value={statistics.min}
                        className="bg-red-50 border-red-200"
                    />
                </div>
            )}

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Score Distribution Histogram */}
                <div className="bg-white rounded-xl border p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        📊 Phân bố điểm số
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={histogramData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="range"
                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                />
                                <YAxis
                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                    label={{ value: 'Số học sinh', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                    }}
                                    formatter={(value: number, name: string) => [
                                        `${value} học sinh`,
                                        'Số lượng'
                                    ]}
                                />
                                <Bar
                                    dataKey="count"
                                    radius={[8, 8, 0, 0]}
                                    maxBarSize={60}
                                >
                                    {histogramData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pass/Fail Pie Chart */}
                <div className="bg-white rounded-xl border p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        🎯 Tỷ lệ Đạt / Không đạt
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={passFailData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {passFailData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    formatter={(value) => (
                                        <span className="text-gray-600 text-sm">{value}</span>
                                    )}
                                />
                                <Tooltip
                                    formatter={(value: number) => [`${value} học sinh`, '']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Summary text */}
                    <div className="mt-4 text-center text-sm">
                        <span className="text-green-600 font-medium">{statistics.passCount} đạt</span>
                        <span className="text-gray-400 mx-2">/</span>
                        <span className="text-red-600 font-medium">{statistics.failCount} không đạt</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Stat Card Component
interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    suffix?: string;
    className?: string;
    trend?: 'up' | 'down' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, suffix, className, trend }) => {
    return (
        <div className={`rounded-xl border p-4 ${className}`}>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs text-gray-600 font-medium">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-800">{value}</span>
                {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
            </div>
            {trend && (
                <div className={`text-xs mt-1 ${trend === 'up' ? 'text-green-600' :
                    trend === 'down' ? 'text-red-600' : 'text-gray-500'
                    }`}>
                    {trend === 'up' && '↑ Tốt'}
                    {trend === 'down' && '↓ Cần cải thiện'}
                </div>
            )}
        </div>
    );
};

export default ResultsAnalytics;
