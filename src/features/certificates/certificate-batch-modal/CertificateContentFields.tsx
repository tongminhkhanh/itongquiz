interface CertificateContentFieldsProps {
  achievementPrefix: string;
  setAchievementPrefix: (value: string) => void;
  dateLine: string;
  setDateLine: (value: string) => void;
}

export const CertificateContentFields = (props: CertificateContentFieldsProps) => (
  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-3">
    <p className="text-sm font-semibold text-amber-900">Nội dung in trên chứng nhận</p>
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">Mở đầu thành tích</label>
      <input
        type="text"
        value={props.achievementPrefix}
        maxLength={160}
        onChange={event => props.setAchievementPrefix(event.target.value)}
        placeholder="Đã hoàn thành xuất sắc"
        className="w-full border border-amber-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
      <p className="mt-1 text-xs text-slate-500">Tên bài thi sẽ được tự động nối phía sau.</p>
    </div>
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">Dòng ngày cấp</label>
      <input
        type="text"
        value={props.dateLine}
        maxLength={200}
        onChange={event => props.setDateLine(event.target.value)}
        placeholder="Mường La, ngày 15 tháng 7 năm 2026"
        className="w-full border border-amber-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    </div>
  </div>
);
