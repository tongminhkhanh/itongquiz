/**
 * authStore.ts
 * Zustand store for teacher authentication.
 * Stores JWT token in localStorage ('itongquiz_teacher_jwt_token')
 * so certificate hooks can read it.
 */
import { create } from 'zustand';

const TEACHER_JWT_KEY = 'itongquiz_teacher_jwt_token';
const AUTH_SESSION_KEY = 'auth_session';

interface AuthState {
    isLoggingIn: boolean;
    isAuthenticated: boolean;
    username: string | null;
    fullName: string | null;
    isAdmin: boolean;
    teacherClass: string | null;
    token: string | null;

    loginStart: () => void;
    loginSuccess: (
        username: string,
        fullName: string,
        isAdmin?: boolean,
        teacherClass?: string,
        token?: string | null
    ) => void;
    loginFailure: () => void;
    logout: () => void;
    restoreSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    isLoggingIn: false,
    isAuthenticated: false,
    username: null,
    fullName: null,
    isAdmin: false,
    teacherClass: null,
    token: null,

    loginStart: () => set({ isLoggingIn: true }),

    loginSuccess: (username, fullName, isAdmin = false, teacherClass, token) => {
        // Persist JWT so certificate hooks can pick it up
        if (token) {
            localStorage.setItem(TEACHER_JWT_KEY, token);
        }
        // Persist session info (without token for security)
        localStorage.setItem(
            AUTH_SESSION_KEY,
            JSON.stringify({ username, fullName, isAdmin, teacherClass: teacherClass ?? null })
        );
        set({
            isLoggingIn: false,
            isAuthenticated: true,
            username,
            fullName,
            isAdmin,
            teacherClass: teacherClass ?? null,
            token: token ?? null,
        });
    },

    loginFailure: () => set({ isLoggingIn: false }),

    logout: () => {
        localStorage.removeItem(TEACHER_JWT_KEY);
        localStorage.removeItem(AUTH_SESSION_KEY);
        set({
            isLoggingIn: false,
            isAuthenticated: false,
            username: null,
            fullName: null,
            isAdmin: false,
            teacherClass: null,
            token: null,
        });
    },

    restoreSession: () => {
        try {
            const raw = localStorage.getItem(AUTH_SESSION_KEY);
            const jwt = localStorage.getItem(TEACHER_JWT_KEY);
            if (raw) {
                const s = JSON.parse(raw);
                set({
                    isAuthenticated: !!jwt,
                    username: s.username ?? null,
                    fullName: s.fullName ?? null,
                    isAdmin: s.isAdmin ?? false,
                    teacherClass: s.teacherClass ?? null,
                    token: jwt,
                });
            }
        } catch {
            localStorage.removeItem(AUTH_SESSION_KEY);
        }
    },
}));
