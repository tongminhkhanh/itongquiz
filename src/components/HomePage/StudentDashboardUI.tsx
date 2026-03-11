import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useQuizStore } from '../../../stores/quizStore';
import { useGamificationStore } from '../../stores/useGamificationStore';
import { getAvatarUrl } from '../../config/avatars';
import { getAllAssignments } from '../../services/classroomService';
import { Assignment } from '../../types/classroom.types';
import { Quiz } from '../../types';
import { Loader2, Play, Trophy, Star, BookOpen, Clock, Target, CalendarDays, Rocket, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

const StudentDashboardUI: React.FC<StudentDashboardUIProps> = ({ ioeQuizzes = [] }) => {
    // --- Stores ---
    const classroomStore = useClassroomStore();
    const quizStore = useQuizStore();
    const { pet, coins } = useGamificationStore();
    const studentSession = classroomStore.studentSession;

    // --- State ---
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);

    // --- Fetch Data ---
    useEffect(() => {
        const fetchAssignments = async () => {
            setIsLoadingTasks(true);
            try {
                const data = await getAllAssignments();
                setAssignments(data);
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

        const assignedQuizIds = new Set(
            classroomStore.assignments
                .filter(a => a.studentId === studentSession.studentId)
                .map(a => a.quizId)
        );

        // Convert raw assignments to Quiz format, filter by assigned ids
        return assignments
            .filter(a => assignedQuizIds.has(a.quizId))
            .map(assignment => {
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
    }, [assignments, classroomStore.studentAssignments, studentSession, quizStore.quizzes, ioeQuizzes]);

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

    if (!studentSession) return null;

    const handleStartQuiz = (quiz: Quiz) => {
        quizStore.selectQuiz(quiz);
        quizStore.setView('student');
    };

    const handleLogout = () => {
        if (window.confirm('Em có chắc chắn muốn đăng xuất không?')) {
            classroomStore.logoutStudent();
        }
    };

    return (
        <div className="min-h-screen bg-[#F4F7FC] font-sans text-slate-800 flex flex-col items-center">

            {/* --- NAVBAR --- */}
            <header className="w-full bg-white shadow-sm border-b border-slate-100 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={`${FLUENT_CDN}/Honeybee/3D/honeybee_3d.png`} alt="Logo" className="w-10 h-10 drop-shadow-md" />
                        <span className="text-2xl font-black tracking-tight text-slate-800">
                            ÍtOng<span className="text-orange-500">Quiz</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-4 md:gap-8">
                        {/* Gamification Stats */}
                        <div className="hidden md:flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                                <span className="text-amber-500 font-bold flex items-center gap-1">
                                    <Trophy className="w-4 h-4" /> {pet?.level || 1}
                                </span>
                                <span className="text-xs uppercase font-bold text-amber-600">Cấp bậc</span>
                            </div>
                            <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-200">
                                <span className="text-yellow-600 font-bold flex items-center gap-1">
                                    <Star className="w-4 h-4 fill-yellow-500" /> {coins}
                                </span>
                                <span className="text-xs uppercase font-bold text-yellow-700">Xu</span>
                            </div>
                        </div>

                        {/* User Profile */}
                        <div className="flex items-center gap-3 border-l pl-4 border-slate-200">
                            <div className="flex flex-col items-end hidden sm:flex">
                                <span className="font-bold text-sm leading-tight text-slate-700">{studentSession.fullName}</span>
                                <span className="text-xs text-slate-500 font-medium">{studentSession.className || 'Học sinh'}</span>
                            </div>
                            <div className="relative group cursor-pointer">
                                <img
                                    src={studentSession.avatarId ? getAvatarUrl(studentSession.avatarId) : getAvatarUrl('default')}
                                    className="w-10 h-10 rounded-full border-2 border-indigo-100 object-cover shadow-sm group-hover:border-indigo-300 transition-colors"
                                    alt="Avatar"
                                />
                                {/* Dropdown menu simple */}
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right scale-95 group-hover:scale-100 pt-2 pb-2">
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
                            <img src={`${FLUENT_CDN}/Graduation%20cap/3D/graduation_cap_3d.png`} alt="Hat" className="w-20 md:w-28 filter drop-shadow-md" />
                        </div>
                        <div className="text-center md:text-left text-white">
                            <h1 className="text-3xl md:text-4xl font-black mb-2">Chào ngày mới, {studentSession.fullName.split(' ').pop()}! 👋</h1>
                            <p className="text-indigo-100 text-lg font-medium mb-6">Hôm nay em muốn chinh phục thử thách nào? Hãy chọn một bài tập và bắt đầu nhé!</p>

                            <div className="flex items-center justify-center md:justify-start gap-4">
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 text-sm font-semibold flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-300" /> Cập nhật điểm danh 100%
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <AnimatePresence>
                                {myAssignmentQuizzes.map((quiz, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                                        key={quiz.id}
                                        className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-indigo-100 transition-all group flex flex-col"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                <BookOpen className="w-6 h-6" />
                                            </div>
                                            <span className="bg-red-50 text-red-600 text-xs font-black uppercase px-3 py-1 rounded-full">Bắt buộc</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-2">{quiz.title}</h3>
                                        <p className="text-sm font-medium text-slate-500 mb-6 flex items-center gap-2">
                                            <Clock className="w-4 h-4" /> Mới giao
                                        </p>

                                        <button
                                            onClick={() => handleStartQuiz(quiz)}
                                            className="mt-auto w-full bg-slate-50 hover:bg-indigo-50 text-indigo-600 font-bold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Play className="w-4 h-4" /> Làm bài ngay
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center">
                            <img src={`${FLUENT_CDN}/Party%20popper/3D/party_popper_3d.png`} alt="Yay" className="w-20 h-20 mb-4 opacity-80" />
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
                                onClick={() => {
                                    quizStore.setCategory(cat.id);
                                    quizStore.setView('quiz-list'); // Need to handle quiz-list view appropriately 
                                }}
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
        </div>
    );
};

export default StudentDashboardUI;
