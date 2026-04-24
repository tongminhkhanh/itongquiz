import React from 'react';
import { BarChart } from 'recharts/es6/chart/BarChart';
import { PieChart } from 'recharts/es6/chart/PieChart';
import { Bar } from 'recharts/es6/cartesian/Bar';
import { XAxis } from 'recharts/es6/cartesian/XAxis';
import { YAxis } from 'recharts/es6/cartesian/YAxis';
import { CartesianGrid } from 'recharts/es6/cartesian/CartesianGrid';
import { Tooltip } from 'recharts/es6/component/Tooltip';
import { ResponsiveContainer } from 'recharts/es6/component/ResponsiveContainer';
import { Cell } from 'recharts/es6/component/Cell';
import { Legend } from 'recharts/es6/component/Legend';
import { Pie } from 'recharts/es6/polar/Pie';
import { TrendingUp, TrendingDown, Target, Users, Award } from 'lucide-react';
import { ResultsStatistics } from '../../../utils/statisticsUtils';

interface ResultsAnalyticsProps {
    statistics: ResultsStatistics;
    hideStats?: boolean;
}

const COLORS = {
    pass: '#16a34a',
    fail: '#ef4444',
};

const INDIGO_MONO_SCALE = ['#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#3730a3'];

const pickHistogramColor = (count: number, maxCount: number) => {
    if (maxCount <= 0) return INDIGO_MONO_SCALE[0];
    const ratio = count / maxCount;
    const index = Math.min(
        INDIGO_MONO_SCALE.length - 1,
        Math.max(0, Math.floor(ratio * INDIGO_MONO_SCALE.length))
    );
    return INDIGO_MONO_SCALE[index];
};

type StatTone = 'neutral' | 'success' | 'danger';

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    suffix?: string;
    tone?: StatTone;
    trend?: 'up' | 'down' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, suffix, tone = 'neutral', trend }) => {
    const valueColor =
        tone === 'success' ? 'text-green-600' :
            tone === 'danger' ? 'text-red-600' :
                'text-slate-900';

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                <span className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500">
                    {icon}
                </span>
                <span className="text-xs text-slate-500 font-semibold">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-black ${valueColor}`}>{value}</span>
                {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
            </div>
            {trend && (
                <div className={`text-xs mt-1 ${trend === 'up' ? 'text-green-600' :
                    trend === 'down' ? 'text-red-600' : 'text-slate-500'
                    }`}>
                    {trend === 'up' && '↑ Tốt'}
                    {trend === 'down' && '↓ Cần cải thiện'}
                </div>
            )}
        </div>
    );
};

export const ResultsAnalytics: React.FC<ResultsAnalyticsProps> = ({ statistics, hideStats = false }) => {
    const passFailData = [
        { name: 'Đạt (≥5đ)', value: statistics.passCount, color: COLORS.pass },
        { name: 'Không đạt (<5đ)', value: statistics.failCount, color: COLORS.fail },
    ].filter(d => d.value > 0);

    const maxHistogramCount = Math.max(...statistics.scoreDistribution.map(item => item.count), 0);
    const histogramData = statistics.scoreDistribution.map((item) => ({
        ...item,
        fill: pickHistogramColor(item.count, maxHistogramCount),
    }));

    return (
        <div className="space-y-8">
            {!hideStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5">
                    <StatCard
                        icon={<Users className="w-5 h-5" />}
                        label="Tổng bài làm"
                        value={statistics.totalResults}
                    />
                    <StatCard
                        icon={<Target className="w-5 h-5" />}
                        label="Điểm TB"
                        value={statistics.mean}
                        suffix="điểm"
                    />
                    <StatCard
                        icon={<TrendingUp className="w-5 h-5" />}
                        label="Trung vị"
                        value={statistics.median}
                        suffix="điểm"
                    />
                    <StatCard
                        icon={<Award className="w-5 h-5" />}
                        label="Tỷ lệ đạt"
                        value={statistics.passRate}
                        suffix="%"
                        tone={statistics.passRate >= 50 ? 'success' : 'danger'}
                        trend={statistics.passRate >= 70 ? 'up' : statistics.passRate >= 50 ? 'neutral' : 'down'}
                    />
                    <StatCard
                        icon={<TrendingUp className="w-5 h-5" />}
                        label="Điểm cao nhất"
                        value={statistics.max}
                    />
                    <StatCard
                        icon={<TrendingDown className="w-5 h-5" />}
                        label="Điểm thấp nhất"
                        value={statistics.min}
                        tone={statistics.min < 5 ? 'danger' : 'neutral'}
                    />
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl border border-slate-200 p-7 shadow-sm">
                    <h3 className="text-3xl font-black text-slate-900 mb-5">
                        Phân bố điểm số
                    </h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={histogramData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    label={{ value: 'Số học sinh', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 25px -5px rgba(15,23,42,0.08)'
                                    }}
                                    formatter={(value: number) => [`${value} học sinh`, 'Số lượng']}
                                />
                                <Bar dataKey="count" radius={[12, 12, 0, 0]} maxBarSize={64}>
                                    {histogramData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 p-7 shadow-sm">
                    <h3 className="text-3xl font-black text-slate-900 mb-5">
                        Tỷ lệ Đạt / Không đạt
                    </h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={passFailData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={68}
                                    outerRadius={100}
                                    paddingAngle={4}
                                    dataKey="value"
                                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {passFailData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    formatter={(value) => <span className="text-slate-600 text-sm">{value}</span>}
                                />
                                <Tooltip formatter={(value: number) => [`${value} học sinh`, '']} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-5 text-center text-sm">
                        <span className="text-green-600 font-semibold">{statistics.passCount} đạt</span>
                        <span className="text-slate-400 mx-2">/</span>
                        <span className="text-red-600 font-semibold">{statistics.failCount} không đạt</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultsAnalytics;
