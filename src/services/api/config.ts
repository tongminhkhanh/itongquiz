import { WORKERS_API_URL } from '../../config/constants';

export const REMOTE_WORKERS_API_URL = 'https://phieu.thitong.site';

interface WorkersApiResolutionInput {
    configuredUrl: string;
    isDev: boolean;
    hostname?: string;
}

export function resolveWorkersApiBaseUrl({
    configuredUrl,
    isDev,
    hostname,
}: WorkersApiResolutionInput): string {
    const normalizedUrl = configuredUrl.replace(/\/$/, '');
    const isVercelPreview = typeof hostname === 'string' && /\.vercel\.app$/i.test(hostname);

    if (isVercelPreview) return '';
    if (isDev && normalizedUrl === REMOTE_WORKERS_API_URL) return '';
    return normalizedUrl;
}

export function getWorkersApiBaseUrl(): string {
    return resolveWorkersApiBaseUrl({
        configuredUrl: WORKERS_API_URL,
        isDev: import.meta.env.DEV,
        hostname: typeof window === 'undefined' ? undefined : window.location.hostname,
    });
}
