import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Quiz, StudentResult } from '../src/types';
import { callApi } from '../src/services/apiAdapter';
import { prepareQuizForSave } from '../src/services/googleSheetService';
import { cacheService } from '../src/services/CacheService';

type ViewType = 'home' | 'student' | 'teacher_login' | 'teacher_dash' | 'student_portal';

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
    removeResult: (id: string) => Promise<void>;
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

            // Async Actions - All routes through Cloudflare Workers D1
            loadQuizzes: async () => {
                set({ isLoading: true, error: null });
                try {
                    // Fetch quizzes and questions from D1 via Workers API
                    const [quizData, questionData] = await Promise.all([
                        callApi<any[]>('get_quizzes'),
                        callApi<any[]>('get_questions')
                    ]);

                    if (!quizData || !Array.isArray(quizData)) {
                        set({ quizzes: [], isLoading: false });
                        return;
                    }

                    const qDataArray = Array.isArray(questionData) ? questionData : [];

                    // Group questions by quizId
                    const questionsByQuizId: Record<string, any[]> = {};
                    qDataArray.forEach((q: any) => {
                        const qId = q.quizId || q.quiz_id;
                        if (!questionsByQuizId[qId]) questionsByQuizId[qId] = [];
                        // Parse JSON fields if they come as strings from D1
                        let parsed = { ...q };
                        if (typeof q.items === 'string') try { parsed.items = JSON.parse(q.items); } catch { }
                        if (typeof q.pairs === 'string') try { parsed.pairs = JSON.parse(q.pairs); } catch { }
                        if (typeof q.categories === 'string') try { parsed.categories = JSON.parse(q.categories); } catch { }
                        if (typeof q.blanks === 'string') try { parsed.blanks = JSON.parse(q.blanks); } catch { }
                        if (typeof q.distractors === 'string') try { parsed.distractors = JSON.parse(q.distractors); } catch { }
                        if (typeof q.options === 'string') parsed.options = q.options.split('|');
                        if (typeof q.correctAnswers === 'string') try { parsed.correctAnswers = JSON.parse(q.correctAnswers); } catch { }
                        if (typeof q.letters === 'string') try { parsed.letters = JSON.parse(q.letters); } catch { }
                        if (typeof q.riddleLines === 'string') try { parsed.riddleLines = JSON.parse(q.riddleLines); } catch { }
                        // UNDERLINE question fields
                        if (typeof q.words === 'string') try { parsed.words = JSON.parse(q.words); } catch { }
                        if (typeof q.correctWordIndexes === 'string') try { parsed.correctWordIndexes = JSON.parse(q.correctWordIndexes); } catch { }
                        // ORDERING / IMAGE_QUESTION fields
                        if (typeof q.correctOrder === 'string') try { parsed.correctOrder = JSON.parse(q.correctOrder); } catch { }
                        if (typeof q.optionImages === 'string') try { parsed.optionImages = JSON.parse(q.optionImages); } catch { }
                        // Normalize snake_case to camelCase
                        parsed.quizId = parsed.quizId || parsed.quiz_id;
                        parsed.correctAnswer = parsed.correctAnswer || parsed.correct_answer;
                        parsed.mainQuestion = parsed.mainQuestion || parsed.main_question || parsed.question;
                        parsed.correctWord = parsed.correctWord || parsed.correct_word;
                        parsed.correctWordIndexes = parsed.correctWordIndexes || parsed.correct_word_indexes;
                        parsed.correctWordIndexes = parsed.correctWordIndexes || parsed.correct_word_indexes;

                        // BẢO ĐẢM CÁC TRƯỜNG ARRAY KHÔNG BAO GIỜ UNDEFINED ĐỂ TRÁNH CRASH GIAO DIỆN
                        parsed.options = Array.isArray(parsed.options) ? parsed.options : [];
                        parsed.items = Array.isArray(parsed.items) ? parsed.items : [];
                        parsed.pairs = Array.isArray(parsed.pairs) ? parsed.pairs : [];
                        parsed.categories = Array.isArray(parsed.categories) ? parsed.categories : [];
                        parsed.blanks = Array.isArray(parsed.blanks) ? parsed.blanks : [];
                        parsed.distractors = Array.isArray(parsed.distractors) ? parsed.distractors : [];
                        parsed.letters = Array.isArray(parsed.letters) ? parsed.letters : [];
                        parsed.riddleLines = Array.isArray(parsed.riddleLines) ? parsed.riddleLines : [];
                        parsed.words = Array.isArray(parsed.words) ? parsed.words : [];
                        parsed.correctWordIndexes = Array.isArray(parsed.correctWordIndexes) ? parsed.correctWordIndexes : [];
                        parsed.correctOrder = Array.isArray(parsed.correctOrder) ? parsed.correctOrder : [];
                        parsed.optionImages = Array.isArray(parsed.optionImages) ? parsed.optionImages : [];

                        questionsByQuizId[qId].push(parsed);
                    });

                    // Build Quiz objects
                    const quizzes: Quiz[] = quizData.map((row: any) => ({
                        id: row.id,
                        title: row.title || '',
                        classLevel: row.classLevel || row.class_level || '',
                        category: row.category || '',
                        timeLimit: parseInt(row.timeLimit || row.time_limit) || 30,
                        createdAt: row.createdAt || row.created_at || new Date().toISOString(),
                        createdBy: row.createdBy || row.created_by || '',
                        accessCode: row.accessCode || row.access_code || undefined,
                        requireCode: row.requireCode === true || row.requireCode === 'TRUE' || row.requireCode === 1 || row.require_code === true || row.require_code === 'TRUE' || row.require_code === 1,
                        showOnHome: !(row.showOnHome === false || row.showOnHome === 'FALSE' || row.showOnHome === 0 || row.show_on_home === false || row.show_on_home === 'FALSE' || row.show_on_home === 0),
                        questions: questionsByQuizId[row.id] || []
                    }));

                    // Sync selectedQuiz with fresh data
                    const currentSelectedQuiz = get().selectedQuiz;
                    const updatedSelectedQuiz = currentSelectedQuiz
                        ? quizzes.find(q => q.id === currentSelectedQuiz.id) || null
                        : null;

                    console.log(`[quizStore] Loaded ${quizzes.length} quizzes from D1`);
                    set({ quizzes, selectedQuiz: updatedSelectedQuiz, isLoading: false });
                } catch (err: any) {
                    set({ error: err.message || 'Failed to load quizzes', isLoading: false });
                }
            },

            loadResults: async () => {
                try {
                    const data = await callApi<any[]>('get_results');
                    if (!data || !Array.isArray(data)) {
                        set({ results: [] });
                        return;
                    }
                    const results: StudentResult[] = data.map((row: any) => ({
                        id: row.id || `result-${Date.now()}`,
                        studentName: row.studentName || row.name || '',
                        studentClass: row.studentClass || row.className || '',
                        quizId: row.quizId || row.quiz_id || '',
                        quizTitle: row.quizTitle || row.quiz_title || '',
                        score: parseFloat(String(row.score || 0).replace(',', '.')) || 0,
                        correctCount: parseInt(row.correctCount || row.correct_count) || 0,
                        totalQuestions: parseInt(row.totalQuestions || row.total_questions) || 0,
                        submittedAt: row.submittedAt || row.submitted_at || new Date().toISOString(),
                        timeTaken: parseInt(row.timeTaken || row.time_taken) || 0,
                        answers: typeof row.answers === 'string' ? JSON.parse(row.answers || '{}') : (row.answers || {})
                    })).filter(r => r.studentName);
                    set({ results });
                } catch (err: any) {
                    console.error('Failed to load results:', err);
                }
            },

            createQuiz: async (quiz) => {
                set({ isLoading: true, error: null });
                try {
                    const prepared = prepareQuizForSave(quiz);
                    const result = await callApi('create_quiz', prepared);
                    if (result && result.status === 'success') {
                        cacheService.invalidatePrefix('quizzes:');
                        set((state) => ({
                            quizzes: [...state.quizzes, quiz],
                            isLoading: false
                        }));
                    } else {
                        throw new Error(result?.message || 'Failed to save quiz');
                    }
                } catch (err: any) {
                    set({ error: err.message, isLoading: false });
                    throw err;
                }
            },

            modifyQuiz: async (quiz) => {
                set({ isLoading: true, error: null });
                try {
                    const prepared = prepareQuizForSave(quiz);
                    const result = await callApi('update_quiz', { ...prepared, id: quiz.id });
                    if (result && result.status === 'success') {
                        cacheService.invalidatePrefix('quizzes:');
                        set((state) => ({
                            quizzes: state.quizzes.map(q => q.id === quiz.id ? quiz : q),
                            isLoading: false
                        }));
                    } else {
                        throw new Error(result?.message || 'Failed to update quiz');
                    }
                } catch (err: any) {
                    set({ error: err.message, isLoading: false });
                    throw err;
                }
            },

            removeQuiz: async (id) => {
                set({ isLoading: true, error: null });
                try {
                    const result = await callApi('delete_quiz', { id });
                    if (result && result.status === 'success') {
                        cacheService.invalidatePrefix('quizzes:');
                        set((state) => ({
                            quizzes: state.quizzes.filter(q => q.id !== id),
                            isLoading: false
                        }));
                    } else {
                        throw new Error(result?.message || 'Failed to delete quiz');
                    }
                } catch (err: any) {
                    set({ error: err.message, isLoading: false });
                    throw err;
                }
            },

            submitResult: async (result) => {
                try {
                    const res = await callApi('submit_result', {
                        ...result,
                        className: result.studentClass,
                        quizTitle: result.quizTitle || 'Unknown Quiz'
                    });
                    if (res && res.status === 'success') {
                        cacheService.invalidatePrefix('results:');
                        set((state) => ({
                            results: [...state.results, result]
                        }));
                    } else {
                        throw new Error('Không thể lưu kết quả. Vui lòng thử lại!');
                    }
                } catch (err) {
                    console.error('Failed to submit result:', err);
                    throw err;
                }
            },

            removeResult: async (id) => {
                set({ isLoading: true, error: null });
                try {
                    const result = await callApi('delete_result', { resultId: id });
                    if (result && result.status === 'success') {
                        cacheService.invalidatePrefix('results:');
                        set((state) => ({
                            results: state.results.filter(r => r.id !== id),
                            isLoading: false
                        }));
                    } else {
                        throw new Error('Failed to delete result');
                    }
                } catch (err: any) {
                    set({ error: err.message, isLoading: false });
                    throw err;
                }
            }
        }),
        {
            name: 'itongquiz-store',
            storage: createJSONStorage(() => localStorage),
            // Only persist selected fields to avoid stale data
            // NOTE: Do NOT persist selectedClassLevel - it should reset when returning home
            partialize: (state) => ({
                // Persist quizzes locally for offline access
                quizzes: state.quizzes,
                // Persist view state so teacher dashboard stays after F5 refresh
                view: state.view,
            }),
        }
    )
);

