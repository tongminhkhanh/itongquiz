import React, { useState, useEffect } from 'react';
import { Quiz, QuestionType, StudentResult, Question } from '../types';
import { CheckCircle } from 'lucide-react';
import {
  AccessCodeForm,
  StudentInfoForm,
  SubmitConfirmModal,
  ResultScreen,
  QuestionRenderer
} from './student';

interface Props {
  quiz: Quiz;
  onExit: () => void;
  onSaveResult: (result: StudentResult) => void;
}

const StudentView: React.FC<Props> = ({ quiz, onExit, onSaveResult }) => {
  // Determine initial step based on whether quiz requires access code
  const [step, setStep] = useState<'code' | 'info' | 'quiz' | 'result'>(
    quiz.requireCode ? 'code' : 'info'
  );
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');

  // Access code verification state
  const [enteredCode, setEnteredCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimit * 60);
  const [startTime, setStartTime] = useState<number>(0);
  const [result, setResult] = useState<StudentResult | null>(null);

  // Shuffled questions for random order
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fisher-Yates shuffle algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Timer logic
  useEffect(() => {
    if (step === 'quiz' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (step === 'quiz' && timeLeft === 0) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, timeLeft]);

  // Prevent refresh (F5) and navigation away during quiz
  useEffect(() => {
    if (step === 'quiz') {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'Bạn đang làm bài! Nếu rời đi, bài làm sẽ bị mất. Bạn có chắc muốn thoát?';
        return e.returnValue;
      };

      const handlePopState = (e: PopStateEvent) => {
        e.preventDefault();
        const confirmLeave = window.confirm('Bạn đang làm bài! Nếu quay lại, bài làm sẽ bị mất. Bạn có chắc muốn thoát?');
        if (!confirmLeave) {
          window.history.pushState(null, '', window.location.href);
        } else {
          onExit();
        }
      };

      window.history.pushState(null, '', window.location.href);
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [step, onExit]);

  const handleStart = () => {
    if (!studentName || !studentClass) return;
    setShuffledQuestions(shuffleArray(quiz.questions));
    setStartTime(Date.now());
    setStep('quiz');
  };

  const handleCodeVerify = () => {
    if (enteredCode.toUpperCase() === quiz.accessCode?.toUpperCase()) {
      setCodeError('');
      setStep('info');
    } else {
      setCodeError('Mã không đúng. Vui lòng thử lại!');
    }
  };

  const handleAnswerChange = (questionId: string, value: any, subId?: string) => {
    if (subId) {
      setAnswers(prev => ({
        ...prev,
        [questionId]: {
          ...(prev[questionId] || {}),
          [subId]: value
        }
      }));
    } else {
      setAnswers(prev => ({ ...prev, [questionId]: value }));
    }
  };

  const handleMatchingClick = (questionId: string, item: string, type: 'left' | 'right') => {
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
  };

  const calculateScore = () => {
    let correctCount = 0;
    let totalItems = 0;

    quiz.questions.forEach(q => {
      if (q.type === QuestionType.MCQ) {
        totalItems++;
        if (answers[q.id] === q.correctAnswer) correctCount++;
      } else if (q.type === QuestionType.SHORT_ANSWER) {
        totalItems++;
        const studentAns = (answers[q.id] || "").toString().trim().toLowerCase();
        const correctAns = q.correctAnswer.toString().trim().toLowerCase();
        if (studentAns === correctAns) correctCount++;
      } else if (q.type === QuestionType.TRUE_FALSE) {
        totalItems++;
        let allSubItemsCorrect = true;
        q.items.forEach((item, idx) => {
          const itemKey = item.id || `item-${idx}`;
          const studentAns = answers[q.id]?.[itemKey];
          if (studentAns !== item.isCorrect) {
            allSubItemsCorrect = false;
          }
        });
        if (allSubItemsCorrect) correctCount++;
      } else if (q.type === QuestionType.MATCHING) {
        totalItems++;
        const userPairs = answers[q.id] || {};
        const correctPairs = q.pairs;
        let isAllCorrect = true;
        const actualUserPairsCount = Object.keys(userPairs).filter(key => key !== 'selectedLeft').length;
        if (actualUserPairsCount !== correctPairs.length) {
          isAllCorrect = false;
        } else {
          for (const correctPair of correctPairs) {
            const studentRight = userPairs[correctPair.left];
            if (studentRight !== correctPair.right) {
              isAllCorrect = false;
              break;
            }
          }
        }
        if (isAllCorrect) correctCount++;
      } else if (q.type === QuestionType.MULTIPLE_SELECT) {
        totalItems++;
        const studentAns = (answers[q.id] as string[]) || [];
        const correctAns = q.correctAnswers || [];
        const isCorrect = studentAns.length === correctAns.length &&
          studentAns.every(val => correctAns.includes(val));
        if (isCorrect) correctCount++;
      } else if (q.type === QuestionType.DRAG_DROP) {
        totalItems++;
        const studentAns = (answers[q.id] as Record<number, string>) || {};
        const text = q.text || "";
        const parts = text.split(/(\[.*?\])/g);
        const blanks: number[] = [];
        parts.forEach((part, idx) => {
          if (part.startsWith('[') && part.endsWith(']')) {
            blanks.push(idx);
          }
        });

        let allCorrect = true;
        blanks.forEach((blankIdx, i) => {
          const correctWord = q.blanks[i];
          const studentWord = studentAns[blankIdx];
          if (studentWord !== correctWord) {
            allCorrect = false;
          }
        });

        if (allCorrect && blanks.length > 0) correctCount++;
      } else if (q.type === QuestionType.ORDERING) {
        totalItems++;
        const studentAns = (answers[q.id] as Record<number, number>) || {};
        const correctOrder = (q as any).correctOrder || [];
        const items = (q as any).items || [];

        // Check if student's ordering matches correct order
        // correctOrder[i] = index in items array that should be at position i+1
        let allCorrect = true;
        for (let i = 0; i < correctOrder.length; i++) {
          const expectedItemIndex = correctOrder[i];
          const studentOrder = studentAns[expectedItemIndex];
          // studentOrder should be i+1 (1-indexed position)
          if (studentOrder !== i + 1) {
            allCorrect = false;
            break;
          }
        }
        if (allCorrect && items.length > 0) correctCount++;
      }
    });

    const score = totalItems === 0 ? 0 : (correctCount / totalItems) * 10;
    return { score: parseFloat(score.toFixed(1)), correctCount, totalItems };
  };

  const handleSubmit = () => {
    const { score, correctCount, totalItems } = calculateScore();
    const timeTaken = Math.round((Date.now() - startTime) / 60000);

    const resultData: StudentResult = {
      id: crypto.randomUUID(),
      quizId: quiz.id,
      quizTitle: quiz.title, // ✅ Thêm quizTitle để lưu vào Google Sheets
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
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Check if question is answered (for sidebar)
  const isQuestionAnswered = (q: Question) => {
    if (q.type === QuestionType.TRUE_FALSE) {
      return q.items.every((item, idx) => {
        const itemKey = item.id || `item-${idx}`;
        return answers[q.id]?.[itemKey] !== undefined;
      });
    } else if (q.type === QuestionType.MATCHING) {
      const userPairs = answers[q.id] || {};
      const pairedCount = Object.keys(userPairs).filter(k => k !== 'selectedLeft').length;
      return pairedCount === q.pairs.length;
    } else if (q.type === QuestionType.MULTIPLE_SELECT) {
      return (answers[q.id] as string[])?.length > 0;
    } else if (q.type === QuestionType.DRAG_DROP) {
      const text = (q as any).text || "";
      const parts = text.split(/(\[.*?\])/g);
      const blanks: number[] = [];
      parts.forEach((part: string, idx: number) => {
        if (part.startsWith('[') && part.endsWith(']')) {
          blanks.push(idx);
        }
      });
      const currentAnswers = (answers[q.id] as Record<number, string>) || {};
      return blanks.length > 0 && blanks.every(idx => currentAnswers[idx] !== undefined);
    }
    return !!answers[q.id];
  };

  // ACCESS CODE VIEW
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

  // STUDENT INFO VIEW
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

  // RESULT VIEW
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

  // QUIZ TAKING VIEW
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{quiz.title}</h1>
          <p className="text-lg text-gray-500 mt-1">
            Thí sinh: <span className="font-semibold text-gray-700">{studentName}</span> -
            Lớp: <span className="font-semibold text-gray-700">{studentClass}</span>
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6">
        {/* Questions */}
        <div className="flex-1 space-y-6 pb-20 md:pb-0">
          {shuffledQuestions.map((q, index) => (
            <QuestionRenderer
              key={q.id}
              question={q}
              index={index}
              answers={answers}
              onAnswerChange={handleAnswerChange}
              onMatchingClick={handleMatchingClick}
            />
          ))}
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-80 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky top-24">
            <div className="text-center mb-6">
              <p className="text-sm text-gray-500 mb-1">Thời gian còn lại</p>
              <div className="text-3xl font-mono font-bold text-orange-600 bg-orange-50 py-2 rounded-lg border border-orange-100">
                {formatTime(timeLeft)}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-bold text-gray-700 mb-3 flex justify-between">
                <span>Danh sách câu hỏi</span>
                <span className="text-gray-400 font-normal">{Object.keys(answers).length}/{shuffledQuestions.length}</span>
              </p>
              <div className="grid grid-cols-5 gap-2">
                {shuffledQuestions.map((q, index) => {
                  const isAnswered = isQuestionAnswered(q);
                  return (
                    <button
                      key={q.id}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(`question-${index}`)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`h-10 w-10 flex items-center justify-center rounded-full text-sm font-bold transition-all ${isAnswered
                        ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setShowConfirmModal(true)}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center"
            >
              <CheckCircle className="w-5 h-5 mr-2" /> NỘP BÀI
            </button>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      <SubmitConfirmModal
        isOpen={showConfirmModal}
        unansweredCount={shuffledQuestions.length - Object.keys(answers).length}
        onConfirm={() => {
          setShowConfirmModal(false);
          handleSubmit();
        }}
        onCancel={() => setShowConfirmModal(false)}
      />

      {/* Mobile Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-10 flex justify-center md:hidden">
        <button
          onClick={() => setShowConfirmModal(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-12 rounded-full shadow-lg text-lg transform transition-transform hover:scale-105"
        >
          NỘP BÀI
        </button>
      </div>
    </div>
  );
};

export default StudentView;
