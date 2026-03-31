import React, { useState } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useQuizStore } from '../../../stores/quizStore';
import { Loader2, User, Lock, GraduationCap, Apple, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

// --- Fluent Emoji CDN Base ---
const FLUENT_CDN = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets';

const LoginLandingPage: React.FC = () => {
    // --- State ---
    const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState('');

    // --- Stores ---
    const authStore = useAuthStore();
    const classroomStore = useClassroomStore();
    const quizStore = useQuizStore();

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
            console.error("Login error:", error);
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
        <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50 font-sans">
            {/* LEFT COLUMN: Hero Section (60%) */}
            <div className="md:w-[60%] w-full relative overflow-hidden flex flex-col justify-center p-8 md:p-16 lg:p-24 bg-gradient-to-br from-indigo-900 via-blue-800 to-teal-500 text-white">
                {/* Background Decorations */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                    <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full blur-[100px] bg-blue-400"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] bg-teal-400"></div>
                </div>



                <div className="relative z-10 max-w-2xl">
                    <div className="flex items-center gap-3 mb-8">
                        <img
                            src={`${FLUENT_CDN}/Honeybee/3D/honeybee_3d.png`}
                            alt="Logo"
                            className="w-12 h-12 md:w-16 md:h-16 drop-shadow-lg"
                        />
                        <span className="text-2xl md:text-3xl font-black tracking-tight">
                            ÍtOng<span className="text-yellow-400">Quiz</span>
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-black leading-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-100">
                        Khơi Dậy Tiềm Năng Tri Thức
                    </h1>

                    <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-lg leading-relaxed font-medium">
                        Nền tảng kiểm tra trực tuyến thông minh, giúp giáo viên quản lý lớp học hiệu quả và học sinh ôn luyện hứng thú mỗi ngày.
                    </p>

                    <ul className="space-y-4 text-base md:text-lg text-white/90">
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
            </div>

            {/* RIGHT COLUMN: Form Login (40%) */}
            <div className="md:w-[40%] w-full flex items-center justify-center p-6 md:p-8 relative">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-[420px] bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] relative z-10"
                >
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-slate-800">
                            {activeTab === 'student' ? 'Chào mừng em!' : 'Kính chào Thầy/Cô!'}
                        </h2>
                        <p className="text-slate-500 font-medium mt-2">
                            {activeTab === 'student' ? 'Đăng nhập để vào lớp học ảo của em' : 'Đăng nhập vào bảng điều khiển quản lý'}
                        </p>
                    </div>

                    {/* Custom Toggle Switch */}
                    <div className="bg-slate-100/80 p-1.5 rounded-full flex relative mb-8">
                        <div
                            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-full shadow transition-all duration-300 ease-out`}
                            style={{ left: activeTab === 'student' ? '6px' : 'calc(50%)' }}
                        />
                        <button
                            type="button"
                            onClick={() => { setActiveTab('student'); setLocalError(''); }}
                            className={`flex-[1] flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold transition-colors relative z-10 ${activeTab === 'student' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <GraduationCap className="w-4 h-4" /> Học sinh
                        </button>
                        <button
                            type="button"
                            onClick={() => { setActiveTab('teacher'); setLocalError(''); }}
                            className={`flex-[1] flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold transition-colors relative z-10 ${activeTab === 'teacher' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
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
                                    placeholder={activeTab === 'student' ? "tentaikhoan..." : "username..."}
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
                                "Đăng nhập ngay"
                            )}
                        </button>
                    </form>

                    {/* Bottom notes */}
                    <p className="text-center text-sm text-slate-400 mt-8 font-medium">
                        Cần hỗ trợ? Hãy liên hệ với Quản trị viên nhà trường.
                    </p>
                </motion.div>

                {/* Background Pattern Right */}
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
