import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
    // State
    isLoggedIn: boolean;
    teacherName: string | null;
    isAdmin: boolean;
    teacherClass: string | null; // Class this teacher is responsible for
    isLoggingIn: boolean;
    loginError: boolean;

    // Actions
    loginStart: () => void;
    loginSuccess: (name: string, isAdmin: boolean, teacherClass?: string | null) => void;
    loginFailure: () => void;
    logout: () => void;
    resetError: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            // Initial state
            isLoggedIn: false,
            teacherName: null,
            isAdmin: false,
            teacherClass: null,
            isLoggingIn: false,
            loginError: false,

            // Actions
            loginStart: () => set({ isLoggingIn: true, loginError: false }),

            loginSuccess: (name, isAdmin, teacherClass) => set({
                isLoggedIn: true,
                teacherName: name,
                isAdmin,
                teacherClass: teacherClass || null,
                isLoggingIn: false,
                loginError: false
            }),

            loginFailure: () => set({
                isLoggingIn: false,
                loginError: true
            }),

            logout: () => set({
                isLoggedIn: false,
                teacherName: null,
                isAdmin: false,
                teacherClass: null,
                isLoggingIn: false,
                loginError: false
            }),

            resetError: () => set({ loginError: false })
        }),
        {
            name: 'auth-storage', // localStorage key
            partialize: (state) => ({
                isLoggedIn: state.isLoggedIn,
                teacherName: state.teacherName,
                isAdmin: state.isAdmin,
                teacherClass: state.teacherClass
            })
        }
    )
);
