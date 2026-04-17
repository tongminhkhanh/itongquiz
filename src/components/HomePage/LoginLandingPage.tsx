import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useQuizStore } from '../../../stores/quizStore';
import { Loader2, GraduationCap, UserRound, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnnouncementBanner from '../common/AnnouncementBanner';
import AnnouncementMarquee from '../common/AnnouncementMarquee';
import { showError, showConfirm } from '../../utils/toast';
import { getAnnouncement, Announcement as AnnouncementData } from '../../services/announcementService';

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

    useEffect(() => {
        // Fetch announcement
        const fetchAnnouncement = async () => {
            const data = await getAnnouncement();
            console.log('Fetched Announcement Data:', data);
            if (data) setAnnouncement(data);
        };
        fetchAnnouncement();

        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        return () => { document.head.removeChild(link); };
    }, []);

    const authStore = useAuthStore();
    const classroomStore = useClassroomStore();
    const quizStore = useQuizStore();
    const navigate = useNavigate();

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
                    const payload: SavedLoginAccount = { username: normalizedUsername, role, savedAt: new Date().toISOString() };
                    localStorage.setItem(SAVED_LOGIN_KEY, JSON.stringify(payload));
                },
            });
        } catch (error) {
            console.warn('Could not persist login account:', error);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) { showError('Vui lòng nhập đầy đủ thông tin!'); return; }
        if (activeTab === 'teacher') { await handleTeacherLogin(); } else { await handleStudentLogin(); }
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

    useEffect(() => {
        try {
            const raw = localStorage.getItem(SAVED_LOGIN_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw) as Partial<SavedLoginAccount>;
            if (typeof saved.username === 'string' && saved.username.trim()) setUsername(saved.username.trim());
            if (saved.role === 'teacher' || saved.role === 'student') setActiveTab(saved.role);
        } catch (error) {
            console.warn('Could not load saved login account:', error);
        }
    }, []);

    const features = [
        { avatar: "/avatar1.png", text: <>Ngân hàng <strong>10,000+</strong> câu hỏi trắc nghiệm đa dạng.</> },
        { avatar: "/avatar2.png", text: <>Báo cáo điểm số, <strong>thống kê chi tiết</strong> tự động.</> },
        { avatar: "/avatar3.png", text: <>Giao diện <strong>điều khiển trực quan</strong>, dễ dùng cho mọi người.</> },
    ];

    return (
        <div className="landing-container">
            {/* ====== BANNER ANNOUNCEMENT (Hệ thống mới) ====== */}
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

            <style>{`
                .landing-container {
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    font-family: 'Baloo 2', sans-serif;
                    background-image: url('/meadow-bg.png');
                    background-size: cover;
                    background-position: center bottom;
                    background-repeat: no-repeat;
                }
                .header-inner {
                    padding: 20px 48px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    z-index: 10;
                }
                .main-layout {
                    flex: 1;
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;
                    gap: 40px;
                    padding: 20px 80px 60px;
                    max-width: 1280px;
                    margin: 0 auto;
                    width: 100%;
                    z-index: 10;
                }
                .hero-section {
                    flex: 1;
                    max-width: 540px;
                    background: transparent;
                    display: flex;
                    flex-direction: column;
                    gap: 32px;
                }
                .app-footer {
                    padding: 16px 32px;
                    text-align: center;
                    font-size: 0.85rem;
                    color: #1e293b;
                    font-weight: 500;
                    width: 100%;
                    position: relative;
                    margin-top: auto;
                }

                .login-card {
                    background: #ffffff;
                    border-radius: 32px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08), 0 20px 25px -5px rgba(0, 0, 0, 0.04);
                    position: relative;
                    overflow: visible;
                }
                
                .login-card::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    border-radius: 32px;
                    border: 2px solid rgba(255, 255, 255, 0.5);
                    pointer-events: none;
                }

                .leaf-decor-top {
                    position: absolute;
                    top: -15px;
                    left: 20px;
                    width: 70px;
                    height: 70px;
                    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M30,90 C10,70 10,30 30,10 C50,-10 90,-10 90,30 C90,60 60,95 30,90 Z' fill='%23dcfce7' opacity='0.7'/%3E%3C/svg%3E") no-repeat center/contain;
                    z-index: 0;
                }
                
                .leaf-decor-bottom {
                    position: absolute;
                    bottom: 0;
                    right: 40px;
                    width: 150px;
                    height: 150px;
                    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M80,10 C100,30 100,70 80,90 C60,110 20,110 20,70 C20,40 50,5 80,10 Z' fill='%23dcfce7' opacity='0.5'/%3E%3C/svg%3E") no-repeat center/contain;
                    z-index: 0;
                }

                .role-tab {
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    border-radius: 20px;
                    cursor: pointer;
                    font-weight: 700;
                    font-size: 0.95rem;
                }
                
                .role-tab.active {
                    background: #ffffff;
                    color: #064E3B; /* Darker green text */
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }
                
                .role-tab:not(.active) {
                    color: #064E3B;
                    background: transparent;
                }

                .role-tab:not(.active):hover {
                    background: rgba(255,255,255,0.3);
                }

                .switcher-container {
                    background: #22c55e;
                    border-radius: 20px;
                    padding: 4px;
                    display: flex;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
                }

                .form-input {
                    width: 100%;
                    padding: 12px 14px 12px 42px;
                    border: 2px solid #f3f4f6;
                    border-radius: 14px;
                    font-family: 'Baloo 2', sans-serif;
                    font-size: 0.95rem;
                    color: #1f2937;
                    background: #f9fafb;
                    transition: all 0.2s ease;
                    outline: none;
                }
                
                .form-input:focus {
                    border-color: #22c55e;
                    background: #ffffff;
                    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.1);
                }
                
                .form-input::placeholder { color: #9ca3af; font-weight: 500; }
                
                .submit-btn {
                    width: 100%;
                    padding: 14px;
                    background: #16a34a; /* Tailwind green-600 */
                    color: white;
                    font-family: 'Baloo 2', sans-serif;
                    font-size: 1.1rem;
                    font-weight: 700;
                    border: none;
                    border-radius: 14px;
                    cursor: pointer;
                    transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.2s;
                    box-shadow: 0 4px 14px rgba(22, 163, 74, 0.3);
                }
                
                .submit-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(22, 163, 74, 0.4);
                    background: #15803d;
                }
                
                .submit-btn:active:not(:disabled) {
                    transform: translateY(1px);
                    box-shadow: 0 2px 8px rgba(22, 163, 74, 0.25);
                }
                
                .submit-btn:disabled { opacity: 0.65; cursor: not-allowed; }
                
                .header-nav-btn {
                    font-family: 'Baloo 2', sans-serif;
                    font-weight: 600;
                    color: #1e3a8a; /* Indigo-900 */
                    background: none;
                    border: none;
                    cursor: pointer;
                    transition: color 0.2s;
                    font-size: 1rem;
                }
                
                .header-nav-btn:hover { color: #2563eb; }
                
                .cta-btn {
                    background: #ffffff;
                    color: #16a34a; /* Green-600 */
                    border-radius: 9999px;
                    padding: 8px 18px;
                    font-family: 'Baloo 2', sans-serif;
                    font-weight: 700;
                    font-size: 0.95rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                }
                
                .cta-btn:hover { background: #fafafa; transform: scale(1.02); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
                
                .feature-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 1rem;
                    color: #1e293b; /* slate-800 */
                    font-weight: 500;
                    padding: 10px 16px;
                    margin-left: -16px;
                    border-radius: 24px;
                    border: 1px solid transparent;
                    transition: all 0.3s ease;
                    cursor: pointer;
                    position: relative;
                    z-index: 50;
                    pointer-events: auto;
                }
                
                .feature-item:hover {
                    transform: translateY(-5px) scale(1.03);
                    background: rgba(255, 255, 255, 0.85);
                    box-shadow: 0 12px 35px rgba(0, 0, 0, 0.1);
                    border-color: rgba(255, 255, 255, 0.9);
                }
                
                @media (max-width: 900px) {
                    .nav-links { display: none !important; }
                    .header-inner { padding: 16px 24px; }
                }

                @media (max-width: 768px) {
                    .hero-text h1 { font-size: 2.2rem !important; margin-bottom: 8px !important; line-height: 1.2 !important; white-space: normal !important; word-break: normal !important; }
                    .main-layout { flex-direction: column; align-items: center; justify-content: flex-start; padding: 16px 16px 40px; gap: 24px; }
                    .login-card-wrapper { order: 1; width: 100%; max-width: 500px; padding: 0; }
                    .hero-section { order: 2; width: 100%; text-align: center; align-items: center; max-width: 100%; }
                    .hero-text p { margin: 0 auto; font-size: 0.95rem; line-height: 1.5; white-space: normal; max-width: 100%; }
                    .feature-list-container { display: none !important; } /* Hide features on mobile */
                    
                    .login-card { padding: 24px 20px 20px; }
                    .form-input { padding: 10px 12px 10px 36px; font-size: 0.9rem; }
                    .submit-btn { padding: 12px; font-size: 1rem; }
                    .role-tab { padding: 8px 10px; font-size: 0.9rem; }
                    
                    .header-inner { flex-direction: column; padding: 16px; gap: 12px; }
                    .header-nav-container { justify-content: center; width: 100%; }
                    .cta-btn { width: 100%; justify-content: center; padding: 12px; font-size: 1rem; }
                    
                    .app-footer { padding: 10px; font-size: 0.75rem; border-top: 1px solid rgba(255,255,255,0.2); }
                }

                @media (max-width: 480px) {
                    .hero-text h1 { font-size: 1.8rem !important; }
                    .login-card { padding: 20px 16px; border-radius: 20px; }
                    .login-card::before { border-radius: 20px; }
                    .leaf-decor-top { width: 35px; height: 35px; left: 5px; top: -5px; }
                    .leaf-decor-bottom { right: 5px; width: 70px; height: 70px; }
                    .switcher-container { margin-bottom: 20px; }
                }
            `}</style>

            {/* ====== HEADER ====== */}
            <header className="header-inner">
                {/* Logo */}
                <div className="header-logo-container" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <img
                        src="/shool-logo1-removebg.png"
                        alt="ítOngQuiz logo"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/school-logo.png'; }}
                        style={{ width: 44, height: 44, objectFit: 'contain' }}
                    />
                    <span style={{ fontWeight: 800, fontSize: '1.4rem' }}>
                        <span style={{ color: '#1e3a8a' }}>ítong</span><span style={{ color: '#FACC15' }}>Quiz</span>
                    </span>
                </div>

                {/* Nav & CTA */}
                <div className="header-nav-container" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                    <nav className="nav-links" style={{ display: 'flex', gap: 24 }}>
                        <button className="header-nav-btn" onClick={() => navigate('/')}>Trang chủ</button>
                        <button className="header-nav-btn" onClick={() => navigate('/about')}>Giới thiệu</button>
                        <button className="header-nav-btn" onClick={() => navigate('/contact')}>Liên hệ</button>
                    </nav>
                    <button
                        className="cta-btn"
                        onClick={() => window.open('https://cdth.vercel.app/', '_blank')}
                    >
                        Chuyển Đổi YCCĐ <ArrowRight size={16} />
                    </button>
                </div>
            </header>

            {/* ====== MAIN ====== */}
            <main className="main-layout">
                {/* ---- LEFT: Hero ---- */}
                <section className="hero-section">
                    <div className="hero-text">
                        <h1 style={{
                            fontSize: '4.2rem',
                            fontWeight: 800,
                            lineHeight: 1.1,
                            color: '#1e3a8a', /* Dark Blue */
                            marginBottom: 20,
                        }}>
                            Khơi Dậy Tiềm Năng Tri Thức
                        </h1>
                        <p style={{ fontSize: '1.05rem', color: '#1e293b', lineHeight: 1.6, maxWidth: 460, fontWeight: 500, margin: 0 }}>
                            Nền tảng kiểm tra trực tuyến thông minh, giúp giáo viên quản lý lớp học hiệu quả và học sinh ôn luyện hứng thú mỗi ngày.
                        </p>
                    </div>

                    <div className="feature-list-container hidden md:flex flex-col gap-5">
                        {features.map((f, i) => (
                            <div key={i} className="feature-item flex items-center gap-3">
                                <img 
                                    src={f.avatar} 
                                    alt={`Feature aspect ${i+1}`}
                                    style={{
                                        width: 48, 
                                        height: 48, 
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        backgroundColor: '#fff',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                        border: '2px solid #fff'
                                    }} 
                                />
                                <span style={{flex: 1}}>{f.text}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ---- RIGHT: Login Card ---- */}
                <div className="login-card-wrapper" style={{ width: '100%', maxWidth: 440 }}>
                    <div className="login-card" style={{ padding: '40px 40px 32px' }}>
                        <div className="leaf-decor-top"></div>
                        <div className="leaf-decor-bottom"></div>

                        {/* Card Header */}
                        <div style={{ textAlign: 'center', marginBottom: 24, position: 'relative', zIndex: 1 }}>
                            <h2 style={{ fontWeight: 800, fontSize: '1.8rem', color: '#111827', marginBottom: 4 }}>
                                {activeTab === 'student' ? 'Chào mừng em!' : 'Chào Thầy/Cô!'}
                            </h2>
                            <p style={{ color: '#6b7280', fontSize: '0.95rem', fontWeight: 500 }}>
                                {activeTab === 'student' ? 'Đăng nhập để vào lớp học ảo của em' : 'Truy cập bảng điều khiển quản lý'}
                            </p>
                        </div>

                        {/* Role Toggle */}
                        <div className="switcher-container" style={{ marginBottom: 28, position: 'relative', zIndex: 1 }} data-purpose="role-switcher">
                            <button
                                className={`role-tab ${activeTab === 'student' ? 'active' : ''}`}
                                style={{ flex: 1, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none' }}
                                onClick={() => { setActiveTab('student'); }}
                            >
                                <GraduationCap size={18} /> Học sinh
                            </button>
                            <button
                                className={`role-tab ${activeTab === 'teacher' ? 'active' : ''}`}
                                style={{ flex: 1, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none' }}
                                onClick={() => { setActiveTab('teacher'); }}
                            >
                                <UserRound size={18} /> Giáo viên
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleLogin} style={{ position: 'relative', zIndex: 1 }}>
                            {/* Username */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#111827', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    Tên đăng nhập
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <UserRound size={18} color="#9ca3af" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder={activeTab === 'student' ? 'Mã học sinh' : 'Tài khoản giáo viên'}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div style={{ marginBottom: 28 }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#111827', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    Mật khẩu
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={activeTab === 'student' ? 'Mật khẩu học sinh' : '••••••••'}
                                        required
                                    />
                                </div>
                            </div>


                            {/* Submit */}
                            <button type="submit" className="submit-btn" disabled={isLoading}>
                                {isLoading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        <Loader2 className="animate-spin" size={20} /> Đang xử lý...
                                    </span>
                                ) : 'Đăng nhập ngay'}
                            </button>
                        </form>

                        {/* Support */}
                        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#6b7280', marginTop: 24, fontWeight: 500, position: 'relative', zIndex: 1 }}>
                            Cần hỗ trợ?{' '}
                            <a href="mailto:sample_user_baf53feb@gmail.com" style={{ color: '#16a34a', fontWeight: 700 }}>
                                Liên hệ Quản trị viên
                            </a>
                        </p>
                    </div>
                </div>
            </main>

            {/* ====== FOOTER ====== */}
            <footer className="app-footer">
                <p>© {new Date().getFullYear()} itongQuiz. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LoginLandingPage;
