import { callApi } from './apiAdapter';

export interface SystemSettings {
    aiAssistantEnabled: boolean;
    updatedAt?: string;
}

export const getSystemSettings = async (): Promise<SystemSettings> => {
    try {
        const data = await callApi<any>('get_system_settings');
        if (data?.status === 'success' && data?.data) {
            return {
                aiAssistantEnabled: Boolean(data.data.aiAssistantEnabled),
                updatedAt: data.data.updatedAt || '',
            };
        }
    } catch (error) {
        console.error('Error getting system settings:', error);
    }

    return { aiAssistantEnabled: true };
};

export const saveSystemSettings = async (payload: {
    actorUsername: string;
    aiAssistantEnabled: boolean;
}): Promise<boolean> => {
    try {
        const data = await callApi<any>('save_system_settings', payload);
        const success = data?.status === 'success';
        if (success && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('itongquiz:system-settings-updated', {
                detail: { aiAssistantEnabled: payload.aiAssistantEnabled },
            }));
        }
        return success;
    } catch (error) {
        console.error('Error saving system settings:', error);
        return false;
    }
};
