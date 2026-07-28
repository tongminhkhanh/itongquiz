import React, { useEffect, useRef, useState } from 'react';
import {
    AlertCircle,
    Eye,
    EyeOff,
    GraduationCap,
    Loader2,
    Lock,
    ShieldCheck,
    UserRound,
} from 'lucide-react';

interface LoginFormProps {
    activeTab: 'student' | 'teacher';
    setActiveTab: (tab: 'student' | 'teacher') => void;
    username: string;
    setUsername: (val: string) => void;
    password: string;
    setPassword: (val: string) => void;
    isLoading: boolean;
    onSubmit: (e: React.FormEvent) => void;
    rememberAccount?: boolean;
    onRememberAccountChange?: (remember: boolean) => void;
    errorMessage?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({
    activeTab,
    setActiveTab,
    username,
    setUsername,
    password,
    setPassword,
    isLoading,
    onSubmit,
    rememberAccount = false,
    onRememberAccountChange,
    errorMessage = '',
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const [capsLockEnabled, setCapsLockEnabled] = useState(false);
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const studentTabRef = useRef<HTMLButtonElement>(null);
    const teacherTabRef = useRef<HTMLButtonElement>(null);
    const isStudent = activeTab === 'student';
    const panelId = `login-panel-${activeTab}`;
    const usernameHelpId = `login-username-help-${activeTab}`;
    const errorId = 'login-form-error';

    useEffect(() => {
        if (!errorMessage) return;
        if (username.trim()) {
            passwordRef.current?.focus();
        } else {
            usernameRef.current?.focus();
        }
    }, [errorMessage, username]);

    const updateCapsLockState = (event: React.KeyboardEvent<HTMLInputElement>) => {
        setCapsLockEnabled(event.getModifierState('CapsLock'));
    };

    const handleRoleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (isLoading) return;
        let nextRole: 'student' | 'teacher' | null = null;
        if (event.key === 'ArrowLeft' || event.key === 'Home') nextRole = 'student';
        if (event.key === 'ArrowRight' || event.key === 'End') nextRole = 'teacher';
        if (!nextRole) return;
        event.preventDefault();
        setActiveTab(nextRole);
        if (nextRole === 'student') studentTabRef.current?.focus();
        if (nextRole === 'teacher') teacherTabRef.current?.focus();
    };

    const inputFocusClass = isStudent
        ? 'focus:border-emerald-500 focus:ring-emerald-500/15'
        : 'focus:border-blue-600 focus:ring-blue-600/15';

    return (
        <section
            className="order-1 w-full max-w-[440px] md:order-2"
            aria-label={isStudent ? 'Đăng nhập học sinh' : 'Đăng nhập giáo viên'}
        >
            <div className="relative overflow-hidden rounded-[24px] border border-white/80 bg-white/95 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5 backdrop-blur-sm sm:p-7 md:p-8">
                <div
                    aria-hidden="true"
                    className={`absolute inset-x-0 top-0 h-1.5 ${
                        isStudent
                            ? 'bg-gradient-to-r from-emerald-400 via-green-500 to-lime-400'
                            : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400'
                    }`}
                />

                <div className="relative z-10 mb-5 text-center">
                    <div className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${
                        isStudent
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-blue-50 text-blue-700'
                    }`}>
                        {isStudent ? <GraduationCap size={23} /> : <ShieldCheck size={22} />}
                    </div>
                    <h1 className="text-[1.55rem] font-extrabold leading-tight text-slate-950 sm:text-[1.7rem]">
                        {isStudent
                            ? 'Chào em, bắt đầu học nhé!'
                            : 'Đăng nhập khu vực giáo viên'}
                    </h1>
                    <p className="mx-auto mt-1.5 max-w-[330px] text-sm font-medium leading-6 text-slate-600">
                        {isStudent
                            ? 'Dùng tài khoản do giáo viên chủ nhiệm cung cấp.'
                            : 'Truy cập lớp học, đề kiểm tra và báo cáo học tập.'}
                    </p>
                </div>

                <div
                    className="relative z-10 mb-5 flex rounded-2xl bg-slate-100 p-1"
                    data-purpose="role-switcher"
                    role="tablist"
                    aria-label="Chọn vai trò đăng nhập"
                >
                    <button
                        ref={studentTabRef}
                        id="login-tab-student"
                        type="button"
                        role="tab"
                        aria-selected={isStudent}
                        aria-controls="login-panel-student"
                        disabled={isLoading}
                        className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                            isStudent
                                ? 'bg-white text-emerald-800 shadow-sm'
                                : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                        }`}
                        onClick={() => setActiveTab('student')}
                        onKeyDown={handleRoleKeyDown}
                    >
                        <GraduationCap size={18} /> Học sinh
                    </button>
                    <button
                        ref={teacherTabRef}
                        id="login-tab-teacher"
                        type="button"
                        role="tab"
                        aria-selected={!isStudent}
                        aria-controls="login-panel-teacher"
                        disabled={isLoading}
                        className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                            !isStudent
                                ? 'bg-white text-blue-800 shadow-sm'
                                : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                        }`}
                        onClick={() => setActiveTab('teacher')}
                        onKeyDown={handleRoleKeyDown}
                    >
                        <UserRound size={18} /> Giáo viên
                    </button>
                </div>

                <form
                    id={panelId}
                    role="tabpanel"
                    aria-labelledby={`login-tab-${activeTab}`}
                    aria-label={isStudent ? 'Đăng nhập học sinh' : 'Đăng nhập giáo viên'}
                    onSubmit={onSubmit}
                    className="relative z-10"
                    noValidate
                >
                    <div className="mb-4">
                        <label
                            htmlFor="login-username"
                            className="mb-2 block text-sm font-bold text-slate-800"
                        >
                            {isStudent ? 'Mã học sinh' : 'Tên đăng nhập'}
                        </label>
                        <div className="relative">
                            <UserRound
                                size={18}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                ref={usernameRef}
                                id="login-username"
                                type="text"
                                inputMode="text"
                                autoCapitalize="none"
                                autoCorrect="off"
                                autoComplete="username"
                                className={`min-h-12 w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-[0.95rem] text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 ${inputFocusClass}`}
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                placeholder={isStudent ? 'Ví dụ: HS4A001' : 'Nhập tài khoản giáo viên'}
                                aria-describedby={usernameHelpId}
                                disabled={isLoading}
                                required
                            />
                        </div>
                        <p id={usernameHelpId} className="mt-1.5 text-xs font-medium text-slate-500">
                            {isStudent
                                ? 'Mã học sinh do giáo viên chủ nhiệm cung cấp.'
                                : 'Sử dụng tài khoản được nhà trường cấp.'}
                        </p>
                    </div>

                    <div className="mb-3">
                        <label
                            htmlFor="login-password"
                            className="mb-2 block text-sm font-bold text-slate-800"
                        >
                            Mật khẩu
                        </label>
                        <div className="relative">
                            <Lock
                                size={18}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                ref={passwordRef}
                                id="login-password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                className={`min-h-12 w-full rounded-xl border-2 bg-slate-50 py-3 pl-11 pr-12 text-[0.95rem] text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 ${
                                    errorMessage ? 'border-red-400' : 'border-slate-200'
                                } ${inputFocusClass}`}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                onKeyDown={updateCapsLockState}
                                onKeyUp={updateCapsLockState}
                                onBlur={() => setCapsLockEnabled(false)}
                                placeholder="Nhập mật khẩu"
                                aria-invalid={Boolean(errorMessage)}
                                aria-describedby={[
                                    capsLockEnabled ? 'login-caps-lock' : '',
                                    errorMessage ? errorId : '',
                                ].filter(Boolean).join(' ') || undefined}
                                disabled={isLoading}
                                required
                            />
                            <button
                                type="button"
                                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                                onClick={() => setShowPassword((visible) => !visible)}
                                disabled={isLoading}
                            >
                                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                            </button>
                        </div>
                        {capsLockEnabled && (
                            <p
                                id="login-caps-lock"
                                role="status"
                                className="mt-1.5 text-xs font-semibold text-amber-700"
                            >
                                Caps Lock đang bật
                            </p>
                        )}
                    </div>

                    {errorMessage && (
                        <div
                            id={errorId}
                            role="alert"
                            className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold leading-5 text-red-700"
                        >
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <div className="mb-5 flex items-start justify-between gap-3">
                        <label className="flex cursor-pointer items-start gap-2 text-xs font-semibold leading-5 text-slate-600">
                            <input
                                type="checkbox"
                                checked={rememberAccount}
                                onChange={(event) => onRememberAccountChange?.(event.target.checked)}
                                disabled={isLoading}
                                className={`mt-0.5 h-4 w-4 rounded border-slate-300 ${
                                    isStudent ? 'accent-emerald-600' : 'accent-blue-600'
                                }`}
                            />
                            <span>
                                {isStudent
                                    ? 'Ghi nhớ mã học sinh'
                                    : 'Ghi nhớ tài khoản trên thiết bị này'}
                            </span>
                        </label>
                        {!isStudent && (
                            <a
                                href="mailto:support@thitong.site?subject=Hỗ trợ tài khoản giáo viên"
                                className="shrink-0 text-xs font-bold text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            >
                                Quên mật khẩu?
                            </a>
                        )}
                    </div>

                    <button
                        type="submit"
                        className={`flex min-h-[50px] w-full items-center justify-center rounded-xl px-4 text-base font-extrabold text-white shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-65 ${
                            isStudent
                                ? 'bg-emerald-600 shadow-emerald-600/25 hover:bg-emerald-700 focus-visible:ring-emerald-600'
                                : 'bg-blue-700 shadow-blue-700/25 hover:bg-blue-800 focus-visible:ring-blue-700'
                        }`}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin" size={20} />
                                Đang đăng nhập...
                            </span>
                        ) : isStudent ? (
                            'Vào lớp học'
                        ) : (
                            'Vào trang quản lý'
                        )}
                    </button>
                </form>

                <div className="relative z-10 mt-5 border-t border-slate-100 pt-4 text-center text-xs font-medium leading-5 text-slate-500">
                    {isStudent ? (
                        <p>
                            Quên mật khẩu? Hãy nhờ giáo viên chủ nhiệm cấp lại.
                        </p>
                    ) : (
                        <p>
                            Cần hỗ trợ?{' '}
                            <a
                                href="mailto:support@thitong.site"
                                className="font-bold text-blue-700 hover:underline"
                            >
                                Liên hệ quản trị viên
                            </a>
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
};

export default LoginForm;
