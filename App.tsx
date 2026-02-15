import React, { useState, useEffect, Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Quiz, QuestionType } from './src/types';
import { SCHOOL_NAME } from './src/config/constants';
import { Loader2 } from 'lucide-react';
import { fetchIoeQuizzes, saveIoeResult } from './src/services/ioeSheetService';
import { useAuthStore } from './stores/authStore';
import { useQuizStore } from './stores/quizStore';

// Lazy load main views
const StudentView = React.lazy(() => import('./src/components/StudentView'));
const IoeStudentView = React.lazy(() => import('./src/components/IoeStudentView'));
const TeacherDashboard = React.lazy(() => import('./src/components/TeacherDashboard'));
const StudentPortal = React.lazy(() => import('./src/components/StudentPortal'));
const HomePage = React.lazy(() => import('./src/components/HomePage/HomePage'));

const App: React.FC = () => {
    // --- STORES ---
    const authStore = useAuthStore();
    const quizStore = useQuizStore();

    // --- IOE State (Lifted for deep linking) ---
    const [ioeQuizzes, setIoeQuizzes] = useState<Quiz[]>([]);
    const [ioeLoading, setIoeLoading] = useState(false);

    // --- INITIALIZATION ---
    useEffect(() => {
        // Load data on mount
        quizStore.loadQuizzes();
        quizStore.loadResults();

        // Check URL for quizId - if it's an IOE quiz, load IOE quizzes
        const params = new URLSearchParams(window.location.search);
        const quizId = params.get('quizId') || params.get('quiz');
        if (quizId && quizId.startsWith('ioe-')) {
            loadIoeData(false); // Initial load for deep link
        }
    }, []);

    const loadIoeData = async (forceRefresh = false) => {
        if (ioeLoading) return;
        setIoeLoading(true);
        try {
            const quizzes = await fetchIoeQuizzes(forceRefresh);
            setIoeQuizzes(quizzes);
            console.log('[IOE] Loaded', quizzes.length, 'quizzes', forceRefresh ? '(refreshed)' : '');
        } catch (err) {
            console.error('[IOE] Load error:', err);
        } finally {
            setIoeLoading(false);
        }
    };

    // Effect to handle deep linking once quizzes are loaded
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const quizId = params.get('quizId') || params.get('quiz');
        if (quizId && !quizStore.selectedQuiz) {
            // First check main quizzes
            let foundQuiz = quizStore.quizzes.find(q => q.id === quizId);

            // If not found in main, check IOE quizzes
            if (!foundQuiz && ioeQuizzes.length > 0) {
                foundQuiz = ioeQuizzes.find(q => q.id === quizId);
            }

            if (foundQuiz) {
                quizStore.selectQuiz(foundQuiz);
                quizStore.setView('student');
            }
        }
    }, [quizStore.quizzes, ioeQuizzes]);

    // --- VIEWS ---

    if (quizStore.view === 'teacher_dash') {
        return (
            <>
                <Suspense fallback={
                    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                            <p className="text-gray-500 font-medium">Đang tải trang quản lý...</p>
                        </div>
                    </div>
                }>
                    <TeacherDashboard />
                </Suspense>
                <Analytics />
            </>
        );
    }

    if (quizStore.view === 'student_portal') {
        return (
            <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center bg-white">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                </div>
            }>
                <StudentPortal />
            </Suspense>
        );
    }

    if (quizStore.view === 'student' && quizStore.selectedQuiz) {
        const isIoeQuiz = quizStore.selectedQuiz.category === 'ioe';

        return (
            <>
                <Suspense fallback={
                    <div className={`min-h-screen flex items-center justify-center ${isIoeQuiz ? 'bg-[#1a3a5c]' : 'bg-white'}`}>
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className={`w-12 h-12 animate-spin ${isIoeQuiz ? 'text-[#c9a227]' : 'text-green-500'}`} />
                            <p className={`font-medium ${isIoeQuiz ? 'text-white' : 'text-gray-500'}`}>
                                {isIoeQuiz ? 'Loading IOE Quiz...' : 'Đang tải bài kiểm tra...'}
                            </p>
                        </div>
                    </div>
                }>
                    {isIoeQuiz ? (
                        <IoeStudentView
                            quiz={quizStore.selectedQuiz}
                            onExit={() => quizStore.goHome()}
                            onSaveResult={saveIoeResult}
                        />
                    ) : (
                        <StudentView
                            quiz={quizStore.selectedQuiz}
                            onExit={() => quizStore.goHome()}
                            onSaveResult={quizStore.submitResult}
                        />
                    )}
                </Suspense>
                <Analytics />
            </>
        );
    }

    // Home Screen (New Component)
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
                <Loader2 className="w-12 h-12 text-[#6C5CE7] animate-spin" />
            </div>
        }>
            <HomePage
                ioeQuizzes={ioeQuizzes}
                ioeLoading={ioeLoading}
                onRefreshIoe={() => loadIoeData(true)}
            />
            <Analytics />
        </Suspense>
    );
};

export default App;
