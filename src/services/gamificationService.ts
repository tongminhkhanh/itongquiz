/**
 * Gamification Service
 *
 * API calls to Google Apps Script for Pet System, Shop, and Rewards.
 * Reuses the same callGasApi pattern as classroomService.
 */

import { GOOGLE_SCRIPT_URL } from '../config/constants';
import {
    PetData,
    ShopItem,
    GameStateResult,
    PurchaseResult,
    LeaderboardEntry,
} from '../types/gamification.types';

// Security: API token for GAS authentication
const API_SECRET_TOKEN = import.meta.env.VITE_API_SECRET_TOKEN || '';

// Response type matching GAS API format
interface GamificationApiResponse<T> {
    status: 'success' | 'error';
    data?: T;
    message?: string;
}

/**
 * Helper to call GAS API
 */
const callGasApi = async <T = unknown>(
    action: string,
    payload: Record<string, unknown> = {}
): Promise<GamificationApiResponse<T>> => {
    if (!GOOGLE_SCRIPT_URL) {
        console.error('[GamificationService] GOOGLE_SCRIPT_URL is not defined');
        return { status: 'error', message: 'Script URL not configured' };
    }

    try {
        console.log(`[GamificationService] Calling API [${action}] at ${GOOGLE_SCRIPT_URL}`);
        console.log(`[GamificationService] Payload:`, JSON.stringify({ ...payload, action }));

        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                ...payload,
                action,
                token: API_SECRET_TOKEN,
            }),
        });

        const text = await response.text();
        console.log(`[GamificationService] Raw Response [${action}]:`, text);

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error(`[GamificationService] JSON Parse Error:`, e);
            return { status: 'error', message: 'Máy chủ trả về dữ liệu lỗi.' };
        }

        if (data.status === 'error') {
            console.error(`[GamificationService] API Error [${action}]:`, data.message);
            return { status: 'error', message: data.message || 'Unknown API error' };
        }

        return { status: 'success', data: data.data ?? data };
    } catch (error) {
        console.error(`[GamificationService] Network Error [${action}]:`, error);
        return { status: 'error', message: 'Lỗi mạng hoặc CORS. Vui lòng kiểm tra console.' };
    }
};

// ==========================================
// PET DATA
// ==========================================

/**
 * Get pet data, coins, and shop items for a student.
 * If no pet exists, server auto-creates a default one.
 */
export const getPetData = async (
    username: string,
    petId?: string,
    petName?: string
): Promise<{ pet: PetData; coins: number; shopItems: ShopItem[] } | null> => {
    const res = await callGasApi<{ pet: PetData; coins: number; shopItems: ShopItem[] }>(
        'get_pet_data',
        { username, petId, petName }
    );
    if (res.status === 'success' && res.data) {
        return res.data;
    }
    return null;
};

// ==========================================
// GAME STATE
// ==========================================

/**
 * Update game state after completing a quiz.
 * Adds EXP and coins, checks for level up.
 */
export const updateGameState = async (
    username: string,
    addExp: number,
    addCoins: number
): Promise<GameStateResult | null> => {
    const res = await callGasApi<GameStateResult>('update_game_state', {
        username,
        addExp,
        addCoins,
    });
    if (res.status === 'success' && res.data) {
        return res.data;
    }
    return null;
};

// ==========================================
// SHOP
// ==========================================

/**
 * Buy a shop item for the pet.
 * Deducts coins and adds item to pet inventory.
 */
export const buyShopItem = async (
    username: string,
    itemId: string
): Promise<PurchaseResult | null> => {
    const res = await callGasApi<PurchaseResult>('buy_shop_item', {
        username,
        itemId,
    });
    if (res.status === 'success' && res.data) {
        return res.data;
    }
    // Throw with server message for better UX
    throw new Error(res.message || 'Không thể mua đồ.');
};

// ==========================================
// LEADERBOARD
// ==========================================

/**
 * Get top 10 students by pet level.
 */
export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
    const res = await callGasApi<LeaderboardEntry[]>('get_leaderboard');
    if (res.status === 'success' && Array.isArray(res.data)) {
        return res.data;
    }
    return [];
};
