import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
    // State
    isLoggedIn: boolean;
    teacherName: string | null;
    isAdmin: boolean;
    teacherClass: string | null; // Class this teacher is responsible for

    // Actions
    login: (name: string, isAdmin: boolean, teacherClass?: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            // Initial state
            isLoggedIn: false,
            teacherName: null,
            isAdmin: false,
            teacherClass: null,

            // Login action
            login: (name: string, isAdmin: boolean, teacherClass?: string) => set({
                isLoggedIn: true,
                teacherName: name,
                isAdmin,
                teacherClass: teacherClass || null
            }),

            // Logout action
            logout: () => set({
                isLoggedIn: false,
                teacherName: null,
                isAdmin: false,
                teacherClass: null
            })
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
