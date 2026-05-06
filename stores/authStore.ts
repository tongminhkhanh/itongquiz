import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
    // State
    isLoggedIn: boolean;
    username: string | null; // Add username
    teacherName: string | null;
    isAdmin: boolean;
    teacherClass: string | null; // Class this teacher is responsible for
    token: string | null;
    isLoggingIn: boolean;
    loginError: boolean;

    // Actions
    loginStart: () => void;
    loginSuccess: (username: string, name: string, isAdmin: boolean, teacherClass?: string | null, token?: string | null) => void; // Update signature
    loginFailure: () => void;
    logout: () => void;
    resetError: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            // Initial state
            isLoggedIn: false,
            username: null,
            teacherName: null,
            isAdmin: false,
            teacherClass: null,
            token: null,
            isLoggingIn: false,
            loginError: false,

            // Actions
            loginStart: () => set({ isLoggingIn: true, loginError: false }),

            loginSuccess: (username, name, isAdmin, teacherClass, token) => set({
                isLoggedIn: true,
                username,
                teacherName: name,
                isAdmin,
                teacherClass: teacherClass || null,
                token: token || null,
                isLoggingIn: false,
                loginError: false
            }),

            loginFailure: () => set({
                isLoggingIn: false,
                loginError: true
            }),

            logout: () => set({
                ...(() => {
                    try { localStorage.removeItem('itongquiz_jwt_token'); } catch {}
                    return {};
                })(),
                isLoggedIn: false,
                username: null,
                teacherName: null,
                isAdmin: false,
                teacherClass: null,
                token: null,
                isLoggingIn: false,
                loginError: false
            }),

            resetError: () => set({ loginError: false })
        }),
        {
            name: 'auth-storage', // localStorage key
            partialize: (state) => ({
                isLoggedIn: state.isLoggedIn,
                username: state.username,
                teacherName: state.teacherName,
                isAdmin: state.isAdmin,
                teacherClass: state.teacherClass,
                token: state.token
            })
        }
    )
);
