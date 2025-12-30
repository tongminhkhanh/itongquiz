import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Quiz, StudentResult } from '../src/types';
import { fetchQuizzesFromSheets, fetchResultsFromSheets, saveQuizToSheet, saveResultToSheet, updateQuizInSheet, deleteQuizFromSheet } from '../src/services/googleSheetService';
import { GOOGLE_SHEET_ID, QUIZ_GID, QUESTION_GID, RESULTS_GID, GOOGLE_SCRIPT_URL } from '../src/config/constants';

type ViewType = 'home' | 'student' | 'teacher_login' | 'teacher_dash';

interface QuizState {
    // State
    view: ViewType;
    quizzes: Quiz[];
    selectedQuiz: Quiz | null;
    selectedClassLevel: string | null;
    selectedCategory: string | null;
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
    setCategory: (category: string | null) => void;

    // Results actions
    setResults: (results: StudentResult[]) => void;
    addResult: (result: StudentResult) => void;

    // UI actions
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    // Async Actions
    loadQuizzes: () => Promise<void>;
    loadResults: () => Promise<void>;
    createQuiz: (quiz: Quiz) => Promise<void>;
    modifyQuiz: (quiz: Quiz) => Promise<void>;
    removeQuiz: (id: string) => Promise<void>;
    submitResult: (result: StudentResult) => Promise<void>;
}

export const useQuizStore = create<QuizState>()(
    persist(
        (set, get) => ({
            // Initial state
            view: 'home',
            quizzes: [],
            selectedQuiz: null,
            selectedClassLevel: null,
            selectedCategory: null,
            results: [],
            isLoading: false,
            error: null,

            // View actions
            setView: (view) => set({ view }),
            goHome: () => set({
                view: 'home',
                selectedQuiz: null,
                selectedClassLevel: null,
                selectedCategory: null
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
            setClassLevel: (level) => set({ selectedClassLevel: level, selectedCategory: null }),
            setCategory: (category) => set({ selectedCategory: category }),

            // Results actions
            setResults: (results) => set({ results }),
            addResult: (result) => set((state) => ({
                results: [...state.results, result]
            })),

            // UI actions
            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),

            // Async Actions
            loadQuizzes: async () => {
                set({ isLoading: true, error: null });
                try {
                    const quizzes = await fetchQuizzesFromSheets(GOOGLE_SHEET_ID, QUIZ_GID, QUESTION_GID);
                    set({ quizzes, isLoading: false });
                } catch (err: any) {
                    set({ error: err.message || 'Failed to load quizzes', isLoading: false });
                }
            },

            loadResults: async () => {
                // Don't set global loading for results to avoid blocking UI if not necessary, or separate loading state?
                // For now, let's just fetch silently or set loading if needed.
                // But TeacherDashboard uses it.
                try {
                    const results = await fetchResultsFromSheets(GOOGLE_SHEET_ID, RESULTS_GID);
                    set({ results });
                } catch (err: any) {
                    console.error('Failed to load results:', err);
                    // set({ error: 'Failed to load results' }); // Optional
                }
            },

            createQuiz: async (quiz) => {
                set({ isLoading: true, error: null });
                try {
                    const success = await saveQuizToSheet(quiz, GOOGLE_SCRIPT_URL);
                    if (success) {
                        set((state) => ({
                            quizzes: [...state.quizzes, quiz],
                            isLoading: false
                        }));
                    } else {
                        throw new Error('Failed to save quiz to Google Sheets');
                    }
                } catch (err: any) {
                    set({ error: err.message, isLoading: false });
                    throw err;
                }
            },

            modifyQuiz: async (quiz) => {
                set({ isLoading: true, error: null });
                try {
                    const success = await updateQuizInSheet(quiz, GOOGLE_SCRIPT_URL);
                    if (success) {
                        set((state) => ({
                            quizzes: state.quizzes.map(q => q.id === quiz.id ? quiz : q),
                            isLoading: false
                        }));
                    } else {
                        throw new Error('Failed to update quiz in Google Sheets');
                    }
                } catch (err: any) {
                    set({ error: err.message, isLoading: false });
                    throw err;
                }
            },

            removeQuiz: async (id) => {
                set({ isLoading: true, error: null });
                try {
                    const success = await deleteQuizFromSheet(id, GOOGLE_SCRIPT_URL);
                    if (success) {
                        set((state) => ({
                            quizzes: state.quizzes.filter(q => q.id !== id),
                            isLoading: false
                        }));
                    } else {
                        throw new Error('Failed to delete quiz from Google Sheets');
                    }
                } catch (err: any) {
                    set({ error: err.message, isLoading: false });
                    throw err;
                }
            },

            submitResult: async (result) => {
                // This might be called by student view
                try {
                    const success = await saveResultToSheet(result, GOOGLE_SCRIPT_URL);
                    if (success) {
                        set((state) => ({
                            results: [...state.results, result]
                        }));
                    }
                } catch (err) {
                    console.error('Failed to submit result:', err);
                    throw err;
                }
            }
        }),
        {
            name: 'itongquiz-store',
            storage: createJSONStorage(() => localStorage),
            // Only persist selected fields to avoid stale data
            partialize: (state) => ({
                selectedClassLevel: state.selectedClassLevel,
                // Maybe persist quizzes too to work offline/faster load?
                // quizzes: state.quizzes, 
                // Let's stick to current behavior for now.
            }),
        }
    )
);

