import React, { useState } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useQuizStore } from '../../../stores/quizStore';
import { Loader2, User, Lock, GraduationCap, Apple, CheckCircle2, Menu, X } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AnnouncementMarquee from '../common/AnnouncementMarquee';

const LoginLandingPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState('');
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springConfig = { damping: 25, stiffness: 120 };
    const xSpring = useSpring(mouseX, springConfig);
    const ySpring = useSpring(mouseY, springConfig);

    const layer0_X = useTransform(xSpring, [-500, 500], [10, -10]);
    const layer0_Y = useTransform(ySpring, [-400, 400], [10, -10]);

    const layer2_X = useTransform(xSpring, [-500, 500], [15, -15]);
    const layer2_Y = useTransform(ySpring, [-400, 400], [15, -15]);

    const handleMouseMove = (e: React.MouseEvent) => {
        const { clientX, clientY } = e;
        mouseX.set(clientX - window.innerWidth / 2);
        mouseY.set(clientY - window.innerHeight / 2);
    };

    const authStore = useAuthStore();
    const classroomStore = useClassroomStore();
    const quizStore = useQuizStore();
    const navigate = useNavigate();

    const isLoading = activeTab === 'teacher' ? authStore.isLoggingIn : classroomStore.isLoading;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        if (!username || !password) {
            setLocalError('Vui lòng nhập đầy đủ thông tin!');
            return;
        }

        if (activeTab === 'teacher') {
            await handleTeacherLogin();
        } else {
            await handleStudentLogin();
        }
    };

    const handleTeacherLogin = async () => {
        authStore.loginStart();
        try {
            const { callApi } = await import('../../services/apiAdapter');
            const teachers = await callApi<any[]>('get_teachers');

            if (!teachers || !Array.isArray(teachers)) {
                authStore.loginFailure();
                setLocalError('Không thể lấy danh sách giáo viên. Vui lòng thử lại!');
                return;
            }

            const teacher = teachers.find((t: any) => {
                const tUsername = String(t.username || t.id || '').trim();
                const tPassword = String(t.password || '').trim();
                return tUsername === username && tPassword === password;
            });

            if (teacher) {
                const tUsername = String(teacher.username || teacher.id || '').trim();
                const tFullNameRaw = String(teacher.fullName || teacher.fullname || teacher.full_name || teacher.name || '').trim();
                const tFullName = tFullNameRaw || tUsername;
                const isTeacherAdmin = teacher.role === 'admin';
                const tClass = teacher.class ? String(teacher.class).trim() : undefined;
                authStore.loginSuccess(tUsername, tFullName, isTeacherAdmin, tClass);
                quizStore.setView('teacher_dash');
            } else {
                authStore.loginFailure();
                setLocalError('Tên đăng nhập hoặc mật khẩu không đúng!');
            }
        } catch (error) {
            console.error('Login error:', error);
            authStore.loginFailure();
            setLocalError('Có lỗi xảy ra khi kết nối. Vui lòng thử lại!');
        }
    };

    const handleStudentLogin = async () => {
        const success = await classroomStore.loginStudent({ username, password });
        if (success) {
            quizStore.setView('home');
        } else {
            setLocalError('Tên đăng nhập hoặc mật khẩu học sinh không đúng!');
        }
    };

    return (
        <div
            onMouseMove={handleMouseMove}
            className="min-h-dvh w-full flex flex-col lg:flex-row bg-slate-50 font-sans overflow-x-hidden"
        >
            <div className="absolute top-0 left-0 z-30 w-full lg:w-[60%] p-3 md:p-5">
                <div className="rounded-2xl border border-white/25 bg-white/15 backdrop-blur-xl px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 md:gap-3 text-white hover:text-cyan-100 transition-colors shrink-0"
                    >
                        <img
                            src="/school-logo.png"
                            alt="Logo Trường"
                            className="w-8 h-8 md:w-10 md:h-10 drop-shadow-lg"
                        />
                        <span className="text-xl md:text-2xl font-black tracking-tight">
                            ÍtOng<span className="text-yellow-300">Quiz</span>
                        </span>
                    </button>
                    <div className="hidden sm:flex items-center gap-1 md:gap-2">
                        <button
                            onClick={() => navigate('/')}
                            className="px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-semibold text-white hover:bg-white/20 transition whitespace-nowrap"
                        >
                            Trang chủ
                        </button>
                        <button
                            onClick={() => navigate('/about')}
                            className="px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-semibold text-white hover:bg-white/20 transition whitespace-nowrap"
                        >
                            Giới thiệu
                        </button>
                        <button
                            onClick={() => navigate('/contact')}
                            className="px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-semibold text-white hover:bg-white/20 transition whitespace-nowrap"
                        >
                            Liên hệ
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsMobileNavOpen((prev) => !prev)}
                        className="sm:hidden w-11 h-11 rounded-xl bg-white/10 text-white border border-white/20 flex items-center justify-center"
                        aria-label="Mở menu điều hướng"
                    >
                        {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
                {isMobileNavOpen && (
                    <div className="sm:hidden mt-2 rounded-2xl border border-white/25 bg-slate-900/70 backdrop-blur-xl p-2 flex flex-col gap-1">
                        <button onClick={() => { navigate('/'); setIsMobileNavOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-white/15">Trang chủ</button>
                        <button onClick={() => { navigate('/about'); setIsMobileNavOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-white/15">Giới thiệu</button>
                        <button onClick={() => { navigate('/contact'); setIsMobileNavOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-white/15">Liên hệ</button>
                    </div>
                )}
            </div>

            <div className="lg:w-[60%] w-full relative overflow-hidden flex flex-col justify-center pt-28 md:pt-32 lg:pt-28 px-5 py-8 md:px-10 md:py-14 lg:p-24 bg-gradient-to-br from-indigo-900 via-blue-800 to-teal-500 text-white">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                    <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full blur-[100px] bg-blue-400 hidden md:block"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] bg-teal-400 hidden md:block"></div>
                </div>

                <motion.div style={{ x: layer0_X, y: layer0_Y }} className="absolute inset-0 pointer-events-none overflow-hidden hidden md:block">
                    {[...Array(15)].map((_, i) => (
                        <div
                            key={i}
                            className="light-particle"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                width: `${Math.random() * 6 + 2}px`,
                                height: `${Math.random() * 6 + 2}px`,
                                animation: `particle-pulse ${Math.random() * 4 + 2}s infinite ${Math.random() * 2}s`,
                                opacity: Math.random() * 0.5 + 0.1
                            }}
                        />
                    ))}
                </motion.div>

                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black leading-tight mb-5 md:mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-100">
                        Khơi Dậy Tiềm Năng Tri Thức
                    </h1>

                    <p className="text-base sm:text-lg md:text-xl text-blue-100 mb-7 md:mb-10 max-w-lg leading-relaxed font-medium">
                        Nền tảng kiểm tra trực tuyến thông minh, giúp giáo viên quản lý lớp học hiệu quả và học sinh ôn luyện hứng thú mỗi ngày.
                    </p>

                    <ul className="space-y-3 md:space-y-4 text-sm sm:text-base md:text-lg text-white/90">
                        <li className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <CheckCircle2 className="w-5 h-5 text-teal-300" />
                            </span>
                            Ngân hàng <strong className="text-white">10,000+ câu hỏi</strong> trắc nghiệm đa dạng.
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <CheckCircle2 className="w-5 h-5 text-teal-300" />
                            </span>
                            Báo cáo điểm số, <strong className="text-white">thống kê chi tiết</strong> tự động.
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <CheckCircle2 className="w-5 h-5 text-teal-300" />
                            </span>
                            Giao diện <strong className="text-white">hiện đại, thân thiện</strong> cho học sinh.
                        </li>
                    </ul>
                </div>

                <div className="absolute inset-0 z-0 pointer-events-none">
                    <motion.div
                        style={{ x: layer2_X, y: layer2_Y }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
                        className="absolute bottom-[-20px] right-[-40px] w-[50%] max-w-[450px] z-10 hidden md:block"
                    >
                        <img
                            src="/assets/student-hero.png"
                            alt="Học sinh"
                            className="w-full h-auto shadow-3d-premium"
                        />
                    </motion.div>
                </div>

                <div className="absolute top-0 right-0 h-full w-40 hero-edge-fade pointer-events-none hidden md:block z-20"></div>
            </div>

            <div className="lg:w-[40%] w-full flex items-center justify-center px-4 py-6 md:p-8 relative">
                <div className="absolute top-3 left-3 right-3 md:top-4 md:left-8 md:right-8 z-20">
                    <AnnouncementMarquee variant="compact" />
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-[460px] bg-white rounded-3xl p-5 sm:p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] relative z-10 mt-8 lg:mt-0"
                >
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-slate-800">
                            {activeTab === 'student' ? 'Chào mừng em!' : 'Kính chào Thầy/Cô!'}
                        </h2>
                        <p className="text-slate-500 font-medium mt-2">
                            {activeTab === 'student' ? 'Đăng nhập để vào lớp học ảo của em' : 'Đăng nhập vào bảng điều khiển quản lý'}
                        </p>
                    </div>

                    <div className="bg-slate-100/80 p-1.5 rounded-full flex relative mb-8">
                        <div
                            className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-full shadow transition-all duration-300 ease-out"
                            style={{ left: activeTab === 'student' ? '6px' : 'calc(50%)' }}
                        />
                        <button
                            type="button"
                            onClick={() => { setActiveTab('student'); setLocalError(''); }}
                            className={`flex-[1] flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold transition-colors relative z-10 ${
                                activeTab === 'student' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <GraduationCap className="w-4 h-4" /> Học sinh
                        </button>
                        <button
                            type="button"
                            onClick={() => { setActiveTab('teacher'); setLocalError(''); }}
                            className={`flex-[1] flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold transition-colors relative z-10 ${
                                activeTab === 'teacher' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Apple className="w-4 h-4" /> Giáo viên
                        </button>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                                {activeTab === 'student' ? 'Tên đăng nhập' : 'Tên tài khoản'}
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                    <User className="w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-12 pr-4 h-14 border-2 border-slate-200 rounded-2xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-semibold text-slate-700 bg-slate-50 focus:bg-white"
                                    placeholder="Tài Khoản"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                                Mật khẩu
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 h-14 border-2 border-slate-200 rounded-2xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-semibold text-slate-700 bg-slate-50 focus:bg-white"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {localError && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2"
                            >
                                <span className="text-lg leading-none">⚠️</span>
                                {localError}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : (
                                'Đăng nhập ngay'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-400 mt-8 font-medium">
                        Cần hỗ trợ? Hãy{' '}
                        <a
                            href="mailto:sample_user_baf53feb@gmail.com"
                            className="text-blue-600 hover:text-blue-700 underline decoration-blue-400 underline-offset-2 font-semibold"
                        >
                            liên hệ
                        </a>{' '}
                        với Quản trị viên nhà trường.
                    </p>
                </motion.div>

                <div className="absolute bottom-0 right-0 opacity-5 pointer-events-none">
                    <svg width="400" height="400" viewBox="0 0 100 100">
                        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
                        </pattern>
                        <rect width="100" height="100" fill="url(#grid)" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default LoginLandingPage;
