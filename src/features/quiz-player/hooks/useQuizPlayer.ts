import { useState, useEffect, useCallback, useMemo } from 'react';
import { Quiz, Question, QuestionType, StudentResult } from '../../../types';
import { useClassroomStore } from '../../../stores/useClassroomStore';
import { useGamificationStore } from '../../../stores/useGamificationStore';
import { validateAnswersOnServer } from '../../../services/quizValidationService';
import { calculateStudentScore } from '../utils/quizScoring';
import { playTingSound, showError } from '../../../utils/toast';

interface UseQuizPlayerProps {
    quiz: Quiz;
    onExit: () => void;
    onSaveResult: (result: StudentResult) => void | Promise<void>;
}

export const useQuizPlayer = ({ quiz, onExit, onSaveResult }: UseQuizPlayerProps) => {
    const classroomStore = useClassroomStore();
    const session = classroomStore.studentSession;
    const isLoggedIn = !!session;

    // UUID generator utility
    const generateUUID = useCallback((): string => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }, []);

    // Shuffle algorithms
    const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }, []);

    const shuffleWithinLevel = useCallback((questions: Question[]) => {
        const level1 = questions.filter((q: any) => q.difficultyLevel === 1);
        const level2 = questions.filter((q: any) => q.difficultyLevel === 2);
        const level3 = questions.filter((q: any) => q.difficultyLevel === 3);
        const noLevel = questions.filter((q: any) => !q.difficultyLevel);

        return [
            ...shuffleArray(level1),
            ...shuffleArray(noLevel),
            ...shuffleArray(level2),
            ...shuffleArray(level3)
        ];
    }, [shuffleArray]);

    // Initial step logic
    const getInitialStep = useCallback((): 'code' | 'info' | 'quiz' | 'result' => {
        if (isLoggedIn && !quiz.requireCode) return 'info';
        if (quiz.requireCode) return 'code';
        return 'info';
    }, [isLoggedIn, quiz.requireCode]);

    // Core state
    const [step, setStep] = useState<'code' | 'info' | 'quiz' | 'result'>(getInitialStep());
    const [studentName, setStudentName] = useState(session?.fullName || '');
    const [studentClass, setStudentClass] = useState(session?.className || '');
    const studentAvatar = session?.avatar || null;
    const [enteredCode, setEnteredCode] = useState('');
    const [codeError, setCodeError] = useState('');
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [timeLeft, setTimeLeft] = useState(quiz.timeLimit * 60);
    const [startTime, setStartTime] = useState<number>(0);
    const [result, setResult] = useState<StudentResult | null>(null);
    const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

    // Gamification state
    const [showReward, setShowReward] = useState(false);
    const [rewardData, setRewardData] = useState<{
        expEarned: number;
        coinsEarned: number;
        newLevel: number;
        leveledUp: boolean;
    } | null>(null);

    // Pagination state
    const QUESTIONS_PER_PAGE = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(shuffledQuestions.length / QUESTIONS_PER_PAGE);
    const questionsOnCurrentPage = useMemo(() => {
        const startIndex = (currentPage - 1) * QUESTIONS_PER_PAGE;
        return shuffledQuestions.slice(startIndex, startIndex + QUESTIONS_PER_PAGE);
    }, [currentPage, shuffledQuestions]);

    // Timer logic
    useEffect(() => {
        if (quiz.isPractice || !quiz.timeLimit) return;
        if (step !== 'quiz' || timeLeft <= 0) {
            if (step === 'quiz' && timeLeft === 0) handleSubmit();
            return;
        }

        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, timeLeft, quiz.isPractice, quiz.timeLimit]);

    // Browser navigation protection
    useEffect(() => {
        if (step !== 'quiz') return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = 'Bạn đang làm bài! Nếu rời đi, bài làm sẽ bị mất.';
            return e.returnValue;
        };

        const handlePopState = (e: PopStateEvent) => {
            e.preventDefault();
            if (window.confirm('Bạn đang làm bài! Nếu quay lại, bài làm sẽ bị mất. Bạn có chắc muốn thoát?')) {
                onExit();
            } else {
                window.history.pushState(null, '', window.location.href);
            }
        };

        window.history.pushState(null, '', window.location.href);
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [step, onExit]);

    // Auto-start for logged-in students
    useEffect(() => {
        if (isLoggedIn && step === 'info' && studentName && studentClass) {
            handleStart();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoggedIn, step]);

    // Handlers
    const handleStart = useCallback(() => {
        if (!studentName || !studentClass) return;
        
        const hasLevels = quiz.questions.some((q: any) => q.difficultyLevel);
        const finalQuestions = hasLevels ? shuffleWithinLevel(quiz.questions) : shuffleArray(quiz.questions);
        
        setShuffledQuestions(finalQuestions);
        setStartTime(Date.now());
        setStep('quiz');
    }, [studentName, studentClass, quiz.questions, shuffleWithinLevel, shuffleArray]);

    const handleCodeVerify = useCallback(() => {
        if (enteredCode.toUpperCase() === quiz.accessCode?.toUpperCase()) {
            setCodeError('');
            setStep('info');
        } else {
            setCodeError('Mã không đúng. Vui lòng thử lại!');
        }
    }, [enteredCode, quiz.accessCode]);

    const handleAnswerChange = useCallback((questionId: string, value: any, subId?: string) => {
        setAnswers(prev => {
            if (subId) {
                return {
                    ...prev,
                    [questionId]: { ...(prev[questionId] || {}), [subId]: value }
                };
            }
            return { ...prev, [questionId]: value };
        });
    }, []);

    const handleMatchingClick = useCallback((questionId: string, item: string, type: 'left' | 'right') => {
        setAnswers(prev => {
            const currentAnswers = prev[questionId] || {};
            let newAnswers = { ...currentAnswers };

            if (type === 'left') {
                if (newAnswers.selectedLeft === item) {
                    delete newAnswers.selectedLeft;
                } else {
                    newAnswers.selectedLeft = item;
                }
            } else {
                const selectedLeft = newAnswers.selectedLeft;
                if (selectedLeft) {
                    newAnswers[selectedLeft] = item;
                    delete newAnswers.selectedLeft;
                }
            }
            return { ...prev, [questionId]: newAnswers };
        });
    }, []);

    const handleSubmit = useCallback(async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setSubmitError(null);

        const timeTaken = Math.round((Date.now() - startTime) / 60000);

        try {
            const validationResult = await validateAnswersOnServer({
                quizId: quiz.id,
                answers,
                studentName,
                studentClass
            });

            if (!validationResult.success) throw new Error(validationResult.error || 'Server validation failed');

            // Senior Enrichment: Merge server results with client overrides
            const clientScoring = calculateStudentScore(quiz, answers);
            
            // Rebuild final answers with snapshots and corrections
            const finalAnswersWithSnapshots: Record<string, any> = {};
            const isAnswerSkipped = (value: any): boolean => (
                value === undefined ||
                value === null ||
                value === '' ||
                (Array.isArray(value) && value.length === 0) ||
                (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0)
            );
            const clientOverrideTypes = new Set([
                QuestionType.ORDERING,
                QuestionType.UNDERLINE,
                QuestionType.ERROR_CORRECTION
            ]);

            quiz.questions.forEach(q => {
                const clientResult = clientScoring.details.find(d => d.questionId === q.id);
                const serverResult = validationResult.details?.find((d: any) => d.questionId === q.id);
                const selectedAnswer = answers[q.id];
                const skipped = isAnswerSkipped(selectedAnswer);

                let isCorrect = false;
                if (!skipped) {
                    const clientIsCorrect = Boolean(clientResult?.isCorrect);
                    const serverIsCorrect = serverResult?.isCorrect;

                    if (clientOverrideTypes.has(q.type)) {
                        // Keep local override only for historically unstable server types.
                        isCorrect = clientIsCorrect || Boolean(serverIsCorrect);
                    } else if (typeof serverIsCorrect === 'boolean') {
                        isCorrect = serverIsCorrect;
                    } else {
                        isCorrect = clientIsCorrect;
                    }
                }

                finalAnswersWithSnapshots[q.id] = {
                    selectedAnswer,
                    isCorrect,
                    questionSnapshot: { ...q }
                };
            });

            const mergedCorrectCount = Object.values(finalAnswersWithSnapshots).filter((a: any) => a.isCorrect === true).length;
            const mergedTotalQuestions = quiz.questions.length;
            const mergedScore = mergedTotalQuestions === 0
                ? 0
                : parseFloat(((mergedCorrectCount / mergedTotalQuestions) * 10).toFixed(1));

            const resultData: StudentResult = {
                id: generateUUID(),
                quizId: quiz.id,
                quizTitle: quiz.title,
                studentName,
                studentClass,
                score: mergedScore,
                correctCount: mergedCorrectCount,
                totalQuestions: mergedTotalQuestions,
                timeTaken,
                submittedAt: new Date().toISOString(),
                answers: {
                    ...finalAnswersWithSnapshots,
                    _questionOrder: shuffledQuestions.map(q => q.id)
                },
                validationDetails: validationResult.details
            };

            if (!quiz.isPractice) await onSaveResult(resultData);
            setResult(resultData);

            // Gamification logic
            const addExp = mergedCorrectCount * 10 + (mergedScore === 10 ? 50 : 0);
            const addCoins = mergedCorrectCount * 5;
            
            let rewardLevel = 1;
            let didLevelUp = false;

            const gamStore = useGamificationStore.getState();
            if (classroomStore.studentSession?.username && gamStore.pet) {
                try {
                    const success = await gamStore.updateGameState(
                        classroomStore.studentSession.username,
                        addExp,
                        addCoins
                    );
                    if (success) {
                        rewardLevel = useGamificationStore.getState().lastReward?.newLevel ?? 1;
                        didLevelUp = useGamificationStore.getState().lastReward?.leveledUp ?? false;
                    }
                } catch (e) { console.warn('Gamification sync failed', e); }
            }

            if (mergedCorrectCount > 0) {
                setRewardData({ expEarned: addExp, coinsEarned: addCoins, newLevel: rewardLevel, leveledUp: didLevelUp });
                setShowReward(true);
            }

            setStep('result');
            playTingSound();
        } catch (error: any) {
            setSubmitError('Lỗi khi nộp bài! ' + (error.message || ''));
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubmitting, startTime, quiz, answers, studentName, studentClass, generateUUID, shuffledQuestions, onSaveResult, classroomStore.studentSession?.username]);

    const isQuestionAnswered = useCallback((q: Question) => {
        const val = answers[q.id];
        if (!val) return false;
        
        switch(q.type) {
            case QuestionType.TRUE_FALSE:
                return (q.items ?? []).every((_, idx) => val[`item-${idx}`] !== undefined || val[`item-${idx}`] !== undefined);
            case QuestionType.MULTIPLE_SELECT:
                return Array.isArray(val) && val.length > 0;
            case QuestionType.WORD_SCRAMBLE:
                return Array.isArray(val) && val.length === (q as any).letters?.length;
            case QuestionType.ERROR_CORRECTION:
                return !!val.wrongWord && !!val.correctWord;
            default:
                return true;
        }
    }, [answers]);

    return {
        step, studentName, setStudentName, studentClass, setStudentClass, studentAvatar,
        enteredCode, setEnteredCode, codeError, answers, timeLeft, result,
        shuffledQuestions, isSubmitting, submitError, showReward, setShowReward,
        showSubmitConfirm, setShowSubmitConfirm,
        rewardData, currentPage, setCurrentPage, totalPages, questionsOnCurrentPage,
        handleStart, handleCodeVerify, handleAnswerChange, handleMatchingClick, handleSubmit, isQuestionAnswered
    };
};
