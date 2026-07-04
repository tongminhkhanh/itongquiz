import React, { useState, Suspense } from 'react';
import { Award, Plus, RefreshCw, AlertCircle, Inbox, CheckCircle2, Clock, Send, XCircle } from 'lucide-react';
import { useBatches } from './useBatches';
import type { BatchRecord } from './useBatches';

const BatchCreateModal = React.lazy(() => import('./BatchCreateModal'));

function statusBadge(status: BatchRecord['status']) {
    switch (status) {
        case 'sent': return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} />Đã gửi</span>;
        case 'sending': return <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"><Send size={11} />Đang gửi</span>;
        case 'error': return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><XCircle size={11} />Lỗi</span>;
        default: return <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full"><Clock size={11} />Nháp</span>;
    }
}

const TeacherCertificatesPage: React.FC = () => {
    const { batches, isLoading, error, refetch, createBatch } = useBatches();
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow">
                        <Award size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Cấp phát Chứng nhận</h2>
                        <p className="text-xs text-slate-500">Tạo và gửi chứng nhận cho học sinh</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={refetch}
                        disabled={isLoading}
                        className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-50"
                        title="Làm mới"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                    >
                        <Plus size={15} /> Cấp mới
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Không thể tải dữ liệu</p>
                        <p className="text-xs text-red-500 mt-0.5">{error}</p>
                        <button onClick={refetch} className="mt-2 text-xs text-red-600 underline">Thử lại</button>
                    </div>
                </div>
            )}

            {/* Skeleton loading */}
            {isLoading && (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
                            <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                    <div className="h-4 bg-slate-200 rounded w-48" />
                                    <div className="h-3 bg-slate-100 rounded w-32" />
                                </div>
                                <div className="h-6 bg-slate-100 rounded-full w-20" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty */}
            {!isLoading && !error && batches.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                        <Inbox size={36} className="text-amber-300" />
                    </div>
                    <h3 className="text-base font-bold text-slate-700 mb-1">Chưa có đợt cấp phát nào</h3>
                    <p className="text-sm text-slate-400 max-w-xs mb-5">Nhấn "Cấp mới" để tạo đợt cấp chứng nhận đầu tiên cho học sinh.</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                        <Plus size={15} /> Cấp chứng nhận ngay
                    </button>
                </div>
            )}

            {/* Batch list */}
            {!isLoading && batches.length > 0 && (
                <div className="space-y-3">
                    {batches.map((b) => (
                        <div key={b.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-slate-800 text-sm truncate">{b.title}</h3>
                                        {statusBadge(b.status)}
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Mẫu: <span className="font-medium">{b.template_name ?? '—'}</span>
                                        {' · '}
                                        {b.done_certs}/{b.total_certs} chứng nhận xong
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {new Date(b.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                {/* Progress bar */}
                                {b.total_certs > 0 && (
                                    <div className="shrink-0 w-20">
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-400 rounded-full transition-all"
                                                style={{ width: `${Math.round((b.done_certs / b.total_certs) * 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 text-right mt-0.5">
                                            {Math.round((b.done_certs / b.total_certs) * 100)}%
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <Suspense fallback={null}>
                    <BatchCreateModal
                        onClose={() => setShowModal(false)}
                        onCreated={() => { setShowModal(false); refetch(); }}
                        createBatch={createBatch}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default TeacherCertificatesPage;
