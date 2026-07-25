import React from 'react';
import { Crown, Medal } from 'lucide-react';
import { getAvatarUrl } from '../../config/avatars';
import type { TopGoldStudent } from '../../types/gamification.types';

interface StudentGoldPodiumProps {
  students: TopGoldStudent[];
  currentUsername?: string;
}

const podiumOrder = [0, 1, 2] as const;

const rankStyles = {
  0: {
    order: 'order-2',
    wrapper: '-mt-4 border-amber-300 bg-amber-50 sm:-mt-8',
    badge: 'bg-amber-400 text-amber-950',
    label: 'Hạng 1',
  },
  1: {
    order: 'order-1',
    wrapper: 'border-slate-300 bg-slate-50',
    badge: 'bg-slate-300 text-slate-800',
    label: 'Hạng 2',
  },
  2: {
    order: 'order-3',
    wrapper: 'border-orange-300 bg-orange-50',
    badge: 'bg-orange-300 text-orange-950',
    label: 'Hạng 3',
  },
} as const;

export const StudentGoldPodium: React.FC<StudentGoldPodiumProps> = ({
  students,
  currentUsername,
}) => {
  const topThree = students.slice(0, 3);

  if (topThree.length === 0) return null;

  return (
    <ol aria-label="Ba học sinh dẫn đầu" className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {podiumOrder.map((studentIndex) => {
        const student = topThree[studentIndex];
        const style = rankStyles[studentIndex];
        if (!student) {
          return <li key={studentIndex} aria-hidden="true" className={style.order} />;
        }

        const rank = studentIndex + 1;
        const isCurrent = student.username === currentUsername;

        return (
          <li
            key={student.username}
            className={`relative flex min-w-0 flex-col items-center rounded-2xl border px-2 pb-4 pt-5 text-center shadow-sm ${style.order} ${style.wrapper}`}
          >
            <span className={`absolute -top-3 inline-flex min-h-7 items-center gap-1 rounded-full px-2 text-xs font-bold ${style.badge}`}>
              {rank === 1 ? (
                <Crown className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Medal className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {style.label}
            </span>
            <img
              src={student.avatar ? getAvatarUrl(student.avatar) : getAvatarUrl('default')}
              alt=""
              aria-hidden="true"
              className={`h-14 w-14 rounded-full border-2 object-cover sm:h-16 sm:w-16 ${rank === 1 ? 'border-amber-400' : 'border-white'}`}
              onError={(event) => {
                event.currentTarget.src = getAvatarUrl('default');
              }}
            />
            <h3 className="mt-3 line-clamp-2 text-xs font-bold text-slate-900 sm:text-sm">
              {student.fullName}
            </h3>
            <p className="mt-1 text-xs font-semibold text-amber-700">
              {student.coins.toLocaleString('vi-VN')} xu
            </p>
            {isCurrent ? (
              <span className="mt-2 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                Em
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
};
