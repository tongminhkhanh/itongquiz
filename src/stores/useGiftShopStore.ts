import { create } from 'zustand';
import { useGamificationStore } from './useGamificationStore';
import {
    giftShopService,
    GiftCatalogUpsertInput,
} from '../services/giftShop.service';
import type {
    GiftCatalogItem,
    GiftOrder,
    GiftOrderActor,
    GiftOrderQuery,
    GiftPurchaseResponse,
    GiftShopEventLog,
} from '../types/giftShop.types';

interface PurchaseArgs {
    studentId: string;
    studentName: string;
    studentUsername: string;
    classId: string;
    className?: string;
    itemId: string;
    currentCoins: number;
    idempotencyKey: string;
}

interface GiftShopStore {
    catalog: GiftCatalogItem[];
    myOrders: GiftOrder[];
    managedOrders: GiftOrder[];
    eventLogs: GiftShopEventLog[];
    isLoading: boolean;
    error: string | null;
    lastPurchase: GiftPurchaseResponse | null;

    loadCatalog: () => Promise<void>;
    loadStudentOrders: (studentId: string) => Promise<void>;
    loadManagedOrders: (query: GiftOrderQuery) => Promise<void>;
    loadEventLogs: () => Promise<void>;
    purchaseGift: (args: PurchaseArgs) => Promise<GiftPurchaseResponse | null>;
    deliverOrder: (orderId: string, actor: GiftOrderActor, queryAfter?: GiftOrderQuery) => Promise<boolean>;
    cancelOrder: (orderId: string, actor: GiftOrderActor, reason: string, queryAfter?: GiftOrderQuery) => Promise<boolean>;
    saveCatalogItem: (input: GiftCatalogUpsertInput) => Promise<GiftCatalogItem | null>;
    clearLastPurchase: () => void;
    clearError: () => void;
}

const syncGamificationCoins = (coins: number) => {
    useGamificationStore.setState((state) => ({
        ...state,
        coins,
    }));
};

export const useGiftShopStore = create<GiftShopStore>((set, get) => ({
    catalog: [],
    myOrders: [],
    managedOrders: [],
    eventLogs: [],
    isLoading: false,
    error: null,
    lastPurchase: null,

    loadCatalog: async () => {
        set({ isLoading: true, error: null });
        try {
            const catalog = await giftShopService.getCatalog();
            set({ catalog, isLoading: false });
        } catch (error) {
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : 'Không thể tải danh mục quà.',
            });
        }
    },

    loadStudentOrders: async (studentId: string) => {
        set({ isLoading: true, error: null });
        try {
            const orders = await giftShopService.getOrders({ studentId });
            set({ myOrders: orders, isLoading: false });
        } catch (error) {
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : 'Không thể tải lịch sử đổi quà.',
            });
        }
    },

    loadManagedOrders: async (query: GiftOrderQuery) => {
        set({ isLoading: true, error: null });
        try {
            const managedOrders = await giftShopService.getOrders(query);
            set({ managedOrders, isLoading: false });
        } catch (error) {
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : 'Không thể tải danh sách đơn quà.',
            });
        }
    },

    loadEventLogs: async () => {
        set({ isLoading: true, error: null });
        try {
            const logs = await giftShopService.getEventLogs();
            set({ eventLogs: logs, isLoading: false });
        } catch (error) {
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : 'Không thể tải nhật ký giao dịch.',
            });
        }
    },

    purchaseGift: async (args: PurchaseArgs) => {
        set({ isLoading: true, error: null });
        try {
            const result = await giftShopService.purchase({
                studentId: args.studentId,
                studentName: args.studentName,
                studentUsername: args.studentUsername,
                classId: args.classId,
                className: args.className,
                itemId: args.itemId,
                currentCoins: args.currentCoins,
                idempotencyKey: args.idempotencyKey,
            });
            syncGamificationCoins(result.newCoins);
            const myOrders = await giftShopService.getOrders({ studentId: args.studentId });
            set({ lastPurchase: result, myOrders, isLoading: false });
            return result;
        } catch (error) {
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : 'Đổi quà thất bại.',
            });
            return null;
        }
    },

    deliverOrder: async (orderId: string, actor: GiftOrderActor, queryAfter?: GiftOrderQuery) => {
        set({ isLoading: true, error: null });
        try {
            await giftShopService.deliverOrder(orderId, actor);
            const query = queryAfter || { status: 'VOUCHER_ISSUED' };
            const managedOrders = await giftShopService.getOrders(query);
            set({ managedOrders, isLoading: false });
            return true;
        } catch (error) {
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : 'Không thể xác nhận trao quà.',
            });
            return false;
        }
    },

    cancelOrder: async (orderId: string, actor: GiftOrderActor, reason: string, queryAfter?: GiftOrderQuery) => {
        set({ isLoading: true, error: null });
        try {
            const result = await giftShopService.cancelOrder(orderId, actor, reason);
            const query = queryAfter || { status: 'VOUCHER_ISSUED' };
            const managedOrders = await giftShopService.getOrders(query);
            const myOrders = get().myOrders.some((x) => x.studentId === result.order.studentId)
                ? await giftShopService.getOrders({ studentId: result.order.studentId })
                : get().myOrders;

            syncGamificationCoins(result.newCoins);
            set({ managedOrders, myOrders, isLoading: false });
            return true;
        } catch (error) {
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : 'Không thể hủy đơn quà.',
            });
            return false;
        }
    },

    saveCatalogItem: async (input: GiftCatalogUpsertInput) => {
        set({ isLoading: true, error: null });
        try {
            const savedItem = await giftShopService.upsertCatalogItem(input);
            const catalog = await giftShopService.getCatalog();
            set({ catalog, isLoading: false });
            return savedItem;
        } catch (error) {
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : 'Không thể lưu danh mục quà.',
            });
            return null;
        }
    },

    clearLastPurchase: () => set({ lastPurchase: null }),

    clearError: () => set({ error: null }),
}));
