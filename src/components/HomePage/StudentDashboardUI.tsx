import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import StudentAchievementsPage from '../../features/certificates/StudentAchievementsPage';
import { useAuthStore } from '../../../stores/authStore';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useAssignmentStore } from '../../stores/useAssignmentStore';
import { useQuizStore } from '../../../stores/quizStore';
import { useGamificationStore } from '../../stores/useGamificationStore';
import { useGameLoopStore } from '../../stores/useGameLoopStore';
import { getAvatarUrl } from '../../config/avatars';
import { callApi } from '../../services/apiAdapter';
import { Assignment } from '../../types/classroom.types';
import { Question, Quiz } from '../../types';
import { Loader2, CheckCircle2 } from 'lucide-react';
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
import CurrentAnnouncementBanner from '../common/CurrentAnnouncementBanner';
import {
    AssignedWorkSection,
    getAssignmentVisualState,
    LearningProgressPanel,
    RewardSidebar,
    StudentDashboardHeader,
    StudentDashboardHero,
    SubjectPracticeGrid,
    WeeklyQuestsPanel,
    type WeeklyQuestViewModel,
} from './student-dashboard';

// --- Subject Config (Reused from HomePage) ---
export const SUBJECT_CONFIG: Record<string, { title: string; icon: string; color: string; desc: string; showOnHome?: boolean }> = {
    'toan': { title: 'Toán Học', icon: 'calculate', color: 'from-blue-400 to-blue-600', desc: 'Rèn luyện tư duy logic' },
    'tieng-viet': { title: 'Tiếng Việt', icon: 'menu_book', color: 'from-amber-400 to-amber-600', desc: 'Vun đắp ngôn ngữ tiếng mẹ đẻ' },
    'tu-nhien-xa-hoi': { title: 'Tự nhiên & Xã hội', icon: 'public', color: 'from-emerald-400 to-emerald-600', desc: 'Khám phá thế giới muôn màu' },
    'tieng-anh': { title: 'Tiếng Anh', icon: 'language', color: 'from-blue-400 to-blue-700', desc: 'Mở rộng giao tiếp quốc tế' },
    'tin-hoc': { title: 'Tin học', icon: 'computer', color: 'from-slate-400 to-slate-600', desc: 'Làm chủ công nghệ tương lai' },
    'ioe': { title: 'Luyện thi IOE', icon: 'workspace_premium', color: 'from-yellow-400 to-orange-500', desc: 'Chinh phục kỳ thi tiếng Anh quốc gia', showOnHome: true },
};

interface StudentDashboardUIProps {
    ioeQuizzes?: Quiz[];
}

const ASSIGNMENTS_PER_PAGE = 5;
const ATTENDANCE_REWARD = { exp: 50, coins: 50 };
const SUBJECT_CARD_STYLES = [
    { surfaceClass: 'border-blue-100 bg-blue-50', accentClass: 'bg-blue-100 text-blue-700' },
    { surfaceClass: 'border-amber-100 bg-amber-50', accentClass: 'bg-amber-100 text-amber-700' },
    { surfaceClass: 'border-emerald-100 bg-emerald-50', accentClass: 'bg-emerald-100 text-emerald-700' },
    { surfaceClass: 'border-indigo-100 bg-indigo-50', accentClass: 'bg-indigo-100 text-indigo-700' },
    { surfaceClass: 'border-slate-200 bg-slate-50', accentClass: 'bg-slate-200 text-slate-700' },
    { surfaceClass: 'border-orange-100 bg-orange-50', accentClass: 'bg-orange-100 text-orange-700' },
] as const;

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
    const assignmentStore = useAssignmentStore();
    const fetchStudentAssignments = assignmentStore.fetchStudentAssignments;
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
    const [activeSection, setActiveSection] = useState<'dashboard' | 'achievements'>('dashboard');
    const [isJourneyExpanded, setIsJourneyExpanded] = useState(false);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [assignmentError, setAssignmentError] = useState<string | null>(null);
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

            if (joinedSessionQuiz && Array.isArray(joinedSessionQuiz.questions) && joinedSessionQuiz.questions.length > 0) {
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
                const loadedQuiz = useQuizStore.getState().quizzes.find((q) => q.id === joinedLiveExam.quizId);
                if (loadedQuiz && (!Array.isArray(loadedQuiz.questions) || loadedQuiz.questions.length === 0)) {
                    await quizStore.loadQuizQuestions(joinedLiveExam.quizId);
                }
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
    const [weeklyQuests, setWeeklyQuests] = useState<WeeklyQuestViewModel[]>([]);
    const [isWeeklyQuestsLoading, setIsWeeklyQuestsLoading] = useState(false);
    const [weeklyQuestsError, setWeeklyQuestsError] = useState<string | null>(null);
    const [isClaimingWeeklyQuest, setIsClaimingWeeklyQuest] = useState<string | null>(null);
    const [claimingMissionId, setClaimingMissionId] = useState<GameLoopMission['id'] | null>(null);

    // --- Fetch Data ---
    const fetchAssignments = useCallback(async () => {
        setIsLoadingTasks(true);
        setAssignmentError(null);
        try {
            if (studentSession?.studentId) {
                await fetchStudentAssignments(studentSession.studentId);
                const storeError = useAssignmentStore.getState().error;
                if (storeError) throw new Error(storeError);
            }
        } catch (error) {
            console.error('Failed to fetch assignments:', error);
            setAssignmentError('Chưa tải được bài giáo viên giao. Em hãy thử lại.');
        } finally {
            setIsLoadingTasks(false);
        }
    }, [fetchStudentAssignments, studentSession?.studentId]);

    useEffect(() => {
        void fetchAssignments();
    }, [fetchAssignments]);

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
    const fetchWeeklyQuests = useCallback(async () => {
        if (!studentSession?.username) return;

        setIsWeeklyQuestsLoading(true);
        setWeeklyQuestsError(null);
        try {
            const data = await callApi('get_weekly_quests', {});
            if (data.status === 'success' && Array.isArray(data.quests)) {
                setWeeklyQuests(data.quests);
                return;
            }
            throw new Error(data.message || 'Không thể tải nhiệm vụ tuần');
        } catch (error) {
            console.error('Error fetching weekly quests:', error);
            setWeeklyQuestsError('Không thể tải nhiệm vụ tuần');
        } finally {
            setIsWeeklyQuestsLoading(false);
        }
    }, [studentSession?.username]);

    useEffect(() => {
        void fetchWeeklyQuests();
    }, [fetchWeeklyQuests]);
    // --- Derived Data ---
    const myAssignmentQuizzes = useMemo(() => {
        if (!studentSession) return [];
        const mappedAssignments = assignmentStore.assignments.map(assignment => {
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
    }, [assignmentStore.assignments, studentSession, quizStore.quizzes, ioeQuizzes]);

    const publicCategories = useMemo(() => {
        const categories = Object.keys(SUBJECT_CONFIG).filter(cat => SUBJECT_CONFIG[cat].showOnHome !== false);
        return categories.map((cat, index) => {
            let total = 0;
            if (cat === 'ioe') {
                total = ioeQuizzes.length;
            } else {
                total = quizStore.quizzes.filter(q => (q.category || 'class') === cat && q.showOnHome !== false).length;
            }
            const config = SUBJECT_CONFIG[cat];
            const cardStyle = SUBJECT_CARD_STYLES[index % SUBJECT_CARD_STYLES.length];
            return {
                id: cat,
                title: config.title,
                description: config.desc,
                icon: config.icon,
                total,
                ...cardStyle,
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

    const hasReadyAssignment = useMemo(
        () => myAssignmentQuizzes.some((quiz) => getAssignmentVisualState(quiz) === 'ready'),
        [myAssignmentQuizzes]
    );

    const handleHeroPrimaryAction = useCallback(() => {
        const targetId = hasReadyAssignment ? 'assigned-work' : 'practice-library';
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [hasReadyAssignment]);

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
            toast.success('Đổi mật khẩu thành công.');
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
            toast('Hôm nay em đã điểm danh nhận thưởng rồi. Mai quay lại nhé!', { icon: '📅' });
            return;
        }
        const randomQuestion = pickRandomAttendanceQuestion();
        if (!randomQuestion) {
            toast.error('Hiện chưa có câu hỏi trắc nghiệm phù hợp trong ngân hàng đề.');
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
        setClaimingMissionId(missionId);
        try {
            await claimMission(studentSession.username, missionId);
        } finally {
            setClaimingMissionId(null);
        }
    };

    const handleClaimChest = async () => {
        if (!studentSession?.username) return;
        await claimChest(studentSession.username);
    };

    const handleClaimWeeklyQuest = async (questId: string) => {
        if (!studentSession?.username) return;

        try {
            setIsClaimingWeeklyQuest(questId);
            const data = await callApi('claim_weekly_quest', { questId });

            if (data.status === 'success') {
                // Show success toast (you'll need to import toast from react-hot-toast)
                toast.success(`🎉 Nhận thưởng thành công! +${data.reward.coins} xu`);

                // Refresh weekly quests through the same retryable loader.
                await fetchWeeklyQuests();

                // Refresh dashboard to update coins
                if (data.data) {
                    loadDashboard(studentSession.username);
                }
            }
        } catch (error: any) {
            console.error('Error claiming weekly quest:', error);
            toast.error(error.message || 'Không thể nhận thưởng');
        } finally {
            setIsClaimingWeeklyQuest(null);
        }
    };

    return (
        <div className="min-h-dvh bg-[#F4F7FC] font-sans text-slate-800 flex flex-col items-center">
            <CurrentAnnouncementBanner role="student" />
            <StudentDashboardHeader
                studentName={studentSession.fullName}
                className={studentSession.className}
                avatarUrl={studentSession.avatar ? getAvatarUrl(studentSession.avatar) : getAvatarUrl('default')}
                level={pet?.level || 1}
                coins={coins}
                activeSection={activeSection}
                giftShopEnabled={giftShopEnabled}
                studentId={studentSession.studentId}
                onSelectSection={setActiveSection}
                onOpenGiftShop={handleOpenGiftShop}
                onOpenLiveExam={() => setIsJoinLiveExamModalOpen(true)}
                onOpenAvatar={() => setIsAvatarModalOpen(true)}
                onOpenChangePassword={openChangePasswordModal}
                onLogout={handleLogout}
            />

            <main className="w-full max-w-7xl mx-auto px-3 md:px-8 py-5 md:py-12 flex-1 flex flex-col gap-7 md:gap-10">
                {activeSection === 'achievements' ? (
                    <StudentAchievementsPage />
                ) : (
                    <>
                <StudentDashboardHero
                    firstName={studentSession.fullName.split(' ').pop() || studentSession.fullName}
                    hasReadyAssignment={hasReadyAssignment}
                    attendanceClaimed={attendanceClaimed}
                    attendanceLabel={attendanceBadgeText}
                    attendanceAvailable={attendanceClaimed || attendanceQuestionPool.length > 0}
                    onPrimaryAction={handleHeroPrimaryAction}
                    onAttendance={openAttendanceModal}
                />

                <AssignedWorkSection
                    quizzes={pagedAssignmentQuizzes}
                    isLoading={isLoadingTasks}
                    errorMessage={assignmentError}
                    page={assignmentPage}
                    totalPages={totalAssignmentPages}
                    onRetry={() => void fetchAssignments()}
                    onPageChange={setAssignmentPage}
                    onStartQuiz={handleStartQuiz}
                />
                <section className="space-y-6">
                    <LearningProgressPanel
                        dashboard={dashboard}
                        isLoading={isGameLoopLoading}
                        errorMessage={gameLoopError}
                        expanded={isJourneyExpanded}
                        claimingMissionId={claimingMissionId}
                        onToggle={() => setIsJourneyExpanded((current) => !current)}
                        onRetry={() => {
                            if (studentSession.username) void loadDashboard(studentSession.username);
                        }}
                        onClaimMission={handleClaimMission}
                    />
                    <section className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-6 items-start">
                        <WeeklyQuestsPanel
                            quests={weeklyQuests}
                            isLoading={isWeeklyQuestsLoading}
                            errorMessage={weeklyQuestsError}
                            claimingQuestId={isClaimingWeeklyQuest}
                            onRetry={() => void fetchWeeklyQuests()}
                            onClaim={handleClaimWeeklyQuest}
                        />
                        <RewardSidebar
                            dashboard={dashboard}
                            giftShopEnabled={giftShopEnabled}
                            isProcessing={isGameLoopLoading}
                            onOpenChest={handleClaimChest}
                            onOpenGiftShop={handleOpenGiftShop}
                            onOpenBadges={() => setIsBadgeGalleryOpen(true)}
                        />
                    </section>
                </section>



                <StudentHomeworkSection
                    studentId={studentSession.studentId}
                    classId={studentSession.classId}
                    onSelectAssignment={setSelectedHw}
                />


                <SubjectPracticeGrid
                    subjects={publicCategories}
                    onSelectSubject={setSelectedSubject}
                />
                <div className="pb-12 text-center hidden md:block"><p className="text-slate-400 font-medium text-sm">ÍtOngQuiz © 2026 - Môi trường học tập tích cực</p></div>
                    </>
                )}
            </main>

            {/* --- MODALS --- */}
            <AnimatePresence>
                {isAttendanceModalOpen && attendanceQuestion && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-0 md:p-4 flex items-end md:items-center justify-center" onClick={() => !isSubmittingAttendance && setIsAttendanceModalOpen(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} onClick={(e) => e.stopPropagation()} className="w-full h-dvh md:h-auto md:max-w-2xl bg-white rounded-none md:rounded-3xl p-4 md:p-8 shadow-2xl overflow-y-auto">
                            <div className="flex items-start justify-between gap-4 mb-5"><div><p className="text-xs font-black text-blue-600 uppercase tracking-wider mb-1">Điểm danh nhận thưởng</p><h3 className="text-xl md:text-2xl font-black text-slate-800">Câu hỏi ngẫu nhiên</h3><p className="text-sm text-slate-500 mt-1">Nguồn: {attendanceQuestion.quizTitle}</p></div><button type="button" onClick={() => setIsAttendanceModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">Đóng</button></div>
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 md:p-5 mb-4"><MathSpan content={attendanceQuestion.question || ''} className="text-blue-900 font-semibold leading-relaxed" /></div>
                            <div className="space-y-3 mb-5">
                                {attendanceQuestion.options.map((option, index) => {
                                    const label = String.fromCharCode(65 + index);
                                    const isSelected = selectedAttendanceAnswer === label;
                                    const isCorrectOption = attendanceResult !== null && label === attendanceQuestion.correctLabel;
                                    const isWrongSelected = attendanceResult === 'wrong' && isSelected && !isCorrectOption;
                                    return (
                                        <button key={`${attendanceQuestion.id}-${label}`} type="button" disabled={attendanceResult !== null || isSubmittingAttendance} onClick={() => setSelectedAttendanceAnswer(label)}
                                            className={`w-full text-left p-3 rounded-xl border-2 transition-colors flex items-center gap-3 ${isCorrectOption ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : isWrongSelected ? 'border-red-400 bg-red-50 text-red-700' : isSelected ? 'border-indigo-400 bg-indigo-50 text-blue-800' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}>
                                            <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center shrink-0">{label}</span>
                                            <MathSpan content={cleanOptionText(option)} className="font-medium text-slate-700" />
                                        </button>
                                    );
                                })}
                            </div>
                            {attendanceMessage && <div className={`rounded-xl px-4 py-3 text-sm font-semibold mb-5 ${attendanceResult === 'correct' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{attendanceMessage}</div>}
                            <div className="flex items-center justify-end gap-3">
                                {attendanceResult === 'wrong' && !attendanceClaimed && <button type="button" onClick={openAttendanceModal} className="px-4 py-2 rounded-xl border border-indigo-200 text-blue-700 font-bold hover:bg-indigo-50">Câu khác</button>}
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
                            <div className="flex items-start justify-between gap-4 mb-5"><div><p className="text-xs font-black text-blue-600 uppercase tracking-wider mb-1">Tài khoản</p><h3 className="text-xl font-black text-slate-800">Đổi mật khẩu</h3></div><button type="button" onClick={closeChangePasswordModal} className="text-slate-400 hover:text-slate-600 text-sm font-bold">Đóng</button></div>
                            <div className="space-y-4">
                                <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mật khẩu cũ</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nhập mật khẩu hiện tại" autoFocus /></div>
                                <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mật khẩu mới</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Tối thiểu 6 ký tự" /></div>
                                <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nhập lại mật khẩu mới</label><input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nhập lại mật khẩu mới" /></div>
                            </div>
                            {changePasswordError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold px-4 py-3">{changePasswordError}</div>}
                            <div className="mt-6 flex items-center justify-end gap-3">
                                <button type="button" onClick={closeChangePasswordModal} className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50">Hủy</button>
                                <button type="submit" disabled={isChangingPassword} className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-60">{isChangingPassword ? 'Đang lưu...' : 'Lưu mật khẩu'}</button>
                            </div>
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
