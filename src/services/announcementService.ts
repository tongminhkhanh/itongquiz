/**
 * Announcement Service
 * Handles marquee announcement API calls via apiAdapter (supports both GAS and D1)
 */

import { callApi } from './apiAdapter';

export interface Announcement {
    id: string;
    content: string;
    isActive: boolean;
    updatedAt: string;
}

/**
 * Get current announcement
 */
export const getAnnouncement = async (): Promise<Announcement | null> => {
    try {
        const data = await callApi<any>('get_announcement');

        if (data && data.status === 'success') {
            return data.announcement || null;
        }

        // If data is the announcement directly (D1 format)
        if (data && data.content !== undefined) {
            return data as Announcement;
        }

        return null;
    } catch (error) {
        console.error('Error getting announcement:', error);
        return null;
    }
};

/**
 * Save announcement (admin only)
 */
export const saveAnnouncement = async (content: string, isActive: boolean): Promise<boolean> => {
    try {
        const data = await callApi<any>('save_announcement', { content, isActive });

        if (data && data.status === 'success') {
            return true;
        }

        console.error('Save announcement error:', data?.message);
        return false;
    } catch (error) {
        console.error('Error saving announcement:', error);
        return false;
    }
};
