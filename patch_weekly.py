import pathlib, sys

path = pathlib.Path(r'src/components/HomePage/StudentDashboardUI.tsx')
content = path.read_text(encoding='utf-8')

# The OLD block starts with \n + 24 spaces + {/* Weekly Quests Panel */}
# ends with closing the card div + \n + 20 spaces + </div>  (closing the left column)

# Find start
START_MARKER = '\n                        {/* Weekly Quests Panel */}'
start = content.find(START_MARKER)
if start == -1:
    print('START MARKER NOT FOUND'); sys.exit(1)
print(f'Start at {start}')

# Find the closing sequence of the panel + left-column closing div
# After the panel </div> there's \n                    </div> (20 spaces) which closes the left column
END_MARKER = '</div>\n                    </div>'
# Search from after start
from_start = content.find(END_MARKER, start)
if from_start == -1:
    print('END MARKER NOT FOUND'); sys.exit(1)
end = from_start + len(END_MARKER)
print(f'End at {end}')

OLD = content[start:end]
print('OLD snippet start:', repr(OLD[:80]))
print('OLD snippet end:', repr(OLD[-80:]))
print('OLD length:', len(OLD))

NEW = '''
                    </div>

                    {/* Weekly Quests Panel — card rieng ngoai Hanh trinh hom nay */}
                    <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-5 md:p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xl">
                                \U0001f4c5
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Nhi\u1ec7m v\u1ee5 tu\u1ea7n</h3>
                                <p className="text-xs text-slate-500">Reset m\u1ed7i th\u1ee9 2</p>
                            </div>
                        </div>

                        {isWeeklyQuestsLoading ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                            </div>
                        ) : weeklyQuestsError ? (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                {weeklyQuestsError}
                            </div>
                        ) : weeklyQuests.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center">
                                <p className="text-sm font-semibold text-slate-400">Ch\u01b0a c\u00f3 nhi\u1ec7m v\u1ee5 tu\u1ea7n n\u00e0o. H\u00e3y quay l\u1ea1i sau nh\u00e9! \U0001f31f</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {weeklyQuests.map((quest) => {
                                    const progressPercent = Math.min(100, (quest.progress / quest.target) * 100);

                                    return (
                                        <div
                                            key={quest.id}
                                            className={`rounded-2xl border p-4 transition-colors ${
                                                quest.claimed
                                                    ? \'border-emerald-100 bg-emerald-50/60\'
                                                    : quest.completed
                                                    ? \'border-purple-200 bg-purple-50/60\'
                                                    : \'border-slate-200 bg-slate-50\'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3 mb-2">
                                                <div className="text-2xl flex-shrink-0">{quest.icon}</div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-black text-slate-800 flex flex-wrap items-center gap-2">
                                                        {quest.title}
                                                        {quest.claimed && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5">
                                                                \u2713 \u0110\u00e3 nh\u1eadn
                                                            </span>
                                                        )}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">{quest.description}</p>
                                                </div>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="mb-3">
                                                <div className="flex justify-between text-xs font-bold mb-1">
                                                    <span className="text-slate-600">{quest.progress}/{quest.target}</span>
                                                    <span className="text-purple-600">{Math.round(progressPercent)}%</span>
                                                </div>
                                                <div
                                                    className="h-2 bg-slate-200 rounded-full overflow-hidden"
                                                    role="progressbar"
                                                    aria-valuenow={quest.progress}
                                                    aria-valuemin={0}
                                                    aria-valuemax={quest.target}
                                                >
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                            quest.claimed
                                                                ? \'bg-emerald-400\'
                                                                : \'bg-gradient-to-r from-purple-500 to-indigo-500\'
                                                        }`}
                                                        style={{ width: `${progressPercent}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Reward & Claim button */}
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-xs font-bold text-amber-600 flex flex-wrap items-center gap-1">
                                                    <span>\U0001faa9 +{quest.reward.coins} Xu</span>
                                                    {quest.reward.exp > 0 && (
                                                        <span className="text-violet-600">\u00b7 +{quest.reward.exp} EXP</span>
                                                    )}
                                                    {quest.reward.items.length > 0 && (
                                                        <span className="text-slate-500">\u00b7 +{quest.reward.itemCount} v\u1eadt ph\u1ea9m</span>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleClaimWeeklyQuest(quest.id)}
                                                    disabled={!quest.completed || quest.claimed}
                                                    aria-label={
                                                        quest.claimed
                                                            ? \'\u0110\u00e3 nh\u1eadn th\u01b0\u1edfng\'
                                                            : quest.completed
                                                            ? \'Nh\u1eadn th\u01b0\u1edfng nhi\u1ec7m v\u1ee5 tu\u1ea7n\'
                                                            : \'Ch\u01b0a ho\u00e0n th\u00e0nh nhi\u1ec7m v\u1ee5\'
                                                    }
                                                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                                        quest.claimed
                                                            ? \'bg-emerald-100 text-emerald-600 cursor-default\'
                                                            : quest.completed
                                                            ? \'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-md hover:scale-[1.03]\'
                                                            : \'bg-slate-200 text-slate-400 cursor-not-allowed\'
                                                    }`}
                                                >
                                                    {quest.claimed ? \'\u2713 \u0110\u00e3 nh\u1eadn\' : quest.completed ? \'Nh\u1eadn th\u01b0\u1edfng\' : \'Ch\u01b0a xong\'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>'''

new_content = content[:start] + NEW + content[end:]
path.write_text(new_content, encoding='utf-8')
print('DONE. New file size:', len(new_content))
