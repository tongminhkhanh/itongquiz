import { CheckCircle2, ChevronDown, ChevronUp, Flame, Lock, Sparkles } from 'lucide-react';
import { DashboardSectionError, ProgressSkeleton } from './DashboardStates';
import type { LearningProgressPanelProps } from './dashboard.types';
import { getMissionProgressPercent } from './dashboard.utils';

export function LearningProgressPanel({
  dashboard,
  isLoading,
  errorMessage,
  expanded,
  claimingMissionId,
  onToggle,
  onRetry,
  onClaimMission,
}: LearningProgressPanelProps) {
  const completedMissions = dashboard?.missions.filter((mission) => mission.completed).length || 0;
  const totalMissions = dashboard?.missions.length || 0;

  return (
    <section
      data-testid="learning-progress-panel"
      aria-labelledby="learning-progress-title"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls="learning-progress-details"
        className="flex min-h-11 w-full flex-col gap-4 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 md:flex-row md:items-center md:justify-between"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span id="learning-progress-title" className="block text-xl font-black text-slate-900 md:text-2xl">
              Hành trình hôm nay
            </span>
            <span className="mt-1 block text-sm font-medium text-slate-600">
              Theo dõi tiến độ học tập và nhận thưởng khi hoàn thành.
            </span>
          </span>
        </span>

        <span className="flex items-center justify-between gap-3 md:justify-end">
          <span className="text-right">
            <span className="block text-sm font-black text-slate-800">
              {dashboard ? `${completedMissions}/${totalMissions} nhiệm vụ` : 'Đang tải tiến độ'}
            </span>
            <span className="block text-xs font-bold text-slate-500">
              Chuỗi {dashboard?.profile.dailyStreak || 0} ngày
            </span>
          </span>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </span>
        </span>
      </button>

      <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
        <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-violet-800">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {dashboard ? `${completedMissions}/${totalMissions} nhiệm vụ hôm nay` : 'Đang tải nhiệm vụ'}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-orange-700">
          <Flame className="h-4 w-4" aria-hidden="true" />
          Chuỗi {dashboard?.profile.dailyStreak || 0} ngày
        </span>
      </div>

      {expanded ? (
        <div id="learning-progress-details" className="mt-5">
          {isLoading && !dashboard ? <ProgressSkeleton /> : null}
          {!isLoading && errorMessage ? (
            <DashboardSectionError message={errorMessage} onRetry={onRetry} />
          ) : null}
          {!isLoading && !errorMessage && dashboard ? (
            <div className="space-y-4">
              {dashboard.missions.map((mission) => {
                const percent = getMissionProgressPercent(mission);
                const isClaiming = claimingMissionId === mission.id;
                const claimDisabled = !mission.completed || mission.claimed || isClaiming;
                const claimLabel = isClaiming
                  ? 'Đang nhận...'
                  : mission.claimed
                    ? 'Đã nhận'
                    : mission.completed
                      ? 'Nhận thưởng'
                      : 'Chưa đủ';

                return (
                  <article key={mission.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-slate-900">{mission.title}</h3>
                          {mission.claimed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Đã nhận
                            </span>
                          ) : mission.completed ? (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-800">
                              Sẵn sàng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-1 text-[11px] font-black text-slate-600">
                              <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Đang tiến hành
                            </span>
                          )}
                        </div>
                        <p className="mb-3 text-sm font-medium text-slate-600">{mission.description}</p>
                        <div
                          role="progressbar"
                          aria-label={`Tiến độ ${mission.title}`}
                          aria-valuemin={0}
                          aria-valuemax={Math.max(0, mission.target)}
                          aria-valuenow={Math.min(Math.max(0, mission.progress), Math.max(0, mission.target))}
                          className="h-2.5 overflow-hidden rounded-full bg-slate-200"
                        >
                          <div
                            className="h-full origin-left rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-400 transition-transform duration-300 motion-reduce:transition-none"
                            style={{ transform: `scaleX(${percent / 100})` }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-600">
                          <span>{mission.progress}/{mission.target} {mission.unit}</span>
                          <span>+{mission.rewardCoins} Xu</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onClaimMission(mission.id)}
                        disabled={claimDisabled}
                        className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-4 text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                          mission.claimed
                            ? 'bg-emerald-50 text-emerald-700'
                            : mission.completed
                              ? 'bg-violet-600 text-white hover:bg-violet-700'
                              : 'cursor-not-allowed bg-slate-200 text-slate-500'
                        }`}
                      >
                        {claimLabel}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
