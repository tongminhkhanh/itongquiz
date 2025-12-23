import React, { useState, useEffect } from 'react';
import { Quiz, QuestionType, StudentResult, Question } from '../types';
import { Clock, CheckCircle, AlertCircle, RefreshCcw, Home } from 'lucide-react';
import { SCHOOL_NAME } from '../constants';

interface Props {
  quiz: Quiz;
  onExit: () => void;
  onSaveResult: (result: StudentResult) => void;
}

const StudentView: React.FC<Props> = ({ quiz, onExit, onSaveResult }) => {
  const [step, setStep] = useState<'info' | 'quiz' | 'result'>('info');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimit * 60);
  const [startTime, setStartTime] = useState<number>(0);
  const [result, setResult] = useState<StudentResult | null>(null);

  // Shuffled questions for random order
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);

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

  const handleStart = () => {
    if (!studentName || !studentClass) return;
    // Shuffle questions when starting the quiz
    setShuffledQuestions(shuffleArray(quiz.questions));
    setStartTime(Date.now());
    setStep('quiz');
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
          // Check if this right item is already paired with another left item
          const existingLeftForThisRight = Object.keys(newAnswers).find(key => newAnswers[key] === item && key !== 'selectedLeft');
          if (existingLeftForThisRight) {
            // If it is, remove the old pair
            delete newAnswers[existingLeftForThisRight];
          }

          // Check if the selectedLeft is already paired
          if (newAnswers[selectedLeft]) {
            // If it is, remove the old right item it was paired with
            // (This logic might need refinement based on desired UX for re-pairing)
          }

          // Form the new pair
          newAnswers[selectedLeft] = item;
          delete newAnswers.selectedLeft; // Clear selected left item
        } else {
          // If no left item is selected, and a right item is clicked,
          // check if it's part of an existing pair and remove that pair.
          const leftItemPairedWithThisRight = Object.keys(newAnswers).find(key => newAnswers[key] === item && key !== 'selectedLeft');
          if (leftItemPairedWithThisRight) {
            delete newAnswers[leftItemPairedWithThisRight];
          }
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
        // For True/False, each sub-item counts
        q.items.forEach(item => {
          totalItems++;
          const studentAns = answers[q.id]?.[item.id];
          if (studentAns === item.isCorrect) correctCount++;
        });
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

  if (step === 'info') {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-lg mt-10 border-t-4 border-orange-500">
        <h2 className="text-2xl font-bold text-center text-orange-600 mb-2">{SCHOOL_NAME}</h2>
        <h3 className="text-xl font-semibold text-center text-gray-800 mb-6">{quiz.title}</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Họ và tên học sinh</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="mt-1 w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none"
              placeholder="Ví dụ: Lò Văn A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Lớp</label>
            <select
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              className="mt-1 w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none"
            >
              <option value="">Chọn lớp...</option>
              {Array.from({ length: 9 }, (_, i) => i + 1).map(num => (
                <option key={`${quiz.classLevel}A${num}`} value={`${quiz.classLevel}A${num}`}>
                  {quiz.classLevel}A{num}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
            <p className="text-sm text-yellow-800 font-semibold flex items-center">
              <Clock className="w-4 h-4 mr-2" /> Thời gian làm bài: {quiz.timeLimit} phút
            </p>
          </div>

          <button
            onClick={handleStart}
            disabled={!studentName || !studentClass}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-md"
          >
            Bắt đầu làm bài
          </button>

          <button onClick={onExit} className="w-full text-gray-500 hover:text-gray-700 mt-2 text-sm">
            Quay lại
          </button>
        </div>
      </div>
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
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-yellow-800 text-xs">
                                💡 <strong>Gợi ý:</strong> Em hãy đọc kỹ lại câu hỏi và các lựa chọn. Suy nghĩ xem đáp án nào phù hợp nhất với kiến thức đã học.
                              </p>
                            </div>
                          )}
                          {isCorrect && <span className="text-green-600">✓ Chính xác!</span>}
                        </div>
                      );
                    })()}
                    {q.type === QuestionType.SHORT_ANSWER && (() => {
                      const isCorrect = (answers[q.id] || "").toString().toLowerCase() === q.correctAnswer.toLowerCase();
                      return (
                        <div>
                          <p className={isCorrect ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                            Em ghi: {answers[q.id] || "..."}
                          </p>
                          {!isCorrect && (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-yellow-800 text-xs">
                                💡 <strong>Gợi ý:</strong> Em hãy tính toán hoặc suy luận lại. Kiểm tra xem em đã hiểu đúng yêu cầu của câu hỏi chưa.
                              </p>
                            </div>
                          )}
                          {isCorrect && <span className="text-green-600">✓ Chính xác!</span>}
                        </div>
                      );
                    })()}
                    {q.type === QuestionType.TRUE_FALSE && (
                      <div className="grid grid-cols-1 gap-1 mt-2">
                        {q.items.map(item => {
                          const studentVal = answers[q.id]?.[item.id];
                          const isCorrect = studentVal === item.isCorrect;
                          return (
                            <div key={item.id} className={`p-2 rounded ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                              <div className="flex items-center justify-between">
                                <span className="flex-1">{item.statement}</span>
                                <span className={isCorrect ? "text-green-600 font-bold text-xs" : "text-red-500 font-bold text-xs"}>
                                  {studentVal === true ? "Đúng" : studentVal === false ? "Sai" : "Trống"}
                                  {isCorrect && " ✓"}
                                </span>
                              </div>
                              {!isCorrect && (
                                <p className="text-yellow-700 text-xs mt-1 italic">
                                  💡 Hãy xem lại phát biểu này và suy nghĩ kỹ hơn.
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {q.type === QuestionType.MATCHING && (() => {
                      const userPairs = answers[q.id] || {};
                      const incorrectPairs = q.pairs.filter(p => userPairs[p.left] !== p.right);
                      const hasIncorrect = incorrectPairs.length > 0;

                      return (
                        <div className="mt-2">
                          <p className="font-bold mb-2">Các cặp em đã nối:</p>
                          {q.pairs.map(correctPair => {
                            const studentRight = userPairs[correctPair.left];
                            const isCorrect = studentRight === correctPair.right;
                            return (
                              <div key={correctPair.left} className={`flex justify-between items-center p-2 rounded mb-1 ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                                <span className="font-medium">{correctPair.left}</span>
                                <span className="mx-2">→</span>
                                <span className={`${isCorrect ? 'text-green-700' : 'text-red-700'} font-bold`}>
                                  {studentRight || "Chưa nối"}
                                  {isCorrect && " ✓"}
                                </span>
                              </div>
                            );
                          })}
                          {hasIncorrect && (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-yellow-800 text-xs">
                                💡 <strong>Gợi ý:</strong> Em hãy xem lại mối quan hệ giữa các cột. Mỗi ý ở cột A chỉ nối với đúng một ý ở cột B.
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
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-yellow-800 text-xs">
                                💡 <strong>Gợi ý:</strong> Câu này có nhiều đáp án đúng. Em hãy đọc lại câu hỏi và kiểm tra từng lựa chọn xem có phù hợp không.
                                {studentAns.length < correctAns.length && " (Có thể em còn thiếu đáp án)"}
                                {studentAns.length > correctAns.length && " (Có thể em chọn thừa đáp án)"}
                              </p>
                            </div>
                          )}
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
    <div
      className="min-h-screen p-4 pb-24 bg-cover bg-center bg-fixed bg-no-repeat"
      style={{ backgroundImage: "url('/quiz-background.jpg')" }}
    >
      {/* Overlay for better readability */}
      <div className="fixed inset-0 bg-white/40 backdrop-blur-[1px] -z-10"></div>

      <div className="max-w-3xl mx-auto">
        <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-10 px-4 py-3 flex justify-between items-center">
          <div>
            <span className="text-gray-500 text-sm">Thí sinh:</span>
            <span className="font-bold text-gray-800 ml-1">{studentName} ({studentClass})</span>
          </div>
          <div className={`font-mono text-xl font-bold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="mt-16 space-y-8">
          {shuffledQuestions.map((q, index) => (
            <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-gray-100">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-orange-100 text-orange-600 font-bold rounded-lg w-8 h-8 flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1">
                  {q.type === QuestionType.TRUE_FALSE || q.type === QuestionType.MATCHING ? (
                    <h3 className="text-lg font-bold text-gray-800">{q.mainQuestion}</h3>
                  ) : (
                    <h3 className="text-lg font-bold text-gray-800">{(q as any).question}</h3>
                  )}

                  {q.image && (
                    <div className="mt-3 mb-4">
                      <img
                        src={q.image}
                        alt="Question Illustration"
                        className="max-h-64 rounded-lg border border-gray-200 object-contain"
                      />
                    </div>
                  )}

                  {/* Render Inputs */}
                  <div className="mt-4">
                    {q.type === QuestionType.MCQ && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt, idx) => {
                          const label = String.fromCharCode(65 + idx); // A, B, C, D
                          const isSelected = answers[q.id] === label;
                          return (
                            <button
                              key={idx}
                              onClick={() => handleAnswerChange(q.id, label)}
                              className={`text-left p-4 rounded-xl border-2 transition-all flex items-center ${isSelected
                                ? 'border-orange-500 bg-orange-50 text-orange-900'
                                : 'border-gray-200 hover:border-orange-300'
                                }`}
                            >
                              <span className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center text-xs font-bold ${isSelected ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 text-gray-400'
                                }`}>
                                {label}
                              </span>
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {q.type === QuestionType.SHORT_ANSWER && (
                      <div>
                        <input
                          type="text"
                          maxLength={4}
                          value={answers[q.id] || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="w-full md:w-1/2 p-3 border-2 border-gray-300 rounded-xl text-lg font-mono focus:border-orange-500 outline-none uppercase"
                          placeholder="Nhập đáp án..."
                        />
                        <p className="text-xs text-gray-400 mt-2">Tối đa 4 ký tự/số.</p>
                      </div>
                    )}

                    {q.type === QuestionType.TRUE_FALSE && (
                      <div className="space-y-3">
                        {q.items.map((item, i) => {
                          const val = answers[q.id]?.[item.id];
                          return (
                            <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                              <span className="text-gray-700 font-medium mr-4 flex-1">
                                {String.fromCharCode(97 + i)}. {item.statement}
                              </span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAnswerChange(q.id, true, item.id)}
                                  className={`px-3 py-1 rounded font-bold text-sm ${val === true ? 'bg-green-500 text-white' : 'bg-white border border-gray-300 text-gray-500'}`}
                                >Đ</button>
                                <button
                                  onClick={() => handleAnswerChange(q.id, false, item.id)}
                                  className={`px-3 py-1 rounded font-bold text-sm ${val === false ? 'bg-red-500 text-white' : 'bg-white border border-gray-300 text-gray-500'}`}
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
                        <div className="mt-4">
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
                                    {pair.left}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="space-y-3">
                              <p className="font-bold text-orange-600 text-center">Cột B</p>
                              {[...q.pairs].sort((a, b) => a.right.localeCompare(b.right)).map((pair) => {
                                const colorIdx = rightToColorIndex[pair.right];
                                const color = colorIdx !== undefined ? pairColors[colorIdx] : null;

                                return (
                                  <div
                                    key={pair.right}
                                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all font-medium ${color
                                      ? `${color.border} ${color.bg} ${color.text}`
                                      : 'border-gray-200 hover:border-orange-300'
                                      }`}
                                    onClick={() => handleMatchingClick(q.id, pair.right, 'right')}
                                  >
                                    {color && <span className="mr-2">●</span>}
                                    {pair.right}
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
                                      {left} ↔ {currentAnswers[left]}
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt, idx) => {
                          const label = String.fromCharCode(65 + idx); // A, B, C, D
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
                              className={`text-left p-4 rounded-xl border-2 transition-all flex items-center ${isSelected
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                                : 'border-gray-200 hover:border-indigo-300'
                                }`}
                            >
                              <div className={`w-6 h-6 rounded border-2 mr-3 flex items-center justify-center text-xs font-bold ${isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-300 text-gray-400'
                                }`}>
                                {isSelected && <CheckCircle className="w-4 h-4" />}
                              </div>
                              {opt}
                            </button>
                          )
                        })}
                        <p className="col-span-2 text-xs text-gray-500 mt-2">Chọn tất cả các đáp án đúng.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-10 flex justify-center">
          <button
            onClick={() => {
              // Simple validation check before submitting
              const unanswered = shuffledQuestions.filter(q => {
                if (q.type === QuestionType.TRUE_FALSE) {
                  return q.items.some(i => answers[q.id]?.[i.id] === undefined);
                }
                return !answers[q.id];
              });

              if (unanswered.length > 0) {
                if (confirm(`Bạn còn ${unanswered.length} câu chưa làm xong. Bạn có chắc chắn muốn nộp bài không?`)) {
                  handleSubmit();
                }
              } else {
                handleSubmit();
              }
            }}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-12 rounded-full shadow-lg text-lg transform transition-transform hover:scale-105"
          >
            NỘP BÀI
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentView;
