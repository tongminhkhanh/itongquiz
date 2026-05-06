import React, { useMemo } from 'react';
import { useQuizStore } from '../../stores/useQuizStore';
import { useAuthStore } from '../../../stores/authStore';
import { FileText, CheckCircle, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { calculateResultsStatistics } from '../../utils/statisticsUtils';
import { ResultsAnalytics } from '../teacher/ResultsView/ResultsAnalytics';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactElement;
    valueClassName?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, valueClassName = 'text-slate-900' }) => (
    <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500 mb-2">{title}</p>
                <h3 className={`text-4xl font-black ${valueClassName}`}>{value}</h3>
            </div>
            <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200">
                {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-6 h-6 text-slate-500' })}
            </div>
        </div>
    </div>
);

const OverviewTab: React.FC = () => {
    const authStore = useAuthStore();
    const quizStore = useQuizStore();

    const filteredResults = useMemo(() => {
        return authStore.isAdmin || !authStore.teacherClass
            ? quizStore.results
            : quizStore.results.filter(r => {
                const stuClass = (r.studentClass || '').toLowerCase().replace(/\s+/g, '');
                const teaClass = (authStore.teacherClass || '').toLowerCase().replace(/\s+/g, '');
                return stuClass.includes(teaClass) || teaClass.includes(stuClass);
            });
    }, [quizStore.results, authStore.isAdmin, authStore.teacherClass]);

    const statistics = useMemo(() => calculateResultsStatistics(filteredResults), [filteredResults]);

    const stats = useMemo(() => {
        return {
            totalQuizzes: quizStore.quizzes.length,
            totalResults: statistics.totalResults,
            avgScore: statistics.mean.toFixed(1),
            uniqueStudents: new Set(filteredResults.map(r => r.studentName)).size
        };
    }, [quizStore.quizzes, statistics, filteredResults]);

    const recentActivities = filteredResults
        .slice()
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        .slice(0, 5);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-900">Tổng quan</h2>
                    <p className="text-slate-500 mt-2 text-lg">
                        Chào ngày mới, {authStore.teacherName || 'Cô/Thầy'}! Đây là tình hình hôm nay.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <StatCard
                    title="Đề kiểm tra"
                    value={stats.totalQuizzes}
                    icon={<FileText />}
                />
                <StatCard
                    title="Điểm trung bình"
                    value={stats.avgScore}
                    icon={<TrendingUp />}
                />
                <StatCard
                    title="Số bài đã nộp"
                    value={stats.totalResults}
                    icon={<CheckCircle />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                <div className="lg:col-span-2">
                    <ResultsAnalytics statistics={statistics} hideStats={true} />
                </div>

                <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-7">
                        <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200">
                            <Clock className="w-5 h-5 text-slate-600" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900">Vừa nộp bài</h3>
                    </div>

                    {recentActivities.length > 0 ? (
                        <div className="space-y-5">
                            {recentActivities.map((result, idx) => {
                                const score = Number(result.score || 0);
                                const isPass = score >= 5;

                                return (
                                    <div key={idx} className="flex items-start gap-4">
                                        <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                                            <span className="text-blue-700 font-bold text-xs">
                                                {result.studentName.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">
                                                {result.studentName} <span className="font-normal text-slate-500">vừa nộp</span> {result.quizTitle}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${isPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {isPass ? `Đạt ${score} điểm` : `Chưa đạt ${score} điểm`}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(result.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Sparkles className="w-9 h-9 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm">Chưa có ai nộp bài hôm nay.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OverviewTab;
