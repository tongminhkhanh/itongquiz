import { CalendarDays, Gift, Medal, Trophy } from 'lucide-react';
import { getAchievementBadgeAlt, getAchievementBadgeImage } from '../../../config/achievementBadges';
import type { RewardSidebarProps } from './dashboard.types';

export function RewardSidebar({
  dashboard,
  giftShopEnabled,
  isProcessing,
  onOpenChest,
  onOpenGiftShop,
  onOpenBadges,
}: RewardSidebarProps) {
  const chestClaimed = Boolean(dashboard?.bonusChest.claimed);
  const chestAvailable = Boolean(dashboard?.bonusChest.available) && !chestClaimed;
  const chestLabel = chestClaimed
    ? 'Đã mở rương'
    : isProcessing
      ? 'Đang mở...'
      : chestAvailable
        ? 'Mở rương thưởng'
        : 'Chưa mở khóa';
  const chestDisabled = chestClaimed || isProcessing || !chestAvailable;

  const completedDays = Math.max(0, dashboard?.weekly.completedDays || 0);
  const targetDays = Math.max(1, dashboard?.weekly.targetDays || 5);
  const rhythmPercent = Math.min(100, Math.round((completedDays / targetDays) * 100));
  const achievements = dashboard?.achievements || [];
  const collection = dashboard?.profile.collection || [];

  return (
    <aside aria-label="Phần thưởng và thành tích" className="space-y-6">
      <section className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Gift className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-900">Rương thưởng ngày</h2>
            <p className="text-sm font-medium text-slate-600">Mở khi hoàn thành đủ 3 nhiệm vụ.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="mb-3 text-sm font-semibold leading-6 text-slate-700">
            {chestClaimed
              ? 'Em đã mở rương hôm nay rồi. Mai quay lại nhé!'
              : chestAvailable
                ? 'Rương đã sẵn sàng với phần thưởng sưu tầm hoặc booster nhẹ.'
                : 'Hoàn thành đủ nhiệm vụ ngày để mở rương thưởng.'}
          </p>
          <button
            type="button"
            onClick={onOpenChest}
            disabled={chestDisabled}
            className={`inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
              chestAvailable && !isProcessing
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : chestClaimed
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'cursor-not-allowed bg-slate-200 text-slate-500'
            }`}
          >
            {chestLabel}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">Nhịp học tuần này</h2>
              <p className="text-sm font-medium text-slate-600">Duy trì đều đặn để tiến gần phần thưởng.</p>
            </div>
          </div>
          <span className="text-sm font-black text-blue-700">{completedDays}/{targetDays}</span>
        </div>
        <div
          role="progressbar"
          aria-label="Nhịp học tuần này"
          aria-valuemin={0}
          aria-valuemax={targetDays}
          aria-valuenow={Math.min(completedDays, targetDays)}
          className="mb-3 h-3 overflow-hidden rounded-full bg-slate-200"
        >
          <div
            className="h-full origin-left rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-transform duration-300 motion-reduce:transition-none"
            style={{ transform: `scaleX(${rhythmPercent / 100})` }}
          />
        </div>
        <p className="mb-4 text-sm font-medium leading-6 text-slate-600">
          Hoàn thành đủ nhiệm vụ trong 5 ngày để giữ nhịp tích lũy đẹp cho Gift Shop.
        </p>
        {giftShopEnabled ? (
          <button
            type="button"
            onClick={onOpenGiftShop}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-black text-indigo-800 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Xem mục tiêu quà thật
          </button>
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Medal className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">Sổ huy hiệu</h2>
              <p className="text-sm font-medium text-slate-600">Nhìn lại những cột mốc em đã đạt được.</p>
            </div>
          </div>
          {achievements.length > 0 ? (
            <button
              type="button"
              onClick={onOpenBadges}
              className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-black text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Xem tất cả
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="mb-4 space-y-3">
          {achievements.slice(0, 3).map((achievement) => {
            const badgeImage = getAchievementBadgeImage(achievement.code);
            return (
              <article key={achievement.code} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {badgeImage ? (
                    <img src={badgeImage} alt={getAchievementBadgeAlt(achievement)} className="h-9 w-9 object-contain" />
                  ) : (
                    <span className="text-xl" aria-hidden="true">{achievement.icon}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900">{achievement.title}</h3>
                  <p className="text-xs font-medium leading-5 text-slate-600">{achievement.description}</p>
                </div>
              </article>
            );
          })}
          {achievements.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-center text-sm font-semibold text-slate-600">
              Hoàn thành bài đầu tiên để mở huy hiệu đầu tiên nhé.
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Bộ sưu tập mini</p>
          <div className="flex flex-wrap gap-2">
            {collection.length > 0 ? (
              collection.map((item) => (
                <div
                  key={item.id}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl"
                  title={item.title}
                >
                  {item.icon}
                </div>
              ))
            ) : (
              <p className="text-sm font-medium text-slate-600">Mở rương để bắt đầu bộ sưu tập Toán và Tiếng Việt.</p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold text-slate-700">
            <span>💡 Vé gợi ý: {dashboard?.profile.hintTokens || 0}</span>
            <span>🛡️ Khiên chuỗi: {dashboard?.profile.streakShields || 0}</span>
          </div>
        </div>
      </section>
    </aside>
  );
}
