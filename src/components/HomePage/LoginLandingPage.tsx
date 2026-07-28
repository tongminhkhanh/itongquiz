import React, { useState, useEffect, Suspense } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useQuizStore } from '../../../stores/quizStore';
import PasswordChangeDialog from '../common/PasswordChangeDialog';
import CurrentAnnouncementBanner from '../common/CurrentAnnouncementBanner';
import { NotificationSurfaceStack } from '../../features/notifications/components';
import { useUnifiedNotificationsFeatureFlag } from '../../features/notifications/useUnifiedNotificationsFeatureFlag';

// Sub-components
import LandingHeader from './components/LandingHeader';
import HeroSection from './components/HeroSection';
import LoginForm from './components/LoginForm';
import LandingFooter from './components/LandingFooter';

type SavedLoginAccount = {
    username: string;
    role: 'student' | 'teacher';
    savedAt: string;
};

const SAVED_LOGIN_KEY = 'itongquiz_saved_login_v1';

const LoginLandingPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [pendingTeacher, setPendingTeacher] = useState<any | null>(null);
    const [rememberAccount, setRememberAccount] = useState(false);
    const [loginError, setLoginError] = useState('');

    const authStore = useAuthStore();
    const classroomStore = useClassroomStore();
    const quizStore = useQuizStore();
    const notificationFlag = useUnifiedNotificationsFeatureFlag();

    // Session Persistence
    useEffect(() => {
        try {
            const raw = localStorage.getItem(SAVED_LOGIN_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw) as Partial<SavedLoginAccount>;
            if (typeof saved.username === 'string' && saved.username.trim()) {
                setUsername(saved.username.trim());
                setRememberAccount(true);
            }
            if (saved.role === 'teacher' || saved.role === 'student') {
                setActiveTab(saved.role);
            }
        } catch (error) {
            console.warn('Could not load saved login account:', error);
        }
    }, []);

    const isLoading = activeTab === 'teacher' ? authStore.isLoggingIn : classroomStore.isLoading;

    const persistLoginPreference = () => {
        try {
            if (!rememberAccount) {
                localStorage.removeItem(SAVED_LOGIN_KEY);
                return;
            }
            const saved: SavedLoginAccount = {
                username: username.trim(),
                role: activeTab,
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem(SAVED_LOGIN_KEY, JSON.stringify(saved));
        } catch (error) {
            console.warn('Could not save login account:', error);
        }
    };

    const handleRoleChange = (role: 'student' | 'teacher') => {
        if (isLoading || role === activeTab) return;
        setActiveTab(role);
        setPassword('');
        setLoginError('');
    };

    const handleUsernameChange = (value: string) => {
        setUsername(value);
        if (loginError) setLoginError('');
    };

    const handlePasswordChange = (value: string) => {
        setPassword(value);
        if (loginError) setLoginError('');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password) {
            setLoginError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
            return;
        }
        setLoginError('');
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
            const result = await callApi<{ status?: string; data?: any; message?: string }>('login', {
                username: username.trim(),
                password,
            });
            
            if (result?.status === 'success' && result.data) {
                const teacher = result.data;
                const tUsername = String(teacher.username || '').trim();
                const tFullNameRaw = String(teacher.fullName || teacher.fullname || teacher.full_name || teacher.name || '').trim();
                const tFullName = tFullNameRaw || tUsername;
                const isTeacherAdmin = String(teacher.role || '').trim().toLowerCase() === 'admin';
                const tClass = teacher.class ? String(teacher.class).trim() : undefined;
                if (teacher.requiresPasswordChange) {
                    authStore.loginPendingPasswordChange();
                    setPendingTeacher({
                        username: tUsername,
                        fullName: tFullName,
                        isAdmin: isTeacherAdmin,
                        class: tClass,
                    });
                    return;
                }
                
                persistLoginPreference();
                authStore.loginSuccess(tUsername, tFullName, isTeacherAdmin, tClass);
                quizStore.setView('teacher_dash');
                return;
            }
            authStore.loginFailure();
            setLoginError('Tên đăng nhập hoặc mật khẩu chưa đúng.');
        } catch (error) {
            console.error('Login error:', error);
            authStore.loginFailure();
            setLoginError('Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.');
        }
    };

    const handleStudentLogin = async () => {
        const success = await classroomStore.loginStudent({
            username: username.trim(),
            password,
        });
        if (success) {
            persistLoginPreference();
            quizStore.setView('home');
        } else {
            setLoginError('Mã học sinh hoặc mật khẩu chưa đúng.');
        }
    };

    return (
        <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#eef8f1] bg-[url('/meadow-bg.webp')] bg-cover bg-bottom bg-no-repeat font-baloo">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/40 via-white/20 to-emerald-50/20"
            />
            {pendingTeacher && (
                <PasswordChangeDialog forced onCancel={() => {
                    void import('../../services/apiAdapter').then(({ callApi }) => callApi('logout')).catch(() => undefined);
                    setPendingTeacher(null);
                }} onComplete={() => {
                    persistLoginPreference();
                    authStore.loginSuccess(pendingTeacher.username, pendingTeacher.fullName, pendingTeacher.isAdmin, pendingTeacher.class);
                    setPendingTeacher(null);
                    quizStore.setView('teacher_dash');
                }} />
            )}
            <LandingHeader />
            {notificationFlag.ready && (
                notificationFlag.enabled
                    ? <NotificationSurfaceStack surface="LOGIN" />
                    : <CurrentAnnouncementBanner role={activeTab} />
            )}

            <section
                aria-label="Khu vực đăng nhập"
                className="z-10 mx-auto flex w-full max-w-[1240px] flex-1 flex-col items-center justify-center gap-8 px-4 pb-8 pt-5 sm:px-6 md:flex-row md:justify-between md:gap-12 md:px-12 md:pb-12 md:pt-4 lg:px-16"
            >
                <Suspense fallback={<div className="flex-1 h-64 animate-pulse bg-white/10 rounded-3xl" />}>
                    <HeroSection />
                </Suspense>
                
                <Suspense fallback={<div className="w-full max-w-md h-96 animate-pulse bg-white/20 rounded-3xl" />}>
                    <LoginForm 
                        activeTab={activeTab}
                        setActiveTab={handleRoleChange}
                        username={username}
                        setUsername={handleUsernameChange}
                        password={password}
                        setPassword={handlePasswordChange}
                        isLoading={isLoading}
                        onSubmit={handleLogin}
                        rememberAccount={rememberAccount}
                        onRememberAccountChange={setRememberAccount}
                        errorMessage={loginError}
                    />
                </Suspense>
            </section>

            <LandingFooter />
        </div>
    );
};

export default LoginLandingPage;
