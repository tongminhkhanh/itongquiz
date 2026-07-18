export const ASSIGNMENTS_PER_PAGE = 5;
export const ATTENDANCE_REWARD = { exp: 50, coins: 50 } as const;

export const SUBJECT_CONFIG: Record<
  string,
  { title: string; icon: string; color: string; desc: string; showOnHome?: boolean }
> = {
  toan: {
    title: 'Toán Học', icon: 'calculate', color: 'from-blue-400 to-blue-600',
    desc: 'Rèn luyện tư duy logic',
  },
  'tieng-viet': {
    title: 'Tiếng Việt', icon: 'menu_book', color: 'from-amber-400 to-amber-600',
    desc: 'Vun đắp ngôn ngữ tiếng mẹ đẻ',
  },
  'tu-nhien-xa-hoi': {
    title: 'Tự nhiên & Xã hội', icon: 'public', color: 'from-emerald-400 to-emerald-600',
    desc: 'Khám phá thế giới muôn màu',
  },
  'tieng-anh': {
    title: 'Tiếng Anh', icon: 'language', color: 'from-blue-400 to-blue-700',
    desc: 'Mở rộng giao tiếp quốc tế',
  },
  'tin-hoc': {
    title: 'Tin học', icon: 'computer', color: 'from-slate-400 to-slate-600',
    desc: 'Làm chủ công nghệ tương lai',
  },
};

export const SUBJECT_CARD_STYLES = [
  { surfaceClass: 'border-blue-100 bg-blue-50', accentClass: 'bg-blue-100 text-blue-700' },
  { surfaceClass: 'border-amber-100 bg-amber-50', accentClass: 'bg-amber-100 text-amber-700' },
  { surfaceClass: 'border-emerald-100 bg-emerald-50', accentClass: 'bg-emerald-100 text-emerald-700' },
  { surfaceClass: 'border-indigo-100 bg-indigo-50', accentClass: 'bg-indigo-100 text-indigo-700' },
  { surfaceClass: 'border-slate-200 bg-slate-50', accentClass: 'bg-slate-200 text-slate-700' },
  { surfaceClass: 'border-orange-100 bg-orange-50', accentClass: 'bg-orange-100 text-orange-700' },
] as const;
