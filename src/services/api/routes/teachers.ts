import type { RouteRegistry } from '../types';

export const teacherRoutes: RouteRegistry = {
    get_teachers: {
        method: 'GET',
        auth: 'session',
        path: () => '/api/teachers',
    },
    create_teacher: {
        method: 'POST',
        auth: 'session',
        path: () => '/api/teachers',
    },
    update_teacher: {
        method: 'PUT',
        auth: 'session',
        path: ({ username }) => `/api/teachers/${encodeURIComponent(username)}`,
    },
    delete_teacher: {
        method: 'DELETE',
        auth: 'session',
        path: ({ username }) => `/api/teachers/${encodeURIComponent(username)}`,
    },
    login: {
        method: 'POST',
        auth: 'session',
        path: () => '/api/login',
    },
    logout: {
        method: 'POST',
        auth: 'session',
        path: () => '/api/logout',
    },
};
