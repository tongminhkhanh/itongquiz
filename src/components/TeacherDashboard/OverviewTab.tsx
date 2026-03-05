import React, { useMemo } from 'react';
import { useQuizStore } from '../../../stores/quizStore';
import { useAuthStore } from '../../../stores/authStore';
import { Users, FileText, CheckCircle, Clock, TrendingUp, Sparkles, Activity } from 'lucide-react';

const OverviewTab: React.FC = () => {
    const authStore = useAuthStore();
    const quizStore = useQuizStore();

    // Lọc results nếu là GV bộ môn
    const filteredResults = useMemo(() => {
        return authStore.isAdmin || !authStore.teacherClass
            ? quizStore.results
            : quizStore.results.filter(r => r.studentClass === authStore.teacherClass);
    }, [quizStore.results, authStore.isAdmin, authStore.teacherClass]);

    // Tính toán thống kê
    const stats = useMemo(() => {
        const totalQuizzes = quizStore.quizzes.length;
        const totalResults = filteredResults.length;

        // Tính điểm trung bình
        const validScores = filteredResults.filter(r => r.score !== undefined && r.score !== null);
        const avgScore = validScores.length > 0
            ? (validScores.reduce((sum, r) => sum + Number(r.score), 0) / validScores.length).toFixed(1)
            : '0.0';

        // Đếm số học sinh duy nhất (dựa trên tên học sinh)
        const uniqueStudents = new Set(filteredResults.map(r => r.studentName)).size;

        return {
            totalQuizzes,
            totalResults,
            avgScore,
            uniqueStudents
        };
    }, [quizStore.quizzes, filteredResults]);

    const StatCard = ({ title, value, icon, colorClass, bgClass }: any) => (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${bgClass}`}>
                    {React.cloneElement(icon, { className: `w-6 h-6 ${colorClass}` })}
                </div>
            </div>
        </div>
    );

    // Mock hoạt động gần đây
    const recentActivities = filteredResults
        .slice()
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        .slice(0, 5);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Tổng quan</h2>
                    <p className="text-gray-500 mt-1">
                        Chào ngày mới, {authStore.teacherName || 'Cô/Thầy'}! Đây là tình hình hôm nay.
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Học sinh tương tác"
                    value={stats.uniqueStudents}
                    icon={<Users />}
                    colorClass="text-blue-600"
                    bgClass="bg-blue-100"
                />
                <StatCard
                    title="Đề kiểm tra"
                    value={stats.totalQuizzes}
                    icon={<FileText />}
                    colorClass="text-purple-600"
                    bgClass="bg-purple-100"
                />
                <StatCard
                    title="Điểm trung bình"
                    value={stats.avgScore}
                    icon={<TrendingUp />}
                    colorClass="text-green-600"
                    bgClass="bg-green-100"
                />
                <StatCard
                    title="Số bài đã nộp"
                    value={stats.totalResults}
                    icon={<CheckCircle />}
                    colorClass="text-orange-600"
                    bgClass="bg-orange-100"
                />
            </div>

            {/* Info Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                {/* Left: TBD Chart placeholder */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Activity className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Biểu đồ kết quả</h3>
                    </div>
                    <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <TrendingUp className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-gray-500 font-medium text-sm">Chưa có đủ dữ liệu biểu đồ</p>
                        <p className="text-gray-400 text-xs mt-1">Số liệu sẽ hiển thị khi có nhiều bài nộp hơn.</p>
                    </div>
                </div>

                {/* Right: Activity Feed */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Vừa nộp bài</h3>
                    </div>

                    {recentActivities.length > 0 ? (
                        <div className="space-y-4">
                            {recentActivities.map((result, idx) => (
                                <div key={idx} className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-1">
                                        <span className="text-orange-600 font-bold text-xs">
                                            {result.studentName.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">
                                            {result.studentName} <span className="font-normal text-gray-500">vừa nộp</span> {result.quizTitle}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1 display-flex">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${Number(result.score) >= 8 ? 'bg-green-100 text-green-700' :
                                                Number(result.score) >= 5 ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                Đạt {result.score} điểm
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(result.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">Chưa có ai nộp bài hôm nay.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OverviewTab;
