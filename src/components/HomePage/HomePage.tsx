import React, { useState, useMemo, useEffect } from 'react';
import { Quiz } from '../../types';
import { useAuthStore } from '../../../stores/authStore';
import { useQuizStore } from '../../../stores/quizStore';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { Lock, Search, Clock, ChevronRight } from 'lucide-react';
import Modal from '../common/Modal';
import LoginModal from '../common/LoginModal';
import AnnouncementMarquee from '../common/AnnouncementMarquee';
import QuizListPage from './QuizListPage';
import LeaderboardPage from './LeaderboardPage';
import { getAllAssignments } from '../../services/classroomService';
import { Assignment } from '../../types/classroom.types';
import LoginLandingPage from './LoginLandingPage';
import StudentDashboardUI from './StudentDashboardUI';

// --- Types ---
interface HomePageProps {
    ioeQuizzes: Quiz[];
    ioeLoading: boolean;
    onRefreshIoe: () => void;
}

// --- Fluent Emoji CDN Base ---
const FLUENT_CDN = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets';

// --- Coming Soon Categories ---
const COMING_SOON_CATEGORIES = ['science', 'history'];

// --- Subject Config (Sticker Land) ---
export const SUBJECT_CONFIG: Record<string, {
    label: string;
    title: string;
    desc: string;
    icon: string;
    color: string;
    bgColor: string;
    borderColor: string;
    btnColor: string;
    btnBorder: string;
    btnText: string;
    btnLabel: string;
    highlight?: boolean;
}> = {
    'all': {
        label: 'Tất Cả',
        title: 'Thư Viện Đề Thi',
        desc: 'Khám phá tất cả bài tập.',
        icon: `${FLUENT_CDN}/Open%20book/3D/open_book_3d.png`,
        color: '#6366F1', // Indigo
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
        btnColor: 'bg-indigo-500 hover:bg-indigo-400',
        btnBorder: 'border-indigo-700',
        btnText: 'text-white',
        btnLabel: 'Khám phá ngay',
    },
    'class': {
        label: 'Bài Tập',
        title: 'Bài Tập Lớp',
        desc: 'Bài tập được giao từ thầy cô.',
        icon: `${FLUENT_CDN}/Books/3D/books_3d.png`,
        color: '#3B82F6',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        btnColor: 'bg-blue-500 hover:bg-blue-400',
        btnBorder: 'border-blue-700',
        btnText: 'text-white',
        btnLabel: 'Bắt đầu',
    },
    'ioe': {
        label: 'Tiếng Anh',
        title: 'English Fun',
        desc: 'Hello! How are you?',
        icon: `${FLUENT_CDN}/Speech%20balloon/3D/speech_balloon_3d.png`,
        color: '#F59E0B',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        btnColor: 'bg-yellow-400 hover:bg-yellow-300',
        btnBorder: 'border-yellow-600',
        btnText: 'text-yellow-900',
        btnLabel: 'Start Now',
    },
    'vioedu': {
        label: 'Toán Học',
        title: 'Toán Thông Minh',
        desc: 'Cộng trừ nhân chia thật dễ!',
        icon: `${FLUENT_CDN}/Abacus/3D/abacus_3d.png`,
        color: '#3B82F6',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        btnColor: 'bg-blue-500 hover:bg-blue-400',
        btnBorder: 'border-blue-700',
        btnText: 'text-white',
        btnLabel: 'Bắt đầu',
    },
    'trang-nguyen': {
        label: 'Tiếng Việt',
        title: 'Vua Tiếng Việt',
        desc: 'Ghép chữ, đoán từ, kể chuyện.',
        icon: `${FLUENT_CDN}/Pencil/3D/pencil_3d.png`,
        color: '#EC4899',
        bgColor: 'bg-pink-50',
        borderColor: 'border-pink-200',
        btnColor: 'bg-pink-500 hover:bg-pink-400',
        btnBorder: 'border-pink-700',
        btnText: 'text-white',
        btnLabel: 'Bắt đầu',
        highlight: true,
    },
    'on-tap': {
        label: 'Ôn Tập',
        title: 'Ôn Tập Chung',
        desc: 'Ôn tập theo từng chủ đề bài học.',
        icon: `${FLUENT_CDN}/Notebook/3D/notebook_3d.png`,
        color: '#8B5CF6',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        btnColor: 'bg-purple-500 hover:bg-purple-400',
        btnBorder: 'border-purple-700',
        btnText: 'text-white',
        btnLabel: 'Bắt đầu',
    },
    'science': {
        label: 'Khoa Học',
        title: 'Nhà Khoa Học',
        desc: 'Thí nghiệm và khám phá.',
        icon: `${FLUENT_CDN}/Test%20tube/3D/test_tube_3d.png`,
        color: '#10B981',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        btnColor: 'bg-green-500 hover:bg-green-400',
        btnBorder: 'border-green-700',
        btnText: 'text-white',
        btnLabel: 'Bắt đầu',
    },
    'history': {
        label: 'Lịch Sử',
        title: 'Sử Việt Hào Hùng',
        desc: 'Danh nhân và sự kiện.',
        icon: `${FLUENT_CDN}/Scroll/3D/scroll_3d.png`,
        color: '#F97316',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        btnColor: 'bg-orange-500 hover:bg-orange-400',
        btnBorder: 'border-orange-700',
        btnText: 'text-white',
        btnLabel: 'Bắt đầu',
    },
};

// --- Grade Colors ---
const GRADE_COLORS: Record<string, string> = {
    '1': '#00B894', '2': '#0984E3', '3': '#6C5CE7', '4': '#E17055', '5': '#F39C12',
};

const HomePage: React.FC<HomePageProps> = ({ ioeQuizzes, ioeLoading, onRefreshIoe }) => {
    // --- State ---
    const [view, setView] = useState<'home' | 'quiz-list' | 'leaderboard'>('home');
    const [activeTab, setActiveTab] = useState<string>('all');
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [loginTab, setLoginTab] = useState<'student' | 'teacher'>('student');
    const [searchTerm, setSearchTerm] = useState('');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [showComingSoon, setShowComingSoon] = useState(false);

    // --- Stores ---
    const authStore = useAuthStore();
    const quizStore = useQuizStore();
    const classroomStore = useClassroomStore();

    // --- Derived State ---
    const isStudentLoggedIn = !!classroomStore.studentSession;
    const isTeacherLoggedIn = authStore.isLoggedIn;
    const isLoggedIn = isStudentLoggedIn || isTeacherLoggedIn;

    // --- Fetch Assignments on Mount ---
    useEffect(() => {
        const fetchAssignments = async () => {
            try {
                const data = await getAllAssignments();
                setAssignments(data);
            } catch (error) {
                console.error('Failed to fetch assignments:', error);
            }
        };
        fetchAssignments();
    }, []);

    // --- Fetch Student Assignments if Logged In ---
    useEffect(() => {
        if (isStudentLoggedIn && classroomStore.studentSession) {
            classroomStore.fetchStudentAssignments(classroomStore.studentSession.studentId);
        }
    }, [isStudentLoggedIn, classroomStore.studentSession?.studentId]);

    // --- Map Assignments to Quiz Format ---
    const assignmentQuizzes = useMemo((): Quiz[] => {
        return assignments.map((assignment) => ({
            id: assignment.quizId,
            title: assignment.quizTitle || 'Bài tập',
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
            // Store assignment metadata for later use
            _assignmentData: assignment
        } as Quiz & { _assignmentData?: Assignment }));
    }, [assignments]);

    // Filter assignments for current student
    // Filter assignments for current student
    const myAssignmentQuizzes = useMemo(() => {
        if (!isStudentLoggedIn || !classroomStore.studentSession) return [];

        // Use classroomStore.assignments which has attemptCount populated
        const studentAssignments = classroomStore.assignments;
        const allQuizzes = quizStore.quizzes;

        return studentAssignments.map((assignment) => {
            const originalQuiz = allQuizzes.find(q => q.id === assignment.quizId);

            return {
                id: assignment.quizId,
                title: originalQuiz?.title || assignment.quizTitle || 'Bài tập',
                category: 'class',
                questions: originalQuiz?.questions || [],
                // Quiz does not have 'duration', use 0 or timeLimit if compatible
                duration: 0,
                timeLimit: originalQuiz?.timeLimit || 0,
                requireCode: false,
                allowReview: false,
                classLevel: originalQuiz?.classLevel || '',
                subject: 'class',
                createdAt: assignment.createdAt,
                // Quiz does not have 'maxScore', calculate or default
                maxScore: originalQuiz ? (originalQuiz.questions?.length || 0) * 10 : 0,
                // Store assignment metadata for later use
                _assignmentData: assignment
            } as Quiz & { _assignmentData?: Assignment; duration?: number; maxScore?: number };
        });
    }, [isStudentLoggedIn, classroomStore.studentSession, classroomStore.assignments, quizStore.quizzes]);

    // --- Filter Quizzes ---
    const filteredQuizzes = useMemo(() => {
        let quizzes: Quiz[] = [];

        if (activeTab === 'all') {
            quizzes = [...quizStore.quizzes];
        } else if (activeTab === 'ioe') {
            quizzes = ioeQuizzes;
        } else if (activeTab === 'game') {
            return [];
        } else if (activeTab === 'class') {
            // Show assignments instead of regular quizzes for "Bài Tập Lớp"
            if (isStudentLoggedIn) {
                quizzes = myAssignmentQuizzes;
            } else {
                quizzes = assignmentQuizzes;
            }
        } else {
            // Specific category
            quizzes = quizStore.quizzes.filter(q => (q.category || 'class') === activeTab);
        }

        // Apply Global Visibility Rules
        // If it's a general library category (not class assignments and not IOE), hide quizzes with showOnHome === false
        if (activeTab !== 'class' && activeTab !== 'ioe') {
            quizzes = quizzes.filter(q => q.showOnHome !== false);

            // 🛡️ SECURITY FIX: If student is logged in, hide quizzes that are currently assigned to them
            // This prevents them from "practicing" an exam and bypassing attempt limits
            if (isStudentLoggedIn) {
                const assignedQuizIds = myAssignmentQuizzes.map(aq => aq.id);
                quizzes = quizzes.filter(q => !assignedQuizIds.includes(q.id));
            }
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            quizzes = quizzes.filter(q => q.title.toLowerCase().includes(term));
        }
        if (quizStore.selectedClassLevel) {
            quizzes = quizzes.filter(q => q.classLevel === quizStore.selectedClassLevel);
        }
        return quizzes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [activeTab, quizStore.quizzes, ioeQuizzes, myAssignmentQuizzes, assignments, searchTerm, quizStore.selectedClassLevel, isTeacherLoggedIn]);

    // --- Handlers ---
    const openLogin = (tab: 'student' | 'teacher') => {
        setLoginTab(tab);
        setIsLoginModalOpen(true);
    };

    const handleQuizClick = async (q: Quiz) => {
        // CASE 1: Student is logged in
        if (isStudentLoggedIn && classroomStore.studentSession) {
            // If it's an assignment (has _assignmentData), track attempt
            if (q._assignmentData) {
                const assignmentId = q._assignmentData.id;
                const studentId = classroomStore.studentSession.studentId;

                // 1. RE-FETCH latest assignment status to ensure attempt count is fresh
                await classroomStore.fetchStudentAssignments(studentId);
                const freshAssignments = useClassroomStore.getState().assignments;
                const freshAssignment = freshAssignments.find(a => a.id === assignmentId);

                if (freshAssignment) {
                    const maxAttempts = freshAssignment.maxAttempts || 1;
                    const usedAttempts = freshAssignment.attemptCount || 0;

                    if (usedAttempts >= maxAttempts) {
                        alert(`Bạn đã hết lượt làm bài này! (${usedAttempts}/${maxAttempts} lượt)`);
                        return; // BLOCK
                    }
                }

                // 2. Track attempt (START) - Increment count on server
                const success = await classroomStore.startAssignmentAttempt(assignmentId, studentId);

                if (!success) {
                    alert('Lỗi khi bắt đầu làm bài. Vui lòng thử lại.');
                    return;
                }

                // 3. Refresh assignments again to reflect the NEW attempt count immediately
                await classroomStore.fetchStudentAssignments(studentId);
            } else {
                // 🛡️ SECURITY FIX: Check if this quiz ID is actually an assignment for this student
                // even if it was clicked from a practice/library tab.
                const linkedAssignment = myAssignmentQuizzes.find(aq => aq.id === q.id);

                if (linkedAssignment && linkedAssignment._assignmentData) {
                    const assignmentId = linkedAssignment._assignmentData.id;
                    const studentId = classroomStore.studentSession.studentId;
                    const attemptCount = linkedAssignment._assignmentData.attemptCount || 0;
                    const maxAttempts = linkedAssignment._assignmentData.maxAttempts || 1;

                    if (attemptCount >= maxAttempts) {
                        alert(`Bạn đã hết lượt làm bài tập này (${attemptCount}/${maxAttempts}).`);
                        return;
                    }

                    const success = await classroomStore.startAssignmentAttempt(assignmentId, studentId);
                    if (!success) {
                        alert('Lỗi khi bắt đầu làm bài. Vui lòng thử lại.');
                        return;
                    }
                    await classroomStore.fetchStudentAssignments(studentId);
                }
            }
        }

        // CASE 2: Teacher/Guest (or Student taking practice)
        quizStore.selectQuiz(q);
        quizStore.setView('student');
    };

    const handleCategoryClick = (catId: string) => {
        // Coming soon categories
        if (COMING_SOON_CATEGORIES.includes(catId)) {
            setShowComingSoon(true);
            return;
        }
        setActiveTab(catId);
        setView('quiz-list'); // Navigate to quiz list view
        if (catId === 'ioe') onRefreshIoe();
    };

    const handleBackHome = () => {
        setView('home');
        setActiveTab('all');
        setSearchTerm('');
    };

    // --- Subject Stats (for cards) ---
    const subjectCards = useMemo(() => {
        const allQuizzes = [...quizStore.quizzes, ...ioeQuizzes];
        // Only show explicit categories on Home page Grid
        const categories = ['all', 'class', 'ioe'];
        return categories.map(cat => {
            let catQuizzes = [];
            if (cat === 'all') {
                catQuizzes = allQuizzes.filter(q => q.showOnHome !== false);
            } else if (cat === 'ioe') {
                catQuizzes = ioeQuizzes;
            } else if (cat === 'class') {
                catQuizzes = isStudentLoggedIn ? myAssignmentQuizzes : assignmentQuizzes;
            } else {
                // For regular subjects, only count those that are supposed to be shown on Home
                catQuizzes = quizStore.quizzes.filter(q => (q.category || 'class') === cat && q.showOnHome !== false);
            }
            return {
                id: cat,
                ...SUBJECT_CONFIG[cat],
                total: catQuizzes.length,
            };
        });
    }, [quizStore.quizzes, ioeQuizzes, myAssignmentQuizzes, assignmentQuizzes, isStudentLoggedIn]);

    // =====================================================
    // RENDER — LOGGED IN DASHBOARD OR LOGIN LANDING PAGE
    // =====================================================

    if (!isLoggedIn) {
        return <LoginLandingPage />;
    }

    if (isStudentLoggedIn && view === 'home') {
        return <StudentDashboardUI ioeQuizzes={ioeQuizzes} />;
    }

    return (
        <div className="sticker-land">
            <AnnouncementMarquee />

            {/* Sun Decoration */}
            <div className="sticker-land__sun">
                <img
                    src={`${FLUENT_CDN}/Sun/3D/sun_3d.png`}
                    alt=""
                    className="sticker-land__sun-img"
                />
            </div>

            {/* Cloud 1 */}
            <div className="sticker-land__cloud sticker-land__cloud--1">
                <img src={`${FLUENT_CDN}/Cloud/3D/cloud_3d.png`} alt="" />
            </div>
            {/* Cloud 2 */}
            <div className="sticker-land__cloud sticker-land__cloud--2">
                <img src={`${FLUENT_CDN}/Cloud/3D/cloud_3d.png`} alt="" />
            </div>

            {/* ===== NAVBAR (Glass Pill) ===== */}
            <nav className="sticker-nav">
                <div className="sticker-nav__inner">
                    {/* Logo */}
                    <div className="sticker-nav__logo" onClick={() => { setActiveTab('all'); quizStore.setClassLevel(null); }}>
                        <img
                            src={`${FLUENT_CDN}/Honeybee/3D/honeybee_3d.png`}
                            alt="Ít Ong Quiz"
                            className="sticker-nav__logo-img"
                        />
                        <span className="sticker-nav__logo-text">
                            ÍtOng<span className="sticker-nav__logo-accent">Quiz</span>
                        </span>
                    </div>

                    {/* Nav Links */}
                    <div className="sticker-nav__links">
                        <button
                            onClick={() => { setActiveTab('all'); quizStore.setClassLevel(null); }}
                            className="sticker-nav__link"
                        >
                            Trang chủ
                        </button>
                        <button
                            onClick={() => setView('leaderboard')}
                            className="sticker-nav__link"
                        >
                            Xếp hạng
                        </button>
                        <button className="sticker-nav__link">
                            Cửa hàng
                        </button>
                    </div>

                    {/* Auth Button */}
                    {!isLoggedIn ? (
                        <button
                            onClick={() => openLogin('student')}
                            className="sticker-nav__cta"
                        >
                            Vào Lớp
                        </button>
                    ) : (
                        <button
                            onClick={() => isTeacherLoggedIn ? quizStore.setView('teacher_dash') : quizStore.setView('home')}
                            className="sticker-nav__cta"
                        >
                            {isTeacherLoggedIn ? 'Vào Quản Lý' : 'Vào Học'}
                        </button>
                    )}
                </div>
            </nav>

            {/* ===== LEADERBOARD VIEW ===== */}
            {view === 'leaderboard' && (
                <LeaderboardPage onBack={() => setView('home')} />
            )}

            {/* ===== QUIZ LIST VIEW ===== */}
            {view === 'quiz-list' && (
                <QuizListPage
                    category={activeTab}
                    quizzes={filteredQuizzes}
                    onBack={handleBackHome}
                    onQuizClick={handleQuizClick}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    selectedGrade={quizStore.selectedClassLevel}
                    onGradeChange={quizStore.setClassLevel}
                    isLoggedIn={isLoggedIn}
                    onLoginClick={() => openLogin('student')}
                />
            )}

            {/* ===== HOME VIEW ===== */}
            {view === 'home' && (
                <>
                    {/* ===== HERO ===== */}
                    <header className="sticker-hero">


                        <h1 className="sticker-hero__title">
                            Vùng Đất <span className="sticker-hero__title--blue">Tri Thức</span>
                            <br />
                            Của <span className="sticker-hero__title--yellow">Ong Vàng</span>
                        </h1>

                        {/* Floating 3D Icons */}
                        <div className="sticker-hero__icons">
                            <div className="sticker-hero__icon" style={{ animationDelay: '0s' }}>
                                <img src={`${FLUENT_CDN}/Abacus/3D/abacus_3d.png`} alt="Toán" className="sticker-img" />
                            </div>
                            <div className="sticker-hero__icon" style={{ animationDelay: '1.5s' }}>
                                <img src={`${FLUENT_CDN}/Books/3D/books_3d.png`} alt="Văn" className="sticker-img" />
                            </div>
                            <div className="sticker-hero__icon" style={{ animationDelay: '2s' }}>
                                <img src={`${FLUENT_CDN}/Graduation%20cap/3D/graduation_cap_3d.png`} alt="Tốt Nghiệp" className="sticker-img" />
                            </div>
                        </div>

                        {/* CTA Button */}
                        <button
                            onClick={() => document.getElementById('subject-cards')?.scrollIntoView({ behavior: 'smooth' })}
                            className="sticker-hero__btn"
                        >
                            CHỌN MÔN HỌC 👇
                        </button>
                    </header>

                    {/* ===== SUBJECT CARDS ===== */}
                    <section id="subject-cards" className="sticker-main">
                        <div className="sticker-cards">
                            {subjectCards.map((subject) => (
                                <a
                                    key={subject.id}
                                    href={`#${subject.id}`}
                                    className={`sticker-card ${activeTab === subject.id ? 'sticker-card--active' : ''} ${subject.highlight ? 'sticker-card--highlight' : ''}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleCategoryClick(subject.id);
                                    }}
                                    style={{ '--card-color': subject.color, textDecoration: 'none' } as React.CSSProperties}
                                >
                                    {/* 3D Sticker Icon */}
                                    <div className="sticker-card__icon-wrap">
                                        <img src={subject.icon} alt={`Ảnh minh họa môn ${subject.label}`} className="sticker-card__icon" />
                                    </div>

                                    {/* Label */}
                                    <div className="sticker-card__label-wrap">
                                        <span
                                            className="sticker-card__label"
                                            style={{ background: `${subject.color}15`, color: subject.color, borderColor: `${subject.color}30` }}
                                        >
                                            {subject.label}
                                        </span>
                                    </div>

                                    {/* Title & Description */}
                                    <h2
                                        className="sticker-card__title"
                                        style={subject.id === 'science' ? { fontSize: '1.8rem' } : {}}
                                    >
                                        {subject.title}
                                    </h2>
                                    <p className="sticker-card__desc">{subject.desc}</p>

                                    {/* Action Button */}
                                    <div
                                        className={`sticker-card__btn ${subject.btnColor} ${subject.btnText}`}
                                        style={{ borderBottomColor: `${subject.color}99` }}
                                    >
                                        {subject.btnLabel} ▶️
                                    </div>
                                </a>
                            ))}
                        </div>

                        {/* ===== SEARCH BAR ===== */}
                        {activeTab !== 'all' && !COMING_SOON_CATEGORIES.includes(activeTab) && (
                            <div className="sticker-search">
                                <Search className="sticker-search__icon" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Tìm bài ôn tập..."
                                    className="sticker-search__input"
                                />
                            </div>
                        )}

                        {/* ===== QUIZ LIST ===== */}
                        {activeTab !== 'all' && !COMING_SOON_CATEGORIES.includes(activeTab) && (
                            <section className="sticker-quiz-list">
                                <h2 className="sticker-quiz-list__title">
                                    <img
                                        src={SUBJECT_CONFIG[activeTab]?.icon || `${FLUENT_CDN}/Books/3D/books_3d.png`}
                                        alt=""
                                        className="sticker-quiz-list__title-icon"
                                    />
                                    {SUBJECT_CONFIG[activeTab]?.title || 'Bài ôn tập'}
                                    <span className="sticker-quiz-list__count">{filteredQuizzes.length} bài</span>
                                </h2>

                                <div className="sticker-quiz-grid">
                                    {filteredQuizzes.length > 0 ? (
                                        filteredQuizzes.map((quiz) => {
                                            const catConfig = SUBJECT_CONFIG[quiz.category || 'class'] || SUBJECT_CONFIG['class'];
                                            return (
                                                <button
                                                    key={(quiz as any)._assignmentData?.id || quiz.id}
                                                    onClick={() => handleQuizClick(quiz)}
                                                    className="sticker-quiz-item"
                                                >
                                                    <div
                                                        className="sticker-quiz-item__stripe"
                                                        style={{ background: catConfig.color }}
                                                    />
                                                    <div className="sticker-quiz-item__header">
                                                        <img src={catConfig.icon} alt="" className="sticker-quiz-item__emoji" />
                                                        {quiz.requireCode && (
                                                            <Lock className="sticker-quiz-item__lock" />
                                                        )}
                                                    </div>
                                                    <h4 className="sticker-quiz-item__title">{quiz.title}</h4>
                                                    <div className="sticker-quiz-item__meta">
                                                        <span><Clock className="w-3.5 h-3.5" /> {quiz.timeLimit} phút</span>
                                                        <span>📝 {quiz.questions.length} câu</span>
                                                    </div>
                                                    <div className="sticker-quiz-item__cta" style={{ color: catConfig.color }}>
                                                        Bắt đầu <ChevronRight className="w-4 h-4" />
                                                    </div>
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="sticker-empty">
                                            <img
                                                src={`${FLUENT_CDN}/See-no-evil%20monkey/3D/see-no-evil_monkey_3d.png`}
                                                alt=""
                                                className="sticker-empty__img"
                                            />
                                            <h3 className="sticker-empty__title">Không tìm thấy bài nào!</h3>
                                            <p className="sticker-empty__text">Thử tìm từ khóa khác xem sao?</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}
                    </section>

                    {/* ===== COMING SOON MODAL ===== */}
                    <Modal
                        isOpen={showComingSoon}
                        onClose={() => setShowComingSoon(false)}
                        title=""
                        showCloseButton={false}
                        size="sm"
                    >
                        <div className="text-center p-4">
                            <div className="mb-4 flex justify-center">
                                <img
                                    src={`${FLUENT_CDN}/Rocket/3D/rocket_3d.png`}
                                    alt="Rocket"
                                    className="w-24 h-24 object-contain animate-bounce"
                                    onError={(e) => {
                                        // Fallback if image fails
                                        e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/1356/1356479.png";
                                    }}
                                />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">
                                Sắp ra mắt!
                            </h3>
                            <p className="text-gray-600 font-medium mb-6">
                                Chức năng này đang được phát triển.<br />
                                Các em quay lại sau nhé!
                            </p>
                            <button
                                onClick={() => setShowComingSoon(false)}
                                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105 active:scale-95"
                            >
                                Dạ vâng ạ!
                            </button>
                        </div>
                    </Modal>
                </>
            )
            }

            {/* ===== LOGIN MODAL ===== */}
            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                initialTab={loginTab}
            />
        </div >
    );
};

export default HomePage;

