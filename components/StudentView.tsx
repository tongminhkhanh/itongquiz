import React, { useState, useEffect } from 'react';
import { Quiz, QuestionType, StudentResult, Question } from '../types';
import { Clock, CheckCircle, AlertCircle, RefreshCcw, Home } from 'lucide-react';
import { SCHOOL_NAME } from '../constants';
import { AccessCodeForm, StudentInfoForm, QuizSidebar, SubmitConfirmModal } from './student';

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
      // Handle F5 / refresh / close tab
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'Bạn đang làm bài! Nếu rời đi, bài làm sẽ bị mất. Bạn có chắc muốn thoát?';
        return e.returnValue;
      };

      // Handle back button
      const handlePopState = (e: PopStateEvent) => {
        e.preventDefault();
        const confirmLeave = window.confirm('Bạn đang làm bài! Nếu quay lại, bài làm sẽ bị mất. Bạn có chắc muốn thoát?');
        if (!confirmLeave) {
          // Push state again to prevent leaving
          window.history.pushState(null, '', window.location.href);
        } else {
          onExit();
        }
      };

      // Push initial state to history
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
    // Shuffle questions when starting the quiz
    setShuffledQuestions(shuffleArray(quiz.questions));
    setStartTime(Date.now());
    setStep('quiz');
  };

  // Helper function to format math text
  const formatText = (text: string) => {
    if (!text) return "";
    // Replace / with : ONLY if surrounded by spaces (e.g., 5 / 7 -> 5 : 7). Keep fractions (1/2) as is.
    // Replace * with x (e.g., 5 * 7 -> 5 x 7)
    return text
      .replace(/([a-zA-Z0-9?]+)\s*\*\s*([a-zA-Z0-9?]+)/g, '$1 x $2')
      .replace(/([a-zA-Z0-9?]+)\s+\/\s+([a-zA-Z0-9?]+)/g, '$1 : $2');
  };

  // Verify access code
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
      // For True/False, we store as { "qId": { "subId": boolean } }
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
        // If a left item is already selected, deselect it
        if (newAnswers.selectedLeft === item) {
          delete newAnswers.selectedLeft;
        } else {
          newAnswers.selectedLeft = item;
        }
      } else { // type === 'right'
        const selectedLeft = newAnswers.selectedLeft;
        if (selectedLeft) {
          // If a left item is selected, try to form a pair

          // Check if the selectedLeft is already paired
          // (We overwrite the old pair for this left item automatically)

          // Form the new pair
          // Note: We allow multiple left items to map to the same right item (Many-to-One)
          newAnswers[selectedLeft] = item;
          delete newAnswers.selectedLeft; // Clear selected left item
        } else {
          // If no left item is selected, and a right item is clicked,
          // do nothing (or maybe highlight it? but for now we require Left -> Right flow)
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
        // TRUE_FALSE counts as 1 question - only correct if ALL sub-items are correct
        totalItems++;
        let allSubItemsCorrect = true;
        q.items.forEach(item => {
          const studentAns = answers[q.id]?.[item.id];
          if (studentAns !== item.isCorrect) {
            allSubItemsCorrect = false;
          }
        });
        if (allSubItemsCorrect) correctCount++;
      } else if (q.type === QuestionType.MATCHING) {
        totalItems++; // A matching question counts as one item
        const userPairs = answers[q.id] || {}; // Student's submitted pairs
        const correctPairs = q.pairs; // Correct pairs from the quiz definition

        let isAllCorrect = true;

        // First, check if the number of matched pairs is correct
        // (excluding 'selectedLeft' which is a UI state, not an answer)
        const actualUserPairsCount = Object.keys(userPairs).filter(key => key !== 'selectedLeft').length;
        if (actualUserPairsCount !== correctPairs.length) {
          isAllCorrect = false;
        } else {
          // Then, check if each user-matched pair is correct
          for (const correctPair of correctPairs) {
            const studentRight = userPairs[correctPair.left];
            if (studentRight !== correctPair.right) {
              isAllCorrect = false;
              break;
            }
          }
        }

        if (isAllCorrect) {
          correctCount++;
        }
      } else if (q.type === QuestionType.MULTIPLE_SELECT) {
        totalItems++;
        const studentAns = (answers[q.id] as string[]) || [];
        const correctAns = q.correctAnswers || [];

        // Check if arrays are equal (ignoring order, though we sort on select)
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

        // Check if all blanks are filled correctly
        let allCorrect = true;
        blanks.forEach((blankIdx, i) => {
          const correctWord = q.blanks[i]; // The correct word for this blank
          const studentWord = studentAns[blankIdx];
          if (studentWord !== correctWord) {
            allCorrect = false;
          }
        });

        if (allCorrect && blanks.length > 0) correctCount++;
      }
    });

    const score = totalItems === 0 ? 0 : (correctCount / totalItems) * 10;
    return { score: parseFloat(score.toFixed(1)), correctCount, totalItems };
  };

  const handleSubmit = () => {
    // Check if finished (optional logic omitted for brevity, proceeding to submit)
    const { score, correctCount, totalItems } = calculateScore();
    const timeTaken = Math.round((Date.now() - startTime) / 60000);

    const resultData: StudentResult = {
      id: crypto.randomUUID(),
      quizId: quiz.id,
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

  // ACCESS CODE VERIFICATION VIEW
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

  if (step === 'result' && result) {
    return (
      <div className="max-w-2xl mx-auto p-4 pb-20">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className={`p-6 text-center ${result.score >= 5 ? 'bg-green-100' : 'bg-red-100'}`}>
            <h2 className="text-3xl font-bold mb-2">Kết quả của em</h2>
            <div className="text-6xl font-extrabold mb-2" style={{ color: result.score >= 5 ? '#16a34a' : '#dc2626' }}>
              {result.score}
            </div>
            <p className="text-gray-600">Đúng {result.correctCount}/{result.totalQuestions} câu</p>
          </div>

          <div className="p-6">
            <div className="bg-blue-50 p-4 rounded-xl mb-6">
              <h3 className="font-bold text-blue-800 mb-2">🌟 Nhận xét của thầy cô:</h3>
              <p className="text-blue-700 text-sm">
                {result.score >= 9 ? "Tuyệt vời! Em nắm rất chắc kiến thức. Hãy tiếp tục phát huy nhé!" :
                  result.score >= 7 ? "Khá lắm! Em đã hiểu bài, nhưng cần cẩn thận hơn một chút ở các câu khó." :
                    result.score >= 5 ? "Đạt. Em cần ôn lại bài kỹ hơn để đạt điểm cao hơn vào lần sau." :
                      "Cần cố gắng nhiều hơn. Em hãy xem lại sách giáo khoa và hỏi thầy cô những phần chưa hiểu nhé!"}
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="font-bold text-lg border-b pb-2">Chi tiết bài làm</h3>
              {quiz.questions.map((q, idx) => (
                <div key={q.id} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex items-start mb-2">
                    <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-1 rounded mr-2 mt-0.5">Câu {idx + 1}</span>
                    <div>
                      {q.type === QuestionType.TRUE_FALSE || q.type === QuestionType.MATCHING ? (
                        <p className="font-medium text-gray-800">{q.mainQuestion}</p>
                      ) : (
                        <p className="font-medium text-gray-800">{(q as any).question}</p>
                      )}
                      {q.image && (
                        <div className="mt-2">
                          <img
                            src={q.image}
                            alt="Question Illustration"
                            className="max-h-40 rounded border border-gray-200 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Render Answer Review based on Type */}
                  <div className="ml-10 text-sm">
                    {q.type === QuestionType.MCQ && (() => {
                      const isCorrect = answers[q.id] === q.correctAnswer;
                      return (
                        <div>
                          <p className={isCorrect ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                            Em chọn: {answers[q.id] || "Không trả lời"}
                          </p>
                          {!isCorrect && (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-blue-800 text-sm">
                                💡 <strong>Hướng dẫn giải:</strong> {(q as any).explanation || "Hãy xem lại kiến thức phần này nhé!"}
                              </p>
                            </div>
                          )}
                          {isCorrect && <span className="text-green-600">✓ Chính xác!</span>}
                        </div>
                      );
                    })()}
                    {q.type === QuestionType.SHORT_ANSWER && (() => {
                      const correctAns = (q.correctAnswer || "").toString().toLowerCase();
                      const isCorrect = (answers[q.id] || "").toString().toLowerCase() === correctAns;
                      return (
                        <div>
                          <p className={isCorrect ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                            Em ghi: {answers[q.id] || "..."}
                          </p>
                          {!isCorrect && (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-blue-800 text-sm">
                                💡 <strong>Hướng dẫn giải:</strong> {(q as any).explanation || "Hãy tính toán lại cẩn thận nhé!"}
                              </p>
                            </div>
                          )}
                          {isCorrect && <span className="text-green-600">✓ Chính xác!</span>}
                        </div>
                      );
                    })()}
                    {q.type === QuestionType.TRUE_FALSE && (
                      <div className="grid grid-cols-1 gap-1 mt-2">
                        {(q.items || []).map(item => {
                          const studentVal = answers[q.id]?.[item.id];
                          const isCorrect = studentVal === item.isCorrect;
                          return (
                            <div key={item.id} className={`p-2 rounded ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                              <div className="flex items-center justify-between">
                                <span className="flex-1">{formatText(item.statement)}</span>
                                <span className={isCorrect ? "text-green-600 font-bold text-xs" : "text-red-500 font-bold text-xs"}>
                                  {studentVal === true ? "Đúng" : studentVal === false ? "Sai" : "Trống"}
                                  {isCorrect && " ✓"}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                        {/* Show explanation if any item is wrong */}
                        {(q.items || []).some(item => answers[q.id]?.[item.id] !== item.isCorrect) && (
                          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-blue-800 text-sm">
                              💡 <strong>Hướng dẫn giải:</strong> {(q as any).explanation || "Hãy đọc kỹ lại các phát biểu nhé!"}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    {q.type === QuestionType.MATCHING && (() => {
                      const userPairs = answers[q.id] || {};
                      const incorrectPairs = (q.pairs || []).filter(p => userPairs[p.left] !== p.right);
                      const hasIncorrect = incorrectPairs.length > 0;

                      return (
                        <div className="mt-2">
                          <p className="font-bold mb-2">Các cặp em đã nối:</p>
                          {(q.pairs || []).map(correctPair => {
                            const studentRight = userPairs[correctPair.left];
                            const isCorrect = studentRight === correctPair.right;
                            return (
                              <div key={correctPair.left} className={`flex justify-between items-center p-2 rounded mb-1 ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                                <span className="font-medium">{formatText(correctPair.left)}</span>
                                <span className="mx-2">→</span>
                                <span className={`${isCorrect ? 'text-green-700' : 'text-red-700'} font-bold`}>
                                  {formatText(studentRight || "Chưa nối")}
                                  {isCorrect && " ✓"}
                                </span>
                              </div>
                            );
                          })}
                          {hasIncorrect && (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-blue-800 text-sm">
                                💡 <strong>Hướng dẫn giải:</strong> {(q as any).explanation || "Hãy xem lại mối quan hệ giữa các cột nhé!"}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {q.type === QuestionType.MULTIPLE_SELECT && (() => {
                      const studentAns = (answers[q.id] as string[]) || [];
                      const correctAns = q.correctAnswers || [];
                      const isCorrect = studentAns.length === correctAns.length && studentAns.every(val => correctAns.includes(val));

                      return (
                        <div>
                          <p className="mb-1">
                            Em chọn: <span className={isCorrect ? "font-bold text-green-600" : "font-bold text-red-500"}>
                              {studentAns.length > 0 ? studentAns.join(', ') : "Không trả lời"}
                            </span>
                          </p>
                          {isCorrect ? (
                            <span className="text-green-600 font-bold text-sm">✓ Chính xác!</span>
                          ) : (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-blue-800 text-sm">
                                💡 <strong>Hướng dẫn giải:</strong> {(q as any).explanation || "Hãy kiểm tra kỹ từng lựa chọn nhé!"}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {q.type === QuestionType.DRAG_DROP && (() => {
                      const studentAns = (answers[q.id] as Record<number, string>) || {};
                      const text = (q as any).text || "";
                      const parts = text.split(/(\[.*?\])/g);
                      const blanks: number[] = [];
                      parts.forEach((part: string, idx: number) => {
                        if (part.startsWith('[') && part.endsWith(']')) {
                          blanks.push(idx);
                        }
                      });
                      const correctBlanks = (q as any).blanks || [];

                      // Check if all blanks are filled correctly
                      let allCorrect = true;
                      blanks.forEach((blankIdx, i) => {
                        const correctWord = correctBlanks[i];
                        const studentWord = studentAns[blankIdx];
                        if (studentWord !== correctWord) {
                          allCorrect = false;
                        }
                      });

                      return (
                        <div>
                          <p className="font-bold mb-2">Câu trả lời của em:</p>
                          <div className="text-sm leading-relaxed bg-gray-50 p-3 rounded-lg">
                            {parts.map((part, idx) => {
                              if (part.startsWith('[') && part.endsWith(']')) {
                                const blankIndex = blanks.indexOf(idx);
                                const correctWord = correctBlanks[blankIndex] || "";
                                const studentWord = studentAns[idx];
                                const isBlankCorrect = studentWord === correctWord;
                                return (
                                  <span
                                    key={idx}
                                    className={`inline-block px-2 py-1 rounded mx-1 font-bold ${isBlankCorrect
                                      ? 'bg-green-100 text-green-700 border border-green-300'
                                      : 'bg-red-100 text-red-700 border border-red-300'
                                      }`}
                                  >
                                    {studentWord || "___"}
                                    {isBlankCorrect && " ✓"}
                                  </span>
                                );
                              }
                              return <span key={idx}>{formatText(part)}</span>;
                            })}
                          </div>
                          {!allCorrect && (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-blue-800 text-sm">
                                💡 <strong>Hướng dẫn giải:</strong> {(q as any).explanation || "Hãy xem lại từ vựng nhé!"}
                              </p>
                              <div className="mt-1 text-xs text-gray-600">
                                <strong>Đáp án đúng:</strong> {correctBlanks.join(', ')}
                              </div>
                            </div>
                          )}
                          {allCorrect && <span className="text-green-600 font-bold text-sm mt-2 block">✓ Chính xác!</span>}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-gray-50 border-t flex space-x-3">
            <button onClick={onExit} className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-100 flex items-center justify-center">
              <Home className="w-4 h-4 mr-2" /> Về trang chủ
            </button>
          </div>
        </div>
      </div >
    );
  }


  // QUIZ TAKING VIEW
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Header - Minimalist */}
      <div className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{quiz.title}</h1>
          <p className="text-lg text-gray-500 mt-1">Thí sinh: <span className="font-semibold text-gray-700">{studentName}</span> - Lớp: <span className="font-semibold text-gray-700">{studentClass}</span></p>
        </div>
        {/* Timer removed from header as requested */}
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6">
        {/* LEFT COLUMN: Question List */}
        <div className="flex-1 space-y-6 pb-20 md:pb-0">
          {shuffledQuestions.map((q, index) => (
            <div key={q.id} id={`question-${index}`} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 scroll-mt-24">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Câu hỏi {index + 1}</h3>
                <div className="text-gray-700 font-medium">
                  {q.type === QuestionType.TRUE_FALSE || q.type === QuestionType.MATCHING ? (
                    <p>{formatText(q.mainQuestion || "")}</p>
                  ) : (
                    <p>{formatText((q as any).question || "")}</p>
                  )}
                </div>

                {q.image && (
                  <div className="mt-3">
                    <img
                      src={q.image}
                      alt="Question Illustration"
                      className="max-h-64 rounded-lg border border-gray-200 object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Answer Section */}
              <div className="mt-4 pl-0 md:pl-4 border-l-0 md:border-l-4 border-orange-100">
                {q.type === QuestionType.MCQ && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt, idx) => {
                      const label = String.fromCharCode(65 + idx); // A, B, C, D
                      const isSelected = answers[q.id] === label;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleAnswerChange(q.id, label)}
                          className={`text-left p-3 rounded-lg border transition-all flex items-center ${isSelected
                            ? 'border-orange-500 bg-orange-50 text-orange-900 ring-1 ring-orange-500'
                            : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                            }`}
                        >
                          <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 ${isSelected ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 text-gray-500'
                            }`}>
                            {label}
                          </span>
                          <span>{formatText(opt)}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {q.type === QuestionType.SHORT_ANSWER && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Trả lời:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={answers[q.id] || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        className="flex-1 p-2 border-b-2 border-gray-400 bg-transparent focus:border-orange-500 outline-none font-mono text-lg"
                        placeholder="Nhập đáp án..."
                      />
                    </div>
                  </div>
                )}

                {q.type === QuestionType.TRUE_FALSE && (
                  <div className="space-y-2">
                    {q.items.map((item, i) => {
                      const val = answers[q.id]?.[item.id];
                      return (
                        <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <span className="text-gray-700 mr-4 flex-1 text-sm">
                            {String.fromCharCode(97 + i)}. {formatText(item.statement)}
                          </span>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleAnswerChange(q.id, true, item.id)}
                              className={`w-10 h-8 rounded font-bold text-sm transition-colors ${val === true ? 'bg-green-500 text-white shadow-md' : 'bg-white border border-gray-300 text-gray-400 hover:bg-gray-100'}`}
                            >Đ</button>
                            <button
                              onClick={() => handleAnswerChange(q.id, false, item.id)}
                              className={`w-10 h-8 rounded font-bold text-sm transition-colors ${val === false ? 'bg-red-500 text-white shadow-md' : 'bg-white border border-gray-300 text-gray-400 hover:bg-gray-100'}`}
                            >S</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {q.type === QuestionType.MATCHING && (() => {
                  // Define colors for pairs
                  const pairColors = [
                    { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-700' },
                    { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-700' },
                    { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-700' },
                    { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-700' },
                    { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-700' },
                    { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-700' },
                    { bg: 'bg-teal-100', border: 'border-teal-500', text: 'text-teal-700' },
                    { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-700' },
                  ];

                  // Build a map of left -> colorIndex for paired items
                  const currentAnswers = answers[q.id] || {};
                  const pairedLeftItems = Object.keys(currentAnswers).filter(key => key !== 'selectedLeft' && currentAnswers[key]);
                  const leftToColorIndex: Record<string, number> = {};
                  pairedLeftItems.forEach((left, idx) => {
                    leftToColorIndex[left] = idx % pairColors.length;
                  });

                  // Build a map of right -> colorIndex
                  const rightToColorIndex: Record<string, number> = {};
                  pairedLeftItems.forEach(left => {
                    const right = currentAnswers[left];
                    if (right && leftToColorIndex[left] !== undefined) {
                      rightToColorIndex[right] = leftToColorIndex[left];
                    }
                  });

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <p className="font-bold text-blue-600 text-center">Cột A</p>
                          {q.pairs.map((pair) => {
                            const isSelectedLeft = currentAnswers.selectedLeft === pair.left;
                            const isPaired = currentAnswers[pair.left] !== undefined;
                            const colorIdx = leftToColorIndex[pair.left];
                            const color = isPaired && colorIdx !== undefined ? pairColors[colorIdx] : null;

                            return (
                              <div
                                key={pair.left}
                                className={`p-3 rounded-lg border-2 cursor-pointer transition-all font-medium ${isSelectedLeft
                                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300'
                                  : color
                                    ? `${color.border} ${color.bg} ${color.text}`
                                    : 'border-gray-200 hover:border-blue-300'
                                  }`}
                                onClick={() => handleMatchingClick(q.id, pair.left, 'left')}
                              >
                                {color && <span className="mr-2">●</span>}
                                {formatText(pair.left)}
                              </div>
                            );
                          })}
                        </div>
                        <div className="space-y-3">
                          <p className="font-bold text-orange-600 text-center">Cột B</p>
                          {/* Deduplicate Right Column Items */}
                          {Array.from(new Set(q.pairs.map(p => p.right)))
                            .sort((a, b) => (a as string).localeCompare(b as string))
                            .map((rightItem) => {
                              // Check if this right item is paired with ANY left item
                              const pairedLefts = Object.keys(currentAnswers).filter(key => currentAnswers[key] === rightItem && key !== 'selectedLeft');
                              const isPaired = pairedLefts.length > 0;

                              // Get color of the first paired item (or handle multiple if needed)
                              // For simplicity, we take the color of the first paired left item
                              const colorIdx = isPaired ? leftToColorIndex[pairedLefts[0]] : undefined;
                              const color = colorIdx !== undefined ? pairColors[colorIdx] : null;

                              return (
                                <div
                                  key={rightItem}
                                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all font-medium ${color
                                    ? `${color.border} ${color.bg} ${color.text}`
                                    : 'border-gray-200 hover:border-orange-300'
                                    }`}
                                  onClick={() => handleMatchingClick(q.id, rightItem as string, 'right')}
                                >
                                  {color && <span className="mr-2">●</span>}
                                  {formatText(rightItem as string)}
                                  {pairedLefts.length > 1 && (
                                    <span className="ml-2 text-xs bg-white/50 px-1.5 py-0.5 rounded-full border border-black/10">
                                      x{pairedLefts.length}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {/* Legend - show paired items */}
                      {pairedLeftItems.length > 0 && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs font-bold text-gray-600 mb-2">Đã nối:</p>
                          <div className="flex flex-wrap gap-2">
                            {pairedLeftItems.map(left => {
                              const colorIdx = leftToColorIndex[left];
                              const color = pairColors[colorIdx];
                              return (
                                <span key={left} className={`text-xs px-2 py-1 rounded ${color.bg} ${color.text} ${color.border} border`}>
                                  {formatText(left)} ↔ {formatText(currentAnswers[left])}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 text-sm text-gray-500 text-center">
                        Chọn một ô ở Cột A, sau đó chọn ô tương ứng ở Cột B để nối.
                      </div>
                      <button
                        onClick={() => setAnswers(prev => ({ ...prev, [q.id]: {} }))}
                        className="mt-2 text-xs text-red-500 underline"
                      >
                        Làm lại câu này
                      </button>
                    </div>
                  );
                })()}

                {q.type === QuestionType.MULTIPLE_SELECT && (
                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((opt, idx) => {
                      const label = String.fromCharCode(65 + idx);
                      const currentAnswers = (answers[q.id] as string[]) || [];
                      const isSelected = currentAnswers.includes(label);
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            const newAnswers = isSelected
                              ? currentAnswers.filter(a => a !== label)
                              : [...currentAnswers, label].sort();
                            handleAnswerChange(q.id, newAnswers);
                          }}
                          className={`text-left p-3 rounded-lg border transition-all flex items-center ${isSelected
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                            : 'border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                          <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300'}`}>
                            {isSelected && <CheckCircle className="w-3 h-3" />}
                          </div>
                          {formatText(opt)}
                        </button>
                      )
                    })}
                  </div>
                )}

                {q.type === QuestionType.DRAG_DROP && (() => {
                  const currentAnswers = (answers[q.id] as Record<number, string>) || {};
                  // Safety check for q.text
                  const text = (q as any).text || "";

                  const parts = text.split(/(\[.*?\])/g);
                  const blanks: number[] = [];
                  parts.forEach((part: string, idx: number) => {
                    if (part.startsWith('[') && part.endsWith(']')) {
                      blanks.push(idx);
                    }
                  });

                  // Combine correct answers and distractors for the word bank
                  // Use a seeded shuffle based on question ID for stability
                  const qBlanks = (q as any).blanks || [];
                  const qDistractors = (q as any).distractors || [];
                  const words = [...qBlanks, ...qDistractors];
                  // Simple seeded shuffle for display stability
                  const seed = q.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                  const allWords = words.sort((a, b) => {
                    const hashA = (a.charCodeAt(0) * seed) % 100;
                    const hashB = (b.charCodeAt(0) * seed) % 100;
                    return hashA - hashB;
                  });

                  const handleWordClick = (word: string) => {
                    // Find first empty blank
                    const firstEmptyBlankIdx = blanks.find(idx => !currentAnswers[idx]);

                    if (firstEmptyBlankIdx !== undefined) {
                      handleAnswerChange(q.id, { ...currentAnswers, [firstEmptyBlankIdx]: word });
                    }
                  };

                  const handleBlankClick = (idx: number) => {
                    // Clear the blank
                    const newAnswers = { ...currentAnswers };
                    delete newAnswers[idx];
                    handleAnswerChange(q.id, newAnswers);
                  };

                  return (
                    <div className="space-y-6">
                      <div className="text-lg leading-loose font-medium text-gray-800 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        {parts.map((part, idx) => {
                          if (part.startsWith('[') && part.endsWith(']')) {
                            const filledWord = currentAnswers[idx];
                            return (
                              <span
                                key={idx}
                                onClick={() => filledWord && handleBlankClick(idx)}
                                className={`inline-block min-w-[80px] h-10 mx-1 px-3 py-1 align-middle text-center rounded-lg border-2 border-dashed transition-all cursor-pointer select-none flex items-center justify-center ${filledWord
                                  ? 'bg-indigo-100 border-indigo-500 text-indigo-700 font-bold border-solid'
                                  : 'bg-gray-50 border-gray-300 text-gray-400 hover:border-indigo-300'
                                  }`}
                              >
                                {filledWord || (idx + 1)}
                              </span>
                            );
                          }
                          return <span key={idx}>{formatText(part)}</span>;
                        })}
                      </div>

                      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <p className="text-sm font-bold text-indigo-800 mb-3 uppercase tracking-wide">Kho từ vựng (Chạm để điền):</p>
                        <div className="flex flex-wrap gap-3">
                          {allWords.map((word, wIdx) => {
                            // Check if word is already used (count occurrences)
                            const usedCount = Object.values(currentAnswers).filter(w => w === word).length;
                            const totalCount = allWords.filter(w => w === word).length;
                            const isFullyUsed = usedCount >= totalCount;

                            return (
                              <button
                                key={`${word}-${wIdx}`}
                                onClick={() => !isFullyUsed && handleWordClick(word)}
                                disabled={isFullyUsed}
                                className={`px-4 py-2 rounded-lg font-bold shadow-sm transition-all transform active:scale-95 ${isFullyUsed
                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                  : 'bg-white text-indigo-700 hover:bg-indigo-600 hover:text-white hover:shadow-md border border-indigo-200'
                                  }`}
                              >
                                {word}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => handleAnswerChange(q.id, {})}
                          className="text-xs text-red-500 hover:underline flex items-center"
                        >
                          <RefreshCcw className="w-3 h-3 mr-1" /> Làm lại câu này
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT COLUMN: Sidebar (Sticky) */}
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
                  // Check if answered
                  let isAnswered = false;
                  if (q.type === QuestionType.TRUE_FALSE) {
                    // For T/F, consider answered if all items have a value
                    isAnswered = q.items.every(i => answers[q.id]?.[i.id] !== undefined);
                  } else if (q.type === QuestionType.MATCHING) {
                    // For Matching, consider answered if all pairs are made (simplified check)
                    const userPairs = answers[q.id] || {};
                    const pairedCount = Object.keys(userPairs).filter(k => k !== 'selectedLeft').length;
                    isAnswered = pairedCount === q.pairs.length;
                  } else if (q.type === QuestionType.MULTIPLE_SELECT) {
                    isAnswered = (answers[q.id] as string[])?.length > 0;
                  } else if (q.type === QuestionType.DRAG_DROP) {
                    // For DRAG_DROP, consider answered if all blanks are filled
                    const qAny = q as any;
                    const text = qAny.text || "";
                    const parts = text.split(/(\[.*?\])/g);
                    const blanks: number[] = [];
                    parts.forEach((part: string, idx: number) => {
                      if (part.startsWith('[') && part.endsWith(']')) {
                        blanks.push(idx);
                      }
                    });
                    const currentAnswers = (answers[q.id] as Record<number, string>) || {};
                    isAnswered = blanks.length > 0 && blanks.every(idx => currentAnswers[idx] !== undefined);
                  } else {
                    isAnswered = !!answers[q.id];
                  }

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

      {/* Custom Confirmation Modal */}      <SubmitConfirmModal
        isOpen={showConfirmModal}
        unansweredCount={shuffledQuestions.length - Object.keys(answers).length}
        onConfirm={() => {
          setShowConfirmModal(false);
          handleSubmit();
        }}
        onCancel={() => setShowConfirmModal(false)}
      />

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
