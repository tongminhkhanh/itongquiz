import React, { useState, useEffect, useCallback } from 'react';
import { Quiz, QuestionType, StudentResult, Question } from '../types';
import {
    AccessCodeForm,
    StudentInfoForm,
    ResultScreen
} from './student';
import { formatMathText, formatHtmlText } from '../utils/formatters';

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
        setShuffledQuestions(shuffleArray(quiz.questions));
        setStartTime(Date.now());
        setStep('quiz');
    };

    const handleAnswerChange = (questionId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

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
                const correctOrder = (q as any).correctOrder || [];
                if (JSON.stringify(studentAns) === JSON.stringify(correctOrder)) correctCount++;
            }
        });

        // IOE Scoring: Mỗi câu đúng = 10 điểm
        const score = correctCount * 10;
        return { score, correctCount, totalItems };
    }, [shuffledQuestions, answers]);

    const handleSubmit = useCallback(() => {
        const { score, correctCount, totalItems } = calculateScore();
        const timeTaken = Math.round((Date.now() - startTime) / 60000);

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
            answers
        };

        setResult(resultData);
        onSaveResult(resultData);
        setStep('result');
    }, [calculateScore, startTime, quiz, studentName, studentClass, answers, onSaveResult]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const currentQuestion = shuffledQuestions[currentIndex];

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

        if (currentAns.includes(itemIndex)) {
            const newAns = currentAns.filter(i => i !== itemIndex);
            handleAnswerChange(currentQuestion.id, newAns);
        } else {
            const newAns = [...currentAns, itemIndex];
            handleAnswerChange(currentQuestion.id, newAns);
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
                        <h1 className="text-lg md:text-xl font-bold text-slate-700 tracking-tight">
                            {quiz.title}
                        </h1>
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
                <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-2">
                    {/* Prev Button */}
                    <button
                        onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                        disabled={currentIndex === 0}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-400 border-2 border-slate-200 hover:border-sky-400 hover:text-sky-400 transition-colors disabled:opacity-30"
                    >
                        ◀
                    </button>

                    {/* Question Numbers */}
                    <div className="flex flex-wrap justify-center gap-1.5 px-3 py-2 bg-white/50 rounded-3xl backdrop-blur-sm">
                        {shuffledQuestions.map((q, idx) => {
                            const isAnswered = isQuestionAnswered(q);
                            const isCurrent = idx === currentIndex;

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`w-9 h-9 flex items-center justify-center rounded-xl font-bold text-sm transition-all ${isCurrent
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
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-400 border-2 border-slate-200 hover:border-sky-400 hover:text-sky-400 transition-colors disabled:opacity-30"
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

                        {/* Sparkle Icon */}
                        <span className="absolute top-8 left-8 text-3xl text-sky-400">✨</span>

                        {currentQuestion && (
                            <div className="w-full max-w-4xl">
                                {/* Question Text - Skip for SHORT_ANSWER since it's rendered inline */}
                                {currentQuestion.type !== QuestionType.SHORT_ANSWER && (
                                    <div className="text-center mb-10">
                                        <h2
                                            className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-700 leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: formatHtmlText((currentQuestion as any).question || (currentQuestion as any).mainQuestion || '') }}
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
                                                        // Extract full sentence from explanation
                                                        const explanation = (currentQuestion as any).explanation || '';
                                                        // Try to get sentence after "Full sentence:" or use explanation directly
                                                        const fullSentenceMatch = explanation.match(/Full sentence:\s*(.+)/i);
                                                        const textToSpeak = fullSentenceMatch
                                                            ? fullSentenceMatch[1].trim()
                                                            : explanation.replace(/Full sentence:/i, '').trim();

                                                        if (textToSpeak && 'speechSynthesis' in window) {
                                                            // Cancel any ongoing speech
                                                            window.speechSynthesis.cancel();

                                                            const utterance = new SpeechSynthesisUtterance(textToSpeak);
                                                            utterance.lang = 'en-US';
                                                            utterance.rate = 0.85; // Slightly slower for kids
                                                            utterance.pitch = 1;
                                                            window.speechSynthesis.speak(utterance);
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
                                                const cleanQuestion = questionText.replace(/🎧\s*/g, '').replace(/Listen and fill:\s*/gi, '');
                                                // Check if question has underscore/placeholder pattern
                                                const hasPlaceholder = /_+|\[\.{2,}\]|\[…\]/.test(cleanQuestion);

                                                if (hasPlaceholder) {
                                                    // Split by underscore patterns: _, __, ___, ____, or [...] 
                                                    const parts = cleanQuestion.split(/(_+|\[\.{2,}\]|\[…\])/);

                                                    return parts.map((part: string, idx: number) => {
                                                        // Check if this part is a blank placeholder
                                                        if (/^_+$/.test(part) || /^\[\.{2,}\]$/.test(part) || /^\[…\]$/.test(part)) {
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
                                                        className="w-32 md:w-36 h-20 md:h-24 rounded-2xl border-3 border-dashed border-amber-400 bg-amber-50 flex items-center justify-center cursor-pointer hover:bg-amber-100 hover:border-amber-500 transition-all shadow-sm"
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
