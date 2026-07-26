import type { RouteRegistry } from '../types';

export const practiceRoutes: RouteRegistry = {
    get_practice_topics: {
        method: 'GET',
        auth: 'studentSession',
        path: () => '/api/practice/topics',
    },
    get_practice_quiz: {
        method: 'GET',
        auth: 'studentSession',
        path: () => '/api/practice',
        query: ({ topic, limit }) => {
            const q = new URLSearchParams();
            if (topic) q.append('topic', topic);
            if (limit) q.append('limit', limit);
            return q;
        },
    },
    submit_practice_answers: {
        method: 'POST',
        auth: 'studentSession',
        path: () => '/api/practice/submissions',
    },
};
