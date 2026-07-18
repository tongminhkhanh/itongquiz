import { DashboardEmptyState, DashboardSectionError } from './DashboardStates';
import type { WeeklyQuestsPanelProps } from './dashboard.types';
import { getWeeklyProgressPercent } from './dashboard.utils';

export function WeeklyQuestsPanel({
  quests,
  isLoading,
  errorMessage,
  claimingQuestId,
  onRetry,
  onClaim,
}: WeeklyQuestsPanelProps) {
  return (
    <section
      aria-labelledby="weekly-quests-title"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-xl" aria-hidden="true">
          📅
        </div>
        <div>
          <h2 id="weekly-quests-title" className="text-lg font-black text-slate-900">
            Nhiệm vụ tuần
          </h2>
          <p className="text-xs text-slate-500">Làm mới mỗi thứ Hai</p>
        </div>
      </div>

      {isLoading ? (
        <div aria-busy="true" aria-label="Đang tải nhiệm vụ tuần" className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="animate-pulse rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-hidden="true">
              <div className="mb-3 h-4 w-1/2 rounded-full bg-slate-200" />
              <div className="mb-4 h-3 w-4/5 rounded-full bg-slate-200" />
              <div className="h-2 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <DashboardSectionError message={errorMessage} onRetry={onRetry} />
      ) : null}

      {!isLoading && !errorMessage && quests.length === 0 ? (
        <DashboardEmptyState
          title="Nhiệm vụ mới sẽ sớm xuất hiện."
          description="Em hãy quay lại sau để khám phá thử thách mới."
        />
      ) : null}

      {!isLoading && !errorMessage && quests.length > 0 ? (
        <div className="space-y-3">
          {quests.map((quest) => {
            const percent = getWeeklyProgressPercent(quest.progress, quest.target);
            const isClaiming = claimingQuestId === quest.id;
            const disabled = !quest.completed || quest.claimed || isClaiming;
            const label = isClaiming
              ? 'Đang nhận...'
              : quest.claimed
                ? 'Đã nhận'
                : quest.completed
                  ? 'Nhận ngay'
                  : 'Chưa xong';

            return (
              <article
                key={quest.id}
                className={`rounded-2xl border p-4 ${
                  quest.claimed
                    ? 'border-emerald-200 bg-emerald-50/60'
                    : quest.completed
                      ? 'border-violet-200 bg-violet-50/60'
                      : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="mb-3 flex items-start gap-3">
                  <span className="shrink-0 text-2xl" aria-hidden="true">{quest.icon}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="flex flex-wrap items-center gap-2 text-sm font-black text-slate-900">
                      {quest.title}
                      {quest.claimed ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                          Đã nhận
                        </span>
                      ) : null}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{quest.description}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="mb-1 flex justify-between text-xs font-bold text-slate-600">
                    <span>{quest.progress}/{quest.target}</span>
                    <span>{percent}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`Tiến độ nhiệm vụ tuần ${quest.title}`}
                    aria-valuemin={0}
                    aria-valuemax={Math.max(0, quest.target)}
                    aria-valuenow={Math.min(Math.max(0, quest.progress), Math.max(0, quest.target))}
                    className="h-2 overflow-hidden rounded-full bg-slate-200"
                  >
                    <div
                      data-testid={`weekly-quest-progress-fill-${quest.id}`}
                      className={`h-full origin-left rounded-full transition-transform duration-300 motion-reduce:transition-none ${
                        quest.claimed ? 'bg-emerald-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                      }`}
                      style={{ transform: `scaleX(${percent / 100})` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-1 text-xs font-bold text-amber-700">
                    <span>🪙 +{quest.reward.coins} Xu</span>
                    {quest.reward.exp > 0 ? <span className="text-violet-700">· +{quest.reward.exp} EXP</span> : null}
                    {quest.reward.items.length > 0 ? (
                      <span className="text-slate-600">· +{quest.reward.itemCount} vật phẩm</span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => onClaim(quest.id)}
                    disabled={disabled}
                    className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-xs font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                      quest.claimed
                        ? 'bg-emerald-100 text-emerald-700'
                        : quest.completed
                          ? 'bg-violet-600 text-white hover:bg-violet-700'
                          : 'cursor-not-allowed bg-slate-200 text-slate-500'
                    }`}
                  >
                    {label}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
