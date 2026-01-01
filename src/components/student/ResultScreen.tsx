import React from 'react';
import { Quiz, QuestionType, StudentResult } from '../../types';
import { Home } from 'lucide-react';

interface Props {
    quiz: Quiz;
    result: StudentResult;
    answers: Record<string, any>;
    onExit: () => void;
}

// Helper function to format math text
const formatText = (text: string) => {
    if (!text) return "";
    return text
        .replace(/([a-zA-Z0-9?]+)\s*\*\s*([a-zA-Z0-9?]+)/g, '$1 x $2')
        .replace(/([a-zA-Z0-9?]+)\s+\/\s+([a-zA-Z0-9?]+)/g, '$1 : $2');
};

const ResultScreen: React.FC<Props> = ({ quiz, result, answers, onExit }) => {
    return (
        <div className="max-w-2xl mx-auto p-4 pb-20">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Score Header */}
                <div className={`p-6 text-center ${result.score >= 5 ? 'bg-green-100' : 'bg-red-100'}`}>
                    <h2 className="text-3xl font-bold mb-2">Kết quả của em</h2>
                    <div className="text-6xl font-extrabold mb-2" style={{ color: result.score >= 5 ? '#16a34a' : '#dc2626' }}>
                        {result.score}
                    </div>
                    <p className="text-gray-600">Đúng {result.correctCount}/{result.totalQuestions} câu</p>
                </div>

                <div className="p-6">
                    {/* Teacher's Comment */}
                    <div className="bg-blue-50 p-4 rounded-xl mb-6">
                        <h3 className="font-bold text-blue-800 mb-2">🌟 Nhận xét của thầy cô:</h3>
                        <p className="text-blue-700 text-sm">
                            {result.score >= 9 ? "Tuyệt vời! Em nắm rất chắc kiến thức. Hãy tiếp tục phát huy nhé!" :
                                result.score >= 7 ? "Khá lắm! Em đã hiểu bài, nhưng cần cẩn thận hơn một chút ở các câu khó." :
                                    result.score >= 5 ? "Đạt. Em cần ôn lại bài kỹ hơn để đạt điểm cao hơn vào lần sau." :
                                        "Cần cố gắng nhiều hơn. Em hãy xem lại sách giáo khoa và hỏi thầy cô những phần chưa hiểu nhé!"}
                        </p>
                    </div>

                    {/* Detailed Review */}
                    <div className="space-y-6">
                        <h3 className="font-bold text-lg border-b pb-2">Chi tiết bài làm</h3>
                        {quiz.questions.map((q, idx) => (
                            <div key={q.id} className="border-b border-gray-100 pb-4 last:border-0">
                                <div className="flex items-start mb-2">
                                    <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-1 rounded mr-2 mt-0.5">Câu {idx + 1}</span>
                                    <div>
                                        {q.type === QuestionType.TRUE_FALSE ? (
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

                                {/* Answer Review */}
                                <div className="ml-10 text-sm">
                                    {/* MCQ Review */}
                                    {q.type === QuestionType.MCQ && (() => {
                                        const isCorrect = answers[q.id] === q.correctAnswer;
                                        const correctIndex = ['A', 'B', 'C', 'D'].indexOf(q.correctAnswer);
                                        const correctOptionText = q.options[correctIndex] || q.correctAnswer;
                                        return (
                                            <div>
                                                <p className={isCorrect ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                                                    Em chọn: {answers[q.id] || "Không trả lời"}
                                                </p>
                                                {!isCorrect && (
                                                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                                                        <div className="flex items-start">
                                                            <span className="text-green-600 font-bold mr-2">✓</span>
                                                            <p className="text-green-700">
                                                                <strong>Đáp án đúng:</strong> {q.correctAnswer}. {correctOptionText}
                                                            </p>
                                                        </div>
                                                        <div className="border-t border-blue-200 pt-2">
                                                            <p className="text-blue-800 text-sm">
                                                                💡 <strong>Hướng dẫn giải:</strong>
                                                            </p>
                                                            <p className="text-blue-700 text-sm mt-1">
                                                                {(q as any).explanation || `Câu hỏi: "${formatText((q as any).question)}". Đáp án đúng là "${correctOptionText}". Em hãy đọc lại câu hỏi và so sánh các đáp án để hiểu tại sao đáp án này đúng nhé!`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {isCorrect && <span className="text-green-600">✓ Chính xác!</span>}
                                            </div>
                                        );
                                    })()}

                                    {/* Short Answer Review */}
                                    {q.type === QuestionType.SHORT_ANSWER && (() => {
                                        const correctAns = (q.correctAnswer || "").toString();
                                        const studentAns = (answers[q.id] || "").toString();
                                        const isCorrect = studentAns.toLowerCase() === correctAns.toLowerCase();
                                        return (
                                            <div>
                                                <p className={isCorrect ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                                                    Em ghi: {studentAns || "(Không trả lời)"}
                                                </p>
                                                {!isCorrect && (
                                                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                                                        <div className="flex items-start">
                                                            <span className="text-green-600 font-bold mr-2">✓</span>
                                                            <p className="text-green-700">
                                                                <strong>Đáp án đúng:</strong> {correctAns}
                                                            </p>
                                                        </div>
                                                        <div className="border-t border-blue-200 pt-2">
                                                            <p className="text-blue-800 text-sm">
                                                                💡 <strong>Hướng dẫn giải:</strong>
                                                            </p>
                                                            <p className="text-blue-700 text-sm mt-1">
                                                                {(q as any).explanation || `Từ câu hỏi "${formatText((q as any).question)}", em cần tính/suy luận để ra kết quả là "${correctAns}". Hãy kiểm tra lại từng bước tính toán của mình nhé!`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {isCorrect && <span className="text-green-600">✓ Chính xác!</span>}
                                            </div>
                                        );
                                    })()}

                                    {/* True/False Review */}
                                    {q.type === QuestionType.TRUE_FALSE && (
                                        <div className="grid grid-cols-1 gap-1 mt-2">
                                            {(q.items || []).map((item, idx) => {
                                                const itemKey = item.id || `item-${idx}`;
                                                const studentVal = answers[q.id]?.[itemKey];
                                                const isCorrect = studentVal === item.isCorrect;
                                                return (
                                                    <div key={itemKey} className={`p-2 rounded ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
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
                                            {(q.items || []).some((item, idx) => {
                                                const itemKey = item.id || `item-${idx}`;
                                                return answers[q.id]?.[itemKey] !== item.isCorrect;
                                            }) && (
                                                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                                                        <p className="text-blue-800 text-sm font-bold">💡 Hướng dẫn giải:</p>
                                                        <div className="text-sm space-y-1">
                                                            {(q.items || []).map((item, idx) => {
                                                                const itemKey = item.id || `item-${idx}`;
                                                                const studentVal = answers[q.id]?.[itemKey];
                                                                const isItemCorrect = studentVal === item.isCorrect;
                                                                if (isItemCorrect) return null;
                                                                return (
                                                                    <div key={itemKey} className="bg-white p-2 rounded border-l-4 border-blue-400">
                                                                        <p className="text-gray-700">
                                                                            <span className="font-medium">"{formatText(item.statement)}"</span>
                                                                        </p>
                                                                        <p className="text-blue-700 mt-1">
                                                                            → Đáp án đúng là <strong>{item.isCorrect ? "ĐÚNG" : "SAI"}</strong>.
                                                                            {item.isCorrect
                                                                                ? " Phát biểu này hoàn toàn chính xác theo nội dung bài học."
                                                                                : " Phát biểu này không đúng, em cần xem lại kiến thức liên quan."}
                                                                        </p>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        {(q as any).explanation && (
                                                            <p className="text-blue-700 text-sm border-t border-blue-200 pt-2">
                                                                📝 {(q as any).explanation}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                        </div>
                                    )}

                                    {/* Matching Review */}
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
                                                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                                                        <p className="text-blue-800 text-sm font-bold">💡 Hướng dẫn giải:</p>
                                                        <div className="text-sm space-y-1">
                                                            {incorrectPairs.map(pair => (
                                                                <div key={pair.left} className="bg-white p-2 rounded border-l-4 border-green-400">
                                                                    <p className="text-green-700">
                                                                        ✓ <strong>{formatText(pair.left)}</strong> → <strong>{formatText(pair.right)}</strong>
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <p className="text-blue-700 text-sm border-t border-blue-200 pt-2">
                                                            📝 {(q as any).explanation || "Hãy ghi nhớ mối liên hệ giữa các cặp trên. Mỗi phần tử bên trái chỉ nối với đúng một phần tử bên phải."}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Multiple Select Review */}
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
                                                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                                                        <div className="flex items-start">
                                                            <span className="text-green-600 font-bold mr-2">✓</span>
                                                            <div>
                                                                <p className="text-green-700 font-bold">Đáp án đúng:</p>
                                                                <ul className="list-disc list-inside text-green-700 text-sm">
                                                                    {correctAns.map((ans: string) => {
                                                                        const optIdx = ['A', 'B', 'C', 'D'].indexOf(ans);
                                                                        return (
                                                                            <li key={ans}>
                                                                                {ans}. {q.options[optIdx] || ans}
                                                                            </li>
                                                                        );
                                                                    })}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                        <div className="border-t border-blue-200 pt-2">
                                                            <p className="text-blue-800 text-sm">
                                                                💡 <strong>Hướng dẫn giải:</strong>
                                                            </p>
                                                            <p className="text-blue-700 text-sm mt-1">
                                                                {(q as any).explanation || `Câu hỏi này có ${correctAns.length} đáp án đúng. Em cần chọn tất cả các đáp án: ${correctAns.join(', ')}. Hãy đọc kỹ từng lựa chọn và kiểm tra xem chúng có thỏa mãn yêu cầu của đề bài không.`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Drag & Drop Review */}
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
                                                    {parts.map((part: string, idx: number) => {
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

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t flex space-x-3">
                    <button onClick={onExit} className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-100 flex items-center justify-center">
                        <Home className="w-4 h-4 mr-2" /> Về trang chủ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResultScreen;
