import type { RouteRegistry, ApiPayload } from '../types';

const toGasPayload = (action: string, payload: ApiPayload): ApiPayload => ({
    ...payload,
    action,
});

export const legacyHomeworkRoutes: RouteRegistry = {
    get_hw_assignments: {
        method: 'POST',
        auth: 'session',
        path: () => '/api/gas',
        body: toGasPayload,
    },
    save_hw_assignment: {
        method: 'POST',
        auth: 'session',
        path: () => '/api/gas',
        body: toGasPayload,
    },
    delete_hw_assignment: {
        method: 'POST',
        auth: 'session',
        path: () => '/api/gas',
        body: toGasPayload,
    },
    submit_hw: {
        method: 'POST',
        auth: 'session',
        path: () => '/api/gas',
        body: toGasPayload,
    },
    get_hw_submissions: {
        method: 'POST',
        auth: 'session',
        path: () => '/api/gas',
        body: toGasPayload,
    },
};
