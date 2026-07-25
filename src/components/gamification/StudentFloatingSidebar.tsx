import React, { useCallback, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useGamificationStore } from '../../stores/useGamificationStore';
import { StudentGoldLeaderboardModal } from './StudentGoldLeaderboardModal';

export interface StudentFloatingSidebarProps {
  currentUsername?: string;
}

export const StudentFloatingSidebar: React.FC<StudentFloatingSidebarProps> = ({
  currentUsername,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const {
    topGoldLeaderboard,
    topGoldLeaderboardLoading,
    topGoldLeaderboardError,
    fetchTopGoldLeaderboard,
  } = useGamificationStore();

  const openLeaderboard = useCallback(() => {
    setIsOpen(true);
    void fetchTopGoldLeaderboard();
  }, [fetchTopGoldLeaderboard]);

  const closeLeaderboard = useCallback(() => {
    setIsOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  return (
    <>
      <div className="fixed bottom-5 right-4 z-30 sm:right-5 md:bottom-6 md:right-6">
        <div className="group relative">
          <motion.button
            ref={triggerRef}
            type="button"
            onClick={openLeaderboard}
            aria-label="Mở Bảng vàng học sinh"
            whileHover={reduceMotion ? undefined : { y: -2, scale: 1.03 }}
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-100 to-amber-300 text-amber-800 shadow-[0_10px_24px_rgba(180,83,9,0.24)] transition-shadow hover:shadow-[0_14px_30px_rgba(180,83,9,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            <Trophy className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
            <span className="pointer-events-none absolute inset-x-2 bottom-1 h-1 rounded-full bg-white/55" aria-hidden="true" />
          </motion.button>
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full right-0 mb-2 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 md:block"
          >
            Mở Bảng vàng
          </span>
        </div>
      </div>

      <StudentGoldLeaderboardModal
        isOpen={isOpen}
        students={topGoldLeaderboard}
        currentUsername={currentUsername}
        isLoading={topGoldLeaderboardLoading}
        error={topGoldLeaderboardError}
        onClose={closeLeaderboard}
        onRetry={() => void fetchTopGoldLeaderboard(true)}
      />
    </>
  );
};
