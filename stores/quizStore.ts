import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Quiz, StudentResult } from '../types';

type ViewType = 'home' | 'student' | 'teacher_login' | 'teacher_dash';

interface QuizState {
    // State
    view: ViewType;
    quizzes: Quiz[];
    selectedQuiz: Quiz | null;
    selectedClassLevel: string | null;
    results: StudentResult[];
    isLoading: boolean;
    error: string | null;

    // View actions
    setView: (view: ViewType) => void;
    goHome: () => void;

    // Quiz actions
    setQuizzes: (quizzes: Quiz[]) => void;
    addQuiz: (quiz: Quiz) => void;
    updateQuiz: (quiz: Quiz) => void;
    deleteQuiz: (id: string) => void;
    selectQuiz: (quiz: Quiz | null) => void;
    setClassLevel: (level: string | null) => void;

    // Results actions
    setResults: (results: StudentResult[]) => void;
    addResult: (result: StudentResult) => void;

    // UI actions
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useQuizStore = create<QuizState>()(
    persist(
        (set) => ({
            // Initial state
            view: 'home',
            quizzes: [],
            selectedQuiz: null,
            selectedClassLevel: null,
            results: [],
            isLoading: false,
            error: null,

            // View actions
            setView: (view) => set({ view }),
            goHome: () => set({
                view: 'home',
                selectedQuiz: null,
                selectedClassLevel: null
            }),

            // Quiz actions
            setQuizzes: (quizzes) => set({ quizzes }),
            addQuiz: (quiz) => set((state) => ({
                quizzes: [...state.quizzes, quiz]
            })),
            updateQuiz: (quiz) => set((state) => ({
                quizzes: state.quizzes.map(q => q.id === quiz.id ? quiz : q)
            })),
            deleteQuiz: (id) => set((state) => ({
                quizzes: state.quizzes.filter(q => q.id !== id)
            })),
            selectQuiz: (quiz) => set({ selectedQuiz: quiz }),
            setClassLevel: (level) => set({ selectedClassLevel: level }),

            // Results actions
            setResults: (results) => set({ results }),
            addResult: (result) => set((state) => ({
                results: [...state.results, result]
            })),

            // UI actions
            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error })
        }),
        {
            name: 'itongquiz-store',
            storage: createJSONStorage(() => localStorage),
            // Only persist selected fields to avoid stale data
            partialize: (state) => ({
                selectedClassLevel: state.selectedClassLevel,
            }),
        }
    )
);

