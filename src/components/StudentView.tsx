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
import { validateAnswersOnServer } from '../services/quizValidationService';

interface Props {
  quiz: Quiz;
  onExit: () => void;
  onSaveResult: (result: StudentResult) => void | Promise<void>;
}

const StudentView: React.FC<Props> = ({ quiz, onExit, onSaveResult }) => {
  // DEBUG: Log quiz data to see structure
  console.log('🎓 StudentView quiz data:', JSON.stringify(quiz, null, 2));
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Pagination: 10 câu/trang
  const QUESTIONS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(shuffledQuestions.length / QUESTIONS_PER_PAGE);
  const startIndex = (currentPage - 1) * QUESTIONS_PER_PAGE;
  const endIndex = startIndex + QUESTIONS_PER_PAGE;
  const questionsOnCurrentPage = shuffledQuestions.slice(startIndex, endIndex);

  // UUID generator fallback (crypto.randomUUID not supported in all browsers/HTTP)
  const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback for older browsers or HTTP
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

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
        const questionText = (q as any).question || "";
        const hasInlineBlanks = /\[blank\]|\[_+\]|_{3,}|\[\d+\]/.test(questionText);

        if (hasInlineBlanks) {
          // Inline blanks mode: check each blank
          const studentAns = (answers[q.id] as Record<number, string>) || {};
          const correctAnswers = (q as any).correctAnswers || []; // Array of correct answers
          let allCorrect = true;

          for (let i = 0; i < correctAnswers.length; i++) {
            const studentVal = (studentAns[i] || "").toString().trim().toLowerCase();
            const correctVal = correctAnswers[i].toString().trim().toLowerCase();
            // Support multiple correct answers separated by |
            const correctOptions = correctVal.split('|').map((s: string) => s.trim());
            if (!correctOptions.includes(studentVal)) {
              allCorrect = false;
              break;
            }
          }

          if (allCorrect && correctAnswers.length > 0) correctCount++;
        } else {
          // Legacy mode: single answer
          const studentAns = (answers[q.id] || "").toString().trim().toLowerCase();
          const correctAns = q.correctAnswer.toString().trim().toLowerCase();
          // Support multiple correct answers separated by |
          const correctOptions = correctAns.split('|').map((s: string) => s.trim());
          if (correctOptions.includes(studentAns)) correctCount++;
        }
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
      } else if (q.type === QuestionType.IMAGE_QUESTION) {
        // Giống MCQ - so sánh đáp án đã chọn với correctAnswer
        totalItems++;
        if (answers[q.id] === (q as any).correctAnswer) correctCount++;
      } else if (q.type === QuestionType.DROPDOWN) {
        // Kiểm tra tất cả dropdown đã chọn đúng
        totalItems++;
        const studentAns = (answers[q.id] as Record<string, string>) || {};
        const blanks = (q as any).blanks || [];
        let allCorrect = true;

        for (const blank of blanks) {
          if (studentAns[blank.id] !== blank.correctAnswer) {
            allCorrect = false;
            break;
          }
        }

        if (allCorrect && blanks.length > 0) correctCount++;
      } else if (q.type === QuestionType.UNDERLINE) {
        // Kiểm tra các từ đã gạch chân có khớp với đáp án đúng không
        totalItems++;
        const studentSelection = (answers[q.id] as number[]) || [];
        const correctIndexes = (q as any).correctWordIndexes || [];

        // So sánh 2 mảng (sorted)
        const studentSorted = [...studentSelection].sort((a, b) => a - b);
        const correctSorted = [...correctIndexes].sort((a, b) => a - b);

        const isCorrect = studentSorted.length === correctSorted.length &&
          studentSorted.every((val, idx) => val === correctSorted[idx]);

        if (isCorrect) correctCount++;
      } else if (q.type === QuestionType.CATEGORIZATION) {
        // Kiểm tra tất cả items đã được phân loại đúng
        totalItems++;
        const studentAns = (answers[q.id] as Record<string, string>) || {};
        const items = (q as any).items || [];

        let allCorrect = true;
        for (const item of items) {
          const studentCatId = studentAns[item.id];
          // Nếu item không thuộc nhóm nào (categoryId rỗng), học sinh không nên xếp vào đâu cả
          if (item.categoryId === '' || item.categoryId === null || item.categoryId === undefined) {
            // Item này không thuộc nhóm nào, học sinh không nên phân loại nó
            if (studentCatId) {
              allCorrect = false;
              break;
            }
          } else {
            // Item thuộc một nhóm, kiểm tra học sinh có xếp đúng không
            if (studentCatId !== item.categoryId) {
              allCorrect = false;
              break;
            }
          }
        }

        if (allCorrect && items.length > 0) correctCount++;
      } else if (q.type === QuestionType.WORD_SCRAMBLE) {
        // Kiểm tra học sinh đã sắp xếp chữ cái đúng thành từ chưa
        totalItems++;
        const letters = (q as any).letters || [];
        const correctWord = ((q as any).correctWord || '').toLowerCase().replace(/\s+/g, '');
        const studentSelection = (answers[q.id] as number[]) || [];

        // Build student's word from selected letter indices
        const studentWord = studentSelection.map((idx: number) => letters[idx]).join('').toLowerCase();

        if (studentWord === correctWord) correctCount++;
      } else if (q.type === QuestionType.RIDDLE) {
        // So sánh 1 đáp án (từ gốc hoặc từ biến đổi tùy theo câu hỏi)
        totalItems++;
        const correctAns = ((q as any).correctAnswer || '').toLowerCase().trim();
        const studentAns = (answers[q.id] || '').toString().toLowerCase().trim();

        if (studentAns === correctAns) correctCount++;
      }
    });

    const score = totalItems === 0 ? 0 : (correctCount / totalItems) * 10;
    return { score: parseFloat(score.toFixed(1)), correctCount, totalItems };
  };

  const handleSubmit = async () => {
    // Prevent double submit
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const timeTaken = Math.round((Date.now() - startTime) / 60000);

    try {
      // 🔐 ANTI-CHEAT: Validate answers on server
      // Server will calculate score and return correct answers
      const validationResult = await validateAnswersOnServer({
        quizId: quiz.id,
        answers,
        studentName,
        studentClass
      });

      if (!validationResult.success) {
        throw new Error(validationResult.error || 'Server validation failed');
      }

      // Use server-calculated score
      const score = validationResult.score;
      const correctCount = validationResult.correctCount;
      const totalItems = validationResult.total;
      console.log('✅ Server validation successful:', validationResult);

      const resultData: StudentResult = {
        id: generateUUID(),
        quizId: quiz.id,
        quizTitle: quiz.title,
        studentName,
        studentClass,
        score,
        correctCount,
        totalQuestions: totalItems,
        timeTaken,
        submittedAt: new Date().toISOString(),
        answers,
        validationDetails: validationResult.details // Store server validation details
      };

      // Save result
      await onSaveResult(resultData);
      setResult(resultData);
      setStep('result');
    } catch (error: any) {
      console.error('🚨 Submit failed:', error);
      setSubmitError('Lỗi khi nộp bài! Vui lòng thử lại. ' + (error.message || ''));
      // 🔐 Cannot use local fallback - answers are stripped for security
      // User must retry submission
    } finally {
      setIsSubmitting(false);
    }
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
    } else if (q.type === QuestionType.IMAGE_QUESTION) {
      // Giống MCQ - chỉ cần có đáp án
      return !!answers[q.id];
    } else if (q.type === QuestionType.DROPDOWN) {
      // Kiểm tra tất cả dropdown đã được chọn
      const blanks = (q as any).blanks || [];
      const currentAnswers = (answers[q.id] as Record<string, string>) || {};
      return blanks.length > 0 && blanks.every((b: any) => currentAnswers[b.id]);
    } else if (q.type === QuestionType.UNDERLINE) {
      // Kiểm tra có chọn ít nhất 1 từ
      const selectedIndexes = (answers[q.id] as number[]) || [];
      return selectedIndexes.length > 0;
    } else if (q.type === QuestionType.SHORT_ANSWER) {
      // Check for inline blanks
      const questionText = (q as any).question || "";
      const hasInlineBlanks = /\[blank\]|\[_+\]|_{3,}|\[\d+\]/.test(questionText);
      if (hasInlineBlanks) {
        const parts = questionText.split(/(\[blank\]|\[_+\]|_{3,}|\[\d+\])/g);
        const blankCount = parts.filter((p: string) => /^\[blank\]$|\[_+\]$|^_{3,}$|^\[\d+\]$/.test(p)).length;
        const currentAnswers = (answers[q.id] as Record<number, string>) || {};
        const filledCount = Object.values(currentAnswers).filter(v => v).length;
        return filledCount >= blankCount;
      }
      return !!answers[q.id];
    } else if (q.type === QuestionType.CATEGORIZATION) {
      // Kiểm tra có phân loại ít nhất 1 item
      const currentAnswers = (answers[q.id] as Record<string, string>) || {};
      // Loại bỏ _selected khỏi count
      const placedCount = Object.keys(currentAnswers).filter(k => k !== '_selected').length;
      return placedCount > 0;
    } else if (q.type === QuestionType.WORD_SCRAMBLE) {
      // Kiểm tra đã chọn ít nhất 1 chữ cái
      const letters = (q as any).letters || [];
      const currentAnswer = (answers[q.id] as number[]) || [];
      return currentAnswer.length === letters.length; // Phải chọn đủ số chữ cái
    } else if (q.type === QuestionType.RIDDLE) {
      // Kiểm tra đã nhập đáp án chưa
      const currentAnswer = (answers[q.id] || '').toString().trim();
      return currentAnswer.length > 0;
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
          {questionsOnCurrentPage.map((q, index) => (
            <QuestionRenderer
              key={q.id}
              question={q}
              index={startIndex + index}
              answers={answers}
              onAnswerChange={handleAnswerChange}
              onMatchingClick={handleMatchingClick}
            />
          ))}

          {/* Pagination Navigation */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-6 bg-white rounded-xl shadow-sm border border-gray-200">
              <button
                onClick={() => {
                  setCurrentPage(prev => Math.max(1, prev - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
              >
                ← Trang trước
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => {
                      setCurrentPage(page);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-10 h-10 rounded-full font-bold transition-all ${currentPage === page
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setCurrentPage(prev => Math.min(totalPages, prev + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
              >
                Trang sau →
              </button>
            </div>
          )}
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
              {/* Page indicator */}
              {totalPages > 1 && (
                <p className="text-xs text-center text-blue-600 mb-2 bg-blue-50 py-1 rounded-lg">
                  Trang {currentPage}/{totalPages}
                </p>
              )}
              <div className="grid grid-cols-5 gap-2">
                {shuffledQuestions.map((q, index) => {
                  const isAnswered = isQuestionAnswered(q);
                  const questionPage = Math.floor(index / QUESTIONS_PER_PAGE) + 1;
                  const isOnCurrentPage = questionPage === currentPage;
                  return (
                    <button
                      key={q.id}
                      onClick={(e) => {
                        e.preventDefault();
                        // Chuyển trang nếu câu hỏi ở trang khác
                        if (!isOnCurrentPage) {
                          setCurrentPage(questionPage);
                        }
                        // Scroll sau khi chuyển trang
                        setTimeout(() => {
                          document.getElementById(`question-${index}`)?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className={`h-10 w-10 flex items-center justify-center rounded-full text-sm font-bold transition-all ${isAnswered
                        ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600'
                        : isOnCurrentPage
                          ? 'bg-orange-100 text-orange-600 hover:bg-orange-200 ring-2 ring-orange-300'
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
              disabled={isSubmitting}
              className={`w-full font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang nộp bài...
                </>
              ) : (
                <><CheckCircle className="w-5 h-5 mr-2" /> NỘP BÀI</>
              )}
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
          disabled={isSubmitting}
          className={`font-bold py-3 px-12 rounded-full shadow-lg text-lg transform transition-transform ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 text-white hover:scale-105'}`}
        >
          {isSubmitting ? 'Đang nộp...' : 'NỘP BÀI'}
        </button>
      </div>
    </div>
  );
};

export default StudentView;
