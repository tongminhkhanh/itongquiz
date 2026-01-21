import React, { useState, useEffect, useCallback } from 'react';
import { Quiz, QuestionType, StudentResult, Question } from '../types';
import {
    AccessCodeForm,
    StudentInfoForm,
    ResultScreen
} from './student';
import { formatMathText } from '../utils/formatters';

interface Props {
    quiz: Quiz;
    onExit: () => void;
    onSaveResult: (result: StudentResult) => void;
}

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

    // For ORDERING - drag and drop state
    const [orderingAnswer, setOrderingAnswer] = useState<number[]>([]);

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
                e.returnValue = 'Bạn đang làm bài IOE! Nếu thoát, bài làm sẽ mất.';
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

        const score = totalItems === 0 ? 0 : (correctCount / totalItems) * 10;
        return { score: parseFloat(score.toFixed(1)), correctCount, totalItems };
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
            // Remove from answer
            const newAns = currentAns.filter(i => i !== itemIndex);
            handleAnswerChange(currentQuestion.id, newAns);
        } else {
            // Add to answer
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
    const dateStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    // IOE QUIZ INTERFACE - Official Style
    return (
        <div className="min-h-screen bg-[#d4b896] p-2 md:p-4">
            {/* Wooden Frame Border */}
            <div className="rounded-lg overflow-hidden shadow-2xl" style={{
                border: '12px solid #b8956e',
                borderImage: 'linear-gradient(135deg, #d4b896 0%, #a67c52 50%, #8b6914 100%) 1',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3), 0 10px 30px rgba(0,0,0,0.4)'
            }}>
                {/* Header Bar - Cream/Beige */}
                <div className="bg-gradient-to-b from-[#f5e6d3] to-[#e8d4bc] px-4 py-3 flex items-center justify-between border-b-4 border-[#b8956e]">
                    {/* Left: IOE Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-[#1a3a5c] border-2 border-[#c9a227] flex items-center justify-center">
                            <span className="text-[#c9a227] font-bold text-sm">IOE</span>
                        </div>
                    </div>

                    {/* Center: Title + Timer */}
                    <div className="text-center flex-1">
                        <h1 className="text-[#1a3a5c] font-bold text-lg md:text-xl">{quiz.title}</h1>
                        <div className="flex items-center justify-center gap-2 text-[#b8956e]">
                            <span className="text-2xl">⏰</span>
                            <span className="font-mono font-bold text-xl text-[#1a3a5c]">{formatTime(timeLeft)}</span>
                        </div>
                    </div>

                    {/* Right: Student Info + Submit */}
                    <div className="text-right">
                        <p className="font-bold text-[#1a3a5c]">{studentName}</p>
                        <p className="text-xs text-[#8b6914]">ID: {studentClass}</p>
                        <button
                            onClick={handleSubmit}
                            className="mt-1 px-4 py-1 bg-[#f5e6d3] border-2 border-[#1a3a5c] rounded font-bold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white transition-all flex items-center gap-1"
                        >
                            SUBMIT <span>⬇</span>
                        </button>
                    </div>
                </div>

                {/* Sub Header - Date/Time */}
                <div className="bg-[#e8d4bc] px-4 py-1 text-right text-sm text-[#8b6914] border-b border-[#b8956e]">
                    {dateStr}
                </div>

                {/* Main Content Area - Dark Blue Chalkboard */}
                <div className="bg-[#1a3a5c] min-h-[60vh] p-4 md:p-6 relative">
                    {/* Navigation Bar with Pentagon Badges */}
                    <div className="flex items-center justify-center gap-1 mb-6 flex-wrap">
                        <button
                            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                            disabled={currentIndex === 0}
                            className="w-8 h-8 bg-[#2a4a6c] text-white rounded flex items-center justify-center disabled:opacity-30"
                        >
                            ◀
                        </button>

                        {shuffledQuestions.map((q, idx) => {
                            const isAnswered = isQuestionAnswered(q);
                            const isCurrent = idx === currentIndex;

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`w-9 h-9 text-sm font-bold transition-all ${isCurrent
                                        ? 'bg-[#c9a227] text-[#1a3a5c] scale-110 shadow-lg'
                                        : isAnswered
                                            ? 'bg-green-500 text-white'
                                            : 'bg-[#3a5a7c] text-white hover:bg-[#4a6a8c]'
                                        }`}
                                    style={{
                                        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
                                    }}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => setCurrentIndex(Math.min(shuffledQuestions.length - 1, currentIndex + 1))}
                            disabled={currentIndex === shuffledQuestions.length - 1}
                            className="w-8 h-8 bg-[#2a4a6c] text-white rounded flex items-center justify-center disabled:opacity-30"
                        >
                            ▶
                        </button>
                    </div>

                    {/* Question Content */}
                    {currentQuestion && (
                        <div className="max-w-4xl mx-auto">
                            {/* ORDERING Question - Card Style like IOE */}
                            {currentQuestion.type === QuestionType.ORDERING && (
                                <div className="space-y-6">
                                    {/* Question Text */}
                                    <div className="text-white text-center text-lg mb-4">
                                        {formatMathText((currentQuestion as any).question || 'Arrange the words to make a correct sentence:')}
                                    </div>

                                    {/* Answer Slots (top row with ?) */}
                                    <div className="flex justify-center gap-4 mb-8">
                                        {((currentQuestion as any).items || []).map((_: string, idx: number) => {
                                            const selectedItems = (answers[currentQuestion.id] as number[]) || [];
                                            const itemAtSlot = selectedItems[idx];
                                            const word = itemAtSlot !== undefined ? ((currentQuestion as any).items || [])[itemAtSlot] : null;

                                            return (
                                                <div
                                                    key={`slot-${idx}`}
                                                    className="w-28 h-20 rounded-lg border-2 border-dashed border-[#c9a227] bg-[#0d2137] flex items-center justify-center"
                                                    onClick={() => {
                                                        if (itemAtSlot !== undefined) {
                                                            // Remove this item from answer
                                                            const newAns = selectedItems.filter((_, i) => i !== idx);
                                                            handleAnswerChange(currentQuestion.id, newAns);
                                                        }
                                                    }}
                                                >
                                                    {word ? (
                                                        <span className="text-white font-medium text-center px-2">{word}</span>
                                                    ) : (
                                                        <span className="text-[#c9a227] text-4xl font-bold">?</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Word Cards (bottom row) */}
                                    <div className="flex justify-center gap-4 flex-wrap">
                                        {((currentQuestion as any).items || []).map((item: string, idx: number) => {
                                            const selectedItems = (answers[currentQuestion.id] as number[]) || [];
                                            const isUsed = selectedItems.includes(idx);

                                            return (
                                                <button
                                                    key={`card-${idx}`}
                                                    onClick={() => {
                                                        if (!isUsed) {
                                                            handleOrderingCardClick(idx);
                                                        }
                                                    }}
                                                    disabled={isUsed}
                                                    className={`px-6 py-4 rounded-lg border-2 font-medium transition-all ${isUsed
                                                        ? 'bg-[#2a4a6c] border-[#3a5a7c] text-gray-500 opacity-50'
                                                        : 'bg-gradient-to-b from-[#f5e6d3] to-[#e8d4bc] border-[#b8956e] text-[#1a3a5c] hover:scale-105 hover:shadow-lg cursor-pointer'
                                                        }`}
                                                    style={{
                                                        boxShadow: isUsed ? 'none' : 'inset 0 -4px 0 rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.2)'
                                                    }}
                                                >
                                                    {item}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Answer Button */}
                                    <div className="flex justify-center mt-8">
                                        <button
                                            onClick={() => setCurrentIndex(Math.min(shuffledQuestions.length - 1, currentIndex + 1))}
                                            className="px-12 py-3 bg-gradient-to-b from-[#c9a227] to-[#a67c52] text-[#1a3a5c] font-bold text-lg rounded-lg shadow-lg hover:from-[#d4b02f] hover:to-[#b8956e] transition-all uppercase tracking-wide"
                                            style={{
                                                boxShadow: '0 4px 0 #7a5a1a, 0 8px 16px rgba(0,0,0,0.3)'
                                            }}
                                        >
                                            ANSWER
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* MCQ Question */}
                            {(currentQuestion.type === QuestionType.MCQ || currentQuestion.type === QuestionType.IMAGE_QUESTION) && (
                                <div className="space-y-6">
                                    {/* Question Image */}
                                    {(currentQuestion as any).image && (
                                        <div className="flex justify-center mb-4">
                                            <img
                                                src={(currentQuestion as any).image}
                                                alt="Question"
                                                className="max-h-48 rounded-lg border-2 border-[#c9a227]"
                                            />
                                        </div>
                                    )}

                                    {/* Question Text */}
                                    <div className="text-white text-center text-xl font-medium mb-6" style={{ whiteSpace: 'pre-wrap' }}>
                                        {formatMathText((currentQuestion as any).question || '')}
                                    </div>

                                    {/* Options as Cards */}
                                    <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                                        {((currentQuestion as any).options || []).map((opt: string, idx: number) => {
                                            const label = String.fromCharCode(65 + idx);
                                            const isSelected = answers[currentQuestion.id] === label;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        handleAnswerChange(currentQuestion.id, label);
                                                        // Auto advance after short delay
                                                        if (currentIndex < shuffledQuestions.length - 1) {
                                                            setTimeout(() => {
                                                                setCurrentIndex(prev => prev + 1);
                                                            }, 300);
                                                        }
                                                    }}
                                                    className={`p-4 rounded-lg border-2 text-left transition-all ${isSelected
                                                        ? 'bg-[#c9a227] border-[#c9a227] text-[#1a3a5c]'
                                                        : 'bg-gradient-to-b from-[#f5e6d3] to-[#e8d4bc] border-[#b8956e] text-[#1a3a5c] hover:scale-102'
                                                        }`}
                                                    style={{
                                                        boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.2)'
                                                    }}
                                                >
                                                    <span className="font-bold">{label}.</span> {formatMathText(opt.replace(/^[A-D]\.\s*/, ''))}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Short Answer */}
                            {currentQuestion.type === QuestionType.SHORT_ANSWER && (
                                <div className="space-y-6 text-center">
                                    <div className="text-white text-xl font-medium mb-6" style={{ whiteSpace: 'pre-wrap' }}>
                                        {formatMathText((currentQuestion as any).question || '')}
                                    </div>
                                    <input
                                        type="text"
                                        value={answers[currentQuestion.id] || ''}
                                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                        placeholder="Type your answer..."
                                        className="w-full max-w-md mx-auto p-4 text-center text-xl font-bold bg-gradient-to-b from-[#f5e6d3] to-[#e8d4bc] border-2 border-[#b8956e] rounded-lg text-[#1a3a5c] placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-[#c9a227]/50"
                                    />
                                </div>
                            )}

                            {/* TRUE/FALSE */}
                            {currentQuestion.type === QuestionType.TRUE_FALSE && (
                                <div className="space-y-4">
                                    <div className="text-white text-lg mb-4" style={{ whiteSpace: 'pre-wrap' }}>
                                        {formatMathText((currentQuestion as any).mainQuestion || '')}
                                    </div>
                                    {currentQuestion.items.map((item, i) => {
                                        const itemKey = item.id || `item-${i}`;
                                        const val = answers[currentQuestion.id]?.[itemKey];
                                        return (
                                            <div key={itemKey} className="flex items-center justify-between bg-gradient-to-b from-[#f5e6d3] to-[#e8d4bc] p-4 rounded-lg border-2 border-[#b8956e]">
                                                <span className="text-[#1a3a5c] flex-1 mr-4 font-medium">
                                                    {String.fromCharCode(97 + i)}. {formatMathText(item.statement)}
                                                </span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleAnswerChange(currentQuestion.id, { ...answers[currentQuestion.id], [itemKey]: true })}
                                                        className={`px-4 py-2 rounded-lg font-bold transition-all ${val === true
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-[#1a3a5c] text-white hover:bg-green-500/70'
                                                            }`}
                                                    >
                                                        TRUE
                                                    </button>
                                                    <button
                                                        onClick={() => handleAnswerChange(currentQuestion.id, { ...answers[currentQuestion.id], [itemKey]: false })}
                                                        className={`px-4 py-2 rounded-lg font-bold transition-all ${val === false
                                                            ? 'bg-red-500 text-white'
                                                            : 'bg-[#1a3a5c] text-white hover:bg-red-500/70'
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
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-[#b8956e] px-4 py-2 text-right text-xs text-[#1a3a5c]">
                    v2026 • IOE Practice
                </div>
            </div>
        </div>
    );
};

export default IoeStudentView;
