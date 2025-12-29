import React from 'react';
import { Quiz, QuestionType } from '../../types';
import { Card, Button } from '../common';
import { Save, PlusCircle } from 'lucide-react';
import { formatMathText } from '../../utils/formatters';

interface QuizPreviewProps {
    quiz: Quiz | null;
    onSave: () => void;
}

const QuizPreview: React.FC<QuizPreviewProps> = ({ quiz, onSave }) => {
    return (
        <Card title="📋 Xem trước đề thi">
            {quiz ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-lg">{quiz.title}</h3>
                            <p className="text-sm text-gray-500">
                                Lớp {quiz.classLevel} • {quiz.questions.length} câu • {quiz.timeLimit} phút
                            </p>
                        </div>
                        <Button
                            onClick={onSave}
                            variant="success"
                            icon={<Save className="w-4 h-4" />}
                        >
                            Lưu đề
                        </Button>
                    </div>

                    <div className="border-t pt-4 max-h-[500px] overflow-y-auto space-y-4">
                        {quiz.questions.map((q, idx) => (
                            <div key={q.id} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                {/* Question Header */}
                                <div className="flex items-start gap-2 mb-3">
                                    <span className="bg-indigo-100 text-indigo-800 text-sm font-bold px-3 py-1 rounded-lg">
                                        Câu {idx + 1}:
                                    </span>
                                    <div className="flex-1">
                                        <p className="text-gray-800 font-medium">
                                            {formatMathText((q as any).question || (q as any).mainQuestion || '')}
                                        </p>
                                    </div>
                                </div>

                                {/* MCQ Options */}
                                {q.type === QuestionType.MCQ && (
                                    <div className="ml-8 space-y-1">
                                        {((q as any).options || []).map((opt: string, i: number) => {
                                            const letter = String.fromCharCode(65 + i);
                                            const isCorrect = letter === (q as any).correctAnswer;
                                            return (
                                                <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isCorrect ? 'bg-green-100 text-green-800 font-semibold' : 'text-gray-600'}`}>
                                                    <span className={`font-bold ${isCorrect ? 'text-green-700' : 'text-gray-500'}`}>{letter}.</span>
                                                    <span>{formatMathText(opt)}</span>
                                                    {isCorrect && <span className="ml-auto text-green-600">✓</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* MULTIPLE_SELECT Options */}
                                {q.type === QuestionType.MULTIPLE_SELECT && (
                                    <div className="ml-8 space-y-1">
                                        {((q as any).options || []).map((opt: string, i: number) => {
                                            const letter = String.fromCharCode(65 + i);
                                            const isCorrect = ((q as any).correctAnswers || []).includes(letter);
                                            return (
                                                <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isCorrect ? 'bg-green-100 text-green-800 font-semibold' : 'text-gray-600'}`}>
                                                    <span className={`font-bold ${isCorrect ? 'text-green-700' : 'text-gray-500'}`}>{letter}.</span>
                                                    <span>{formatMathText(opt)}</span>
                                                    {isCorrect && <span className="ml-auto text-green-600">✓</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* TRUE_FALSE Items */}
                                {q.type === QuestionType.TRUE_FALSE && (
                                    <div className="ml-8 space-y-1">
                                        {((q as any).items || []).map((item: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded-lg text-sm">
                                                <span className="text-gray-700">{String.fromCharCode(97 + i)}. {formatMathText(item.statement)}</span>
                                                <span className={`font-bold px-2 py-0.5 rounded ${item.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {item.isCorrect ? 'Đ' : 'S'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* SHORT_ANSWER */}
                                {q.type === QuestionType.SHORT_ANSWER && (
                                    <div className="ml-8">
                                        <p className="text-sm text-gray-600">
                                            Đáp án: <span className="font-bold text-green-700">{formatMathText((q as any).correctAnswer)}</span>
                                        </p>
                                    </div>
                                )}

                                {/* MATCHING Pairs */}
                                {q.type === QuestionType.MATCHING && (
                                    <div className="ml-8 space-y-1">
                                        {((q as any).pairs || []).map((pair: any, i: number) => (
                                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm">
                                                <span className="text-gray-800 font-medium">{formatMathText(pair.left)}</span>
                                                <span className="text-gray-400">→</span>
                                                <span className="text-green-700 font-semibold">{formatMathText(pair.right)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* DRAG_DROP */}
                                {q.type === QuestionType.DRAG_DROP && (
                                    <div className="ml-8 space-y-2">
                                        <p className="text-sm text-gray-600">{formatMathText((q as any).text)}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {((q as any).blanks || []).map((blank: string, i: number) => (
                                                <span key={i} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">
                                                    {formatMathText(blank)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Question Type Badge */}
                                <div className="mt-2 ml-8">
                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                        {q.type === QuestionType.MCQ ? 'Trắc nghiệm' :
                                            q.type === QuestionType.TRUE_FALSE ? 'Đúng/Sai' :
                                                q.type === QuestionType.SHORT_ANSWER ? 'Điền đáp án' :
                                                    q.type === QuestionType.MATCHING ? 'Nối cột' :
                                                        q.type === QuestionType.MULTIPLE_SELECT ? 'Chọn nhiều' :
                                                            q.type === QuestionType.DRAG_DROP ? 'Kéo thả' : q.type}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 text-gray-400">
                    <PlusCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nhấn "Tạo câu hỏi với AI" để xem trước đề</p>
                </div>
            )}
        </Card>
    );
};

export default QuizPreview;
