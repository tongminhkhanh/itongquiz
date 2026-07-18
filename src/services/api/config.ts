import { WORKERS_API_URL } from '../../config/constants';

export const REMOTE_WORKERS_API_URL = 'https://phieu.thitong.site';

export function getWorkersApiBaseUrl(): string {
    const configuredUrl = WORKERS_API_URL.replace(/\/$/, '');

    // In DEV, if configured URL points to remote production, use empty string
    // so Vite proxy intercepts the request instead.
    if (import.meta.env.DEV && configuredUrl === REMOTE_WORKERS_API_URL) {
        return '';
    }

    return configuredUrl;
}
