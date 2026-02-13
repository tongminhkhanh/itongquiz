/**
 * Announcement Service
 * Handles marquee announcement API calls
 */

import { GOOGLE_SCRIPT_URL } from '../config/constants';

const API_SECRET_TOKEN = import.meta.env.VITE_API_SECRET_TOKEN || '';

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
    if (!GOOGLE_SCRIPT_URL) {
        console.error("GOOGLE_SCRIPT_URL is not defined");
        return null;
    }

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'get_announcement',
                token: API_SECRET_TOKEN
            }),
        });

        const data = await response.json();

        if (data.status === 'success') {
            return data.announcement || null;
        }

        console.error('Get announcement error:', data.message);
        return null;
    } catch (error) {
        console.error('Network error getting announcement:', error);
        return null;
    }
};

/**
 * Save announcement (admin only)
 */
export const saveAnnouncement = async (content: string, isActive: boolean): Promise<boolean> => {
    if (!GOOGLE_SCRIPT_URL) {
        console.error("GOOGLE_SCRIPT_URL is not defined");
        return false;
    }

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'save_announcement',
                token: API_SECRET_TOKEN,
                content,
                isActive
            }),
        });

        const data = await response.json();

        if (data.status === 'success') {
            return true;
        }

        console.error('Save announcement error:', data.message);
        return false;
    } catch (error) {
        console.error('Network error saving announcement:', error);
        return false;
    }
};
