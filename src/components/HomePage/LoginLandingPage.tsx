import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useQuizStore } from '../../../stores/quizStore';
import { showError, showConfirm } from '../../utils/toast';
import { getAnnouncement, Announcement as AnnouncementData } from '../../services/announcementService';
import AnnouncementBanner from '../common/AnnouncementBanner';

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
    const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null);

    const authStore = useAuthStore();
    const classroomStore = useClassroomStore();
    const quizStore = useQuizStore();

    useEffect(() => {
        const fetchAnnouncement = async () => {
            const data = await getAnnouncement();
            if (data) setAnnouncement(data);
        };
        fetchAnnouncement();
    }, []);

    // Session Persistence
    useEffect(() => {
        try {
            const raw = localStorage.getItem(SAVED_LOGIN_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw) as Partial<SavedLoginAccount>;
            if (typeof saved.username === 'string' && saved.username.trim()) {
                setUsername(saved.username.trim());
            }
            if (saved.role === 'teacher' || saved.role === 'student') {
                setActiveTab(saved.role);
            }
        } catch (error) {
            console.warn('Could not load saved login account:', error);
        }
    }, []);

    const isLoading = activeTab === 'teacher' ? authStore.isLoggingIn : classroomStore.isLoading;

    const askToSaveAccount = (rawUsername: string, role: 'student' | 'teacher') => {
        const normalizedUsername = rawUsername.trim();
        if (!normalizedUsername) return;
        try {
            const existingRaw = localStorage.getItem(SAVED_LOGIN_KEY);
            const existing = existingRaw ? JSON.parse(existingRaw) as Partial<SavedLoginAccount> : null;
            if (existing?.username === normalizedUsername && existing?.role === role) return;

            const message = existing?.username
                ? `Bạn có muốn cập nhật tài khoản thành "${normalizedUsername}" không?`
                : `Bạn có muốn lưu tài khoản "${normalizedUsername}" cho lần sau không?`;

            showConfirm({
                message,
                onConfirm: () => {
                    const payload: SavedLoginAccount = { 
                        username: normalizedUsername, 
                        role, 
                        savedAt: new Date().toISOString() 
                    };
                    localStorage.setItem(SAVED_LOGIN_KEY, JSON.stringify(payload));
                },
            });
        } catch (error) {
            console.warn('Could not persist login account:', error);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            showError('Vui lòng nhập đầy đủ thông tin!');
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
            const result = await callApi<{ status?: string; data?: any; message?: string }>('login', { username, password });
            
            if (result?.status === 'success' && result.data) {
                const teacher = result.data;
                const tUsername = String(teacher.username || '').trim();
                const tFullNameRaw = String(teacher.fullName || teacher.fullname || teacher.full_name || teacher.name || '').trim();
                const tFullName = tFullNameRaw || tUsername;
                const isTeacherAdmin = String(teacher.role || '').trim().toLowerCase() === 'admin';
                const tClass = teacher.class ? String(teacher.class).trim() : undefined;
                
                authStore.loginSuccess(tUsername, tFullName, isTeacherAdmin, tClass);
                askToSaveAccount(tUsername || username, 'teacher');
                quizStore.setView('teacher_dash');
                return;
            }
            authStore.loginFailure();
            showError(result?.message || 'Tên đăng nhập hoặc mật khẩu không đúng!');
        } catch (error) {
            console.error('Login error:', error);
            authStore.loginFailure();
            showError('Có lỗi xảy ra khi kết nối. Vui lòng thử lại!');
        }
    };

    const handleStudentLogin = async () => {
        const success = await classroomStore.loginStudent({ username, password });
        if (success) {
            askToSaveAccount(username, 'student');
            quizStore.setView('home');
        } else {
            showError('Tên đăng nhập hoặc mật khẩu học sinh không đúng!');
        }
    };

    return (
        <div className="min-h-screen flex flex-col relative font-baloo bg-[url('/meadow-bg.png')] bg-cover bg-bottom bg-no-repeat transition-all duration-500">
            {/* Announcement Banner */}
            {announcement && announcement.isBannerActive && (
                <AnnouncementBanner
                    id={`banner-${announcement.bannerTitle || announcement.id || 'current'}`}
                    title={announcement.bannerTitle || ''}
                    subtitle={announcement.bannerSubtitle || ''}
                    link={announcement.bannerLink || ''}
                    image={announcement.bannerImage || ''}
                    daysToLive={announcement.daysToLive || 7}
                />
            )}

            <LandingHeader />

            <main className="flex-1 flex flex-col md:flex-row items-center justify-between gap-10 px-4 md:px-20 pb-16 max-w-[1280px] mx-auto w-full z-10">
                <HeroSection />
                
                <LoginForm 
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    username={username}
                    setUsername={setUsername}
                    password={password}
                    setPassword={setPassword}
                    isLoading={isLoading}
                    onSubmit={handleLogin}
                />
            </main>

            <LandingFooter />
        </div>
    );
};

export default LoginLandingPage;
