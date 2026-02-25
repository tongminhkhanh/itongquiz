/**
 * ShopModal Component
 *
 * Cute & Cartoon style modal displaying available shop items for purchase.
 * Features: 3D buy buttons, cartoon item cards, confetti on purchase.
 */

import React, { useState } from 'react';
import { X, ShoppingBag, Check, Loader2 } from 'lucide-react';
import { useGamificationStore } from '../../stores/useGamificationStore';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { ShopItem, ItemSlot } from '../../types/gamification.types';

// Accessory emojis
const ITEM_EMOJI: Record<string, string> = {
    hat_01: '🎩', glass_01: '🕶️', bow_01: '🎀', crown_01: '👑',
    scarf_01: '🧣', wing_01: '🪽', tie_01: '👔', hat_02: '🤠',
    glass_02: '💖', mask_01: '🦸',
};

// Slot labels
const SLOT_LABELS: Record<ItemSlot, string> = {
    HEAD: '🎩 Đầu',
    FACE: '👓 Mặt',
    BODY: '👕 Thân',
};

interface ShopModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose }) => {
    const { shopItems, coins, pet, buyItem, isLoading, error, clearError } = useGamificationStore();
    const { studentSession } = useClassroomStore();
    const [purchasedItemId, setPurchasedItemId] = useState<string | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);

    if (!isOpen) return null;

    const ownedItems = pet?.items || [];
    const username = studentSession?.username || '';

    const handleBuy = async (item: ShopItem) => {
        if (coins < item.price || ownedItems.includes(item.itemId)) return;
        clearError();

        const success = await buyItem(username, item.itemId);
        if (success) {
            setPurchasedItemId(item.itemId);
            setShowConfetti(true);
            setTimeout(() => {
                setShowConfetti(false);
                setPurchasedItemId(null);
            }, 2000);
        }
    };

    // Group items by slot
    const groupedItems = shopItems.reduce<Record<string, ShopItem[]>>((acc, item) => {
        const slot = item.type || 'OTHER';
        if (!acc[slot]) acc[slot] = [];
        acc[slot].push(item);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose} style={{ fontFamily: "'Quicksand', sans-serif" }}>
            {/* Backdrop */}
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />

            {/* Modal */}
            <div
                className="relative w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#FFFFFF',
                    borderRadius: '24px',
                    border: '3px solid #E5E5E5',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                    animation: 'modalSlideUp 0.3s ease-out',
                }}
            >
                {/* Header (Fun gradient) */}
                <div
                    className="flex items-center justify-between p-5"
                    style={{ background: 'linear-gradient(135deg, #F0F9FF, #FFF5CC)', borderBottom: '3px solid #E5E5E5' }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md"
                            style={{ background: '#1CB0F6', borderBottom: '3px solid #1899D6' }}
                        >
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-extrabold" style={{ color: '#4B4B4B' }}>Cửa Hàng</h2>
                            <p className="text-sm font-bold" style={{ color: '#AFAFAF' }}>Mua đồ cho Pet nào! 🛍️</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Coin counter */}
                        <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-extrabold text-sm"
                            style={{ background: '#FFF5CC', border: '2px solid #FFD900', color: '#B8860B' }}
                        >
                            <span>💰</span>
                            <span>{coins}</span>
                        </div>
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:scale-110 active:scale-95"
                            style={{ background: '#F7F7F7', border: '2px solid #E5E5E5', color: '#AFAFAF' }}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div
                        className="mx-5 mt-3 p-3 rounded-xl text-sm font-bold"
                        style={{ background: '#FFF0F0', border: '2px solid #FF4B4B', color: '#FF4B4B' }}
                    >
                        {error}
                    </div>
                )}

                {/* Items Grid */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {Object.entries(groupedItems).map(([slot, items]) => (
                        <div key={slot}>
                            <h3 className="text-sm font-extrabold uppercase tracking-wider mb-3" style={{ color: '#AFAFAF' }}>
                                {SLOT_LABELS[slot as ItemSlot] || slot}
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {items.map((item) => {
                                    const owned = ownedItems.includes(item.itemId);
                                    const canAfford = coins >= item.price;
                                    const justPurchased = purchasedItemId === item.itemId;

                                    return (
                                        <div
                                            key={item.itemId}
                                            className="relative p-4 transition-all"
                                            style={{
                                                borderRadius: '20px',
                                                border: owned
                                                    ? '3px solid #58CC02'
                                                    : canAfford
                                                        ? '3px solid #E5E5E5'
                                                        : '3px solid #F0F0F0',
                                                background: owned
                                                    ? '#F0FDF4'
                                                    : canAfford
                                                        ? '#FFFFFF'
                                                        : '#FAFAFA',
                                                opacity: canAfford || owned ? 1 : 0.6,
                                                animation: justPurchased ? 'purchaseFlash 0.5s ease-out' : undefined,
                                            }}
                                        >
                                            {/* Item emoji (large, centered) */}
                                            <div
                                                className="w-full aspect-square rounded-xl flex items-center justify-center mb-3 text-5xl"
                                                style={{ background: owned ? '#E6FFED' : '#F7F7F7' }}
                                            >
                                                {ITEM_EMOJI[item.itemId] || '🎁'}
                                            </div>

                                            {/* Item name */}
                                            <p className="font-extrabold text-sm text-center truncate" style={{ color: '#4B4B4B' }}>
                                                {item.name}
                                            </p>

                                            {/* Price / Status */}
                                            {owned ? (
                                                <div className="mt-2 flex items-center justify-center gap-1 text-sm font-extrabold" style={{ color: '#58CC02' }}>
                                                    <Check className="w-4 h-4" />
                                                    <span>Đã có</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleBuy(item)}
                                                    disabled={!canAfford || isLoading}
                                                    className="mt-2 w-full py-2.5 rounded-xl text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 active:translate-y-0.5"
                                                    style={{
                                                        background: canAfford ? '#58CC02' : '#E5E5E5',
                                                        borderBottom: canAfford ? '3px solid #58A700' : '3px solid #D0D0D0',
                                                        color: canAfford ? '#FFFFFF' : '#AFAFAF',
                                                        cursor: canAfford ? 'pointer' : 'not-allowed',
                                                    }}
                                                >
                                                    {isLoading ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <span>💰</span>
                                                            <span>{item.price}</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {shopItems.length === 0 && (
                        <div className="text-center py-10" style={{ color: '#AFAFAF' }}>
                            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-bold">Cửa hàng đang cập nhật...</p>
                        </div>
                    )}
                </div>

                {/* Confetti Overlay */}
                {showConfetti && (
                    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                        {[...Array(20)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute w-3 h-3 rounded-full"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: '-10px',
                                    backgroundColor: ['#FF4B4B', '#58CC02', '#1CB0F6', '#FFD900', '#FF9600'][i % 5],
                                    animation: `confettiFall ${1 + Math.random() * 1}s ease-out forwards`,
                                    animationDelay: `${Math.random() * 0.3}s`,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes modalSlideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes purchaseFlash {
                    0% { background-color: #FFF5CC; transform: scale(1.05); }
                    100% { background-color: #F0FDF4; transform: scale(1); }
                }
                @keyframes confettiFall {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default ShopModal;
