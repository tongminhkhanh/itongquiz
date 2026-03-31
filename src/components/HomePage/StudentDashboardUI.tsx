import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useQuizStore } from '../../../stores/quizStore';
import { useGamificationStore } from '../../stores/useGamificationStore';
import { getAvatarUrl } from '../../config/avatars';
import { getAllAssignments } from '../../services/classroomService';
import { Assignment } from '../../types/classroom.types';
import { Quiz } from '../../types';
import { Loader2, Play, Trophy, Star, BookOpen, Clock, Target, CalendarDays, Rocket, ShieldCheck, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SubjectLibrary from '../student/PracticeLibrary/SubjectLibrary';
import AvatarSelectorModal from '../common/AvatarSelectorModal';
import MathSpan from '../common/MathSpan';

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
const ATTENDANCE_STORAGE_PREFIX = 'student-attendance-reward';

interface AttendanceQuestion {
    id: string;
    quizTitle: string;
    question: string;
    options: string[];
    correctLabel: string;
}

const getLocalDateKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

const StudentDashboardUI: React.FC<StudentDashboardUIProps> = ({ ioeQuizzes = [] }) => {
    // --- Stores ---
    const classroomStore = useClassroomStore();
    const quizStore = useQuizStore();
    const { pet, coins, updateGameState } = useGamificationStore();
    const studentSession = classroomStore.studentSession;

    // --- State ---
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
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

    // Fetch pet data if not loaded
    useEffect(() => {
        if (studentSession?.username && !pet) {
            useGamificationStore.getState().fetchPetData(studentSession.username);
        }
    }, [studentSession?.username, pet]);

    // --- Derived Data: Assignments (Daily Quests) ---
    const myAssignmentQuizzes = useMemo(() => {
        if (!studentSession) return [];

        // Convert raw assignments to Quiz format
        return classroomStore.assignments.map(assignment => {
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
    }, [classroomStore.assignments, studentSession, quizStore.quizzes, ioeQuizzes]);

    // --- Derived Data: Public Categories ---
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

    const attendanceStorageKey = useMemo(() => {
        if (!studentSession?.username) return '';
        return `${ATTENDANCE_STORAGE_PREFIX}:${studentSession.username}:${getLocalDateKey()}`;
    }, [studentSession?.username]);

    const attendanceQuestionPool = useMemo<AttendanceQuestion[]>(() => {
        const allQuizzes = [...quizStore.quizzes, ...ioeQuizzes];

        return allQuizzes.flatMap((quiz) => {
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
        if (assignmentPage > totalAssignmentPages) {
            setAssignmentPage(totalAssignmentPages);
        }
    }, [assignmentPage, totalAssignmentPages]);

    useEffect(() => {
        if (!attendanceStorageKey) {
            setAttendanceClaimed(false);
            return;
        }

        try {
            const claimed = localStorage.getItem(attendanceStorageKey) === 'done';
            setAttendanceClaimed(claimed);
        } catch {
            setAttendanceClaimed(false);
        }
    }, [attendanceStorageKey]);

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
        }
    };

    const pickRandomAttendanceQuestion = () => {
        if (attendanceQuestionPool.length === 0) return null;

        if (!attendanceQuestion || attendanceQuestionPool.length === 1) {
            return attendanceQuestionPool[Math.floor(Math.random() * attendanceQuestionPool.length)];
        }

        const currentId = attendanceQuestion.id;
        const candidates = attendanceQuestionPool.filter((q) => q.id !== currentId);
        const pool = candidates.length > 0 ? candidates : attendanceQuestionPool;
        return pool[Math.floor(Math.random() * pool.length)];
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
            const correctText = attendanceQuestion.options[correctIdx]
                ? ` (${cleanOptionText(attendanceQuestion.options[correctIdx])})`
                : '';
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
            const ok = await updateGameState(studentSession.username, ATTENDANCE_REWARD.exp, ATTENDANCE_REWARD.coins);
            if (!ok) {
                setAttendanceResult('wrong');
                setAttendanceMessage('Trả lời đúng nhưng chưa cộng thưởng được. Em thử lại sau nhé!');
                return;
            }

            if (attendanceStorageKey) {
                localStorage.setItem(attendanceStorageKey, 'done');
            }
            setAttendanceClaimed(true);
            setAttendanceResult('correct');
            setAttendanceMessage(`Chính xác! Em nhận +${ATTENDANCE_REWARD.coins} Xu và +${ATTENDANCE_REWARD.exp} EXP.`);
        } catch {
            setAttendanceResult('wrong');
            setAttendanceMessage('Trả lời đúng nhưng hệ thống chưa cộng thưởng. Em thử lại sau nhé!');
        } finally {
            setIsSubmittingAttendance(false);
        }
    };

    const attendanceBadgeText = attendanceClaimed
        ? 'Đã điểm danh hôm nay'
        : attendanceQuestionPool.length > 0
            ? `Điểm danh nhận +${ATTENDANCE_REWARD.coins} Xu +${ATTENDANCE_REWARD.exp} EXP`
            : 'Đang tải câu hỏi điểm danh...';

    return (
        <div className="min-h-screen bg-[#F4F7FC] font-sans text-slate-800 flex flex-col items-center">

            {/* --- NAVBAR --- */}
            <header className="w-full bg-white shadow-sm border-b border-slate-100 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/school-logo.png" alt="School logo iTong Quiz" className="w-10 h-10 object-contain drop-shadow-md" />
                        <span className="text-2xl font-black tracking-tight text-slate-800">
                            ÍtOng<span className="text-orange-500">Quiz</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-3 md:gap-8">
                        {/* Gamification Stats */}
                        <div className="flex items-center gap-2.5 md:gap-4">
                            <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 md:px-3 py-1.5 rounded-full border border-amber-200">
                                <span className="text-amber-500 font-bold flex items-center gap-1 text-sm md:text-base">
                                    <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4" /> {pet?.level || 1}
                                </span>
                                <span className="hidden md:inline text-xs uppercase font-bold text-amber-600">Cấp bậc</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-yellow-50 px-2.5 md:px-3 py-1.5 rounded-full border border-yellow-200">
                                <span className="text-yellow-600 font-bold flex items-center gap-1 text-sm md:text-base">
                                    <Star className="w-3.5 h-3.5 md:w-4 md:h-4 fill-yellow-500" /> {coins}
                                </span>
                                <span className="hidden md:inline text-xs uppercase font-bold text-yellow-700">Xu</span>
                            </div>
                        </div>

                        {/* User Profile */}
                        <div className="flex items-center gap-3 border-l pl-3 md:pl-4 border-slate-200">
                            <div className="flex flex-col items-end hidden sm:flex">
                                <span className="font-bold text-sm leading-tight text-slate-700">{studentSession.fullName}</span>
                                <span className="text-xs text-slate-500 font-medium">{studentSession.className || 'Học sinh'}</span>
                            </div>
                            <div className="relative group cursor-pointer" onClick={() => setIsAvatarModalOpen(true)}>
                                <div className="relative overflow-hidden rounded-full border-2 border-indigo-100 group-hover:border-indigo-400 transition-all shadow-sm">
                                    <img
                                        src={studentSession.avatar ? getAvatarUrl(studentSession.avatar) : getAvatarUrl('default')}
                                        className="w-9 h-9 md:w-10 md:h-10 object-cover group-hover:scale-110 transition-transform"
                                        alt="Avatar"
                                    />
                                    {/* Camera Overlay on Hover */}
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                                {/* Dropdown menu simple */}
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right scale-95 group-hover:scale-100 pt-2 pb-2 z-50" onClick={(e) => e.stopPropagation()}>
                                    <div className="px-4 py-2 border-b border-slate-50 mb-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tài khoản</p>
                                        <p className="text-sm font-bold text-slate-700 block sm:hidden truncate">{studentSession.fullName}</p>
                                    </div>
                                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2">
                                        Đăng xuất
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT --- */}
            <main className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 flex-1 flex flex-col gap-10">

                {/* --- WELCOME BANNER --- */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-500 rounded-[32px] p-8 md:p-12 relative overflow-hidden shadow-lg shadow-indigo-200"
                >
                    <div className="absolute right-0 top-0 w-1/2 h-full opacity-10 pointer-events-none">
                        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <pattern id="circles" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <circle cx="20" cy="20" r="4" fill="currentColor" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#circles)" />
                        </svg>
                    </div>

                    <div className="relative z-10 max-w-2xl flex flex-col md:flex-row items-center gap-8">
                        <div className="w-24 h-24 md:w-32 md:h-32 bg-white/20 backdrop-blur-md rounded-full shadow-inner flex items-center justify-center flex-shrink-0">
                            <img src={`${FLUENT_CDN}/Graduation%20cap/3D/graduation_cap_3d.png`} alt="Mũ cử nhân đại diện cho sự học tập" className="w-20 md:w-28 filter drop-shadow-md" />
                        </div>
                        <div className="text-center md:text-left text-white">
                            <h1 className="text-3xl md:text-4xl font-black mb-2">Chào ngày mới, {studentSession.fullName.split(' ').pop()}! 👋</h1>
                            <p className="text-indigo-100 text-lg font-medium mb-6">Hôm nay em muốn chinh phục thử thách nào? Hãy chọn một bài tập và bắt đầu nhé!</p>

                            <div className="flex items-center justify-center md:justify-start gap-4">
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={openAttendanceModal}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') openAttendanceModal();
                                    }}
                                    className={`backdrop-blur-sm rounded-2xl px-5 py-2.5 text-sm font-black flex items-center gap-2 cursor-pointer transition-all duration-200 ${attendanceClaimed
                                        ? 'bg-gradient-to-r from-emerald-400/70 to-teal-300/70 text-white ring-2 ring-emerald-200/70 shadow-[0_8px_24px_rgba(16,185,129,0.35)]'
                                        : 'bg-gradient-to-r from-amber-300 via-yellow-300 to-lime-300 text-slate-900 ring-2 ring-yellow-100 shadow-[0_10px_28px_rgba(251,191,36,0.45)] hover:scale-105 hover:shadow-[0_12px_36px_rgba(251,191,36,0.55)] animate-pulse'
                                        }`}
                                >
                                    <ShieldCheck className={`w-4 h-4 ${attendanceClaimed ? 'text-white' : 'text-indigo-700'}`} />
                                    <span>{attendanceBadgeText}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>


                {/* --- DAILY QUESTS (Assignments) --- */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
                            <Target className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800">Nhiệm vụ của em</h2>
                        <span className="ml-auto text-sm font-semibold text-slate-500 flex items-center gap-1">
                            <CalendarDays className="w-4 h-4" /> Hôm nay
                        </span>
                    </div>

                    {isLoadingTasks ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                        </div>
                    ) : myAssignmentQuizzes.length > 0 ? (
                        <div className="flex flex-col gap-4 md:gap-6">
                            <AnimatePresence mode="popLayout">
                                {pagedAssignmentQuizzes.map((quiz, i) => {
                                    const assignment = quiz._assignmentData;
                                    const attempts = assignment?.attemptCount || 0;
                                    const maxAttempts = assignment?.maxAttempts || 1;
                                    const isCompleted = attempts >= maxAttempts;

                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                            key={quiz._assignmentData?.id || quiz.id}
                                            className={`bg-white rounded-[24px] p-4 md:p-6 border-2 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all group flex flex-col sm:flex-row sm:items-center gap-4 md:gap-6 ${isCompleted ? 'border-emerald-100 opacity-80' : 'border-slate-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-indigo-100'
                                                }`}
                                        >
                                            {/* Icon & Status */}
                                            <div className="flex sm:flex-col justify-between items-center sm:items-center w-full sm:w-20 gap-3 shrink-0">
                                                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all ${isCompleted ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-500 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white'
                                                    }`}>
                                                    <BookOpen className="w-6 h-6 md:w-7 md:h-7" />
                                                </div>
                                                {isCompleted ? (
                                                    <span className="bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1 shrink-0">
                                                        <ShieldCheck className="w-3 h-3" /> Đã xong
                                                    </span>
                                                ) : (
                                                    <span className="bg-red-50 text-red-600 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shrink-0">Bắt buộc</span>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2 line-clamp-2 leading-tight">{quiz.title}</h3>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5" /> {quiz.timeLimit}'
                                                    </p>
                                                    <p className={`text-xs font-black px-2 py-0.5 rounded-md ${isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                        Lượt làm: {attempts}/{maxAttempts}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Action */}
                                            <button
                                                onClick={() => !isCompleted && handleStartQuiz(quiz)}
                                                disabled={isCompleted}
                                                className={`w-full sm:w-auto sm:min-w-[160px] font-extrabold py-3 md:py-3.5 px-4 rounded-xl md:rounded-2xl transition-all flex items-center justify-center gap-2 shrink-0 ${isCompleted
                                                    ? 'bg-emerald-50 text-emerald-600 cursor-default'
                                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 active:scale-95'
                                                    }`}
                                            >
                                                {isCompleted ? (
                                                    <>🎉 Xem kết quả</>
                                                ) : (
                                                    <><Play className="w-4 h-4 fill-current" /> Làm bài ngay</>
                                                )}
                                            </button>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>

                            {totalAssignmentPages > 1 && (
                                <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => setAssignmentPage(p => Math.max(1, p - 1))}
                                        disabled={assignmentPage === 1}
                                        className="px-3 py-1.5 rounded-lg text-sm font-bold border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Trước
                                    </button>

                                    {Array.from({ length: totalAssignmentPages }, (_, idx) => {
                                        const page = idx + 1;
                                        const isActive = page === assignmentPage;
                                        return (
                                            <button
                                                key={page}
                                                type="button"
                                                onClick={() => setAssignmentPage(page)}
                                                className={`w-9 h-9 rounded-lg text-sm font-bold border transition-colors ${isActive
                                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}

                                    <button
                                        type="button"
                                        onClick={() => setAssignmentPage(p => Math.min(totalAssignmentPages, p + 1))}
                                        disabled={assignmentPage === totalAssignmentPages}
                                        className="px-3 py-1.5 rounded-lg text-sm font-bold border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Sau
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center">
                            <img src={`${FLUENT_CDN}/Party%20popper/3D/party_popper_3d.png`} alt="Pháo hoa chúc mừng hoàn thành nhiệm vụ" className="w-20 h-20 mb-4 opacity-80" />
                            <h3 className="text-xl font-bold text-slate-700">Tuyệt vời!</h3>
                            <p className="text-slate-500 font-medium">Em đã làm hết tất cả bài tập giáo viên giao.</p>
                        </div>
                    )}
                </section>


                {/* --- PUBLIC LIBRARY --- */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-teal-100 p-2 rounded-xl text-teal-600">
                            <Rocket className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800">Thư viện luyện tập</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {publicCategories.map((cat, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                key={cat.id}
                                onClick={() => setSelectedSubject(cat.id)}
                                className={`bg-gradient-to-br ${cat.color} p-6 rounded-3xl text-white cursor-pointer transform hover:-translate-y-1 hover:shadow-xl transition-all relative overflow-hidden group`}
                            >
                                {/* Decorative rings */}
                                <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full group-hover:scale-110 transition-transform"></div>
                                <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-white/10 rounded-full group-hover:scale-110 transition-transform"></div>

                                <div className="relative z-10 flex flex-col h-full">
                                    <span className="material-symbols-outlined text-4xl mb-4 opacity-90 group-hover:opacity-100 transition-opacity">{cat.icon}</span>
                                    <h3 className="text-2xl font-black mb-1 drop-shadow-sm">{cat.title}</h3>
                                    <p className="text-white/80 font-medium text-sm mb-6 max-w-xs">{cat.desc}</p>

                                    <div className="mt-auto inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full w-fit">
                                        <span className="font-bold">{cat.total}</span>
                                        <span className="text-sm opacity-90">bài tập</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Footer space */}
                <div className="pb-12 text-center hidden md:block">
                    <p className="text-slate-400 font-medium text-sm">ÍtOngQuiz © 2026 - Môi trường học tập tích cực</p>
                </div>
            </main>

            {/* --- MODALS --- */}
            <AnimatePresence>
                {isAttendanceModalOpen && attendanceQuestion && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center"
                        onClick={() => !isSubmittingAttendance && setIsAttendanceModalOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-2xl bg-white rounded-3xl p-6 md:p-8 shadow-2xl"
                        >
                            <div className="flex items-start justify-between gap-4 mb-5">
                                <div>
                                    <p className="text-xs font-black text-indigo-500 uppercase tracking-wider mb-1">Điểm danh nhận thưởng</p>
                                    <h3 className="text-xl md:text-2xl font-black text-slate-800">Câu hỏi ngẫu nhiên</h3>
                                    <p className="text-sm text-slate-500 mt-1">Nguồn: {attendanceQuestion.quizTitle}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsAttendanceModalOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                                >
                                    Đóng
                                </button>
                            </div>

                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 md:p-5 mb-4">
                                <MathSpan
                                    content={attendanceQuestion.question || ''}
                                    className="text-slate-800 font-semibold leading-relaxed"
                                />
                            </div>

                            <div className="space-y-3 mb-5">
                                {attendanceQuestion.options.map((option, index) => {
                                    const label = String.fromCharCode(65 + index);
                                    const isSelected = selectedAttendanceAnswer === label;
                                    const isCorrectOption = attendanceResult !== null && label === attendanceQuestion.correctLabel;
                                    const isWrongSelected = attendanceResult === 'wrong' && isSelected && !isCorrectOption;

                                    return (
                                        <button
                                            key={`${attendanceQuestion.id}-${label}`}
                                            type="button"
                                            disabled={attendanceResult !== null || isSubmittingAttendance}
                                            onClick={() => setSelectedAttendanceAnswer(label)}
                                            className={`w-full text-left p-3 rounded-xl border-2 transition-colors flex items-center gap-3 ${isCorrectOption
                                                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                                : isWrongSelected
                                                    ? 'border-red-400 bg-red-50 text-red-700'
                                                    : isSelected
                                                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                                                        : 'border-slate-200 hover:border-indigo-300 bg-white'
                                                }`}
                                        >
                                            <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center shrink-0">
                                                {label}
                                            </span>
                                            <MathSpan
                                                content={cleanOptionText(option)}
                                                className="font-medium text-slate-700"
                                            />
                                        </button>
                                    );
                                })}
                            </div>

                            {attendanceMessage && (
                                <div className={`rounded-xl px-4 py-3 text-sm font-semibold mb-5 ${attendanceResult === 'correct'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                    }`}>
                                    {attendanceMessage}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3">
                                {attendanceResult === 'wrong' && !attendanceClaimed && (
                                    <button
                                        type="button"
                                        onClick={openAttendanceModal}
                                        className="px-4 py-2 rounded-xl border border-indigo-200 text-indigo-600 font-bold hover:bg-indigo-50"
                                    >
                                        Câu khác
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setIsAttendanceModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                                >
                                    Đóng
                                </button>

                                {attendanceResult === null && (
                                    <button
                                        type="button"
                                        onClick={handleAttendanceSubmit}
                                        disabled={!selectedAttendanceAnswer || isSubmittingAttendance}
                                        className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {isSubmittingAttendance ? 'Đang kiểm tra...' : 'Xác nhận đáp án'}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AvatarSelectorModal
                isOpen={isAvatarModalOpen}
                onClose={() => setIsAvatarModalOpen(false)}
                currentAvatar={studentSession.avatar}
            />
        </div>
    );
};

export default StudentDashboardUI;
