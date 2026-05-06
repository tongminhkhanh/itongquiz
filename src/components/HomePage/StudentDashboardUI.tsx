import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useQuizStore } from '../../../stores/quizStore';
import { useGamificationStore } from '../../stores/useGamificationStore';
import { useGameLoopStore } from '../../stores/useGameLoopStore';
import { getAvatarUrl } from '../../config/avatars';
import { callApi } from '../../services/apiAdapter';
import { Assignment } from '../../types/classroom.types';
import { Question, Quiz } from '../../types';
import { Loader2, Play, Trophy, Star, BookOpen, Clock, Target, CalendarDays, Rocket, ShieldCheck, Camera, Gift, KeyRound, Sparkles, CheckCircle2, Lock, Flame, Medal, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SubjectLibrary from '../student/PracticeLibrary/SubjectLibrary';
import { JoinLiveExamModal } from '../LiveExam/JoinLiveExamModal';
import { WaitingRoomStudent } from '../LiveExam/WaitingRoomStudent';
import { LiveExamQuiz } from '../LiveExam/LiveExamQuiz';
import { ResultsRoom } from '../LiveExam/ResultsRoom';
import { useLiveExamStatus } from '../../hooks/useLiveExamStatus';
import AvatarSelectorModal from '../common/AvatarSelectorModal';
import MathSpan from '../common/MathSpan';
import { StudentFloatingSidebar } from '../gamification/StudentFloatingSidebar';
import { StudentHomeworkSection } from '../../features/homework/components/StudentHomeworkSection';
import { HomeworkSubmissionModal } from '../../features/homework/components/HomeworkSubmissionModal';
import { BadgeGallery } from '../gamification/BadgeGallery';
import { HomeworkAssignment } from '../../features/homework/types';
import { useHomeworkStore } from '../../features/homework/stores/useHomeworkStore';
import type { GameLoopMission, GameLoopRewardResult } from '../../types/gameLoop.types';
import type { LiveExamSubmissionResponse } from '../../types/liveExam.types';
import { getAchievementBadgeAlt, getAchievementBadgeImage } from '../../config/achievementBadges';

// --- Subject Config (Reused from HomePage) ---
export const SUBJECT_CONFIG: Record<string, { title: string; icon: string; color: string; desc: string; showOnHome?: boolean }> = {
    'toan': { title: 'Toán Học', icon: 'calculate', color: 'from-blue-400 to-blue-600', desc: 'Rèn luyện tư duy logic' },
    'tieng-viet': { title: 'Tiếng Việt', icon: 'menu_book', color: 'from-amber-400 to-amber-600', desc: 'Vun đắp ngôn ngữ tiếng mẹ đẻ' },
    'tu-nhien-xa-hoi': { title: 'Tự nhiên & Xã hội', icon: 'public', color: 'from-emerald-400 to-emerald-600', desc: 'Khám phá thế giới muôn màu' },
    'tieng-anh': { title: 'Tiếng Anh', icon: 'language', color: 'from-indigo-400 to-indigo-600', desc: 'Mở rộng giao tiếp quốc tế' },
    'tin-hoc': { title: 'Tin học', icon: 'computer', color: 'from-slate-400 to-slate-600', desc: 'Làm chủ công nghệ tương lai' },
    'ioe': { title: 'Luyện thi IOE', icon: 'workspace_premium', color: 'from-yellow-400 to-orange-500', desc: 'Chinh phục kỳ thi tiếng Anh quốc gia', showOnHome: true },
};

const FLUENT_CDN = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets';

interface StudentDashboardUIProps {
    ioeQuizzes?: Quiz[];
}

const ASSIGNMENTS_PER_PAGE = 5;
const ATTENDANCE_REWARD = { exp: 50, coins: 50 };

interface AttendanceQuestion {
    id: string;
    quizTitle: string;
    question: string;
    options: string[];
    correctLabel: string;
}

interface AttendanceStatusData {
    claimedToday: boolean;
    claimDates: string[];
    streakDays: number;
    attendanceDayNumber: number;
    nextRewardExp: number;
    nextRewardCoins: number;
    todayDateKey: string;
    weekStartDateKey: string;
}

interface AttendanceClaimData {
    claimed: boolean;
    alreadyClaimed: boolean;
    claimDates: string[];
    streakDays: number;
    attendanceDayNumber: number;
    multiplier: number;
    awardedExp: number;
    awardedCoins: number;
    message?: string;
}

const getLocalDateKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
};

const getWeekStartDateKey = () => {
    const now = new Date();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = monday.getDay();
    const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(monday.getDate() + offsetToMonday);
    return getDateKey(monday);
};

const getAttendanceMultiplier = (attendanceDayNumber: number) => {
    if (attendanceDayNumber === 3) return 2;
    if (attendanceDayNumber === 5) return 3;
    if (attendanceDayNumber === 7) return 5;
    return 1;
};

const calculateAttendanceStreak = (days: string[], endDateKey: string) => {
    if (!endDateKey || days.length === 0) return 0;
    const daySet = new Set(days);
    let streak = 0;
    const cursor = parseDateKey(endDateKey);
    while (daySet.has(getDateKey(cursor))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
};

const cleanOptionText = (value: unknown) => {
    return String(value ?? '')
        .replace(/^\s*[A-Z]\s*[\.\)\:\-]\s*/i, '')
        .trim();
};

const resolveCorrectLabel = (correctAnswer: unknown, options: string[]): string | null => {
    const raw = String(correctAnswer ?? '').trim();
    if (!raw) return null;
    const directLabelMatch = raw.toUpperCase().match(/^([A-Z])(?:[\.\)\:\-].*)?$/);
    if (directLabelMatch) return directLabelMatch[1];
    if (/^\d+$/.test(raw)) {
        const idx = Number(raw);
        if (idx >= 0 && idx < options.length) {
            return String.fromCharCode(65 + idx);
        }
    }
    const normalizedRaw = cleanOptionText(raw).toUpperCase();
    const optionIndex = options.findIndex((option) => cleanOptionText(option).toUpperCase() === normalizedRaw);
    if (optionIndex >= 0) {
        return String.fromCharCode(65 + optionIndex);
    }
    return null;
};

const normalizeLearningCategory = (value: unknown) => {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'toan' || normalized.includes('toán')) return 'toan';
    if (normalized === 'tieng-viet' || normalized.includes('việt')) return 'tieng-viet';
    return normalized;
};

const getMissionProgressPercent = (mission: GameLoopMission) => {
    if (mission.target <= 0) return 0;
    return Math.min(100, Math.round((mission.progress / mission.target) * 100));
};

const getRewardSummary = (reward: GameLoopRewardResult | null) => {
    if (!reward) return null;
    if (reward.type === 'COINS') {
        return {
            icon: reward.icon || '🪙',
            title: reward.title || 'Thưởng xu',
            description: `Em nhận thêm +${reward.coins || 0} Xu.`,
        };
    }
    if (reward.type === 'COLLECTIBLE') {
        return {
            icon: reward.icon || '🎁',
            title: reward.title || 'Vật phẩm sưu tầm',
            description: 'Một món sưu tầm mới đã được thêm vào bộ sưu tập của em.',
        };
    }
    if (reward.type === 'HINT_TOKEN') {
        return {
            icon: reward.icon || '💡',
            title: reward.title || 'Vé gợi ý',
            description: `Em nhận thêm ${reward.amount || 0} vé gợi ý cho những bài khó.`,
        };
    }
    return {
        icon: reward.icon || '🛡️',
        title: reward.title || 'Khiên giữ chuỗi',
        description: `Em nhận thêm ${reward.amount || 0} khiên để bảo vệ chuỗi học tập.`,
    };
};

const StudentDashboardUI: React.FC<StudentDashboardUIProps> = ({ ioeQuizzes = [] }) => {
    // --- Stores ---
    const classroomStore = useClassroomStore();
    const quizStore = useQuizStore();
    const { pet, coins } = useGamificationStore();
    const {
        dashboard,
        lastReward: lastGameLoopReward,
        isLoading: isGameLoopLoading,
        error: gameLoopError,
        loadDashboard,
        claimMission,
        claimChest,
        clearReward: clearGameLoopReward,
    } = useGameLoopStore();
    const studentSession = classroomStore.studentSession;
    const giftShopEnabled = String(import.meta.env.VITE_FEATURE_GIFT_SHOP_V2 || 'false').toLowerCase() === 'true';

    // --- State ---
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [selectedHw, setSelectedHw] = useState<HomeworkAssignment | null>(null);
    const hwStore = useHomeworkStore();
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [assignmentPage, setAssignmentPage] = useState(1);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [attendanceQuestion, setAttendanceQuestion] = useState<AttendanceQuestion | null>(null);
    const [selectedAttendanceAnswer, setSelectedAttendanceAnswer] = useState<string | null>(null);
    const [attendanceResult, setAttendanceResult] = useState<'correct' | 'wrong' | null>(null);
    const [attendanceMessage, setAttendanceMessage] = useState('');
    const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
    const [attendanceClaimed, setAttendanceClaimed] = useState(false);
    const [attendanceDaysInWeek, setAttendanceDaysInWeek] = useState<string[]>([]);
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [changePasswordError, setChangePasswordError] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isBadgeGalleryOpen, setIsBadgeGalleryOpen] = useState(false);
    const [isJoinLiveExamModalOpen, setIsJoinLiveExamModalOpen] = useState(false);
    const [joinedLiveExam, setJoinedLiveExam] = useState<{
        sessionId: string;
        sessionTitle: string;
        quizId: string;
        duration: number;
        startedAt?: string;
        endsAt?: string;
    } | null>(null);
    const [liveExamStage, setLiveExamStage] = useState<'waiting' | 'active' | 'submitted' | 'results'>('waiting');
    const [isPreparingLiveExam, setIsPreparingLiveExam] = useState(false);
    const [liveExamLoadError, setLiveExamLoadError] = useState<string | null>(null);
    const [liveExamSubmission, setLiveExamSubmission] = useState<LiveExamSubmissionResponse['participant'] | null>(null);

    const { status: joinedLiveExamStatus } = useLiveExamStatus({
        sessionId: joinedLiveExam?.sessionId || '',
        enabled: !!joinedLiveExam,
    });

    const joinedSessionQuiz = useMemo(() => {
        if (!joinedLiveExam) return null;
        return quizStore.quizzes.find((q) => q.id === joinedLiveExam.quizId);
    }, [joinedLiveExam, quizStore.quizzes]);

    const liveExamQuestions = useMemo<Question[]>(() => {
        return Array.isArray(joinedSessionQuiz?.questions) ? joinedSessionQuiz.questions : [];
    }, [joinedSessionQuiz]);

    useEffect(() => {
        if (!joinedLiveExamStatus?.session?.status) return;

        if (joinedLiveExamStatus.session.status === 'active' && liveExamStage !== 'submitted') {
            setLiveExamStage('active');
        } else if (joinedLiveExamStatus.session.status === 'closed') {
            setLiveExamStage('results');
        } else if (liveExamStage !== 'submitted') {
            setLiveExamStage('waiting');
        }
    }, [joinedLiveExamStatus?.session?.status, liveExamStage]);

    useEffect(() => {
        let cancelled = false;

        const ensureLiveExamQuizLoaded = async () => {
            if (!joinedLiveExam || liveExamStage !== 'active') {
                if (!cancelled) {
                    setIsPreparingLiveExam(false);
                    setLiveExamLoadError(null);
                }
                return;
            }

            if (joinedSessionQuiz) {
                if (!cancelled) {
                    setIsPreparingLiveExam(false);
                    setLiveExamLoadError(null);
                }
                return;
            }

            if (!cancelled) {
                setIsPreparingLiveExam(true);
                setLiveExamLoadError(null);
            }

            try {
                await quizStore.loadQuizzes();
                if (!cancelled && !useQuizStore.getState().quizzes.find((q) => q.id === joinedLiveExam.quizId)) {
                    setLiveExamLoadError('Không tải được đề thi trực tiếp. Vui lòng chờ giây lát rồi thử lại.');
                }
            } catch (error) {
                console.error('Failed to prepare live exam quiz:', error);
                if (!cancelled) {
                    setLiveExamLoadError('Không tải được đề thi trực tiếp. Vui lòng thử lại.');
                }
            } finally {
                if (!cancelled) {
                    setIsPreparingLiveExam(false);
                }
            }
        };

        void ensureLiveExamQuizLoaded();

        return () => {
            cancelled = true;
        };
    }, [joinedLiveExam, liveExamStage, joinedSessionQuiz, quizStore]);

    
    // Weekly quests state
    const [weeklyQuests, setWeeklyQuests] = useState<any[]>([]);
    const [isWeeklyQuestsLoading, setIsWeeklyQuestsLoading] = useState(false);
    const [weeklyQuestsError, setWeeklyQuestsError] = useState<string | null>(null);

    // --- Fetch Data ---
    useEffect(() => {
        const fetchAssignments = async () => {
            setIsLoadingTasks(true);
            try {
                if (studentSession?.studentId) {
                    await classroomStore.fetchStudentAssignments(studentSession.studentId);
                }
            } catch (error) {
                console.error('Failed to fetch assignments:', error);
            } finally {
                setIsLoadingTasks(false);
            }
        };
        fetchAssignments();
    }, [studentSession?.studentId]);

    useEffect(() => {
        if (studentSession?.username && !pet) {
            useGamificationStore.getState().fetchPetData(studentSession.username);
        }
    }, [studentSession?.username, pet]);

    useEffect(() => {
        if (studentSession?.username) {
            loadDashboard(studentSession.username);
        }
    }, [studentSession?.username, loadDashboard]);

    // Fetch weekly quests
    useEffect(() => {
        if (!studentSession?.username) return;
        
        const fetchWeeklyQuests = async () => {
            setIsWeeklyQuestsLoading(true);
            setWeeklyQuestsError(null);

            try {
                const data = await callApi('get_weekly_quests', {});

                if (data.status === 'success' && data.quests) {
                    setWeeklyQuests(data.quests);
                }
            } catch (error) {
                console.error('Error fetching weekly quests:', error);
                setWeeklyQuestsError('Không thể tải nhiệm vụ tuần');
            } finally {
                setIsWeeklyQuestsLoading(false);
            }
        };
        
        fetchWeeklyQuests();
    }, [studentSession?.username]);

    // --- Derived Data ---
    const myAssignmentQuizzes = useMemo(() => {
        if (!studentSession) return [];
        const mappedAssignments = classroomStore.assignments.map(assignment => {
            const realQuiz = quizStore.quizzes.find(q => q.id === assignment.quizId) || ioeQuizzes.find(q => q.id === assignment.quizId);
            if (realQuiz) {
                return { ...realQuiz, _assignmentData: assignment } as Quiz & { _assignmentData?: Assignment };
            }
            return {
                id: assignment.quizId,
                title: assignment.quizTitle || 'Bài tập được giao',
                category: 'class',
                questions: [],
                duration: 0,
                timeLimit: 0,
                requireCode: false,
                allowReview: false,
                classLevel: '',
                subject: 'class',
                createdAt: assignment.createdAt,
                maxScore: 0,
                _assignmentData: assignment
            } as Quiz & { _assignmentData?: Assignment };
        });

        return mappedAssignments.sort((a, b) => {
            const aAssignment = a._assignmentData;
            const bAssignment = b._assignmentData;
            const aAttempts = Number(aAssignment?.attemptCount) || 0;
            const bAttempts = Number(bAssignment?.attemptCount) || 0;
            const aMaxAttempts = Math.max(1, Number(aAssignment?.maxAttempts) || 1);
            const bMaxAttempts = Math.max(1, Number(bAssignment?.maxAttempts) || 1);
            const aCompleted = aAttempts >= aMaxAttempts;
            const bCompleted = bAttempts >= bMaxAttempts;

            if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;

            const parseDate = (value?: string, fallback: number = 0) => {
                const timestamp = Date.parse(value || '');
                return Number.isFinite(timestamp) ? timestamp : fallback;
            };

            if (!aCompleted && !bCompleted) {
                const aDeadline = parseDate(aAssignment?.deadline, Number.MAX_SAFE_INTEGER);
                const bDeadline = parseDate(bAssignment?.deadline, Number.MAX_SAFE_INTEGER);
                if (aDeadline !== bDeadline) return aDeadline - bDeadline;
            }

            const aCreatedAt = parseDate(aAssignment?.createdAt, 0);
            const bCreatedAt = parseDate(bAssignment?.createdAt, 0);
            if (aCreatedAt !== bCreatedAt) return bCreatedAt - aCreatedAt;

            return String(a.title || '').localeCompare(String(b.title || ''), 'vi');
        });
    }, [classroomStore.assignments, studentSession, quizStore.quizzes, ioeQuizzes]);

    const publicCategories = useMemo(() => {
        const categories = Object.keys(SUBJECT_CONFIG).filter(cat => SUBJECT_CONFIG[cat].showOnHome !== false);
        return categories.map(cat => {
            let total = 0;
            if (cat === 'ioe') {
                total = ioeQuizzes.length;
            } else {
                total = quizStore.quizzes.filter(q => (q.category || 'class') === cat && q.showOnHome !== false).length;
            }
            return {
                id: cat,
                ...SUBJECT_CONFIG[cat],
                total
            };
        });
    }, [quizStore.quizzes, ioeQuizzes]);

    const attendanceTodayKey = useMemo(() => getLocalDateKey(), [studentSession?.username]);

    const attendanceQuestionPool = useMemo<AttendanceQuestion[]>(() => {
        const allQuizzes = [...quizStore.quizzes, ...ioeQuizzes];
        const prioritizedQuizzes = allQuizzes.filter((quiz) => {
            const normalizedCategory = normalizeLearningCategory((quiz as any).category || (quiz as any).topic || '');
            return normalizedCategory === 'toan' || normalizedCategory === 'tieng-viet';
        });
        const sourceQuizzes = prioritizedQuizzes.length > 0 ? prioritizedQuizzes : allQuizzes;
        return sourceQuizzes.flatMap((quiz) => {
            const sourceQuestions = Array.isArray(quiz.questions) ? quiz.questions : [];
            return sourceQuestions
                .map((q: any) => {
                    const qType = String(q?.type || '').toUpperCase();
                    const options = Array.isArray(q?.options)
                        ? q.options.map((opt: unknown) => String(opt ?? '').trim()).filter(Boolean)
                        : [];
                    const correctLabel = resolveCorrectLabel(q?.correctAnswer, options);
                    if (qType !== 'MCQ' || options.length < 2 || !correctLabel) return null;
                    return {
                        id: `${quiz.id}-${q.id || Math.random().toString(36).slice(2)}`,
                        quizTitle: quiz.title || 'Ngân hàng câu hỏi',
                        question: String(q?.question || ''),
                        options,
                        correctLabel,
                    } as AttendanceQuestion;
                })
                .filter(Boolean) as AttendanceQuestion[];
        });
    }, [quizStore.quizzes, ioeQuizzes]);

    const totalAssignmentPages = Math.max(1, Math.ceil(myAssignmentQuizzes.length / ASSIGNMENTS_PER_PAGE));

    const pagedAssignmentQuizzes = useMemo(() => {
        const start = (assignmentPage - 1) * ASSIGNMENTS_PER_PAGE;
        return myAssignmentQuizzes.slice(start, start + ASSIGNMENTS_PER_PAGE);
    }, [myAssignmentQuizzes, assignmentPage]);

    useEffect(() => {
        if (assignmentPage > totalAssignmentPages) setAssignmentPage(totalAssignmentPages);
    }, [assignmentPage, totalAssignmentPages]);

    useEffect(() => {
        const loadAttendanceStatus = async () => {
            if (!studentSession?.username) {
                setAttendanceClaimed(false);
                setAttendanceDaysInWeek([]);
                return;
            }
            try {
                const res = await callApi<{ status: 'success' | 'error'; data?: AttendanceStatusData; message?: string }>(
                    'get_attendance_status',
                    { username: studentSession.username }
                );
                if (res?.status === 'success' && res.data) {
                    const claimDates = Array.isArray(res.data.claimDates)
                        ? Array.from(new Set(res.data.claimDates.map((d) => String(d || '').trim()).filter(Boolean)))
                        : [];
                    setAttendanceDaysInWeek(claimDates);
                    setAttendanceClaimed(Boolean(res.data.claimedToday));
                    return;
                }
            } catch (err) {
                console.error('Failed to load attendance status:', err);
            }
            setAttendanceClaimed(false);
            setAttendanceDaysInWeek([]);
        };
        loadAttendanceStatus();
    }, [studentSession?.username, attendanceTodayKey]);

    if (joinedLiveExam && liveExamStage === 'waiting') {
        return (
            <WaitingRoomStudent
                sessionId={joinedLiveExam.sessionId}
                sessionTitle={joinedLiveExam.sessionTitle}
                onExamStart={() => setLiveExamStage('active')}
            />
        );
    }

    if (joinedLiveExam && liveExamStage === 'active' && (!joinedSessionQuiz || isPreparingLiveExam)) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Đang chuẩn bị bài thi...</h2>
                    <p className="text-slate-600 mb-4">
                        Giáo viên đã bắt đầu bài thi. Hệ thống đang tải đề để em vào làm bài.
                    </p>
                    {liveExamLoadError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold px-4 py-3">
                            {liveExamLoadError}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (
        joinedLiveExam &&
        liveExamStage === 'active' &&
        joinedSessionQuiz &&
        joinedLiveExamStatus?.session?.endsAt
    ) {
        return (
            <LiveExamQuiz
                sessionId={joinedLiveExam.sessionId}
                questions={liveExamQuestions}
                quizTitle={joinedLiveExam.sessionTitle}
                duration={joinedLiveExamStatus.session.duration}
                endsAt={joinedLiveExamStatus.session.endsAt}
                onComplete={(submission) => {
                    setLiveExamSubmission(submission.participant);
                    setLiveExamStage('submitted');
                }}
            />
        );
    }

    if (joinedLiveExam && liveExamStage === 'submitted') {
        const submittedAtLabel = liveExamSubmission?.submittedAt
            ? new Date(liveExamSubmission.submittedAt).toLocaleTimeString('vi-VN')
            : '';

        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 text-center">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">Em đã nộp bài thành công!</h2>
                    <p className="text-slate-600 mb-6">
                        Đây là điểm tạm thời của em. Kết quả chính thức và xếp hạng sẽ hiện khi giáo viên kết thúc phiên thi.
                    </p>

                    {liveExamSubmission && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
                                <div className="text-sm font-semibold text-blue-700 mb-1">Điểm tạm thời</div>
                                <div className="text-3xl font-bold text-blue-600">{liveExamSubmission.score}</div>
                            </div>
                            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                                <div className="text-sm font-semibold text-emerald-700 mb-1">Câu đúng</div>
                                <div className="text-3xl font-bold text-emerald-600">{liveExamSubmission.correctCount}</div>
                            </div>
                            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
                                <div className="text-sm font-semibold text-rose-700 mb-1">Câu sai</div>
                                <div className="text-3xl font-bold text-rose-600">{liveExamSubmission.wrongCount}</div>
                            </div>
                        </div>
                    )}

                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-left text-slate-600 space-y-2">
                        <p>• Bài làm của em đã được ghi nhận an toàn.</p>
                        <p>• Thời gian nộp: {submittedAtLabel || 'Vừa xong'}.</p>
                        <p>• Hệ thống sẽ tự chuyển sang kết quả chính thức khi phiên thi đóng.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (joinedLiveExam && liveExamStage === 'results') {
        return (
            <ResultsRoom
                sessionId={joinedLiveExam.sessionId}
                sessionTitle={joinedLiveExam.sessionTitle}
            />
        );
    }

    if (!studentSession) return null;

    // Render subjective library view if selected
    if (selectedSubject) {
        return <SubjectLibrary subjectId={selectedSubject} onBack={() => setSelectedSubject(null)} />;
    }

    const handleStartQuiz = (quiz: Quiz) => {
        quizStore.selectQuiz(quiz);
        quizStore.setView('student');
    };

    const handleLogout = () => {
        if (window.confirm('Em có chắc chắn muốn đăng xuất không?')) {
            classroomStore.logoutStudent();
            useAuthStore.getState().logout();
        }
    };

    const openChangePasswordModal = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setChangePasswordError('');
        setIsChangePasswordModalOpen(true);
    };

    const closeChangePasswordModal = () => {
        if (isChangingPassword) return;
        setIsChangePasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setChangePasswordError('');
    };

    const handleChangePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setChangePasswordError('');
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setChangePasswordError('Vui lòng nhập đầy đủ thông tin.');
            return;
        }
        if (newPassword.length < 6) {
            setChangePasswordError('Mật khẩu mới phải từ 6 ký tự.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setChangePasswordError('Mật khẩu mới nhập lại chưa khớp.');
            return;
        }
        if (!studentSession?.studentId) {
            setChangePasswordError('Không xác định được tài khoản học sinh.');
            return;
        }
        setIsChangingPassword(true);
        try {
            const ok = await classroomStore.changeMyPassword(
                studentSession.studentId,
                currentPassword,
                newPassword
            );
            if (!ok) {
                setChangePasswordError(classroomStore.error || 'Không thể đổi mật khẩu.');
                return;
            }
            alert('Đổi mật khẩu thành công.');
            setIsChangePasswordModalOpen(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            setChangePasswordError('');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleOpenGiftShop = () => {
        if (!giftShopEnabled) return;
        quizStore.setView('shop');
    };

    const pickRandomAttendanceQuestion = () => {
        if (attendanceQuestionPool.length === 0) return null;
        if (!attendanceQuestion || attendanceQuestionPool.length === 1) {
            return attendanceQuestionPool[Math.floor(Math.random() * attendanceQuestionPool.length)];
        }
        const currentId = attendanceQuestion.id;
        const candidates = attendanceQuestionPool.filter((q) => q.id !== currentId);
        return (candidates.length > 0 ? candidates : attendanceQuestionPool)[Math.floor(Math.random() * (candidates.length > 0 ? candidates.length : attendanceQuestionPool.length))];
    };

    const openAttendanceModal = () => {
        if (attendanceClaimed) {
            alert('Hôm nay em đã điểm danh nhận thưởng rồi. Mai quay lại nhé!');
            return;
        }
        const randomQuestion = pickRandomAttendanceQuestion();
        if (!randomQuestion) {
            alert('Hiện chưa có câu hỏi trắc nghiệm phù hợp trong ngân hàng đề.');
            return;
        }
        setAttendanceQuestion(randomQuestion);
        setSelectedAttendanceAnswer(null);
        setAttendanceResult(null);
        setAttendanceMessage('');
        setIsAttendanceModalOpen(true);
    };

    const handleAttendanceSubmit = async () => {
        if (!attendanceQuestion || !selectedAttendanceAnswer || attendanceClaimed || isSubmittingAttendance) return;
        const isCorrect = selectedAttendanceAnswer === attendanceQuestion.correctLabel;
        if (!isCorrect) {
            const correctIdx = attendanceQuestion.correctLabel.charCodeAt(0) - 65;
            const correctText = attendanceQuestion.options[correctIdx] ? ` (${cleanOptionText(attendanceQuestion.options[correctIdx])})` : '';
            setAttendanceResult('wrong');
            setAttendanceMessage(`Chưa chính xác. Đáp án đúng là ${attendanceQuestion.correctLabel}${correctText}.`);
            return;
        }
        if (!studentSession?.username) {
            setAttendanceResult('wrong');
            setAttendanceMessage('Không xác định tài khoản học sinh để cộng thưởng.');
            return;
        }
        setIsSubmittingAttendance(true);
        try {
            const res = await callApi<{ status: 'success' | 'error'; data?: AttendanceClaimData; message?: string }>('claim_daily_attendance', { username: studentSession.username });
            if (res?.status !== 'success' || !res.data) {
                setAttendanceResult('wrong');
                setAttendanceMessage(res?.message || 'Không thể cộng thưởng lúc này. Em thử lại sau nhé!');
                return;
            }
            if (res.data.alreadyClaimed || !res.data.claimed) {
                setAttendanceClaimed(true);
                setAttendanceDaysInWeek(Array.isArray(res.data.claimDates) ? res.data.claimDates : attendanceDaysInWeek);
                setAttendanceResult('wrong');
                setAttendanceMessage(res.data.message || 'Hôm nay em đã điểm danh rồi. Mai quay lại nhé!');
                return;
            }
            setAttendanceDaysInWeek(Array.isArray(res.data.claimDates) ? res.data.claimDates : attendanceDaysInWeek);
            setAttendanceClaimed(true);
            setAttendanceResult('correct');
            const bonusText = res.data.multiplier > 1 ? ` (x${res.data.multiplier} ngày ${res.data.attendanceDayNumber})` : '';
            setAttendanceMessage(`Chính xác! Em nhận +${res.data.awardedCoins} Xu và +${res.data.awardedExp} EXP${bonusText}. Bạn đã điểm danh liên tục ${res.data.streakDays} ngày.`);
            await useGamificationStore.getState().fetchPetData(studentSession.username);
        } catch (err) {
            console.error('Attendance claim failed:', err);
            setAttendanceResult('wrong');
            setAttendanceMessage('Không thể cộng thưởng lúc này. Em thử lại sau nhé!');
        } finally {
            setIsSubmittingAttendance(false);
        }
    };

    const attendanceTodayOrder = attendanceClaimed ? attendanceDaysInWeek.length : attendanceDaysInWeek.length + 1;
    const attendanceTodayMultiplier = getAttendanceMultiplier(attendanceTodayOrder);
    const attendanceTodayReward = { exp: ATTENDANCE_REWARD.exp * attendanceTodayMultiplier, coins: ATTENDANCE_REWARD.coins * attendanceTodayMultiplier };
    const attendanceBadgeText = attendanceClaimed ? 'Đã điểm danh hôm nay' : attendanceQuestionPool.length > 0 ? `Điểm danh ngày ${attendanceTodayOrder}: +${attendanceTodayReward.coins} Xu +${attendanceTodayReward.exp} EXP` : 'Đang tải câu hỏi điểm danh...';
    const rewardSummary = getRewardSummary(lastGameLoopReward);

    const handleClaimMission = async (missionId: GameLoopMission['id']) => {
        if (!studentSession?.username) return;
        await claimMission(studentSession.username, missionId);
    };

    const handleClaimChest = async () => {
        if (!studentSession?.username) return;
        await claimChest(studentSession.username);
    };

    const handleClaimWeeklyQuest = async (questId: string) => {
        if (!studentSession?.username) return;

        try {
            const data = await callApi('claim_weekly_quest', { questId });

            if (data.status === 'success') {
                // Show success toast (you'll need to import toast from react-hot-toast)
                alert(`🎉 Nhận thưởng thành công! +${data.reward.coins} xu`);

                // Refresh weekly quests
                const refreshData = await callApi('get_weekly_quests', {});
                if (refreshData.status === 'success') {
                    setWeeklyQuests(refreshData.quests);
                }

                // Refresh dashboard to update coins
                if (data.data) {
                    loadDashboard(studentSession.username);
                }
            }
        } catch (error: any) {
            console.error('Error claiming weekly quest:', error);
            alert(error.message || 'Không thể nhận thưởng');
        }
    };

    return (
        <div className="min-h-dvh bg-[#F4F7FC] font-sans text-slate-800 flex flex-col items-center">
            {/* --- NAVBAR --- */}
            <header className="w-full bg-white shadow-sm border-b border-slate-100 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-3 md:px-8 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/school-logo.png" alt="School logo iTong Quiz" className="w-10 h-10 object-contain drop-shadow-md" />
                        <span className="text-xl md:text-2xl font-black tracking-tight text-slate-800">
                            ÍtOng<span className="text-orange-500">Quiz</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-2 md:gap-8">
                        <div className="flex items-center gap-2 md:gap-4">
                            <div className="flex items-center gap-1.5 bg-amber-50 px-2 md:px-3 py-1.5 rounded-full border border-amber-200">
                                <span className="text-amber-500 font-bold flex items-center gap-1 text-sm md:text-base">
                                    <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4" /> {pet?.level || 1}
                                </span>
                                <span className="hidden md:inline text-xs uppercase font-bold text-amber-600">Cấp bậc</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-yellow-50 px-2 md:px-3 py-1.5 rounded-full border border-yellow-200">
                                <span className="text-yellow-600 font-bold flex items-center gap-1 text-sm md:text-base">
                                    <Star className="w-3.5 h-3.5 md:w-4 md:h-4 fill-yellow-500" /> {coins}
                                </span>
                                <span className="hidden md:inline text-xs uppercase font-bold text-yellow-700">Xu</span>
                            </div>
                        </div>

                        {giftShopEnabled && (
                            <button type="button" onClick={handleOpenGiftShop} className="inline-flex items-center gap-2 px-2.5 md:px-3 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs md:text-sm font-black hover:bg-indigo-100 transition-colors">
                                <Gift className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                <span className="hidden md:inline">Tiệm Tạp Hóa</span>
                            </button>
                        )}

                        <button type="button" onClick={() => setIsJoinLiveExamModalOpen(true)} className="inline-flex items-center gap-2 px-2.5 md:px-3 py-1.5 rounded-full border border-red-200 bg-red-50 text-red-700 text-xs md:text-sm font-black hover:bg-red-100 transition-colors animate-pulse">
                            <Radio className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="hidden md:inline">Thi Trực Tiếp</span>
                        </button>

                        <div className="flex items-center gap-3 border-l pl-3 md:pl-4 border-slate-200">
                            <button onClick={handleLogout} className="sm:hidden h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white">Đăng xuất</button>
                            <div className="flex flex-col items-end hidden sm:flex">
                                <span className="font-bold text-sm leading-tight text-slate-700">{studentSession.fullName}</span>
                                <span className="text-xs text-slate-500 font-medium">{studentSession.className || 'Học sinh'}</span>
                            </div>
                            <div className="relative group cursor-pointer" onClick={() => setIsAvatarModalOpen(true)}>
                                <div className="relative overflow-hidden rounded-full border-2 border-indigo-100 group-hover:border-indigo-400 transition-all shadow-sm">
                                    <img src={studentSession.avatar ? getAvatarUrl(studentSession.avatar) : getAvatarUrl('default')} className="w-9 h-9 md:w-10 md:h-10 object-cover group-hover:scale-110 transition-transform" alt="Avatar" />
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right scale-95 group-hover:scale-100 pt-2 pb-2 z-50" onClick={(e) => e.stopPropagation()}>
                                    <div className="px-4 py-2 border-b border-slate-50 mb-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tài khoản</p>
                                        <p className="text-sm font-bold text-slate-700 block sm:hidden truncate">{studentSession.fullName}</p>
                                    </div>
                                    <button onClick={openChangePasswordModal} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                                        <KeyRound className="w-4 h-4 text-slate-500" /> Đổi mật khẩu
                                    </button>
                                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2">Đăng xuất</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="w-full max-w-7xl mx-auto px-3 md:px-8 py-5 md:py-12 flex-1 flex flex-col gap-7 md:gap-10">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full bg-gradient-to-r from-indigo-600 to-blue-500 rounded-[24px] md:rounded-[32px] p-5 sm:p-6 md:p-12 relative overflow-hidden shadow-lg shadow-indigo-200">
                    <div className="absolute right-0 top-0 w-1/2 h-full opacity-10 pointer-events-none">
                        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                            <defs><pattern id="circles" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="4" fill="currentColor" /></pattern></defs>
                            <rect width="100%" height="100%" fill="url(#circles)" />
                        </svg>
                    </div>
                    <div className="relative z-10 max-w-2xl flex flex-col md:flex-row items-center gap-5 md:gap-8">
                        <div className="w-20 h-20 md:w-32 md:h-32 bg-white/20 backdrop-blur-md rounded-full shadow-inner flex items-center justify-center flex-shrink-0"><img src={`${FLUENT_CDN}/Graduation%20cap/3D/graduation_cap_3d.png`} alt="Logo" className="w-16 md:w-28 filter drop-shadow-md" /></div>
                        <div className="text-center md:text-left text-white">
                            <h1 className="text-2xl md:text-4xl font-black mb-2">Chào ngày mới, {studentSession.fullName.split(' ').pop()}!</h1>
                            <p className="text-indigo-100 text-sm md:text-lg font-medium mb-4 md:mb-6">Hôm nay em muốn chinh phục thử thách nào? Hãy chọn một bài tập và bắt đầu nhé!</p>
                            <div className="flex items-center justify-center md:justify-start gap-2 md:gap-4">
                                <div role="button" tabIndex={0} onClick={openAttendanceModal}
                                    className={`backdrop-blur-sm rounded-2xl px-4 md:px-5 py-2.5 text-xs md:text-sm font-black flex items-center gap-2 cursor-pointer transition-all duration-200 ${attendanceClaimed
                                        ? 'bg-gradient-to-r from-emerald-400/70 to-teal-300/70 text-white ring-2 ring-emerald-200/70'
                                        : 'bg-gradient-to-r from-amber-300 via-yellow-300 to-lime-300 text-slate-900 animate-pulse'}`}>
                                    <ShieldCheck className={`w-4 h-4 ${attendanceClaimed ? 'text-white' : 'text-indigo-700'}`} />
                                    <span>{attendanceBadgeText}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <section className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-6">
                    <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-5 md:p-6">
                        <div className="flex items-center justify-between gap-4 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="bg-violet-100 p-2 rounded-2xl text-violet-600"><Sparkles className="w-5 h-5" /></div>
                                <div>
                                    <h2 className="text-xl md:text-2xl font-black text-slate-800">Hành trình hôm nay</h2>
                                    <p className="text-sm text-slate-500 font-medium">Giữ nhịp học mỗi ngày với nhiệm vụ, rương và huy hiệu.</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs uppercase font-black text-slate-400 tracking-wider">Chuỗi ngày</p>
                                <p className="text-lg font-black text-orange-500 flex items-center justify-end gap-1"><Flame className="w-4 h-4" /> {dashboard?.profile.dailyStreak || 0}</p>
                            </div>
                        </div>

                        {gameLoopError && (
                            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                {gameLoopError}
                            </div>
                        )}

                        {isGameLoopLoading && !dashboard ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                            </div>
                        ) : dashboard ? (
                            <div className="space-y-4">
                                {dashboard.missions.map((mission) => {
                                    const progressPercent = getMissionProgressPercent(mission);
                                    return (
                                        <div key={mission.id} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <h3 className="text-base font-black text-slate-800">{mission.title}</h3>
                                                        {mission.claimed ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-black px-2 py-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Đã nhận
                                                            </span>
                                                        ) : mission.completed ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-black px-2 py-1">
                                                                <Sparkles className="w-3.5 h-3.5" /> Sẵn sàng
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-black px-2 py-1">
                                                                <Lock className="w-3.5 h-3.5" /> Đang tiến hành
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-500 font-medium mb-3">{mission.description}</p>
                                                    <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
                                                        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{ width: `${progressPercent}%` }} />
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 mt-2">
                                                        <span>{mission.progress}/{mission.target} {mission.unit}</span>
                                                        <span>+{mission.rewardCoins} Xu</span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleClaimMission(mission.id)}
                                                    disabled={!mission.completed || mission.claimed || isGameLoopLoading}
                                                    className={`shrink-0 px-4 py-2.5 rounded-2xl text-sm font-black transition-colors ${mission.claimed
                                                        ? 'bg-emerald-50 text-emerald-600 cursor-default'
                                                        : mission.completed
                                                            ? 'bg-violet-600 hover:bg-violet-700 text-white'
                                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                        }`}
                                                >
                                                    {mission.claimed ? 'Đã nhận' : mission.completed ? 'Nhận thưởng' : 'Chưa đủ'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : null}

                        {/* Weekly Quests Panel */}
                        <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-5 md:p-6 mt-6">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xl">
                                    📅
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">Nhiệm vụ tuần</h3>
                                    <p className="text-xs text-slate-500">Reset mỗi thứ 2</p>
                                </div>
                            </div>
                            
                            {isWeeklyQuestsLoading ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                                </div>
                            ) : weeklyQuestsError ? (
                                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                    {weeklyQuestsError}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {weeklyQuests.map((quest) => {
                                        const progressPercent = Math.min(100, (quest.progress / quest.target) * 100);
                                        
                                        return (
                                            <div key={quest.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                <div className="flex items-start gap-3 mb-2">
                                                    <div className="text-2xl">{quest.icon}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-black text-slate-800">{quest.title}</h4>
                                                        <p className="text-xs text-slate-500">{quest.description}</p>
                                                    </div>
                                                </div>
                                                
                                                {/* Progress bar */}
                                                <div className="mb-2">
                                                    <div className="flex justify-between text-xs font-bold mb-1">
                                                        <span className="text-slate-600">{quest.progress}/{quest.target}</span>
                                                        <span className="text-purple-600">{Math.round(progressPercent)}%</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                                                            style={{ width: `${progressPercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                
                                                {/* Reward & Claim button */}
                                                <div className="flex items-center justify-between">
                                                    <div className="text-xs font-bold text-amber-600">
                                                        🪙 +{quest.reward.coins} Xu
                                                        {quest.reward.items.length > 0 && ` + ${quest.reward.itemCount} vật phẩm`}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleClaimWeeklyQuest(quest.id)}
                                                        disabled={!quest.completed || quest.claimed}
                                                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                                            quest.claimed
                                                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                                : quest.completed
                                                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg'
                                                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        {quest.claimed ? '✓ Đã nhận' : quest.completed ? 'Nhận thưởng' : 'Chưa xong'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-5 md:p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-amber-100 p-2 rounded-2xl text-amber-600"><Gift className="w-5 h-5" /></div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">Rương thưởng ngày</h3>
                                    <p className="text-sm text-slate-500 font-medium">Mở khi hoàn thành đủ 3 nhiệm vụ.</p>
                                </div>
                            </div>
                            <div className="rounded-3xl bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border border-amber-100 p-4">
                                <p className="text-sm font-semibold text-slate-600 mb-3">
                                    {dashboard?.bonusChest.claimed
                                        ? 'Em đã mở rương hôm nay rồi. Mai quay lại nhé!'
                                        : dashboard?.bonusChest.available
                                            ? 'Rương đã sẵn sàng với phần thưởng sưu tầm hoặc booster nhẹ.'
                                            : 'Hoàn thành đủ nhiệm vụ ngày để mở rương thưởng.'}
                                </p>
                                <button
                                    type="button"
                                    onClick={handleClaimChest}
                                    disabled={!dashboard?.bonusChest.available || isGameLoopLoading}
                                    className={`w-full py-3 rounded-2xl text-sm font-black transition-colors ${dashboard?.bonusChest.available
                                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    {dashboard?.bonusChest.claimed ? 'Đã mở rương' : 'Mở rương thưởng'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-5 md:p-6">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-2xl text-blue-600"><CalendarDays className="w-5 h-5" /></div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800">Nhịp học tuần này</h3>
                                        <p className="text-sm text-slate-500 font-medium">Tích lũy đều để tiến gần quà thật hơn.</p>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-blue-600">{dashboard?.weekly.completedDays || 0}/{dashboard?.weekly.targetDays || 5}</span>
                            </div>
                            <div className="h-3 rounded-full bg-slate-200 overflow-hidden mb-3">
                                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${Math.min(100, Math.round(((dashboard?.weekly.completedDays || 0) / Math.max(dashboard?.weekly.targetDays || 1, 1)) * 100))}%` }} />
                            </div>
                            <p className="text-sm text-slate-500 font-medium mb-4">
                                Hoàn thành đủ nhiệm vụ trong 5 ngày để giữ nhịp tích lũy đẹp cho Gift Shop.
                            </p>
                            {giftShopEnabled && (
                                <button type="button" onClick={handleOpenGiftShop} className="w-full py-2.5 rounded-2xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-black hover:bg-indigo-100 transition-colors">
                                    Xem mục tiêu quà thật
                                </button>
                            )}
                        </div>

                        <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-5 md:p-6">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-100 p-2 rounded-2xl text-emerald-600"><Medal className="w-5 h-5" /></div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800">Sổ huy hiệu</h3>
                                        <p className="text-sm text-slate-500 font-medium">Nhìn lại những cột mốc nhỏ em đã đạt được.</p>
                                    </div>
                                </div>
                                {(dashboard?.achievements.length || 0) > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setIsBadgeGalleryOpen(true)}
                                        className="text-xs font-black text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1"
                                    >
                                        Xem tất cả
                                        <Trophy className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 gap-3 mb-4">
                                {(dashboard?.achievements.slice(0, 3) || []).map((achievement) => {
                                    const badgeImage = getAchievementBadgeImage(achievement.code);

                                    return (
                                    <div key={achievement.code} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                                            {badgeImage ? (
                                                <img
                                                    src={badgeImage}
                                                    alt={getAchievementBadgeAlt(achievement)}
                                                    className="h-9 w-9 object-contain"
                                                />
                                            ) : (
                                                <span className="text-xl">{achievement.icon}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-slate-800">{achievement.title}</p>
                                            <p className="text-xs text-slate-500 font-medium">{achievement.description}</p>
                                        </div>
                                    </div>
                                    );
                                })}
                                {(dashboard?.achievements.length || 0) === 0 && (
                                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm font-semibold text-slate-500">
                                        Hoàn thành bài đầu tiên để mở huy hiệu đầu tiên nhé.
                                    </div>
                                )}
                            </div>
                            <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-4">
                                <p className="text-xs uppercase font-black tracking-wider text-slate-400 mb-2">Bộ sưu tập mini</p>
                                <div className="flex flex-wrap gap-2">
                                    {(dashboard?.profile.collection || []).length > 0 ? (
                                        dashboard?.profile.collection.map((item) => (
                                            <div key={item.id} className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-xl" title={item.title}>
                                                {item.icon}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-slate-500 font-medium">Mở rương để bắt đầu bộ sưu tập Toán và Tiếng Việt.</p>
                                    )}
                                </div>
                                <div className="mt-4 flex items-center gap-3 text-sm font-bold text-slate-600">
                                    <span>💡 Vé gợi ý: {dashboard?.profile.hintTokens || 0}</span>
                                    <span>🛡️ Khiên chuỗi: {dashboard?.profile.streakShields || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="flex items-center gap-3 mb-6"><div className="bg-orange-100 p-2 rounded-xl text-orange-600"><Target className="w-6 h-6" /></div><h2 className="text-2xl font-black text-slate-800">Nhiệm vụ của em</h2></div>
                    {isLoadingTasks ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div> : myAssignmentQuizzes.length > 0 ? (
                        <div className="flex flex-col gap-4 md:gap-6">
                            <AnimatePresence mode="popLayout">
                                {pagedAssignmentQuizzes.map((quiz, i) => {
                                    const assignment = quiz._assignmentData;
                                    const isCompleted = (assignment?.attemptCount || 0) >= (assignment?.maxAttempts || 1);
                                    return (
                                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} key={quiz._assignmentData?.id || quiz.id} className={`bg-white rounded-[24px] p-4 md:p-6 border-2 flex flex-col sm:flex-row sm:items-center gap-4 md:gap-6 ${isCompleted ? 'border-emerald-100 opacity-80' : 'border-slate-100'}`}>
                                            <div className="flex sm:flex-col justify-between items-center w-full sm:w-20 gap-3 shrink-0">
                                                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center ${isCompleted ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-500'}`}><BookOpen className="w-6 h-6 md:w-7 md:h-7" /></div>
                                                {isCompleted ? <span className="bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase px-2 py-1 rounded-lg">Đã xong</span> : <span className="bg-red-50 text-red-600 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">Bắt buộc</span>}
                                            </div>
                                            <div className="flex-1 min-w-0"><h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2 line-clamp-2">{quiz.title}</h3><div className="flex items-center gap-3"><p className="text-xs font-bold text-slate-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {quiz.timeLimit}'</p><p className={`text-xs font-black px-2 py-0.5 rounded-md ${isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>Lượt làm: {assignment?.attemptCount || 0}/{assignment?.maxAttempts || 1}</p></div></div>
                                            <button onClick={() => !isCompleted && handleStartQuiz(quiz)} disabled={isCompleted} className={`w-full sm:w-auto sm:min-w-[160px] font-extrabold py-3 md:py-3.5 px-4 rounded-xl md:rounded-2xl transition-all ${isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'}`}>{isCompleted ? 'Xem kết quả' : <><Play className="w-4 h-4 fill-current inline mr-2" /> Làm bài ngay</>}</button>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    ) : <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center items-center flex flex-col"><img src={`${FLUENT_CDN}/Party%20popper/3D/party_popper_3d.png`} className="w-20 h-20 mb-4 opacity-80" alt="Done" /><h3 className="text-xl font-bold text-slate-700">Tuyệt vời!</h3><p className="text-slate-500 font-medium">Em đã làm hết tất cả bài tập giáo viên giao.</p></div>}
                </section>

                <StudentHomeworkSection 
                    studentId={studentSession.studentId} 
                    classId={studentSession.classId} 
                    onSelectAssignment={setSelectedHw}
                />

                <section>
                    <div className="flex items-center gap-3 mb-6"><div className="bg-teal-100 p-2 rounded-xl text-teal-600"><Rocket className="w-6 h-6" /></div><h2 className="text-2xl font-black text-slate-800">Thư viện luyện tập</h2></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {publicCategories.map((cat, i) => (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={cat.id} onClick={() => setSelectedSubject(cat.id)} className={`bg-gradient-to-br ${cat.color} p-6 rounded-3xl text-white cursor-pointer transform hover:-translate-y-1 hover:shadow-xl transition-all relative overflow-hidden group`}>
                                <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full group-hover:scale-110"></div>
                                <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-white/10 rounded-full group-hover:scale-110"></div>
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-4"><span className="material-symbols-rounded text-4xl">{cat.icon}</span><span className="bg-white/20 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">{cat.total} Bài tập</span></div>
                                    <h3 className="text-xl font-bold mb-1">{cat.title}</h3>
                                    <p className="text-white/80 text-xs font-medium">{cat.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
                <div className="pb-12 text-center hidden md:block"><p className="text-slate-400 font-medium text-sm">ÍtOngQuiz © 2026 - Môi trường học tập tích cực</p></div>
            </main>

            {/* --- MODALS --- */}
            <AnimatePresence>
                {isAttendanceModalOpen && attendanceQuestion && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-0 md:p-4 flex items-end md:items-center justify-center" onClick={() => !isSubmittingAttendance && setIsAttendanceModalOpen(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} onClick={(e) => e.stopPropagation()} className="w-full h-dvh md:h-auto md:max-w-2xl bg-white rounded-none md:rounded-3xl p-4 md:p-8 shadow-2xl overflow-y-auto">
                            <div className="flex items-start justify-between gap-4 mb-5"><div><p className="text-xs font-black text-indigo-500 uppercase tracking-wider mb-1">Điểm danh nhận thưởng</p><h3 className="text-xl md:text-2xl font-black text-slate-800">Câu hỏi ngẫu nhiên</h3><p className="text-sm text-slate-500 mt-1">Nguồn: {attendanceQuestion.quizTitle}</p></div><button type="button" onClick={() => setIsAttendanceModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">Đóng</button></div>
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 md:p-5 mb-4"><MathSpan content={attendanceQuestion.question || ''} className="text-slate-800 font-semibold leading-relaxed" /></div>
                            <div className="space-y-3 mb-5">
                                {attendanceQuestion.options.map((option, index) => {
                                    const label = String.fromCharCode(65 + index);
                                    const isSelected = selectedAttendanceAnswer === label;
                                    const isCorrectOption = attendanceResult !== null && label === attendanceQuestion.correctLabel;
                                    const isWrongSelected = attendanceResult === 'wrong' && isSelected && !isCorrectOption;
                                    return (
                                        <button key={`${attendanceQuestion.id}-${label}`} type="button" disabled={attendanceResult !== null || isSubmittingAttendance} onClick={() => setSelectedAttendanceAnswer(label)}
                                            className={`w-full text-left p-3 rounded-xl border-2 transition-colors flex items-center gap-3 ${isCorrectOption ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : isWrongSelected ? 'border-red-400 bg-red-50 text-red-700' : isSelected ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}>
                                            <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center shrink-0">{label}</span>
                                            <MathSpan content={cleanOptionText(option)} className="font-medium text-slate-700" />
                                        </button>
                                    );
                                })}
                            </div>
                            {attendanceMessage && <div className={`rounded-xl px-4 py-3 text-sm font-semibold mb-5 ${attendanceResult === 'correct' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{attendanceMessage}</div>}
                            <div className="flex items-center justify-end gap-3">
                                {attendanceResult === 'wrong' && !attendanceClaimed && <button type="button" onClick={openAttendanceModal} className="px-4 py-2 rounded-xl border border-indigo-200 text-indigo-600 font-bold hover:bg-indigo-50">Câu khác</button>}
                                <button type="button" onClick={() => setIsAttendanceModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">Đóng</button>
                                {attendanceResult === null && <button type="button" onClick={handleAttendanceSubmit} disabled={!selectedAttendanceAnswer || isSubmittingAttendance} className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed">{isSubmittingAttendance ? 'Đang kiểm tra...' : 'Xác nhận đáp án'}</button>}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isChangePasswordModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-0 md:p-4 flex items-end md:items-center justify-center" onClick={closeChangePasswordModal}>
                        <motion.form initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} onClick={(e) => e.stopPropagation()} onSubmit={handleChangePasswordSubmit} className="w-full h-dvh md:h-auto md:max-w-md bg-white rounded-none md:rounded-3xl p-4 md:p-6 shadow-2xl overflow-y-auto">
                            <div className="flex items-start justify-between gap-4 mb-5"><div><p className="text-xs font-black text-indigo-500 uppercase tracking-wider mb-1">Tài khoản</p><h3 className="text-xl font-black text-slate-800">Đổi mật khẩu</h3></div><button type="button" onClick={closeChangePasswordModal} className="text-slate-400 hover:text-slate-600 text-sm font-bold">Đóng</button></div>
                            <div className="space-y-4">
                                <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mật khẩu cũ</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nhập mật khẩu hiện tại" autoFocus /></div>
                                <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mật khẩu mới</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Tối thiểu 6 ký tự" /></div>
                                <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nhập lại mật khẩu mới</label><input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nhập lại mật khẩu mới" /></div>
                            </div>
                            {changePasswordError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold px-4 py-3">{changePasswordError}</div>}
                            <div className="mt-6 flex items-center justify-end gap-3"><button type="button" onClick={closeChangePasswordModal} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">Hủy</button><button type="submit" disabled={isChangingPassword} className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60">{isChangingPassword ? 'Đang lưu...' : 'Lưu mật khẩu'}</button></div>
                        </motion.form>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {selectedHw && (
                    <HomeworkSubmissionModal 
                        assignment={selectedHw}
                        submission={hwStore.submissions.find(s => s.assignment_id === selectedHw.id)}
                        studentId={studentSession.studentId}
                        studentName={studentSession.fullName}
                        onClose={() => setSelectedHw(null)}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {rewardSummary && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-sm p-4 flex items-center justify-center" onClick={clearGameLoopReward}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center">
                            <div className="text-5xl mb-3">{rewardSummary.icon}</div>
                            <h3 className="text-xl font-black text-slate-800 mb-2">{rewardSummary.title}</h3>
                            <p className="text-sm text-slate-500 font-medium">{rewardSummary.description}</p>
                            <button type="button" onClick={clearGameLoopReward} className="mt-6 w-full py-3 rounded-2xl bg-violet-600 text-white font-black hover:bg-violet-700 transition-colors">
                                Tiếp tục hành trình
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AvatarSelectorModal isOpen={isAvatarModalOpen} onClose={() => setIsAvatarModalOpen(false)} currentAvatar={studentSession.avatar} />
            <BadgeGallery 
                isOpen={isBadgeGalleryOpen}
                onClose={() => setIsBadgeGalleryOpen(false)}
                achievements={dashboard?.achievements || []}
            />
            <JoinLiveExamModal
                isOpen={isJoinLiveExamModalOpen}
                onClose={() => setIsJoinLiveExamModalOpen(false)}
                onJoinSuccess={(session) => {
                    setJoinedLiveExam({
                        sessionId: session.id,
                        sessionTitle: session.title,
                        quizId: session.quizId,
                        duration: session.duration,
                        startedAt: session.startedAt,
                        endsAt: session.endsAt,
                    });
                    setLiveExamSubmission(null);
                    setLiveExamStage(session.status === 'active' ? 'active' : 'waiting');
                    setIsJoinLiveExamModalOpen(false);
                }}
            />

            <StudentFloatingSidebar />

        </div>
    );
};

export default StudentDashboardUI;
