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
    // Banner fields
    bannerTitle?: string;
    bannerSubtitle?: string;
    bannerLink?: string;
    bannerImage?: string;
    isBannerActive?: boolean;
    daysToLive?: number;
}

/**
 * Get current announcement
 */
export const getAnnouncement = async (): Promise<Announcement | null> => {
    try {
        const data = await callApi<any>('get_announcement');
        console.log('Raw API Response:', data);

        let announcement: any = null;
        if (data && data.status === 'success') {
            announcement = data.announcement;
        } else if (data && data.content !== undefined) {
            announcement = data;
        }

        if (!announcement) return null;

        // Map snake_case from D1 to camelCase for Frontend
        return {
            ...announcement,
            id: String(announcement.id || '1'),
            content: announcement.content || '',
            isActive: announcement.isActive ?? (announcement.is_active === 'true' || announcement.is_active === true || announcement.is_active === 1),
            updatedAt: announcement.updatedAt ?? announcement.updated_at,
            bannerTitle: announcement.bannerTitle ?? announcement.banner_title,
            bannerSubtitle: announcement.bannerSubtitle ?? announcement.banner_subtitle,
            bannerLink: announcement.bannerLink ?? announcement.banner_link,
            bannerImage: announcement.bannerImage ?? announcement.banner_image,
            isBannerActive: announcement.isBannerActive === true || 
                            announcement.isBannerActive === 'true' || 
                            announcement.is_banner_active === 'true' || 
                            announcement.is_banner_active === true || 
                            announcement.is_banner_active === 1,
            daysToLive: Number(announcement.daysToLive ?? announcement.days_to_live ?? 7)
        };
    } catch (error) {
        console.error('Error getting announcement:', error);
        return null;
    }
};

/**
 * Save announcement (admin only)
 */
export const saveAnnouncement = async (params: Partial<Announcement>): Promise<boolean> => {
    try {
        const data = await callApi<any>('save_announcement', params);

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
