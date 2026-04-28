import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Quiz, QuestionType, StudentResult, Question } from '../types';
import {
    AccessCodeForm,
    StudentInfoForm,
    ResultScreen
} from './student';
import { formatMathText, formatHtmlText } from '../utils/formatters';
import { playTingSound, showError } from '../utils/toast';

// 🚀 Agent Skill: Hoist RegExp patterns to module level to avoid re-creation on each render
const REORDER_QUESTION_REGEX = /^(Reorder(?:\s+the\s+words)?)\s*[:/]\s*/i;
// Match colons OR slashes with ANY surrounding whitespace - for normalization
const SEPARATOR_REGEX = /\s*[:/]\s*/g;
// Clean up multiple spaces
const MULTIPLE_SPACES_REGEX = /\s+/g;
const PLACEHOLDER_REGEX = /_+|\[\.{2,}\]|\[…\]/;
const SPLIT_PLACEHOLDER_REGEX = /(_+|\[\.{2,}\]|\[…\])/;
const UNDERSCORE_REGEX = /^_+$/;
const BRACKET_DOTS_REGEX = /^\[\.{2,}\]$/;
const BRACKET_ELLIPSIS_REGEX = /^\[…\]$/;
const UNDERSCORE_FILL_REGEX = /_+/;
const LISTENING_EMOJI_REGEX = /🎧\s*/g;
const LISTEN_FILL_PREFIX_REGEX = /Listen and fill:\s*/gi;

// Helper to fix "Reorder the words" questions
// Normalizes ALL separators (colons and slashes) to format: "word1 /word2 /word3"
const fixReorderQuestion = (text: string): string => {
    if (!text) return text;
    // Check if it's a "Reorder" question
    const reorderMatch = text.match(REORDER_QUESTION_REGEX);
    if (reorderMatch) {
        const prefix = reorderMatch[1];
        let wordsPartRaw = text.substring(reorderMatch[0].length);

        // Replace ALL colons AND slashes with " /" (space before, no space after)
        let wordsPart = wordsPartRaw.replace(SEPARATOR_REGEX, ' /');

        // Normalize multiple spaces to single space
        wordsPart = wordsPart.replace(MULTIPLE_SPACES_REGEX, ' ');

        // Trim and ensure clean formatting
        wordsPart = wordsPart.trim();

        return `${prefix}: ${wordsPart}`;
    }
    return text;
};

interface Props {
    quiz: Quiz;
    onExit: () => void;
    onSaveResult: (result: StudentResult) => void;
}


// Option colors for MCQ
const OPTION_COLORS = [
    { bg: 'bg-emerald-100', hoverBorder: 'hover:border-emerald-500', text: 'text-emerald-600', icon: 'bg-emerald-500' },
    { bg: 'bg-pink-100', hoverBorder: 'hover:border-pink-500', text: 'text-pink-600', icon: 'bg-pink-500' },
    { bg: 'bg-amber-100', hoverBorder: 'hover:border-amber-500', text: 'text-amber-600', icon: 'bg-amber-500' },
    { bg: 'bg-sky-100', hoverBorder: 'hover:border-sky-500', text: 'text-sky-600', icon: 'bg-sky-500' },
];

const IoeStudentView: React.FC<Props> = ({ quiz, onExit, onSaveResult }) => {
    // Steps
    const [step, setStep] = useState<'code' | 'info' | 'quiz' | 'result'>(
        quiz.requireCode ? 'code' : 'info'
    );
    const [studentName, setStudentName] = useState('');
    const [studentClass, setStudentClass] = useState('');

    // Access code
    const [enteredCode, setEnteredCode] = useState('');
    const [codeError, setCodeError] = useState('');

    // Quiz state
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [timeLeft, setTimeLeft] = useState(quiz.timeLimit * 60);
    const [startTime, setStartTime] = useState<number>(0);
    const [result, setResult] = useState<StudentResult | null>(null);
    const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
    const questionNavRef = useRef<HTMLDivElement>(null);

    // Fisher-Yates shuffle
    const shuffleArray = <T,>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    // Timer
    useEffect(() => {
        if (step === 'quiz' && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearInterval(timer);
        } else if (step === 'quiz' && timeLeft === 0) {
            handleSubmit();
        }
    }, [step, timeLeft]);

    // Auto-scroll to current question
    useEffect(() => {
        if (questionNavRef.current && step === 'quiz') {
            const currentBtn = questionNavRef.current.children[currentIndex] as HTMLElement;
            if (currentBtn) {
                currentBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
    }, [currentIndex, step]);

    // Prevent navigation
    useEffect(() => {
        if (step === 'quiz') {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                e.preventDefault();
                e.returnValue = 'Bạn đang làm bài! Nếu thoát, bài làm sẽ mất.';
                return e.returnValue;
            };
            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        }
    }, [step]);

    const handleCodeVerify = () => {
        if (enteredCode.toUpperCase() === quiz.accessCode?.toUpperCase()) {
            setCodeError('');
            setStep('info');
        } else {
            setCodeError('Mã không đúng!');
        }
    };

    const handleStart = () => {
        if (!studentName || !studentClass) return;
        // Shuffle trong cùng mức độ, giữ thứ tự: Mức 1 (đầu) → Mức 2 (giữa) → Mức 3 (cuối)
        const shuffleWithinLevel = (questions: Question[]) => {
            // Nhóm câu hỏi theo difficultyLevel
            const level1 = questions.filter((q: any) => q.difficultyLevel === 1);
            const level2 = questions.filter((q: any) => q.difficultyLevel === 2);
            const level3 = questions.filter((q: any) => q.difficultyLevel === 3);
            const noLevel = questions.filter((q: any) => !q.difficultyLevel);

            // Shuffle trong từng nhóm
            return [
                ...shuffleArray(level1),
                ...shuffleArray(noLevel), // Câu không có level đặt ở giữa
                ...shuffleArray(level2),
                ...shuffleArray(level3)  // Mức 3 ở cuối
            ];
        };

        // Nếu có câu nào có difficultyLevel thì áp dụng shuffleWithinLevel
        const hasLevels = quiz.questions.some((q: any) => q.difficultyLevel);
        setShuffledQuestions(hasLevels ? shuffleWithinLevel(quiz.questions) : shuffleArray(quiz.questions));
        setStartTime(Date.now());
        setStep('quiz');
    };

    // 🚀 Agent Skill: useCallback for stable callback refs
    const handleAnswerChange = useCallback((questionId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    }, []);

    // Calculate score
    const calculateScore = useCallback(() => {
        let correctCount = 0;
        let totalItems = 0;

        shuffledQuestions.forEach(q => {
            totalItems++;
            if (q.type === QuestionType.MCQ || q.type === QuestionType.IMAGE_QUESTION) {
                if (answers[q.id] === (q as any).correctAnswer) correctCount++;
            } else if (q.type === QuestionType.SHORT_ANSWER) {
                const studentAns = (answers[q.id] || '').toString().trim().toLowerCase();
                const correctAns = (q.correctAnswer || '').toString().trim().toLowerCase();
                const correctOptions = correctAns.split('|').map(s => s.trim());
                if (correctOptions.includes(studentAns)) correctCount++;
            } else if (q.type === QuestionType.TRUE_FALSE) {
                let allCorrect = true;
                q.items.forEach((item, idx) => {
                    const itemKey = item.id || `item-${idx}`;
                    if (answers[q.id]?.[itemKey] !== item.isCorrect) allCorrect = false;
                });
                if (allCorrect) correctCount++;
            } else if (q.type === QuestionType.ORDERING) {
                const studentAns = answers[q.id] as number[] || [];
                let correctOrder = (q as any).correctOrder || [];
                // Fallback: if correctOrder is empty but we have items, assume DB order is correct
                const orderItems = (q as any).items || [];
                if ((!correctOrder || correctOrder.length === 0) && orderItems.length > 0) {
                    correctOrder = Array.from({ length: orderItems.length }, (_, i) => i);
                }
                // Compare element-wise with Number conversion for type safety
                if (studentAns.length === correctOrder.length &&
                    studentAns.every((val: number, idx: number) => Number(val) === Number(correctOrder[idx]))) {
                    correctCount++;
                }
            }
        });

        // IOE Scoring: Mỗi câu đúng = 10 điểm
        const score = correctCount * 10;
        return { score, correctCount, totalItems };
    }, [shuffledQuestions, answers]);

    const handleSubmit = useCallback(async () => {
        const timeTaken = Math.round((Date.now() - startTime) / 60000);

        try {
            // IOE quizzes are stored in a separate sheet, so we use local calculation
            // instead of the main quiz validation endpoint
            const { score, correctCount, totalItems } = calculateScore();

            const resultData: StudentResult = {
                id: crypto.randomUUID(),
                quizId: quiz.id,
                quizTitle: quiz.title,
                studentName,
                studentClass,
                score,
                correctCount,
                totalQuestions: totalItems,
                timeTaken,
                submittedAt: new Date().toISOString(),
                answers: {
                    ...answers,
                    _questionOrder: shuffledQuestions.map(q => q.id)
                }
            };

            setResult(resultData);
            onSaveResult(resultData);
            setStep('result');
            setResult(resultData);
            onSaveResult(resultData);
            setStep('result');
            playTingSound();
        } catch (error: unknown) {
            const normalizedError = error instanceof Error ? error : new Error(String(error));
            console.error('Submit error:', error);
            showError('Loi khi nop bai! Vui long thu lai. ' + (normalizedError.message || ''));
        }
    }, [startTime, quiz, studentName, studentClass, answers, onSaveResult, calculateScore]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };


    // 🚀 Agent Skill: useMemo for derived state
    const currentQuestion = useMemo(() =>
        shuffledQuestions[currentIndex],
        [shuffledQuestions, currentIndex]
    );


    const isQuestionAnswered = (q: Question) => {
        if (q.type === QuestionType.TRUE_FALSE) {
            return q.items.every((item, idx) => {
                const itemKey = item.id || `item-${idx}`;
                return answers[q.id]?.[itemKey] !== undefined;
            });
        }
        if (q.type === QuestionType.ORDERING) {
            const ans = answers[q.id] as number[] || [];
            return ans.length === ((q as any).items || []).length;
        }
        return !!answers[q.id];
    };

    // Handle card click for ORDERING
    const handleOrderingCardClick = (itemIndex: number) => {
        if (!currentQuestion) return;
        const currentAns = (answers[currentQuestion.id] as number[]) || [];
        const totalItems = ((currentQuestion as any).items || []).length;

        if (currentAns.includes(itemIndex)) {
            const newAns = currentAns.filter(i => i !== itemIndex);
            handleAnswerChange(currentQuestion.id, newAns);
        } else {
            const newAns = [...currentAns, itemIndex];
            handleAnswerChange(currentQuestion.id, newAns);

            // Auto-advance when all items are placed
            if (newAns.length === totalItems && currentIndex < shuffledQuestions.length - 1) {
                setTimeout(() => setCurrentIndex(prev => prev + 1), 500);
            }
        }
    };

    // ACCESS CODE
    if (step === 'code') {
        return (
            <AccessCodeForm
                quizTitle={quiz.title}
                enteredCode={enteredCode}
                codeError={codeError}
                onCodeChange={setEnteredCode}
                onVerify={handleCodeVerify}
                onExit={onExit}
            />
        );
    }

    // STUDENT INFO
    if (step === 'info') {
        return (
            <StudentInfoForm
                quiz={quiz}
                studentName={studentName}
                studentClass={studentClass}
                onNameChange={setStudentName}
                onClassChange={setStudentClass}
                onStart={handleStart}
                onExit={onExit}
            />
        );
    }

    // RESULT
    if (step === 'result' && result) {
        return (
            <ResultScreen
                quiz={quiz}
                result={result}
                answers={answers}
                onExit={onExit}
            />
        );
    }

    // Get current date/time
    const now = new Date();
    const dateStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    // ========== PLAYFUL ENGLISH ADVENTURE INTERFACE ==========
    return (
        <div className="min-h-screen bg-sky-100 font-sans relative overflow-hidden">
            {/* Decorative Background Icons */}
            <div className="fixed inset-0 pointer-events-none opacity-20 overflow-hidden">
                <span className="absolute top-10 left-10 text-8xl text-sky-400 rotate-12">🎨</span>
                <span className="absolute bottom-20 right-10 text-9xl text-emerald-400 -rotate-12">🚀</span>
                <span className="absolute top-1/4 right-20 text-7xl text-amber-400">💡</span>
                <span className="absolute bottom-1/4 left-20 text-7xl text-pink-300 rotate-45">🧩</span>
            </div>

            {/* Header */}
            <header className="relative z-10 bg-white/80 backdrop-blur-md border-b-4 border-dashed border-sky-400 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-amber-400 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 border-4 border-white">
                        <span className="text-white text-3xl">🌍</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg md:text-xl font-bold text-slate-700 tracking-tight">
                                {quiz.title}
                            </h1>
                            {quiz.examCode && (
                                <span className="px-2 py-0.5 bg-amber-400 text-white text-xs font-bold rounded-full shadow-sm">
                                    {quiz.examCode}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center text-slate-500 text-sm font-medium">
                            <span className="mr-1">👤</span>
                            {studentName} <span className="mx-2 text-slate-300">|</span> {studentClass}
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    {/* Timer */}
                    <div className={`px-6 py-2 rounded-full border-4 border-white shadow-sm flex items-center space-x-2 ${timeLeft < 60 ? 'bg-red-100 animate-pulse' : 'bg-amber-100'}`}>
                        <span className="text-amber-500 text-xl">⏰</span>
                        <span className={`text-2xl font-mono font-bold ${timeLeft < 60 ? 'text-red-600' : 'text-slate-700'}`}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-2xl shadow-[0_4px_0_rgb(5,150,105)] hover:shadow-[0_2px_0_rgb(5,150,105)] hover:translate-y-[2px] flex items-center space-x-2 transition-all active:scale-95"
                    >
                        <span>NỘP BÀI</span>
                        <span>➤</span>
                    </button>
                </div>
            </header>

            {/* Question Navigation */}
            <nav className="relative z-10 py-4 px-4">
                <div className="max-w-full mx-auto flex items-center justify-center gap-2">
                    {/* Prev Button - Jump to nearest unanswered */}
                    <button
                        onClick={() => {
                            // Find nearest unanswered question going backwards
                            for (let i = currentIndex - 1; i >= 0; i--) {
                                if (!isQuestionAnswered(shuffledQuestions[i])) {
                                    setCurrentIndex(i);
                                    return;
                                }
                            }
                            // If no unanswered found, just go back 1
                            setCurrentIndex(Math.max(0, currentIndex - 1));
                        }}
                        disabled={currentIndex === 0}
                        className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-2xl bg-white text-slate-400 border-2 border-slate-200 hover:border-sky-400 hover:text-sky-400 hover:bg-sky-50 transition-all disabled:opacity-30 text-2xl font-bold shadow-sm"
                    >
                        ◀
                    </button>

                    {/* Question Numbers */}
                    <div
                        ref={questionNavRef}
                        className="flex justify-start gap-2 px-4 py-3 bg-white/50 rounded-3xl backdrop-blur-sm overflow-x-auto whitespace-nowrap max-w-[calc(100vw-180px)] scrollbar-hide"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {shuffledQuestions.map((q, idx) => {
                            const isAnswered = isQuestionAnswered(q);
                            const isCurrent = idx === currentIndex;

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl font-bold text-xl transition-all ${isCurrent
                                        ? 'bg-sky-400 text-white border-4 border-white shadow-lg scale-110 -rotate-3'
                                        : isAnswered
                                            ? 'bg-emerald-400 text-white border-2 border-white'
                                            : 'bg-white border-2 border-slate-200 text-slate-600 hover:bg-emerald-50'
                                        }`}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>

                    {/* Next Button */}
                    <button
                        onClick={() => setCurrentIndex(Math.min(shuffledQuestions.length - 1, currentIndex + 1))}
                        disabled={currentIndex === shuffledQuestions.length - 1}
                        className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-2xl bg-white text-slate-400 border-2 border-slate-200 hover:border-sky-400 hover:text-sky-400 hover:bg-sky-50 transition-all disabled:opacity-30 text-2xl font-bold shadow-sm"
                    >
                        ▶
                    </button>
                </div>
            </nav>

            {/* Main Content - Whiteboard */}
            <main className="relative z-10 px-4 pb-12">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-white rounded-3xl shadow-xl border-8 border-slate-100 min-h-[500px] p-6 md:p-12 flex flex-col items-center justify-center relative overflow-hidden">
                        {/* Decorative Tape */}
                        <div className="absolute top-0 left-16 w-24 h-8 bg-amber-400/40 rounded-b-xl border-x-4 border-b-4 border-white"></div>


                        {currentQuestion && (
                            <div className="w-full max-w-4xl">
                                {/* Question Text - Skip for SHORT_ANSWER since it's rendered inline */}
                                {currentQuestion.type !== QuestionType.SHORT_ANSWER && (
                                    <div className="text-center mb-10">
                                        <h2
                                            className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-700 leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: formatHtmlText(fixReorderQuestion((currentQuestion as any).question || (currentQuestion as any).mainQuestion || '')) }}
                                        />
                                    </div>
                                )}

                                {/* MCQ Options */}
                                {(currentQuestion.type === QuestionType.MCQ || currentQuestion.type === QuestionType.IMAGE_QUESTION) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                        {((currentQuestion as any).options || []).map((opt: string, idx: number) => {
                                            const label = String.fromCharCode(65 + idx);
                                            const isSelected = answers[currentQuestion.id] === label;
                                            const color = OPTION_COLORS[idx % OPTION_COLORS.length];

                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        handleAnswerChange(currentQuestion.id, label);
                                                        // Auto advance
                                                        if (currentIndex < shuffledQuestions.length - 1) {
                                                            setTimeout(() => setCurrentIndex(prev => prev + 1), 300);
                                                        }
                                                    }}
                                                    className={`flex items-center p-5 md:p-6 rounded-2xl text-left shadow-sm transition-all active:scale-95 border-4 ${isSelected
                                                        ? `${color.bg} border-${color.text.replace('text-', '')} ring-4 ring-${color.text.replace('text-', '')}/30`
                                                        : `${color.bg} border-white ${color.hoverBorder} hover:shadow-lg`
                                                        }`}
                                                >
                                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xl md:text-2xl font-black mr-4 md:mr-5 shadow-inner transition-colors ${isSelected ? `${color.icon} text-white` : `bg-white ${color.text}`
                                                        }`}>
                                                        {label}
                                                    </div>
                                                    <span
                                                        className="text-xl md:text-2xl font-semibold text-slate-600 flex-1"
                                                        dangerouslySetInnerHTML={{ __html: formatHtmlText(opt.replace(/^[A-D]\.\s*/, '')) }}
                                                    />
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* SHORT ANSWER - Inline Input */}
                                {currentQuestion.type === QuestionType.SHORT_ANSWER && (
                                    <div className="text-center">
                                        {/* Listening Question - Play Button */}
                                        {((currentQuestion as any).question || '').includes('🎧') && (
                                            <div className="mb-6">
                                                <button
                                                    onClick={() => {
                                                        // Extract full sentence from explanation or construct it
                                                        const explanation = (currentQuestion as any).explanation || '';
                                                        const correctAnswer = (currentQuestion as any).correctAnswer || '';
                                                        const questionText = (currentQuestion as any).question || '';

                                                        let textToSpeak = '';

                                                        // Try explanation first
                                                        if (explanation) {
                                                            // Remove "Full sentence:" prefix if present
                                                            textToSpeak = explanation.replace(/Full sentence:\s*/i, '').trim();
                                                        }

                                                        // Fallback: construct from question + correctAnswer
                                                        if (!textToSpeak && questionText && correctAnswer) {
                                                            // Remove emoji and clean question
                                                            let cleanQ = questionText.replace(LISTENING_EMOJI_REGEX, '').replace(LISTEN_FILL_PREFIX_REGEX, '').trim();
                                                            // Replace ___ with correctAnswer
                                                            textToSpeak = cleanQ.replace(UNDERSCORE_FILL_REGEX, correctAnswer);
                                                        }


                                                        if (textToSpeak && 'speechSynthesis' in window) {
                                                            // Cancel any ongoing speech
                                                            window.speechSynthesis.cancel();

                                                            const utterance = new SpeechSynthesisUtterance(textToSpeak);
                                                            utterance.lang = 'en-US';
                                                            utterance.rate = 0.7; // Slow speed for young students
                                                            utterance.pitch = 1;

                                                            // Try to select native female English voice
                                                            const voices = window.speechSynthesis.getVoices();
                                                            const femaleVoice = voices.find(v =>
                                                                (v.lang.startsWith('en-US') || v.lang.startsWith('en-GB')) &&
                                                                (v.name.toLowerCase().includes('female') ||
                                                                    v.name.includes('Samantha') || // macOS
                                                                    v.name.includes('Zira') || // Windows
                                                                    v.name.includes('Google US English') ||
                                                                    v.name.includes('Karen') || // Australian
                                                                    v.name.includes('Moira')) // Irish
                                                            ) || voices.find(v => v.lang.startsWith('en-US') || v.lang.startsWith('en-GB'));

                                                            if (femaleVoice) {
                                                                utterance.voice = femaleVoice;
                                                            }

                                                            window.speechSynthesis.speak(utterance);
                                                        } else {
                                                            console.warn('[TTS] No text to speak or speechSynthesis not supported');
                                                        }
                                                    }}
                                                    className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all active:scale-95 mx-auto border-4 border-white"
                                                    title="Bấm để nghe câu"
                                                >
                                                    <span className="text-4xl">🔊</span>
                                                </button>
                                                <p className="text-sm text-slate-500 mt-2 font-medium">Bấm để nghe câu đầy đủ</p>
                                            </div>
                                        )}

                                        <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-700 leading-relaxed inline-flex flex-wrap items-center justify-center gap-2">
                                            {(() => {
                                                const questionText = (currentQuestion as any).question || '';
                                                // Remove 🎧 emoji for display
                                                const cleanQuestion = questionText.replace(LISTENING_EMOJI_REGEX, '').replace(LISTEN_FILL_PREFIX_REGEX, '');
                                                // Check if question has underscore/placeholder pattern
                                                const hasPlaceholder = PLACEHOLDER_REGEX.test(cleanQuestion);

                                                if (hasPlaceholder) {
                                                    // Split by underscore patterns: _, __, ___, ____, or [...] 
                                                    const parts = cleanQuestion.split(SPLIT_PLACEHOLDER_REGEX);

                                                    return parts.map((part: string, idx: number) => {
                                                        // Check if this part is a blank placeholder
                                                        if (UNDERSCORE_REGEX.test(part) || BRACKET_DOTS_REGEX.test(part) || BRACKET_ELLIPSIS_REGEX.test(part)) {
                                                            return (
                                                                <input
                                                                    key={idx}
                                                                    type="text"
                                                                    value={answers[currentQuestion.id] || ''}
                                                                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                                                    placeholder="..."
                                                                    autoFocus
                                                                    className="inline-block w-40 md:w-52 px-4 py-2 text-center text-2xl md:text-3xl font-bold bg-amber-50 border-3 border-amber-300 rounded-xl text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-amber-300/50 focus:border-amber-400 mx-1"
                                                                />
                                                            );
                                                        }
                                                        // Regular text
                                                        return (
                                                            <span
                                                                key={idx}
                                                                dangerouslySetInnerHTML={{ __html: formatHtmlText(part) }}
                                                            />
                                                        );
                                                    });
                                                } else {
                                                    // No placeholder - show question + input below
                                                    return (
                                                        <>
                                                            <span dangerouslySetInnerHTML={{ __html: formatHtmlText(cleanQuestion) }} />
                                                            <input
                                                                type="text"
                                                                value={answers[currentQuestion.id] || ''}
                                                                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                                                placeholder="Type your answer..."
                                                                autoFocus
                                                                className="inline-block w-48 md:w-64 px-4 py-2 text-center text-2xl md:text-3xl font-bold bg-amber-50 border-3 border-amber-300 rounded-xl text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-amber-300/50 focus:border-amber-400 ml-2"
                                                            />
                                                        </>
                                                    );
                                                }
                                            })()}
                                        </div>

                                        {/* Submit Answer Button */}
                                        {answers[currentQuestion.id] && (
                                            <div className="w-full flex justify-center mt-10">
                                                <button
                                                    onClick={() => {
                                                        // Auto advance to next question
                                                        if (currentIndex < shuffledQuestions.length - 1) {
                                                            setCurrentIndex(prev => prev + 1);
                                                        }
                                                    }}
                                                    className="px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-xl rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95 flex items-center gap-3"
                                                >
                                                    <span>Trả lời</span>
                                                    <span className="text-2xl">✓</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TRUE/FALSE */}
                                {currentQuestion.type === QuestionType.TRUE_FALSE && (
                                    <div className="space-y-4">
                                        {currentQuestion.items.map((item, i) => {
                                            const itemKey = item.id || `item-${i}`;
                                            const val = answers[currentQuestion.id]?.[itemKey];

                                            // Handler for TRUE/FALSE with auto-advance
                                            const handleTrueFalseClick = (value: boolean) => {
                                                const newAnswers = { ...answers[currentQuestion.id], [itemKey]: value };
                                                handleAnswerChange(currentQuestion.id, newAnswers);

                                                // Check if all items are now answered
                                                const allAnswered = currentQuestion.items.every((it, idx) => {
                                                    const key = it.id || `item-${idx}`;
                                                    return key === itemKey ? true : newAnswers[key] !== undefined;
                                                });

                                                // Auto-advance if all answered and not last question
                                                if (allAnswered && currentIndex < shuffledQuestions.length - 1) {
                                                    setTimeout(() => setCurrentIndex(prev => prev + 1), 500);
                                                }
                                            };

                                            return (
                                                <div key={itemKey} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border-2 border-slate-200">
                                                    <span className="text-lg text-slate-700 flex-1 mr-4 font-medium">
                                                        {String.fromCharCode(97 + i)}. <span dangerouslySetInnerHTML={{ __html: formatHtmlText(item.statement) }} />
                                                    </span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleTrueFalseClick(true)}
                                                            className={`px-5 py-2 rounded-xl font-bold transition-all active:scale-95 ${val === true
                                                                ? 'bg-emerald-500 text-white shadow-lg'
                                                                : 'bg-white border-2 border-slate-200 text-slate-600 hover:bg-emerald-50'
                                                                }`}
                                                        >
                                                            TRUE
                                                        </button>
                                                        <button
                                                            onClick={() => handleTrueFalseClick(false)}
                                                            className={`px-5 py-2 rounded-xl font-bold transition-all active:scale-95 ${val === false
                                                                ? 'bg-red-500 text-white shadow-lg'
                                                                : 'bg-white border-2 border-slate-200 text-slate-600 hover:bg-red-50'
                                                                }`}
                                                        >
                                                            FALSE
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* ORDERING */}
                                {currentQuestion.type === QuestionType.ORDERING && (
                                    <div className="space-y-8">
                                        {/* Answer Slots */}
                                        <div className="flex justify-center gap-4 flex-wrap mb-10">
                                            {((currentQuestion as any).items || []).map((_: string, idx: number) => {
                                                const selectedItems = (answers[currentQuestion.id] as number[]) || [];
                                                const itemAtSlot = selectedItems[idx];
                                                const word = itemAtSlot !== undefined ? ((currentQuestion as any).items || [])[itemAtSlot] : null;

                                                return (
                                                    <div
                                                        key={`slot-${idx}`}
                                                        onClick={() => {
                                                            if (itemAtSlot !== undefined) {
                                                                const newAns = selectedItems.filter((_, i) => i !== idx);
                                                                handleAnswerChange(currentQuestion.id, newAns);
                                                            }
                                                        }}
                                                        className="w-32 md:w-36 h-20 md:h-24 rounded-2xl border-2 border-amber-400 bg-amber-50 flex items-center justify-center cursor-pointer hover:bg-amber-100 hover:border-amber-500 transition-all shadow-md hover:shadow-lg"
                                                    >
                                                        {word ? (
                                                            <span className="text-slate-700 font-semibold text-lg md:text-xl text-center px-3">{word}</span>
                                                        ) : (
                                                            <span className="text-amber-400 text-4xl md:text-5xl font-bold">?</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Word Cards */}
                                        <div className="flex justify-center gap-4 flex-wrap">
                                            {((currentQuestion as any).items || []).map((item: string, idx: number) => {
                                                const selectedItems = (answers[currentQuestion.id] as number[]) || [];
                                                const isUsed = selectedItems.includes(idx);

                                                return (
                                                    <button
                                                        key={`card-${idx}`}
                                                        onClick={() => !isUsed && handleOrderingCardClick(idx)}
                                                        disabled={isUsed}
                                                        className={`px-8 py-5 rounded-2xl border-2 font-semibold text-lg md:text-xl transition-all shadow-md ${isUsed
                                                            ? 'bg-slate-100 border-slate-200 text-slate-300 opacity-50'
                                                            : 'bg-white border-slate-300 text-slate-700 hover:scale-105 hover:shadow-xl hover:border-amber-500 hover:bg-amber-50 cursor-pointer active:scale-95'
                                                            }`}
                                                    >
                                                        {item}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer Info */}
                        <div className="absolute bottom-4 right-6 flex items-center space-x-4 text-slate-400 text-xs font-medium">
                            <span className="flex items-center">📝 {dateStr}</span>
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-500">v2026</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Floating Controls */}
            <div className="fixed bottom-6 left-6 z-50 flex flex-col space-y-3">
                <button
                    onClick={onExit}
                    className="w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center text-slate-500 border-2 border-slate-100 hover:text-red-500 hover:border-red-200 transition-colors"
                    title="Thoát"
                >
                    🚪
                </button>
            </div>
        </div>
    );
};

export default IoeStudentView;
