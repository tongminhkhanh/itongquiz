import type { RouteRegistry } from '../types';

export const systemRoutes: RouteRegistry = {
    get_announcement: {
        method: 'GET',
        auth: 'session',
        path: () => '/api/announcements',
    },
    save_announcement: {
        method: 'POST',
        auth: 'session',
        path: () => '/api/announcements',
    },
    get_system_settings: {
        method: 'GET',
        auth: 'session',
        path: () => '/api/system-settings',
    },
    save_system_settings: {
        method: 'POST',
        auth: 'session',
        path: () => '/api/system-settings',
    },
};
