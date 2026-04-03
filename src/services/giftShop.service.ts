import { callApi } from './apiAdapter';
import { StorageKeys } from '../constants/storageKeys';
import type {
    GiftCatalogItem,
    GiftOrder,
    GiftOrderActor,
    GiftOrderQuery,
    GiftPurchasePayload,
    GiftPurchaseResponse,
    GiftShopEventLog,
    GiftVoucher,
    WalletLedgerEntry,
} from '../types/giftShop.types';

type GiftShopMode = 'mock' | 'api';

interface GiftShopMockState {
    catalog: GiftCatalogItem[];
    orders: GiftOrder[];
    vouchers: GiftVoucher[];
    ledger: WalletLedgerEntry[];
    walletByStudentId: Record<string, number>;
    idempotencyOrderMap: Record<string, string>;
    events: GiftShopEventLog[];
}

export interface GiftCatalogUpsertInput {
    id?: string;
    name: string;
    category: GiftCatalogItem['category'];
    priceCoins: number;
    imageUrl: string;
    isActive?: boolean;
    actorIsAdmin?: boolean;
}

export interface GiftCancelResult {
    order: GiftOrder;
    newCoins: number;
}

const DEFAULT_MODE: GiftShopMode = 'mock';
const MOCK_STORAGE_KEY = StorageKeys.GIFT_SHOP_MOCK_STATE;
const EVENT_LIMIT = 500;
const LEDGER_LIMIT = 1000;

const getMode = (): GiftShopMode => {
    const mode = String(import.meta.env.VITE_GIFT_SHOP_MODE || DEFAULT_MODE).toLowerCase();
    return mode === 'api' ? 'api' : 'mock';
};

const nowIso = () => new Date().toISOString();

const randomId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const defaultCatalog = (): GiftCatalogItem[] => {
    const now = nowIso();
    return [
        {
            id: 'gift_snack_01',
            name: 'Sữa chua',
            category: 'SNACK',
            priceCoins: 120,
            imageUrl: 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Cup%20with%20straw/3D/cup_with_straw_3d.png',
            isActive: true,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: 'gift_supply_01',
            name: 'Bút chì HB',
            category: 'SUPPLY',
            priceCoins: 180,
            imageUrl: 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Pencil/3D/pencil_3d.png',
            isActive: true,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: 'gift_privilege_01',
            name: 'Đổi chỗ ngồi 1 buổi',
            category: 'PRIVILEGE',
            priceCoins: 400,
            imageUrl: 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Crown/3D/crown_3d.png',
            isActive: true,
            createdAt: now,
            updatedAt: now,
        },
    ];
};

const getDefaultState = (): GiftShopMockState => ({
    catalog: defaultCatalog(),
    orders: [],
    vouchers: [],
    ledger: [],
    walletByStudentId: {},
    idempotencyOrderMap: {},
    events: [],
});

const readMockState = (): GiftShopMockState => {
    try {
        const raw = localStorage.getItem(MOCK_STORAGE_KEY);
        if (!raw) return getDefaultState();
        const parsed = JSON.parse(raw) as Partial<GiftShopMockState>;
        return {
            ...getDefaultState(),
            ...parsed,
            catalog: Array.isArray(parsed.catalog) && parsed.catalog.length > 0 ? parsed.catalog : defaultCatalog(),
            orders: Array.isArray(parsed.orders) ? parsed.orders : [],
            vouchers: Array.isArray(parsed.vouchers) ? parsed.vouchers : [],
            ledger: Array.isArray(parsed.ledger) ? parsed.ledger : [],
            events: Array.isArray(parsed.events) ? parsed.events : [],
            walletByStudentId: parsed.walletByStudentId || {},
            idempotencyOrderMap: parsed.idempotencyOrderMap || {},
        };
    } catch {
        return getDefaultState();
    }
};

const saveMockState = (state: GiftShopMockState) => {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(state));
};

const pushEvent = (state: GiftShopMockState, event: Omit<GiftShopEventLog, 'id' | 'createdAt'>) => {
    state.events.unshift({
        id: randomId('ev'),
        createdAt: nowIso(),
        ...event,
    });
    if (state.events.length > EVENT_LIMIT) {
        state.events = state.events.slice(0, EVENT_LIMIT);
    }
};

const pushLedger = (state: GiftShopMockState, entry: Omit<WalletLedgerEntry, 'id' | 'createdAt'>) => {
    state.ledger.unshift({
        id: randomId('ledger'),
        createdAt: nowIso(),
        ...entry,
    });
    if (state.ledger.length > LEDGER_LIMIT) {
        state.ledger = state.ledger.slice(0, LEDGER_LIMIT);
    }
};

const ensureWallet = (state: GiftShopMockState, studentId: string, currentCoins: number) => {
    const existing = state.walletByStudentId[studentId];
    if (typeof existing === 'number') return existing;
    state.walletByStudentId[studentId] = Math.max(0, Number(currentCoins) || 0);
    return state.walletByStudentId[studentId];
};

const assertCanManageOrder = (order: GiftOrder, actor: GiftOrderActor) => {
    if (actor.isAdmin) return;
    const teacherClass = (actor.teacherClass || '').trim();
    if (!teacherClass || teacherClass !== order.classId) {
        throw new Error('Bạn không có quyền xử lý đơn của lớp này.');
    }
};

const applyOrderFilters = (orders: GiftOrder[], query: GiftOrderQuery): GiftOrder[] => {
    return orders.filter((order) => {
        if (query.studentId && order.studentId !== query.studentId) return false;
        if (query.classId && order.classId !== query.classId) return false;
        if (query.status && query.status !== 'ALL' && order.status !== query.status) return false;
        return true;
    });
};

const getOrderById = (state: GiftShopMockState, orderId: string) => {
    const order = state.orders.find((x) => x.id === orderId);
    if (!order) throw new Error('Không tìm thấy đơn hàng.');
    return order;
};

const getVoucherByOrderId = (state: GiftShopMockState, orderId: string) => {
    return state.vouchers.find((x) => x.orderId === orderId);
};

const toApiCatalogPayload = (input: GiftCatalogUpsertInput) => ({
    id: input.id,
    name: input.name.trim(),
    category: input.category,
    priceCoins: Math.max(0, Math.floor(Number(input.priceCoins) || 0)),
    imageUrl: input.imageUrl.trim(),
    isActive: input.isActive ?? true,
    actorIsAdmin: Boolean(input.actorIsAdmin),
});

const getCatalogMock = async (): Promise<GiftCatalogItem[]> => {
    const state = readMockState();
    return state.catalog
        .filter((item) => item.isActive)
        .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
};

const upsertCatalogItemMock = async (input: GiftCatalogUpsertInput): Promise<GiftCatalogItem> => {
    const normalized = toApiCatalogPayload(input);
    if (!normalized.name) throw new Error('Tên quà không được để trống.');
    if (!normalized.imageUrl) throw new Error('Link ảnh không được để trống.');
    if (!Number.isFinite(normalized.priceCoins) || normalized.priceCoins <= 0) {
        throw new Error('Giá xu phải lớn hơn 0.');
    }

    const state = readMockState();
    const now = nowIso();

    if (normalized.id) {
        const idx = state.catalog.findIndex((x) => x.id === normalized.id);
        if (idx < 0) throw new Error('Không tìm thấy quà để cập nhật.');
        const updated: GiftCatalogItem = {
            ...state.catalog[idx],
            name: normalized.name,
            category: normalized.category,
            priceCoins: normalized.priceCoins,
            imageUrl: normalized.imageUrl,
            isActive: normalized.isActive ?? true,
            updatedAt: now,
        };
        state.catalog[idx] = updated;
        pushEvent(state, {
            type: 'CATALOG_UPDATED',
            metadata: { itemId: updated.id, priceCoins: updated.priceCoins },
        });
        saveMockState(state);
        return updated;
    }

    const created: GiftCatalogItem = {
        id: randomId('gift'),
        name: normalized.name,
        category: normalized.category,
        priceCoins: normalized.priceCoins,
        imageUrl: normalized.imageUrl,
        isActive: normalized.isActive ?? true,
        createdAt: now,
        updatedAt: now,
    };
    state.catalog.unshift(created);
    pushEvent(state, {
        type: 'CATALOG_CREATED',
        metadata: { itemId: created.id, priceCoins: created.priceCoins },
    });
    saveMockState(state);
    return created;
};

const getOrdersMock = async (query: GiftOrderQuery): Promise<GiftOrder[]> => {
    const state = readMockState();
    return applyOrderFilters(state.orders, query).sort(
        (a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt)
    );
};

const purchaseMock = async (payload: GiftPurchasePayload): Promise<GiftPurchaseResponse> => {
    const state = readMockState();
    const now = nowIso();

    const existingOrderId = state.idempotencyOrderMap[payload.idempotencyKey];
    if (existingOrderId) {
        const existingOrder = getOrderById(state, existingOrderId);
        return {
            orderId: existingOrder.id,
            voucherCode: existingOrder.voucherCode,
            newCoins: state.walletByStudentId[payload.studentId] ?? Math.max(0, payload.currentCoins),
            status: existingOrder.status,
            idempotencyReplay: true,
            order: existingOrder,
        };
    }

    const item = state.catalog.find((x) => x.id === payload.itemId && x.isActive);
    if (!item) {
        throw new Error('Món quà không còn khả dụng.');
    }

    const wallet = ensureWallet(state, payload.studentId, payload.currentCoins);
    if (wallet < item.priceCoins) {
        throw new Error('Không đủ xu để đổi quà.');
    }

    state.walletByStudentId[payload.studentId] = wallet - item.priceCoins;

    const orderId = randomId('order');
    const voucherCode = `VCH-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const order: GiftOrder = {
        id: orderId,
        studentId: payload.studentId,
        studentName: payload.studentName,
        studentUsername: payload.studentUsername,
        classId: payload.classId,
        className: payload.className,
        itemSnapshot: item,
        priceCoins: item.priceCoins,
        status: 'VOUCHER_ISSUED',
        voucherCode,
        createdAt: now,
        updatedAt: now,
    };
    const voucher: GiftVoucher = {
        code: voucherCode,
        orderId,
        studentId: payload.studentId,
        issuedAt: now,
        status: 'ISSUED',
    };

    state.orders.unshift(order);
    state.vouchers.unshift(voucher);
    state.idempotencyOrderMap[payload.idempotencyKey] = orderId;

    pushLedger(state, {
        studentId: payload.studentId,
        deltaCoins: -item.priceCoins,
        reason: 'PURCHASE',
        refOrderId: orderId,
    });
    pushEvent(state, {
        type: 'ORDER_CREATED',
        orderId,
        studentId: payload.studentId,
        metadata: { itemId: item.id, priceCoins: item.priceCoins },
    });
    pushEvent(state, {
        type: 'VOUCHER_ISSUED',
        orderId,
        studentId: payload.studentId,
        metadata: { voucherCode },
    });
    saveMockState(state);

    return {
        orderId,
        voucherCode,
        newCoins: state.walletByStudentId[payload.studentId],
        status: order.status,
        idempotencyReplay: false,
        order,
    };
};

const deliverOrderMock = async (orderId: string, actor: GiftOrderActor): Promise<GiftOrder> => {
    const state = readMockState();
    const order = getOrderById(state, orderId);
    assertCanManageOrder(order, actor);

    if (order.status !== 'VOUCHER_ISSUED') {
        throw new Error('Đơn hàng không ở trạng thái có thể trao quà.');
    }

    order.status = 'DELIVERED';
    order.deliveredBy = actor.username;
    order.deliveredAt = nowIso();
    order.updatedAt = order.deliveredAt;

    const voucher = getVoucherByOrderId(state, orderId);
    if (voucher) voucher.status = 'USED';

    pushEvent(state, {
        type: 'ORDER_DELIVERED',
        orderId,
        studentId: order.studentId,
        actor: actor.username,
    });
    saveMockState(state);
    return order;
};

const cancelOrderMock = async (
    orderId: string,
    actor: GiftOrderActor,
    reason: string
): Promise<GiftCancelResult> => {
    const state = readMockState();
    const order = getOrderById(state, orderId);
    assertCanManageOrder(order, actor);

    if (order.status === 'DELIVERED') {
        throw new Error('Đơn đã trao quà, không thể hủy.');
    }
    if (order.status === 'CANCELLED_REFUNDED') {
        throw new Error('Đơn đã được hủy trước đó.');
    }

    const currentWallet = ensureWallet(state, order.studentId, 0);
    state.walletByStudentId[order.studentId] = currentWallet + order.priceCoins;

    const now = nowIso();
    order.status = 'CANCELLED_REFUNDED';
    order.cancelReason = reason || 'Hủy thủ công';
    order.updatedAt = now;
    order.deliveredBy = actor.username;
    order.deliveredAt = now;

    const voucher = getVoucherByOrderId(state, orderId);
    if (voucher) voucher.status = 'CANCELLED';

    pushLedger(state, {
        studentId: order.studentId,
        deltaCoins: order.priceCoins,
        reason: 'REFUND',
        refOrderId: order.id,
    });
    pushEvent(state, {
        type: 'ORDER_CANCELLED',
        orderId,
        studentId: order.studentId,
        actor: actor.username,
        metadata: { reason: order.cancelReason },
    });
    pushEvent(state, {
        type: 'WALLET_REFUNDED',
        orderId,
        studentId: order.studentId,
        actor: actor.username,
        metadata: { amount: order.priceCoins },
    });
    saveMockState(state);

    return {
        order,
        newCoins: state.walletByStudentId[order.studentId],
    };
};

const getEventsMock = async (): Promise<GiftShopEventLog[]> => {
    const state = readMockState();
    return state.events;
};

export const giftShopService = {
    getMode: (): GiftShopMode => getMode(),

    getCatalog: async (): Promise<GiftCatalogItem[]> => {
        if (getMode() === 'api') {
            const data = await callApi<GiftCatalogItem[]>('get_gift_shop_catalog');
            return Array.isArray(data) ? data : [];
        }
        return getCatalogMock();
    },

    upsertCatalogItem: async (input: GiftCatalogUpsertInput): Promise<GiftCatalogItem> => {
        if (getMode() === 'api') {
            if (input.id) {
                return await callApi<GiftCatalogItem>('update_gift_shop_catalog_item', toApiCatalogPayload(input));
            }
            return await callApi<GiftCatalogItem>('create_gift_shop_catalog_item', toApiCatalogPayload(input));
        }
        return upsertCatalogItemMock(input);
    },

    getOrders: async (query: GiftOrderQuery): Promise<GiftOrder[]> => {
        if (getMode() === 'api') {
            return await callApi<GiftOrder[]>('get_gift_shop_orders', query);
        }
        return getOrdersMock(query);
    },

    purchase: async (payload: GiftPurchasePayload): Promise<GiftPurchaseResponse> => {
        if (getMode() === 'api') {
            return await callApi<GiftPurchaseResponse>('purchase_gift_shop_item', payload);
        }
        return purchaseMock(payload);
    },

    deliverOrder: async (orderId: string, actor: GiftOrderActor): Promise<GiftOrder> => {
        if (getMode() === 'api') {
            return await callApi<GiftOrder>('deliver_gift_shop_order', { orderId, ...actor });
        }
        return deliverOrderMock(orderId, actor);
    },

    cancelOrder: async (
        orderId: string,
        actor: GiftOrderActor,
        reason: string
    ): Promise<GiftCancelResult> => {
        if (getMode() === 'api') {
            return await callApi<GiftCancelResult>('cancel_gift_shop_order', { orderId, reason, ...actor });
        }
        return cancelOrderMock(orderId, actor, reason);
    },

    getEventLogs: async (): Promise<GiftShopEventLog[]> => {
        if (getMode() === 'api') {
            return await callApi<GiftShopEventLog[]>('get_gift_shop_event_logs');
        }
        return getEventsMock();
    },
};
