import type { RouteRegistry } from '../types';

export const aiRoutes: RouteRegistry = {
    ai_tutor_diagnose: {
        method: 'POST',
        auth: 'session', // AI features require login
        path: () => '/api/ai-tutor/diagnose',
    },
    ai_chat: {
        method: 'POST',
        auth: 'session',
        path: () => '/api/ai/chat',
    },
    ask_help_rag: {
        method: 'POST',
        auth: 'session',
        path: () => '/api/help/ask',
    },
};
