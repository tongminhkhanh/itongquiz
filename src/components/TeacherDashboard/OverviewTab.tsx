import React, { useMemo } from 'react';
import {
    AlertCircle,
    Award,
    CheckCircle2,
    ClipboardList,
    FileText,
    GraduationCap,
    PlusCircle,
    Radio,
    RefreshCw,
    TrendingUp,
    UsersRound,
} from 'lucide-react';
import { useQuizStore } from '../../../stores/quizStore';
import { useAuthStore } from '../../../stores/authStore';
import { calculateResultsStatistics } from '../../utils/statisticsUtils';
import { areClassNamesEqual } from '../../utils/classMatching';
import { useTeacherDashboardUIStore } from '../../stores/useTeacherDashboardUIStore';
import {
    DashboardHero,
    MetricGrid,
    PerformancePanel,
    QuickActionGrid,
    RecentQuizzesPanel,
    RecentSubmissionsPanel,
    type DashboardMetric,
    type DashboardQuickAction,
} from './overview';

type ResultsLoadState = 'loading' | 'success' | 'error';

interface OverviewTabProps {
    resultsLoadState: ResultsLoadState;
    resultsError?: string | null;
    onRetryResults: () => void | Promise<void>;
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

const formatDateLabel = (date: Date): string => {
    const value = date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
    return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatScopeLabel = (teacherClass?: string | null): string => {
    const value = String(teacherClass || '').trim();
    if (!value) return 'Tất cả lớp';
    return /^lớp\s+/i.test(value) ? value : `Lớp ${value}`;
};

const OverviewTab: React.FC<OverviewTabProps> = ({
    resultsLoadState,
    resultsError,
    onRetryResults,
}) => {
    const authStore = useAuthStore();
    const quizStore = useQuizStore();
    const setActiveTab = useTeacherDashboardUIStore((state) => state.setActiveTab);

    const filteredResults = useMemo(() => (
        authStore.isAdmin || !authStore.teacherClass
            ? quizStore.results
            : quizStore.results.filter((result) => (
                areClassNamesEqual(result.studentClass, authStore.teacherClass)
            ))
    ), [quizStore.results, authStore.isAdmin, authStore.teacherClass]);

    const visibleQuizzes = useMemo(() => (
        authStore.isAdmin || !authStore.teacherClass
            ? quizStore.quizzes
            : quizStore.quizzes.filter((quiz) => (
                areClassNamesEqual(quiz.classLevel, authStore.teacherClass)
            ))
    ), [quizStore.quizzes, authStore.isAdmin, authStore.teacherClass]);

    const statistics = useMemo(() => calculateResultsStatistics(filteredResults), [filteredResults]);

    const todayResults = useMemo(() => {
        const today = new Date();
        return filteredResults.filter((result) => {
            const submittedAt = new Date(result.submittedAt);
            return !Number.isNaN(submittedAt.getTime()) && isSameLocalDay(submittedAt, today);
        });
    }, [filteredResults]);

    const recentActivities = useMemo(() => (
        todayResults
            .slice()
            .sort((first, second) => (
                new Date(second.submittedAt).getTime() - new Date(first.submittedAt).getTime()
            ))
            .slice(0, 5)
    ), [todayResults]);

    const recentQuizzes = useMemo(() => (
        visibleQuizzes
            .slice()
            .sort((first, second) => {
                const firstTime = new Date(first.createdAt).getTime();
                const secondTime = new Date(second.createdAt).getTime();
                return (Number.isNaN(secondTime) ? 0 : secondTime) - (Number.isNaN(firstTime) ? 0 : firstTime);
            })
            .slice(0, 5)
    ), [visibleQuizzes]);

    const uniqueStudents = useMemo(() => new Set(
        filteredResults.map((result) => result.studentName.trim().toLocaleLowerCase('vi-VN')),
    ).size, [filteredResults]);

    const scopeLabel = authStore.isAdmin ? 'Toàn trường' : formatScopeLabel(authStore.teacherClass);
    const now = new Date();
    const isInitialResultsLoading = resultsLoadState === 'loading' && filteredResults.length === 0;

    const quickActions: DashboardQuickAction[] = [
        {
            tab: 'create',
            title: 'Tạo đề mới',
            description: 'Soạn đề từ nội dung có sẵn, PDF hoặc công cụ AI.',
            icon: <PlusCircle />,
            iconClassName: 'text-[#0284C7]',
            surfaceClassName: 'bg-[#F0F9FF]',
        },
        {
            tab: 'assignments',
            title: 'Giao bài',
            description: 'Chọn lớp, đặt hạn nộp và gửi bài cho học sinh.',
            icon: <ClipboardList />,
            iconClassName: 'text-[#7C3AED]',
            surfaceClassName: 'bg-[#F5F3FF]',
        },
        {
            tab: 'live-exam',
            title: 'Thi trực tiếp',
            description: 'Mở phòng thi và theo dõi tiến độ theo thời gian thực.',
            icon: <Radio />,
            iconClassName: 'text-[#E76F51]',
            surfaceClassName: 'bg-[#FFF4F1]',
        },
        {
            tab: 'results',
            title: 'Xem kết quả',
            description: 'Xem điểm, bài nộp và phân tích mức độ hoàn thành.',
            icon: <FileText />,
            iconClassName: 'text-[#0D8B67]',
            surfaceClassName: 'bg-[#ECFDF5]',
        },
        {
            tab: 'classes',
            title: 'Quản lý lớp',
            description: 'Cập nhật danh sách lớp và thông tin học sinh.',
            icon: <GraduationCap />,
            iconClassName: 'text-[#0891B2]',
            surfaceClassName: 'bg-[#ECFEFF]',
        },
        {
            tab: 'certificates',
            title: 'Cấp chứng nhận',
            description: 'Tạo giấy chứng nhận từ các mẫu đã thiết lập.',
            icon: <Award />,
            iconClassName: 'text-[#A16207]',
            surfaceClassName: 'bg-[#FFFBEB]',
        },
    ];

    const metrics: DashboardMetric[] = [
        {
            label: 'Đề kiểm tra',
            value: visibleQuizzes.length,
            helper: `${scopeLabel} · ${recentQuizzes.length} đề mới nhất được hiển thị bên dưới`,
            icon: <FileText />,
            iconClassName: 'text-[#0284C7]',
            surfaceClassName: 'bg-[#F0F9FF]',
        },
        {
            label: 'Điểm trung bình',
            value: statistics.mean.toFixed(1),
            helper: `${statistics.passRate}% bài đạt từ 5 điểm trở lên`,
            icon: <TrendingUp />,
            iconClassName: 'text-[#0D8B67]',
            surfaceClassName: 'bg-[#ECFDF5]',
        },
        {
            label: 'Số bài đã nộp',
            value: statistics.totalResults,
            helper: `${todayResults.length} bài được nộp trong hôm nay`,
            icon: <CheckCircle2 />,
            iconClassName: 'text-[#7C3AED]',
            surfaceClassName: 'bg-[#F5F3FF]',
        },
        {
            label: 'Học sinh tham gia',
            value: uniqueStudents,
            helper: statistics.totalResults > 0 ? 'Tính theo tên học sinh trong dữ liệu hiện có' : 'Chưa có lượt tham gia',
            icon: <UsersRound />,
            iconClassName: 'text-[#A16207]',
            surfaceClassName: 'bg-[#FFFBEB]',
        },
    ];

    return (
        <div className="mx-auto w-full max-w-[1280px] space-y-4 sm:space-y-5 lg:space-y-6">
            <DashboardHero
                greeting={getGreeting(now)}
                teacherName={authStore.teacherName || authStore.username || 'Cô/Thầy'}
                dateLabel={formatDateLabel(now)}
                scopeLabel={scopeLabel}
                isAdmin={Boolean(authStore.isAdmin)}
                todaySubmissionCount={todayResults.length}
                passRate={statistics.passRate}
                uniqueStudents={uniqueStudents}
                onCreateQuiz={() => setActiveTab('create')}
                onViewResults={() => setActiveTab('results')}
            />

            {resultsLoadState === 'error' && (
                <div role="alert" className="flex flex-col gap-3 rounded-[14px] border border-[#F3B5A7] bg-[#FFF4F1] p-4 text-[#8E3F2E] sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                        <div>
                            <p className="font-semibold">Không thể tải kết quả học tập</p>
                            <p className="mt-1 text-sm text-[#A9533E]">{resultsError || 'Vui lòng kiểm tra kết nối rồi thử lại.'}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => void onRetryResults()}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border border-[#F3B5A7] bg-white px-4 py-2 text-sm font-semibold text-[#8E3F2E] transition-colors hover:bg-[#FFEAE4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E76F51]"
                    >
                        <RefreshCw aria-hidden="true" className="size-4" />
                        Thử lại
                    </button>
                </div>
            )}

            <QuickActionGrid actions={quickActions} onSelect={setActiveTab} />
            <MetricGrid metrics={metrics} isLoadingResults={isInitialResultsLoading} />

            <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] xl:gap-5">
                <PerformancePanel statistics={statistics} isLoading={isInitialResultsLoading} />
                <RecentSubmissionsPanel
                    submissions={recentActivities}
                    isLoading={isInitialResultsLoading}
                    hasError={resultsLoadState === 'error'}
                    onViewAll={() => setActiveTab('results')}
                />
            </div>

            <RecentQuizzesPanel
                quizzes={recentQuizzes}
                onCreateQuiz={() => setActiveTab('create')}
                onManageQuizzes={() => setActiveTab('manage')}
            />
        </div>
    );
};

export default OverviewTab;
