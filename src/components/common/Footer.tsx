import React from 'react';
import { Globe2, Mail, MapPin } from 'lucide-react';
import { SCHOOL_NAME } from '../../config/constants';

export type FooterRoutePath = '/' | '/about' | '/contact' | '/privacy' | '/tos';

interface Props {
    onNavigate: (path: FooterRoutePath) => void;
    showPublicLinks?: boolean;
}

const Footer: React.FC<Props> = ({ onNavigate, showPublicLinks = true }) => {
    const currentYear = new Date().getFullYear();
    const handleRouteClick = (event: React.MouseEvent<HTMLAnchorElement>, path: FooterRoutePath) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onNavigate(path);
    };

    const routeLink = (label: string, path: FooterRoutePath) => (
        <a
            href={path}
            onClick={(event) => handleRouteClick(event, path)}
            className="w-fit rounded text-sm font-medium text-slate-600 transition hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
            {label}
        </a>
    );

    return (
        <footer className="border-t border-slate-200 bg-white font-['Be_Vietnam_Pro']">
            <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                    <a href="/" onClick={(event) => handleRouteClick(event, '/')} className="flex items-center gap-2.5 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                        <img src="/school-logo-v2.webp" alt="" className="h-10 w-10 object-contain" onError={(event) => { event.currentTarget.src = '/school-logo.png'; }} />
                        <span className="text-xl font-black tracking-tight text-[#16407f]">ItOng<span className="text-[#ff9d00]">Quiz</span></span>
                    </a>
                    <p className="mt-4 max-w-xs text-sm font-medium leading-6 text-slate-600">
                        Nền tảng học tập số của {SCHOOL_NAME}, giúp việc giao bài, luyện tập và theo dõi tiến bộ trở nên rõ ràng hơn.
                    </p>
                    <div className="mt-5 flex gap-3">
                        <a href="https://www.thitong.site" aria-label="Website iTongQuiz" className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition hover:bg-blue-700 hover:text-white"><Globe2 className="h-5 w-5" /></a>
                        <a href="mailto:support@thitong.site" aria-label="Email hỗ trợ iTongQuiz" className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition hover:bg-blue-700 hover:text-white"><Mail className="h-5 w-5" /></a>
                    </div>
                </div>

                <div className={showPublicLinks ? '' : 'hidden'}>
                    <h2 className="text-sm font-black text-slate-950">Nền tảng</h2>
                    <div className="mt-5 flex flex-col gap-3">
                        {routeLink('Trang chủ', '/')}
                        {routeLink('Giới thiệu', '/about')}
                        {routeLink('Liên hệ', '/contact')}
                    </div>
                </div>

                <div>
                    <h2 className="text-sm font-black text-slate-950">Hỗ trợ & pháp lý</h2>
                    <div className="mt-5 flex flex-col gap-3">
                        {showPublicLinks && routeLink('Trung tâm liên hệ', '/contact')}
                        {routeLink('Chính sách bảo mật', '/privacy')}
                        {routeLink('Điều khoản sử dụng', '/tos')}
                    </div>
                </div>

                <div>
                    <h2 className="text-sm font-black text-slate-950">Nhà trường</h2>
                    <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                        <p className="font-bold text-slate-900">{SCHOOL_NAME}</p>
                        <p className="mt-2 flex items-start gap-2 text-sm font-medium leading-6 text-slate-600">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                            Mường La, Sơn La, Việt Nam
                        </p>
                    </div>
                </div>
            </div>
            <div className="border-t border-slate-100">
                <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-center text-xs font-medium text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
                    <p>© {currentYear} iTongQuiz. Nền tảng học tập của {SCHOOL_NAME}.</p>
                    <p>Thiết kế vì giáo viên và học sinh tiểu học.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
