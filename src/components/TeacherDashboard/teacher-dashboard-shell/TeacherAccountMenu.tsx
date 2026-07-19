import { X } from 'lucide-react';

interface TeacherAccountMenuProps {
  displayName: string;
  initial: string;
  isAdmin: boolean;
  onLogout: () => void;
}

export const TeacherAccountMenu = ({
  displayName,
  initial,
  isAdmin,
  onLogout,
}: TeacherAccountMenuProps) => (
  <details className="group relative border-l border-slate-200 pl-3 sm:pl-4">
    <summary
      aria-label={`Mở menu tài khoản của ${displayName}`}
      className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden"
    >
      <span className="hidden flex-col items-end sm:flex">
        <span className="text-sm font-bold leading-tight text-slate-700">{displayName}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
          {isAdmin ? 'Quản trị viên' : 'Giáo viên'}
        </span>
      </span>
      <span className="flex size-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white shadow-sm transition-transform group-open:scale-105">
        {initial}
      </span>
    </summary>
    <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white opacity-0 invisible shadow-xl transition-all group-open:visible group-open:opacity-100">
      <div className="border-b border-slate-100 bg-slate-50/80 p-4">
        <p className="mb-1 text-xs text-slate-400">Tài khoản</p>
        <p className="truncate text-sm font-bold text-slate-800">{displayName}</p>
      </div>
      <div className="p-2">
        <button
          type="button"
          onClick={onLogout}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <X aria-hidden="true" className="size-4" /> Đăng xuất
        </button>
      </div>
    </div>
  </details>
);
