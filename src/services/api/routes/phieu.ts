import type { RouteRegistry, ApiPayload } from '../types';

const toGasPayload = (action: string, payload: ApiPayload): ApiPayload => ({
    ...payload,
    action,
});

export const phieuRoutes: RouteRegistry = {
    get_public_phieu: {
        method: 'GET',
        auth: 'public',           // Public endpoint - no authentication required
        path: ({ publicToken }) => `/api/phieu/public/${encodeURIComponent(publicToken)}`,
    },
    upsert_phieu: {
        method: 'POST',
        auth: 'session',
        path: () => '/api/gas',
        body: toGasPayload,
    },
    get_phieu_by_submission: {
        method: 'POST',
        auth: 'session',
        path: () => '/api/gas',
        body: toGasPayload,
    },
    publish_phieu_batch: {
        method: 'POST',
        auth: 'session',
        path: () => '/api/gas',
        body: toGasPayload,
    },
    deactivate_public_phieu_link: {
        method: 'POST',
        auth: 'session',
        path: () => '/api/gas',
        body: toGasPayload,
    },
};
