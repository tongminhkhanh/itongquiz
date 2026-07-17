import React, { useMemo } from 'react';
import { useQuizStore } from '../../../stores/quizStore';
import { useAuthStore } from '../../../stores/authStore';
import {
    AlertCircle,
    ArrowRight,
    Award,
    CheckCircle,
    ClipboardList,
    Clock,
    FileText,
    GraduationCap,
    PlusCircle,
    Radio,
    RefreshCw,
    Sparkles,
    TrendingUp,
    Users,
} from 'lucide-react';
import { calculateResultsStatistics } from '../../utils/statisticsUtils';
import { areClassNamesEqual } from '../../utils/classMatching';
import {
    type TeacherDashboardTab,
    useTeacherDashboardUIStore,
} from '../../stores/useTeacherDashboardUIStore';
import { ResultsAnalytics } from '../teacher/ResultsView/ResultsAnalytics';

type ResultsLoadState = 'loading' | 'success' | 'error';

interface OverviewTabProps {
    resultsLoadState: ResultsLoadState;
    resultsError?: string | null;
    onRetryResults: () => void | Promise<void>;
}

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactElement;
    valueClassName?: string;
}

interface QuickActionCardProps {
    tab: TeacherDashboardTab;
    eyebrow: string;
    title: string;
    description: string;
    icon: React.ReactElement;
    iconClassName: string;
    iconSurfaceClassName: string;
    onSelect: (tab: TeacherDashboardTab) => void;
}

const isSameLocalDay = (first: Date, second: Date): boolean => (
    first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate()
);

const getGreeting = (date: Date): string => {
    const hour = date.getHours();
    if (hour < 11) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, valueClassName = 'text-slate-900' }) => (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
        <div className="flex items-start justify-between gap-4">
            <div>
                <p className="mb-2 text-sm font-medium text-slate-500">{title}</p>
                <h3 className={`text-3xl font-black sm:text-4xl ${valueClassName}`}>{value}</h3>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3">
                {React.cloneElement(icon as React.ReactElement<any>, { className: 'h-6 w-6 text-slate-500' })}
            </div>
        </div>
    </div>
);

const QuickActionCard: React.FC<QuickActionCardProps> = ({
    tab,
    eyebrow,
    title,
    description,
    icon,
    iconClassName,
    iconSurfaceClassName,
    onSelect,
}) => (
    <button
        type="button"
        onClick={() => onSelect(tab)}
        className="group min-h-32 rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:min-h-36 sm:p-5"
    >
        <span className="flex h-full items-start gap-4">
            <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ring-black/5 sm:size-14 ${iconSurfaceClassName}`}>
                {React.cloneElement(icon as React.ReactElement<any>, {
                    className: `size-6 sm:size-7 ${iconClassName}`,
                    'aria-hidden': true,
                })}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{eyebrow}</span>
                <span className="mt-1 flex items-center justify-between gap-3">
                    <span className="text-base font-black text-slate-900 sm:text-lg">{title}</span>
                    <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-600" />
                </span>
                <span className="mt-1.5 block text-sm leading-5 text-slate-500">{description}</span>
            </span>
        </span>
    </button>
);

const OverviewTab: React.FC<OverviewTabProps> = ({
    resultsLoadState,
    resultsError,
    onRetryResults,
}) => {
    const authStore = useAuthStore();
    const quizStore = useQuizStore();
    const setActiveTab = useTeacherDashboardUIStore((state) => state.setActiveTab);

    const filteredResults = useMemo(() => {
        return authStore.isAdmin || !authStore.teacherClass
            ? quizStore.results
            : quizStore.results.filter((result) => (
                areClassNamesEqual(result.studentClass, authStore.teacherClass)
            ));
    }, [quizStore.results, authStore.isAdmin, authStore.teacherClass]);

    const visibleQuizzes = useMemo(() => {
        return authStore.isAdmin || !authStore.teacherClass
            ? quizStore.quizzes
            : quizStore.quizzes.filter((quiz) => (
                areClassNamesEqual(quiz.classLevel, authStore.teacherClass)
            ));
    }, [quizStore.quizzes, authStore.isAdmin, authStore.teacherClass]);

    const statistics = useMemo(() => calculateResultsStatistics(filteredResults), [filteredResults]);

    const stats = useMemo(() => ({
        totalQuizzes: visibleQuizzes.length,
        totalResults: statistics.totalResults,
        avgScore: statistics.mean.toFixed(1),
        uniqueStudents: new Set(
            filteredResults.map((result) => result.studentName.trim().toLocaleLowerCase('vi-VN')),
        ).size,
    }), [visibleQuizzes, statistics, filteredResults]);

    const recentActivities = useMemo(() => {
        const today = new Date();
        return filteredResults
            .filter((result) => {
                const submittedAt = new Date(result.submittedAt);
                return !Number.isNaN(submittedAt.getTime()) && isSameLocalDay(submittedAt, today);
            })
            .slice()
            .sort((first, second) => (
                new Date(second.submittedAt).getTime() - new Date(first.submittedAt).getTime()
            ))
            .slice(0, 5);
    }, [filteredResults]);

    const greeting = getGreeting(new Date());

    const quickActions: Array<Omit<QuickActionCardProps, 'onSelect'>> = [
        {
            tab: 'create',
            eyebrow: 'Soạn đề',
            title: 'Tạo đề mới',
            description: 'Tạo đề từ PDF, nội dung có sẵn hoặc công cụ AI.',
            icon: <PlusCircle />,
            iconClassName: 'text-blue-700',
            iconSurfaceClassName: 'bg-blue-50',
        },
        {
            tab: 'assignments',
            eyebrow: 'Phân phối',
            title: 'Giao bài',
            description: 'Chọn lớp, đặt hạn nộp và gửi bài cho học sinh.',
            icon: <ClipboardList />,
            iconClassName: 'text-violet-700',
            iconSurfaceClassName: 'bg-violet-50',
        },
        {
            tab: 'live-exam',
            eyebrow: 'Tổ chức',
            title: 'Thi trực tiếp',
            description: 'Mở phòng thi và theo dõi tiến độ theo thời gian thực.',
            icon: <Radio />,
            iconClassName: 'text-rose-700',
            iconSurfaceClassName: 'bg-rose-50',
        },
        {
            tab: 'results',
            eyebrow: 'Theo dõi',
            title: 'Xem kết quả',
            description: 'Xem điểm, bài nộp và phân tích mức độ hoàn thành.',
            icon: <FileText />,
            iconClassName: 'text-emerald-700',
            iconSurfaceClassName: 'bg-emerald-50',
        },
        {
            tab: 'classes',
            eyebrow: 'Học sinh',
            title: 'Quản lý lớp',
            description: 'Cập nhật danh sách lớp và thông tin học sinh.',
            icon: <GraduationCap />,
            iconClassName: 'text-cyan-700',
            iconSurfaceClassName: 'bg-cyan-50',
        },
        {
            tab: 'certificates',
            eyebrow: 'Thành tích',
            title: 'Cấp chứng nhận',
            description: 'Tạo và cấp giấy chứng nhận từ các mẫu có sẵn.',
            icon: <Award />,
            iconClassName: 'text-amber-700',
            iconSurfaceClassName: 'bg-amber-50',
        },
    ];

    return (
        <div className="space-y-5 sm:space-y-8">
            <div>
                <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">Tổng quan</h2>
                <p className="mt-1 text-base text-slate-500 sm:mt-2 sm:text-lg">
                    {greeting}, {authStore.teacherName || 'Cô/Thầy'}! Đây là tình hình hôm nay.
                </p>
            </div>

            {resultsLoadState === 'error' && (
                <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                        <div>
                            <p className="font-bold">Không thể tải kết quả học tập</p>
                            <p className="mt-1 text-sm text-red-700">{resultsError || 'Vui lòng kiểm tra kết nối rồi thử lại.'}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => void onRetryResults()}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-red-700 shadow-sm ring-1 ring-inset ring-red-200 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                        <RefreshCw aria-hidden="true" className="size-4" />
                        Thử lại
                    </button>
                </div>
            )}

            <section aria-labelledby="quick-actions-heading" className="rounded-3xl border border-slate-200 bg-slate-100/70 p-4 sm:p-5">
                <div className="mb-4 flex flex-col gap-1 sm:mb-5">
                    <h3 id="quick-actions-heading" className="text-lg font-black text-slate-900 sm:text-xl">Bạn muốn làm gì?</h3>
                    <p className="text-sm text-slate-500">Chọn một công việc để đi thẳng đến màn hình cần thực hiện.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {quickActions.map((action) => (
                        <QuickActionCard key={action.tab} {...action} onSelect={setActiveTab} />
                    ))}
                </div>
            </section>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4 xl:gap-6">
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
                <StatCard
                    title="Học sinh tham gia"
                    value={stats.uniqueStudents}
                    icon={<Users />}
                />
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-3 xl:gap-6">
                <div className="min-w-0 xl:col-span-2">
                    {resultsLoadState === 'loading' && filteredResults.length === 0 ? (
                        <div className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="h-6 w-48 rounded-lg bg-slate-200" />
                            <div className="mt-8 h-40 rounded-2xl bg-slate-100" />
                        </div>
                    ) : (
                        <ResultsAnalytics statistics={statistics} hideStats />
                    )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-center gap-3 sm:mb-6">
                        <div className="rounded-xl border border-slate-200 bg-slate-100 p-2.5">
                            <Clock className="h-5 w-5 text-slate-600" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 sm:text-2xl">Vừa nộp hôm nay</h3>
                    </div>

                    {resultsLoadState === 'loading' && recentActivities.length === 0 ? (
                        <div className="space-y-4" aria-label="Đang tải hoạt động gần đây">
                            {[0, 1, 2].map((item) => (
                                <div key={item} className="flex animate-pulse items-center gap-3">
                                    <div className="size-9 rounded-full bg-slate-200" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-4/5 rounded bg-slate-200" />
                                        <div className="h-3 w-2/5 rounded bg-slate-100" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : recentActivities.length > 0 ? (
                        <div className="space-y-5">
                            {recentActivities.map((result) => {
                                const score = Number(result.score || 0);
                                const isPass = score >= 5;

                                return (
                                    <div key={result.id} className="flex items-start gap-4">
                                        <div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50">
                                            <span className="text-xs font-bold text-blue-700">
                                                {result.studentName.trim().charAt(0).toUpperCase() || '?'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">
                                                {result.studentName} <span className="font-normal text-slate-500">vừa nộp</span> {result.quizTitle}
                                            </p>
                                            <div className="mt-1 flex items-center gap-2">
                                                <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${isPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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
                        <div className="py-8 text-center">
                            <Sparkles className="mx-auto mb-3 h-9 w-9 text-slate-300" />
                            <p className="text-sm text-slate-500">
                                {resultsLoadState === 'error'
                                    ? 'Không thể tải hoạt động nộp bài.'
                                    : 'Chưa có ai nộp bài hôm nay.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OverviewTab;
