/**
 * Gamification Store
 *
 * Zustand store for Pet System state management:
 * Pet data, coins, shop items, leaderboard.
 *
 * Works alongside useClassroomStore (which handles auth).
 * Data is loaded after student login and persisted to localStorage.
 */

import { create } from 'zustand';
import {
    PetData,
    ShopItem,
    LeaderboardEntry,
    PetMood,
} from '../types/gamification.types';
import * as gamificationService from '../services/gamificationService';

// --- Store Interface ---

interface GamificationStore {
    // State
    pet: PetData | null;
    coins: number;
    shopItems: ShopItem[];
    leaderboard: LeaderboardEntry[];
    isLoading: boolean;
    error: string | null;

    // Reward animation state
    lastReward: {
        exp: number;
        coins: number;
        leveledUp: boolean;
        newLevel: number;
    } | null;

    // Actions
    loadPetData: (username: string) => Promise<void>;
    initFromLoginData: (pet: PetData | null, coins: number, shopItems: ShopItem[]) => void;
    updateGameState: (username: string, addExp: number, addCoins: number) => Promise<boolean>;
    fetchPetData: (username: string) => Promise<void>;
    buyItem: (username: string, itemId: string) => Promise<boolean>;
    fetchLeaderboard: () => Promise<void>;
    clearReward: () => void;
    clearGamification: () => void;
    clearError: () => void;
}

// --- Constants ---

const GAMIFICATION_KEY = 'itongquiz_gamification';

// --- Helper: save to localStorage ---
const saveToStorage = (pet: PetData | null, coins: number, shopItems: ShopItem[]) => {
    try {
        localStorage.setItem(GAMIFICATION_KEY, JSON.stringify({ pet, coins, shopItems }));
    } catch {
        // localStorage quota exceeded - silently fail
    }
};

// --- Store ---

export const useGamificationStore = create<GamificationStore>((set, get) => ({
    pet: null,
    coins: 0,
    shopItems: [],
    leaderboard: [],
    isLoading: false,
    error: null,
    lastReward: null,

    /**
     * Load pet data from server (also creates default pet if none exists)
     */
    loadPetData: async (username: string) => {
        set({ isLoading: true, error: null });
        try {
            const result = await gamificationService.getPetData(username);
            if (result) {
                set({
                    pet: result.pet,
                    coins: result.coins,
                    shopItems: result.shopItems,
                    isLoading: false,
                });
                saveToStorage(result.pet, result.coins, result.shopItems);
            } else {
                set({ error: 'Không thể tải dữ liệu Pet.', isLoading: false });
            }
        } catch {
            set({ error: 'Lỗi khi tải dữ liệu Pet.', isLoading: false });
        }
    },

    /**
     * Alias for loadPetData to match interface
     */
    fetchPetData: async (username: string) => {
        await get().loadPetData(username);
    },

    /**
     * Initialize from login response (no extra API call needed)
     */
    initFromLoginData: (pet: PetData | null, coins: number, shopItems: ShopItem[]) => {
        set({ pet, coins, shopItems });
        saveToStorage(pet, coins, shopItems);
    },

    /**
     * Update game state after quiz completion
     */
    updateGameState: async (username: string, addExp: number, addCoins: number) => {
        set({ isLoading: true, error: null });
        try {
            const result = await gamificationService.updateGameState(username, addExp, addCoins);
            if (result) {
                const currentPet = get().pet;
                const updatedPet: PetData | null = currentPet
                    ? {
                        ...currentPet,
                        level: result.newLevel,
                        exp: result.newExp,
                        expToNext: result.newExpToNext,
                        mood: result.mood as PetMood,
                    }
                    : null;

                set({
                    pet: updatedPet,
                    coins: result.newCoins,
                    isLoading: false,
                    lastReward: {
                        exp: addExp,
                        coins: addCoins,
                        leveledUp: result.leveledUp,
                        newLevel: result.newLevel,
                    },
                });
                saveToStorage(updatedPet, result.newCoins, get().shopItems);
                return true;
            }
            set({ error: 'Không thể cập nhật điểm.', isLoading: false });
            return false;
        } catch {
            set({ error: 'Lỗi khi cập nhật điểm.', isLoading: false });
            return false;
        }
    },

    /**
     * Buy a shop item
     */
    buyItem: async (username: string, itemId: string) => {
        set({ isLoading: true, error: null });
        try {
            const result = await gamificationService.buyShopItem(username, itemId);
            if (result) {
                const currentPet = get().pet;
                const updatedPet: PetData | null = currentPet
                    ? { ...currentPet, items: result.items }
                    : null;

                set({
                    pet: updatedPet,
                    coins: result.newCoins,
                    isLoading: false,
                });
                saveToStorage(updatedPet, result.newCoins, get().shopItems);
                return true;
            }
            set({ error: 'Không thể mua đồ.', isLoading: false });
            return false;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Lỗi khi mua đồ.';
            set({ error: message, isLoading: false });
            return false;
        }
    },

    /**
     * Fetch leaderboard
     */
    fetchLeaderboard: async () => {
        try {
            const leaderboard = await gamificationService.getLeaderboard();
            set({ leaderboard });
        } catch {
            console.error('[GamificationStore] Failed to fetch leaderboard');
        }
    },

    /**
     * Clear reward animation state
     */
    clearReward: () => set({ lastReward: null }),

    /**
     * Clear all gamification data (on logout)
     */
    clearGamification: () => {
        localStorage.removeItem(GAMIFICATION_KEY);
        set({
            pet: null,
            coins: 0,
            shopItems: [],
            leaderboard: [],
            lastReward: null,
            error: null,
        });
    },

    /**
     * Clear error message
     */
    clearError: () => set({ error: null }),
}));

/**
 * Restore gamification data from localStorage (call on app init)
 */
export const restoreGamificationData = () => {
    try {
        const saved = localStorage.getItem(GAMIFICATION_KEY);
        if (saved) {
            const { pet, coins, shopItems } = JSON.parse(saved);
            useGamificationStore.setState({ pet, coins, shopItems });
        }
    } catch {
        localStorage.removeItem(GAMIFICATION_KEY);
    }
};
