import React, { useState } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useQuizStore } from '../../../stores/quizStore';
import { Loader2, KeyRound, User, Lock, GraduationCap, Apple } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'student' | 'teacher';
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, initialTab = 'student' }) => {
    const [activeTab, setActiveTab] = useState<'student' | 'teacher'>(initialTab);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // Stores
    const authStore = useAuthStore();
    const classroomStore = useClassroomStore();
    const quizStore = useQuizStore();

    // Local error state to unified handling
    const [localError, setLocalError] = useState('');

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
        // Teacher login logic (using existing authStore actions logic but triggering here)
        // Typically authStore handles the actual fetch, but here we might need to call a function.
        // Looking at App.tsx, the logic was inline. We should ideally move it to store actions or a service.
        // For now, I will use the logic from App.tsx but adapted. 
        // WAIT: App.tsx calls fetchTeachersFromSheets directly. 
        // I should probably move that logic here or into a store action. 
        // Given constraints, I will replicate the logic or ideally refactor.
        // Let's assume we can import fetchTeachersFromSheets.

        authStore.loginStart();
        try {
            const { fetchTeachersFromSheets } = await import('../../services/googleSheetService');
            const { GOOGLE_SHEET_ID, TEACHER_GID } = await import('../../config/constants');

            const teachers = await fetchTeachersFromSheets(GOOGLE_SHEET_ID, TEACHER_GID);
            const teacher = teachers.find(t => t.username === username && t.password === password);

            if (teacher) {
                const isTeacherAdmin = teacher.role === 'admin';
                authStore.loginSuccess(teacher.username, teacher.fullName, isTeacherAdmin, teacher.class);
                onClose();
                // Optional: Show welcome toast
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
            onClose();
            quizStore.setView('student_portal');
        } else {
            setLocalError('Tên đăng nhập hoặc mật khẩu học sinh không đúng!');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with blur & warm tint */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-cream/80 backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(255, 251, 240, 0.8)' }}
            />

            {/* Modal Container */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-[420px] bg-white rounded-[32px] p-8 pt-10 shadow-3xl"
                style={{
                    boxShadow: '0 12px 0 rgba(0,0,0,0.08), 0 20px 40px rgba(0,0,0,0.1)'
                }}
            >
                {/* Mascot Peeking */}
                <div className="absolute -top-[60px] left-1/2 -translate-x-1/2 w-[120px] h-[120px] flex items-center justify-center z-10 pointer-events-none">
                    <span className="text-[80px] filter drop-shadow-xl transform hover:scale-110 transition-transform cursor-pointer">🦉</span>
                </div>

                {/* Tabs */}
                <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 mb-6 relative z-0">
                    <button
                        onClick={() => { setActiveTab('student'); setLocalError(''); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === 'student'
                            ? 'bg-white text-slate-800 shadow-sm scale-[1.02]'
                            : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <GraduationCap className={`w-5 h-5 ${activeTab === 'student' ? 'text-blue-500' : ''}`} />
                        Học sinh
                    </button>
                    <button
                        onClick={() => { setActiveTab('teacher'); setLocalError(''); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === 'teacher'
                            ? 'bg-white text-slate-800 shadow-sm scale-[1.02]'
                            : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <Apple className={`w-5 h-5 ${activeTab === 'teacher' ? 'text-red-500' : ''}`} />
                        Giáo viên
                    </button>
                </div>

                {/* Form */}
                <div className="space-y-6">
                    <div className="text-center mb-2">
                        <h2 className="text-2xl font-black text-slate-800">
                            {activeTab === 'student' ? 'Chào mừng em!' : 'Kính chào Thầy/Cô!'}
                        </h2>
                        <p className="text-slate-500 font-medium text-sm mt-1">
                            {activeTab === 'student' ? 'Nhập tài khoản để vào lớp học ảo' : 'Đăng nhập để quản lý lớp học'}
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                                {activeTab === 'student' ? 'Tên đăng nhập' : 'Username'}
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors">
                                    <User className="w-6 h-6" />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-[52px] pr-4 h-14 border-2 border-slate-200 rounded-2xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 outline-none transition-all font-bold text-slate-700 bg-slate-50 focus:bg-white"
                                    placeholder={activeTab === 'student' ? "Tên đăng nhập..." : "Username..."}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                                Mật khẩu
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors">
                                    <Lock className="w-6 h-6" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-[52px] pr-4 h-14 border-2 border-slate-200 rounded-2xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 outline-none transition-all font-bold text-slate-700 bg-slate-50 focus:bg-white"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {localError && (
                            <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded-r-xl text-red-600 text-sm font-medium flex items-center gap-2 animate-shake">
                                <span className="text-lg">⚠️</span>
                                {localError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-gradient-to-br from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white rounded-full font-black text-lg shadow-[0_4px_0_#F57C00] active:shadow-[0_2px_0_#F57C00] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    Vào lớp ngay!
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded-full transition-all"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </motion.div>
        </div>
    );
};

export default LoginModal;
