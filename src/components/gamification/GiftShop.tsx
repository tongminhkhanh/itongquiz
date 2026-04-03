import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ClipboardCopy, Gift, Loader2, Receipt, Sparkles } from 'lucide-react';
import { useQuizStore } from '../../../stores/quizStore';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useGamificationStore } from '../../stores/useGamificationStore';
import { useGiftShopStore } from '../../stores/useGiftShopStore';
import { giftShopService } from '../../services/giftShop.service';
import type { GiftCatalogItem, GiftCategory } from '../../types/giftShop.types';

const CATEGORY_META: Record<GiftCategory, { label: string; gradient: string }> = {
    SNACK: { label: 'Khu Ăn Vặt', gradient: 'from-rose-400 to-orange-400' },
    SUPPLY: { label: 'Văn Phòng Phẩm', gradient: 'from-blue-500 to-indigo-500' },
    PRIVILEGE: { label: 'Đặc Quyền Lớp', gradient: 'from-emerald-500 to-teal-500' },
};

const randomKey = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const GiftShop: React.FC = () => {
    const quizStore = useQuizStore();
    const { studentSession } = useClassroomStore();
    const coins = useGamificationStore((s) => s.coins);
    const {
        catalog,
        myOrders,
        isLoading,
        error,
        lastPurchase,
        loadCatalog,
        loadStudentOrders,
        purchaseGift,
        clearError,
        clearLastPurchase,
    } = useGiftShopStore();

    const [activeCategory, setActiveCategory] = useState<GiftCategory>('SNACK');
    const [selectedItem, setSelectedItem] = useState<GiftCatalogItem | null>(null);
    const [purchaseKey, setPurchaseKey] = useState<string | null>(null);
    const [copiedVoucher, setCopiedVoucher] = useState(false);

    useEffect(() => {
        if (!studentSession) return;
        loadCatalog();
        loadStudentOrders(studentSession.studentId);
    }, [studentSession?.studentId]);

    const categoryItems = useMemo(
        () => catalog.filter((item) => item.category === activeCategory && item.isActive),
        [catalog, activeCategory]
    );

    const closePurchaseModal = () => {
        setSelectedItem(null);
        setPurchaseKey(null);
    };

    const handleConfirmPurchase = async () => {
        if (!selectedItem || !studentSession) return;
        const idempotencyKey = purchaseKey || randomKey();
        setPurchaseKey(idempotencyKey);

        const result = await purchaseGift({
            studentId: studentSession.studentId,
            studentName: studentSession.fullName,
            studentUsername: studentSession.username,
            classId: studentSession.classId,
            className: studentSession.className,
            itemId: selectedItem.id,
            currentCoins: coins,
            idempotencyKey,
        });

        if (result) {
            closePurchaseModal();
        }
    };

    const handleCopyVoucher = async () => {
        if (!lastPurchase?.voucherCode) return;
        try {
            await navigator.clipboard.writeText(lastPurchase.voucherCode);
            setCopiedVoucher(true);
            setTimeout(() => setCopiedVoucher(false), 1200);
        } catch {
            // Ignore clipboard errors and keep UI responsive.
        }
    };

    if (!studentSession) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                    <p className="text-slate-700 font-semibold mb-4">Không tìm thấy phiên đăng nhập học sinh.</p>
                    <button
                        onClick={() => quizStore.setView('home')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold"
                    >
                        Về trang chủ
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f7fafc] text-slate-800">
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                    <button
                        onClick={() => quizStore.setView('home')}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100"
                    >
                        <ArrowLeft className="w-4 h-4" /> Quay lại
                    </button>
                    <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-indigo-600" />
                        <h1 className="text-lg md:text-xl font-black">Tiệm Tạp Hóa Ít Ong</h1>
                    </div>
                    <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-extrabold text-amber-700">{coins} Xu</span>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 md:p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Danh mục quà</p>
                            <h2 className="text-xl md:text-2xl font-black">Đổi quà bằng xu</h2>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold">
                            Mode: {giftShopService.getMode().toUpperCase()}
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                        {(Object.keys(CATEGORY_META) as GiftCategory[]).map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-black border transition-colors ${
                                    activeCategory === cat
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {CATEGORY_META[cat].label}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-semibold flex items-center justify-between">
                            <span>{error}</span>
                            <button className="underline" onClick={clearError}>Đóng</button>
                        </div>
                    )}

                    {categoryItems.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 font-semibold">
                            Chưa có quà trong danh mục này.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {categoryItems.map((item) => {
                                const canBuy = coins >= item.priceCoins;
                                return (
                                    <article key={item.id} className="rounded-2xl border border-slate-200 p-4 bg-white">
                                        <div className={`h-32 rounded-xl bg-gradient-to-br ${CATEGORY_META[item.category].gradient} p-3 flex items-center justify-center`}>
                                            <img src={item.imageUrl} alt={item.name} className="max-h-full max-w-full object-contain drop-shadow-lg" />
                                        </div>
                                        <h3 className="mt-3 font-extrabold text-slate-800 line-clamp-2 min-h-[44px]">{item.name}</h3>
                                        <p className="text-sm font-bold text-amber-600 mt-1">{item.priceCoins} Xu</p>
                                        <button
                                            onClick={() => setSelectedItem(item)}
                                            disabled={!canBuy || isLoading}
                                            className={`mt-3 w-full py-2.5 rounded-xl text-sm font-black transition-colors ${
                                                canBuy ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            }`}
                                        >
                                            {!canBuy ? 'Không đủ xu' : 'Đổi quà'}
                                        </button>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

                <aside className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 md:p-5 h-fit">
                    <div className="flex items-center gap-2 mb-4">
                        <Receipt className="w-4 h-4 text-slate-600" />
                        <h3 className="font-black text-slate-800">Lịch sử đổi quà</h3>
                    </div>
                    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                        {myOrders.length === 0 ? (
                            <p className="text-sm text-slate-500">Em chưa đổi quà nào.</p>
                        ) : (
                            myOrders.map((order) => (
                                <div key={order.id} className="rounded-xl border border-slate-200 p-3">
                                    <p className="font-bold text-sm text-slate-800 line-clamp-2">{order.itemSnapshot.name}</p>
                                    <p className="text-xs text-slate-500 mt-1">Voucher: <span className="font-mono">{order.voucherCode}</span></p>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs font-bold text-amber-700">{order.priceCoins} Xu</span>
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
                                </div>
                            ))
                        )}
                    </div>
                </aside>
            </main>

            {selectedItem && (
                <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl">
                        <h3 className="text-lg font-black text-slate-800 mb-2">Xác nhận đổi quà</h3>
                        <p className="text-sm text-slate-600">
                            Em có chắc muốn đổi <span className="font-bold">{selectedItem.name}</span> với giá <span className="font-bold text-amber-600">{selectedItem.priceCoins} Xu</span>?
                        </p>
                        <div className="mt-5 flex items-center justify-end gap-2">
                            <button
                                onClick={closePurchaseModal}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleConfirmPurchase}
                                disabled={isLoading}
                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-60"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Xác nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {lastPurchase && (
                <div className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl">
                        <h3 className="text-xl font-black text-slate-800 mb-2">Đổi quà thành công</h3>
                        <p className="text-sm text-slate-600 mb-4">Giữ mã voucher này và đưa cho giáo viên để nhận quà.</p>
                        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 flex items-center justify-between gap-2">
                            <code className="font-mono text-indigo-700 font-bold">{lastPurchase.voucherCode}</code>
                            <button
                                onClick={handleCopyVoucher}
                                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                            >
                                <ClipboardCopy className="w-3.5 h-3.5" /> {copiedVoucher ? 'Đã copy' : 'Copy'}
                            </button>
                        </div>
                        <div className="mt-5 flex justify-end">
                            <button
                                onClick={clearLastPurchase}
                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GiftShop;
