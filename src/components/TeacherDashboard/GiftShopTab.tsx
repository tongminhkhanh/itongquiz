import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Pencil, PlusCircle, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useGiftShopStore } from '../../stores/useGiftShopStore';
import { giftShopService } from '../../services/giftShop.service';
import type { GiftCatalogItem, GiftCategory, GiftOrderStatus } from '../../types/giftShop.types';

const CATEGORY_OPTIONS: Array<{ value: GiftCategory; label: string }> = [
    { value: 'SNACK', label: 'Khu Ăn Vặt' },
    { value: 'SUPPLY', label: 'Văn Phòng Phẩm' },
    { value: 'PRIVILEGE', label: 'Đặc Quyền Lớp' },
];

const STATUS_OPTIONS: Array<{ value: GiftOrderStatus | 'ALL'; label: string }> = [
    { value: 'VOUCHER_ISSUED', label: 'Chờ trao quà' },
    { value: 'DELIVERED', label: 'Đã trao' },
    { value: 'CANCELLED_REFUNDED', label: 'Đã hủy/hoàn xu' },
    { value: 'ALL', label: 'Tất cả' },
];

const CATEGORY_LABEL_MAP: Record<GiftCategory, string> = {
    SNACK: 'Khu Ăn Vặt',
    SUPPLY: 'Văn Phòng Phẩm',
    PRIVILEGE: 'Đặc Quyền Lớp',
};

const GiftShopTab: React.FC = () => {
    const authStore = useAuthStore();
    const {
        catalog,
        managedOrders,
        eventLogs,
        isLoading,
        error,
        loadCatalog,
        loadManagedOrders,
        loadEventLogs,
        deliverOrder,
        cancelOrder,
        saveCatalogItem,
        removeCatalogItem,
        clearError,
    } = useGiftShopStore();

    const [statusFilter, setStatusFilter] = useState<GiftOrderStatus | 'ALL'>('VOUCHER_ISSUED');
    const [classFilter, setClassFilter] = useState('');
    const [form, setForm] = useState({
        name: '',
        category: 'SNACK' as GiftCategory,
        priceCoins: '',
        imageUrl: '',
    });
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const giftShopMode = giftShopService.getMode();

    const actor = useMemo(
        () => ({
            username: authStore.username || 'teacher',
            isAdmin: authStore.isAdmin,
            teacherClass: authStore.teacherClass,
        }),
        [authStore.username, authStore.isAdmin, authStore.teacherClass]
    );

    const query = useMemo(() => {
        const forcedClassId = authStore.isAdmin ? classFilter.trim() : (authStore.teacherClass || '').trim();
        return {
            status: statusFilter,
            classId: forcedClassId || undefined,
            actorUsername: actor.username,
            actorIsAdmin: actor.isAdmin,
            actorTeacherClass: actor.teacherClass || undefined,
        };
    }, [statusFilter, classFilter, authStore.isAdmin, authStore.teacherClass, actor.username, actor.isAdmin, actor.teacherClass]);

    const refreshAll = async () => {
        await Promise.all([
            loadCatalog(),
            loadManagedOrders(query),
            authStore.isAdmin ? loadEventLogs() : Promise.resolve(),
        ]);
    };

    useEffect(() => {
        refreshAll();
    }, [query.status, query.classId, authStore.isAdmin]);

    const handleDeliver = async (orderId: string) => {
        await deliverOrder(orderId, actor, query);
    };

    const handleCancel = async (orderId: string) => {
        const reason = window.prompt('Nhập lý do hủy đơn (sẽ hoàn 100% xu):', 'Hủy thủ công bởi giáo viên');
        if (!reason) return;
        await cancelOrder(orderId, actor, reason, query);
    };

    const resetAdminForm = () => {
        setForm({ name: '', category: 'SNACK', priceCoins: '', imageUrl: '' });
        setEditingItemId(null);
    };

    const handleStartEditItem = (item: GiftCatalogItem) => {
        setEditingItemId(item.id);
        setForm({
            name: item.name,
            category: item.category,
            priceCoins: String(item.priceCoins),
            imageUrl: item.imageUrl,
        });
    };

    const handleCreateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        const price = Number(form.priceCoins);
        if (!form.name.trim() || !form.imageUrl.trim() || !Number.isFinite(price) || price <= 0) {
            alert('Vui lòng nhập đầy đủ tên, giá hợp lệ và link ảnh.');
            return;
        }
        const created = await saveCatalogItem({
            id: editingItemId || undefined,
            name: form.name.trim(),
            category: form.category,
            priceCoins: Math.floor(price),
            imageUrl: form.imageUrl.trim(),
            isActive: true,
            actorIsAdmin: actor.isAdmin,
        });
        if (created) {
            resetAdminForm();
        }
    };

    const handleDeleteItem = async (item: GiftCatalogItem) => {
        const ok = window.confirm(`Xóa vật phẩm "${item.name}" khỏi danh mục?`);
        if (!ok) return;

        const removed = await removeCatalogItem({
            id: item.id,
            actorIsAdmin: actor.isAdmin,
            actorUsername: actor.username,
        });

        if (removed && editingItemId === item.id) {
            resetAdminForm();
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <p className="text-xs font-black uppercase tracking-wider text-indigo-500">Tiệm Tạp Hóa</p>
                    <h2 className="text-2xl font-black text-slate-800">Duyệt đơn & quản kho quà</h2>
                </div>
                <button
                    onClick={refreshAll}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Làm mới
                </button>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-semibold flex items-center justify-between">
                    <span>{error}</span>
                    <button className="underline" onClick={clearError}>Đóng</button>
                </div>
            )}

            {authStore.isAdmin && (
                <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5">
                    <h3 className="text-lg font-black text-slate-800 mb-3">Quản kho (Admin)</h3>
                    <form onSubmit={handleCreateItem} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                            placeholder="Tên quà"
                        />
                        <select
                            value={form.category}
                            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as GiftCategory }))}
                            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                        >
                            {CATEGORY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <input
                            value={form.priceCoins}
                            onChange={(e) => setForm((prev) => ({ ...prev, priceCoins: e.target.value }))}
                            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                            placeholder="Giá xu"
                            type="number"
                            min={1}
                        />
                        <input
                            value={form.imageUrl}
                            onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 md:col-span-3"
                            placeholder="Link ảnh (Cloudinary/CDN)"
                        />
                        <div className="flex items-center gap-2">
                            <button
                                type="submit"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700"
                            >
                                <PlusCircle className="w-4 h-4" /> {editingItemId ? 'Cập nhật quà' : 'Thêm quà'}
                            </button>
                            {editingItemId && (
                                <button
                                    type="button"
                                    onClick={resetAdminForm}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                                >
                                    Hủy sửa
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="mt-4 space-y-2">
                        {catalog.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                                <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-contain bg-slate-50 p-1" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 truncate">{item.name}</p>
                                    <p className="text-xs text-slate-500">{CATEGORY_LABEL_MAP[item.category]} • {item.priceCoins} Xu</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleStartEditItem(item)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                        <Pencil className="w-4 h-4" /> Sửa
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteItem(item)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-sm font-bold text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" /> Xóa
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                    <h3 className="text-lg font-black text-slate-800">Duyệt đơn quà</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as GiftOrderStatus | 'ALL')}
                            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold"
                        >
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        {authStore.isAdmin && (
                            <input
                                value={classFilter}
                                onChange={(e) => setClassFilter(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                                placeholder="Lọc classId (vd: class_3a)"
                            />
                        )}
                    </div>
                </div>

                {managedOrders.length === 0 ? (
                    <p className="text-sm text-slate-500">Không có đơn phù hợp bộ lọc hiện tại.</p>
                ) : (
                    <div className="space-y-3">
                        {managedOrders.map((order) => (
                            <div key={order.id} className="rounded-xl border border-slate-200 p-3 md:p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-bold text-slate-800">{order.studentName} • {order.className || order.classId}</p>
                                        <p className="text-sm text-slate-600">{order.itemSnapshot.name} • {order.priceCoins} Xu</p>
                                        <p className="text-xs text-slate-500 mt-1">Voucher: <span className="font-mono">{order.voucherCode}</span></p>
                                    </div>
                                    <span className={`text-[10px] px-2 py-1 rounded-full font-black ${
                                        order.status === 'VOUCHER_ISSUED'
                                            ? 'bg-blue-50 text-blue-700'
                                            : order.status === 'DELIVERED'
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-red-50 text-red-700'
                                    }`}>
                                        {order.status}
                                    </span>
                                </div>

                                {order.status === 'VOUCHER_ISSUED' && (
                                    <div className="mt-3 flex items-center gap-2">
                                        <button
                                            onClick={() => handleDeliver(order.id)}
                                            disabled={isLoading}
                                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60"
                                        >
                                            <CheckCircle2 className="w-4 h-4" /> Đã trao quà
                                        </button>
                                        <button
                                            onClick={() => handleCancel(order.id)}
                                            disabled={isLoading}
                                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 disabled:opacity-60"
                                        >
                                            <XCircle className="w-4 h-4" /> Hủy & hoàn xu
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {authStore.isAdmin && (
                <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5">
                    <h3 className="text-lg font-black text-slate-800 mb-3">Audit log ({giftShopMode})</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {eventLogs.length === 0 ? (
                            <p className="text-sm text-slate-500">Chưa có sự kiện.</p>
                        ) : (
                            eventLogs.map((event) => (
                                <div key={event.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                    <p className="text-xs font-bold text-slate-700">{event.type}</p>
                                    <p className="text-[11px] text-slate-500">{new Date(event.createdAt).toLocaleString('vi-VN')}</p>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            )}

            {isLoading && (
                <div className="fixed right-6 bottom-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white shadow-lg text-sm font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...
                </div>
            )}
        </div>
    );
};

export default GiftShopTab;
