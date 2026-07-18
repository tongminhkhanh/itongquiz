import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Camera,
  Gift,
  KeyRound,
  LogOut,
  Radio,
  Star,
  Trophy,
} from 'lucide-react';
import NotificationBell from '../../common/NotificationBell';
import type { StudentDashboardHeaderProps } from './dashboard.types';

const baseActionClass =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2';

export function StudentDashboardHeader({
  studentName,
  className,
  avatarUrl,
  level,
  coins,
  activeSection,
  giftShopEnabled,
  studentId,
  onSelectSection,
  onOpenGiftShop,
  onOpenLiveExam,
  onOpenAvatar,
  onOpenChangePassword,
  onLogout,
}: StudentDashboardHeaderProps) {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isAccountMenuOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsAccountMenuOpen(false);
      accountTriggerRef.current?.focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAccountMenuOpen]);

  const runAccountAction = (action: () => void) => {
    setIsAccountMenuOpen(false);
    action();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-2 px-3 md:min-h-20 md:px-8">
        <div className="flex shrink-0 items-center gap-2">
          <img
            src="/school-logo.png"
            alt="School logo iTong Quiz"
            className="h-10 w-10 object-contain drop-shadow-sm"
          />
          <span className="hidden text-xl font-black tracking-tight text-slate-800 sm:inline md:text-2xl">
            ÍtOng<span className="text-orange-500">Quiz</span>
          </span>
        </div>

        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <div
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 text-amber-700"
            aria-label={`Cấp bậc ${level}`}
          >
            <Trophy className="h-4 w-4" aria-hidden="true" />
            <span className="font-bold">{level}</span>
          </div>
          <div
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-yellow-200 bg-yellow-50 px-3 text-yellow-700"
            aria-label={`${coins} xu`}
          >
            <Star className="h-4 w-4 fill-yellow-500" aria-hidden="true" />
            <span className="font-bold">{coins}</span>
          </div>
        </div>

        <nav className="hidden items-center gap-2 lg:flex" aria-label="Điều hướng học sinh">
          <button
            type="button"
            onClick={() => onSelectSection('dashboard')}
            aria-pressed={activeSection === 'dashboard'}
            className={`${baseActionClass} ${
              activeSection === 'dashboard'
                ? 'border-sky-200 bg-sky-50 text-sky-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Trang chủ
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('achievements')}
            aria-pressed={activeSection === 'achievements'}
            className={`${baseActionClass} ${
              activeSection === 'achievements'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Trophy className="h-4 w-4" aria-hidden="true" />
            Thành tích
          </button>
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:ml-0 md:gap-2">
          <button
            type="button"
            onClick={() => onSelectSection('achievements')}
            aria-label="Mở thành tích"
            aria-pressed={activeSection === 'achievements'}
            className={`${baseActionClass} px-2.5 lg:hidden ${
              activeSection === 'achievements'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Trophy className="h-4 w-4" aria-hidden="true" />
            <span className="hidden md:inline">Thành tích</span>
          </button>

          {giftShopEnabled ? (
            <button
              type="button"
              onClick={onOpenGiftShop}
              aria-label="Mở Tiệm Tạp Hóa"
              className={`${baseActionClass} border-indigo-200 bg-indigo-50 px-2.5 text-indigo-700 hover:bg-indigo-100`}
            >
              <Gift className="h-4 w-4" aria-hidden="true" />
              <span className="hidden xl:inline">Tiệm Tạp Hóa</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={onOpenLiveExam}
            aria-label="Thi trực tiếp"
            className={`${baseActionClass} border-rose-200 bg-rose-50 px-2.5 text-rose-700 hover:bg-rose-100`}
          >
            <Radio className="h-4 w-4" aria-hidden="true" />
            <span className="hidden xl:inline">Thi trực tiếp</span>
          </button>

          <div className="flex min-h-11 min-w-11 items-center justify-center">
            <NotificationBell
              userId={studentId}
              onOpenCertificate={() => onSelectSection('achievements')}
            />
          </div>

          <div className="relative">
            <button
              ref={accountTriggerRef}
              type="button"
              onClick={() => setIsAccountMenuOpen((current) => !current)}
              aria-label={`Mở menu tài khoản của ${studentName}`}
              aria-haspopup="menu"
              aria-expanded={isAccountMenuOpen}
              aria-controls="student-account-menu"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border-2 border-sky-100 bg-white p-0.5 shadow-sm transition-colors hover:border-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            >
              <img
                src={avatarUrl}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
                aria-hidden="true"
              />
            </button>

            {isAccountMenuOpen ? (
              <div
                id="student-account-menu"
                role="menu"
                aria-label="Tài khoản học sinh"
                className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
              >
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="truncate text-sm font-bold text-slate-800">{studentName}</p>
                  <p className="truncate text-xs text-slate-500">{className || 'Học sinh'}</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runAccountAction(onOpenAvatar)}
                  className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  <Camera className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  Đổi avatar
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runAccountAction(onOpenChangePassword)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  <KeyRound className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  Đổi mật khẩu
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runAccountAction(onLogout)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Đăng xuất
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
