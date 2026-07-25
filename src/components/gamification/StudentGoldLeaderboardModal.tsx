import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { RefreshCw, Trophy, X } from 'lucide-react';
import { getAvatarUrl } from '../../config/avatars';
import type { TopGoldStudent } from '../../types/gamification.types';
import { StudentGoldPodium } from './StudentGoldPodium';

interface StudentGoldLeaderboardModalProps {
  isOpen: boolean;
  students: TopGoldStudent[];
  currentUsername?: string;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}

const focusableSelector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export const StudentGoldLeaderboardModal: React.FC<StudentGoldLeaderboardModalProps> = ({
  isOpen,
  students,
  currentUsername,
  isLoading,
  error,
  onClose,
  onRetry,
}) => {
  const dialogRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasRows = students.length > 0;
  const showInitialLoading = isLoading && !hasRows;

  return (
    <motion.div
      data-testid="student-gold-backdrop"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      initial={{ opacity: reduceMotion ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.16 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-gold-title"
        aria-describedby="student-gold-description"
        aria-label="Bảng vàng học sinh"
        initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
        className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-[#FFFDF7] shadow-2xl sm:max-w-3xl sm:rounded-3xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-amber-100 bg-white px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">
              <Trophy className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="student-gold-title" className="text-xl font-bold text-slate-900">
                Bảng vàng học sinh
              </h2>
              <p id="student-gold-description" className="mt-1 text-sm text-slate-600">
                10 học sinh có số xu hiện có cao nhất
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Bảng vàng"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          {showInitialLoading ? (
            <div className="space-y-5" aria-label="Đang tải Bảng vàng" aria-busy="true">
              <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="h-40 animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none" />
                ))}
              </div>
              <div className="space-y-2">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none" />
                ))}
              </div>
            </div>
          ) : !hasRows && error ? (
            <div role="alert" className="mx-auto max-w-sm py-12 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-100 text-rose-700">
                <Trophy className="h-7 w-7" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Chưa thể tải Bảng vàng</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Thử lại
              </button>
            </div>
          ) : !hasRows ? (
            <div className="mx-auto max-w-sm py-12 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-700">
                <Trophy className="h-7 w-7" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Bảng vàng đang chờ thành tích đầu tiên</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Hoàn thành bài học để nhận xu và xuất hiện trên Bảng vàng.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {error ? (
                <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <span>{error}</span>
                  <button type="button" onClick={onRetry} className="shrink-0 font-bold underline underline-offset-2">
                    Thử lại
                  </button>
                </div>
              ) : null}

              <StudentGoldPodium students={students} currentUsername={currentUsername} />

              {students.length > 3 ? (
                <ol start={4} className="space-y-2" aria-label="Các thứ hạng còn lại">
                  {students.slice(3).map((student, offset) => {
                    const rank = offset + 4;
                    const isCurrent = student.username === currentUsername;
                    return (
                      <li
                        key={student.username}
                        className={`flex items-center gap-3 rounded-2xl border px-3 py-3 sm:px-4 ${isCurrent ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-white'}`}
                      >
                        <span className="w-7 shrink-0 text-center text-sm font-black text-slate-500">{rank}</span>
                        <img
                          src={student.avatar ? getAvatarUrl(student.avatar) : getAvatarUrl('default')}
                          alt=""
                          aria-hidden="true"
                          className="h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover"
                          onError={(event) => {
                            event.currentTarget.src = getAvatarUrl('default');
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-bold text-slate-900">{student.fullName}</h3>
                            {isCurrent ? (
                              <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700">Em</span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs font-semibold text-amber-700">
                            {student.coins.toLocaleString('vi-VN')} xu
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : null}
            </div>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
};
