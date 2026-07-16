import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    History,
    Loader2,
    RefreshCw,
    RotateCcw,
    ScanSearch,
    ShieldCheck,
} from 'lucide-react';
import MathSpan from '../../components/common/MathSpan';
import { showConfirm, showError, showSuccess } from '../../utils/toast';
import { mathAuditService } from './mathAuditService';
import type { MathAuditIssue, MathAuditSummary, MathRepairBatch, MathRenderEvent } from './mathAudit.types';

const emptySummary: MathAuditSummary = {
    scanned: 0,
    affected: 0,
    autoFixable: 0,
    blocked: 0,
    currentVersion: 0,
};

type SummaryCard = {
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
};

const Preview: React.FC<{ title: string; content: string; tone: 'before' | 'after' }> = ({ title, content, tone }) => (
    <div className={`rounded-xl border p-3 ${tone === 'before' ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
        <p className={`mb-2 text-[10px] font-black uppercase tracking-wide ${tone === 'before' ? 'text-amber-700' : 'text-emerald-700'}`}>{title}</p>
        <div className="rounded-lg bg-white px-3 py-2">
            <MathSpan content={content || '—'} as="div" className="text-sm text-slate-800" />
        </div>
        <code className="mt-2 block max-h-20 overflow-auto whitespace-pre-wrap break-all text-[10px] text-slate-500">{content || '—'}</code>
    </div>
);

const MathAuditPage: React.FC = () => {
    const [issues, setIssues] = useState<MathAuditIssue[]>([]);
    const [summary, setSummary] = useState<MathAuditSummary>(emptySummary);
    const [batches, setBatches] = useState<MathRepairBatch[]>([]);
    const [telemetry, setTelemetry] = useState<MathRenderEvent[]>([]);
    const [telemetrySummary, setTelemetrySummary] = useState({ events: 0, occurrences: 0, days: 7 });
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isApplying, setIsApplying] = useState(false);
    const [rollingBack, setRollingBack] = useState<string | null>(null);

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const [issueResponse, batchResponse, telemetryResponse] = await Promise.all([
                mathAuditService.listIssues(1000),
                mathAuditService.listBatches(),
                mathAuditService.listTelemetry(7),
            ]);
            setIssues(issueResponse.data);
            setSummary(issueResponse.summary);
            setBatches(batchResponse.data);
            setTelemetry(telemetryResponse.data);
            setTelemetrySummary(telemetryResponse.summary);
            setSelected((current) => new Set([...current].filter((id) =>
                issueResponse.data.some((item) => item.questionId === id && item.remainingIssues.length === 0),
            )));
        } catch (error) {
            showError(error instanceof Error ? error.message : 'Không thể tải dữ liệu rà soát LaTeX');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const fixableIssues = useMemo(
        () => issues.filter((issue) => issue.remainingIssues.length === 0),
        [issues],
    );
    const allFixableSelected = fixableIssues.length > 0
        && fixableIssues.every((issue) => selected.has(issue.questionId));

    const toggleAll = () => {
        setSelected(allFixableSelected ? new Set() : new Set(fixableIssues.map((issue) => issue.questionId)));
    };

    const applySelected = () => {
        const questionIds = [...selected];
        if (questionIds.length === 0) return;
        showConfirm({
            message: `Chuẩn hóa ${questionIds.length} câu hỏi và lưu snapshot để có thể hoàn tác?`,
            confirmLabel: 'Chuẩn hóa',
            onConfirm: async () => {
                setIsApplying(true);
                try {
                    const response = await mathAuditService.apply(questionIds);
                    showSuccess(`Đã chuẩn hóa ${response.data.repaired} câu hỏi.`);
                    setSelected(new Set());
                    await load();
                } catch (error) {
                    showError(error instanceof Error ? error.message : 'Chuẩn hóa thất bại');
                } finally {
                    setIsApplying(false);
                }
            },
        });
    };

    const rollback = (batch: MathRepairBatch) => {
        showConfirm({
            message: `Hoàn tác batch ${batch.batch_id.slice(0, 24)}? Câu hỏi đã sửa sau batch sẽ được bỏ qua để tránh mất dữ liệu.`,
            confirmLabel: 'Hoàn tác',
            destructive: true,
            onConfirm: async () => {
                setRollingBack(batch.batch_id);
                try {
                    const response = await mathAuditService.rollback(batch.batch_id);
                    const conflicts = response.data.conflicts.length;
                    showSuccess(`Đã hoàn tác ${response.data.rolledBack} câu${conflicts ? `, bỏ qua ${conflicts} câu có xung đột` : ''}.`);
                    await load();
                } catch (error) {
                    showError(error instanceof Error ? error.message : 'Hoàn tác thất bại');
                } finally {
                    setRollingBack(null);
                }
            },
        });
    };

    const cards: SummaryCard[] = [
        { label: 'Đã quét', value: summary.scanned, icon: ScanSearch, tone: 'text-blue-600' },
        { label: 'Cần xử lý', value: summary.affected, icon: AlertTriangle, tone: 'text-amber-600' },
        { label: 'Tự sửa được', value: summary.autoFixable, icon: CheckCircle2, tone: 'text-emerald-600' },
        { label: 'Cần sửa tay', value: summary.blocked, icon: AlertTriangle, tone: 'text-red-600' },
        { label: 'Phiên bản mới', value: summary.currentVersion, icon: ShieldCheck, tone: 'text-indigo-600' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 text-white shadow"><ScanSearch className="h-5 w-5" /></div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Rà dữ liệu công thức toán</h2>
                        <p className="text-xs text-slate-500">Preview trước/sau, sửa hàng loạt, rollback có kiểm tra xung đột và theo dõi lỗi production.</p>
                    </div>
                </div>
                <button type="button" onClick={() => void load()} disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Quét lại
                </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {cards.map(({ label, value, icon: Icon, tone }) => (
                    <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <Icon className={`mb-2 h-4 w-4 ${tone}`} />
                        <p className="text-2xl font-black text-slate-800">{value}</p>
                        <p className="text-xs text-slate-500">{label}</p>
                    </div>
                ))}
            </div>

            <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="font-bold text-slate-800">Câu hỏi cần chuẩn hóa</h3>
                        <p className="text-xs text-slate-500">Chỉ câu không còn lỗi sau chuẩn hóa mới được chọn tự động.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={toggleAll} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                            {allFixableSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả tự sửa'}
                        </button>
                        <button type="button" onClick={applySelected} disabled={selected.size === 0 || isApplying} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                            {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Chuẩn hóa {selected.size || ''}
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-14"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>
                ) : issues.length === 0 ? (
                    <div className="py-14 text-center text-sm text-emerald-700"><CheckCircle2 className="mr-2 inline h-5 w-5" />Không còn câu hỏi legacy hoặc LaTeX cần sửa.</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {issues.map((issue) => {
                            const fixable = issue.remainingIssues.length === 0;
                            return (
                                <article key={issue.questionId} className="p-4">
                                    <div className="mb-3 flex items-start gap-3">
                                        <input type="checkbox" checked={selected.has(issue.questionId)} disabled={!fixable} onChange={() => setSelected((current) => {
                                            const next = new Set(current);
                                            if (next.has(issue.questionId)) next.delete(issue.questionId); else next.add(issue.questionId);
                                            return next;
                                        })} className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600" />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold text-slate-800">{issue.quizTitle || issue.quizId}</span>
                                                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{issue.questionType}</span>
                                                <span className="text-[10px] text-slate-400">v{issue.currentVersion} → v{issue.targetVersion}</span>
                                                {!fixable && <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">Cần sửa tay</span>}
                                            </div>
                                            <p className="mt-1 break-all text-[11px] text-slate-400">{issue.questionId}</p>
                                            <p className="mt-1 text-xs text-slate-500">Trường thay đổi: {issue.changedFields.join(', ') || 'chỉ nâng phiên bản'}</p>
                                        </div>
                                    </div>
                                    <div className="grid gap-3 lg:grid-cols-2"><Preview title="Trước" content={issue.previewBefore} tone="before" /><Preview title="Sau" content={issue.previewAfter} tone="after" /></div>
                                    {issue.currentIssues.length > 0 && <div className="mt-2 space-y-1 text-xs text-red-600">{issue.currentIssues.map((item, index) => <p key={`${item.field}-${item.code}-${index}`}>• {item.field}: {item.message}</p>)}</div>}
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
                <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2"><History className="h-4 w-4 text-indigo-600" /><h3 className="font-bold text-slate-800">Lịch sử batch</h3></div>
                    <div className="space-y-2">
                        {batches.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Chưa có batch sửa dữ liệu.</p>}
                        {batches.map((batch) => {
                            const remaining = Number(batch.total) - Number(batch.rolled_back);
                            return <div key={batch.batch_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                                <div className="min-w-0"><p className="truncate text-xs font-bold text-slate-700">{batch.batch_id}</p><p className="text-[11px] text-slate-400">{new Date(batch.created_at).toLocaleString('vi-VN')} · {batch.repaired_by}</p><p className="text-[11px] text-slate-500">{batch.total} câu · đã rollback {batch.rolled_back}</p></div>
                                <button type="button" onClick={() => rollback(batch)} disabled={remaining <= 0 || rollingBack === batch.batch_id} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40">
                                    {rollingBack === batch.batch_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Hoàn tác
                                </button>
                            </div>;
                        })}
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-amber-600" /><h3 className="font-bold text-slate-800">Lỗi MathJax production</h3></div><span className="text-xs text-slate-400">{telemetrySummary.occurrences} lượt / {telemetrySummary.days} ngày</span></div>
                    <div className="max-h-[430px] space-y-2 overflow-y-auto">
                        {telemetry.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Chưa ghi nhận lỗi MathJax.</p>}
                        {telemetry.map((event) => <div key={event.fingerprint} className="rounded-xl border border-slate-100 p-3">
                            <div className="flex items-center justify-between gap-2"><span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-600">{event.error_code}</span><span className="text-xs font-bold text-slate-700">×{event.count}</span></div>
                            <p className="mt-1 text-xs text-slate-600">{event.question_type || 'UNKNOWN'} · quiz {event.quiz_id || '—'} · câu {event.question_id || '—'}</p>
                            <p className="break-all text-[10px] text-slate-400">{event.route || '/'} · v{event.math_format_version}</p>
                            <p className="mt-1 text-[10px] text-slate-400">Gần nhất: {new Date(event.last_seen_at).toLocaleString('vi-VN')}</p>
                        </div>)}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default MathAuditPage;