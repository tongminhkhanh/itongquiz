import React from 'react';
import { FLUENT_CDN } from '../constants/dashboard.constants';

interface DashboardNavbarProps {
    isLoggedIn: boolean;
    isTeacherLoggedIn: boolean;
    onResetHome: () => void;
    onNavigateLeaderboard: () => void;
    onOpenLogin: () => void;
    onActionCta: () => void;
}

export const DashboardNavbar: React.FC<DashboardNavbarProps> = ({
    isLoggedIn,
    isTeacherLoggedIn,
    onResetHome,
    onNavigateLeaderboard,
    onOpenLogin,
    onActionCta
}) => {
    return (
        <nav className="sticker-nav">
            <div className="sticker-nav__inner">
                {/* Logo */}
                <div className="sticker-nav__logo" onClick={onResetHome}>
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
                        onClick={onResetHome}
                        className="sticker-nav__link"
                    >
                        Trang chủ
                    </button>
                    <button
                        onClick={onNavigateLeaderboard}
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
                        onClick={onOpenLogin}
                        className="sticker-nav__cta"
                    >
                        Vào Lớp
                    </button>
                ) : (
                    <button
                        onClick={onActionCta}
                        className="sticker-nav__cta"
                    >
                        {isTeacherLoggedIn ? 'Vào Quản Lý' : 'Vào Học'}
                    </button>
                )}
            </div>
        </nav>
    );
};
