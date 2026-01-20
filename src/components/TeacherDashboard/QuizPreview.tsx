import React, { useState } from 'react';
import { Quiz, Question, QuestionType } from '../../types';
import { Card, Button, Modal } from '../common';
import { Save, PlusCircle, Edit3, Trash2, X, FileDown } from 'lucide-react';
import { formatMathText } from '../../utils/formatters';
import GeometryPreview from './GeometryPreview';
import MathJaxWrapper from '../common/MathJaxWrapper';
import TikZPreview from '../common/TikZPreview';
import { generateQuizDocx } from '../../utils/docxGenerator';

interface QuizPreviewProps {
    quiz: Quiz | null;
    onSave: () => void;
    onUpdateQuestions?: (questions: Question[]) => void;
}

const QuizPreview: React.FC<QuizPreviewProps> = ({ quiz, onSave, onUpdateQuestions }) => {
    // Edit modal state
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [editQuestionText, setEditQuestionText] = useState('');
    const [editOptions, setEditOptions] = useState<string[]>([]);
    const [editCorrectAnswer, setEditCorrectAnswer] = useState('');
    const [editRiddleLines, setEditRiddleLines] = useState<string[]>([]);
    const [editAnswerLabel, setEditAnswerLabel] = useState('');
    // Additional states for other question types
    const [editItems, setEditItems] = useState<any[]>([]); // TRUE_FALSE items, ORDERING items
    const [editPairs, setEditPairs] = useState<{ left: string, right: string }[]>([]); // MATCHING pairs
    const [editLetters, setEditLetters] = useState<string[]>([]); // WORD_SCRAMBLE letters
    const [editCorrectWord, setEditCorrectWord] = useState(''); // WORD_SCRAMBLE correctWord
    const [editCorrectAnswers, setEditCorrectAnswers] = useState<string[]>([]); // MULTIPLE_SELECT correctAnswers

    // Delete a question
    const handleDeleteQuestion = (questionId: string) => {
        if (!quiz || !onUpdateQuestions) return;
        const updated = quiz.questions.filter(q => q.id !== questionId);
        onUpdateQuestions(updated);
    };

    // Open edit modal
    const handleEditQuestion = (question: Question) => {
        setEditingQuestion(question);
        if ('question' in question) {
            setEditQuestionText((question as any).question);
        } else if ('mainQuestion' in question) {
            setEditQuestionText((question as any).mainQuestion);
        }
        if ('options' in question) {
            setEditOptions([...(question as any).options]);
        }
        if ('correctAnswer' in question) {
            setEditCorrectAnswer((question as any).correctAnswer);
        }
        if ('correctAnswers' in question) {
            setEditCorrectAnswers([...(question as any).correctAnswers]);
        }
        // RIDDLE specific
        if ('riddleLines' in question) {
            setEditRiddleLines([...(question as any).riddleLines]);
        }
        if ('answerLabel' in question) {
            setEditAnswerLabel((question as any).answerLabel);
        }
        // TRUE_FALSE & ORDERING items
        if ('items' in question) {
            setEditItems([...(question as any).items]);
        }
        // MATCHING pairs
        if ('pairs' in question) {
            setEditPairs([...(question as any).pairs]);
        }
        // WORD_SCRAMBLE
        if ('letters' in question) {
            setEditLetters([...(question as any).letters]);
        }
        if ('correctWord' in question) {
            setEditCorrectWord((question as any).correctWord);
        }
    };

    // Save edited question
    const handleSaveEditedQuestion = () => {
        if (!editingQuestion || !quiz || !onUpdateQuestions) return;

        const updatedQuestions = quiz.questions.map(q => {
            if (q.id !== editingQuestion.id) return q;

            const updated: any = { ...q };

            if ('question' in updated) {
                updated.question = editQuestionText;
            } else if ('mainQuestion' in updated) {
                updated.mainQuestion = editQuestionText;
            }

            if ('options' in updated && editOptions.length > 0) {
                updated.options = editOptions;
            }

            if ('correctAnswer' in updated) {
                updated.correctAnswer = editCorrectAnswer;
            }

            // RIDDLE specific
            if ('riddleLines' in updated) {
                updated.riddleLines = editRiddleLines;
            }
            if ('answerLabel' in updated) {
                updated.answerLabel = editAnswerLabel;
            }
            // TRUE_FALSE & ORDERING items
            if ('items' in updated) {
                updated.items = editItems;
            }
            // MATCHING pairs
            if ('pairs' in updated) {
                updated.pairs = editPairs;
            }
            // WORD_SCRAMBLE
            if ('letters' in updated) {
                updated.letters = editLetters;
            }
            if ('correctWord' in updated) {
                updated.correctWord = editCorrectWord;
            }
            // MULTIPLE_SELECT correctAnswers
            if ('correctAnswers' in updated) {
                updated.correctAnswers = editCorrectAnswers;
            }

            return updated as Question;
        });

        onUpdateQuestions(updatedQuestions);
        handleCloseEditModal();
    };

    // Close edit modal
    const handleCloseEditModal = () => {
        setEditingQuestion(null);
        setEditQuestionText('');
        setEditOptions([]);
        setEditCorrectAnswer('');
        setEditRiddleLines([]);
        setEditAnswerLabel('');
        setEditItems([]);
        setEditPairs([]);
        setEditLetters([]);
        setEditCorrectWord('');
        setEditCorrectAnswers([]);
    };

    // Get question type label
    const getTypeLabel = (type: QuestionType) => {
        const labels: Record<string, string> = {
            [QuestionType.MCQ]: 'Trắc nghiệm',
            [QuestionType.TRUE_FALSE]: 'Đúng/Sai',
            [QuestionType.SHORT_ANSWER]: 'Điền đáp án',
            [QuestionType.MATCHING]: 'Nối cột',
            [QuestionType.MULTIPLE_SELECT]: 'Chọn nhiều',
            [QuestionType.DRAG_DROP]: 'Kéo thả',
            [QuestionType.ORDERING]: 'Sắp xếp',
            [QuestionType.IMAGE_QUESTION]: 'Có hình',
            [QuestionType.DROPDOWN]: 'Dropdown',
            [QuestionType.UNDERLINE]: 'Gạch chân',
            [QuestionType.CATEGORIZATION]: 'Phân loại',
            [QuestionType.WORD_SCRAMBLE]: 'Ghép chữ',
            [QuestionType.RIDDLE]: 'Câu đố',
        };
        return labels[type] || type;
    };

    return (
        <>
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
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => quiz && generateQuizDocx(quiz)}
                                    variant="secondary"
                                    icon={<FileDown className="w-4 h-4" />}
                                >
                                    Tải file Word
                                </Button>
                                <Button
                                    onClick={onSave}
                                    variant="success"
                                    icon={<Save className="w-4 h-4" />}
                                >
                                    Lưu đề
                                </Button>
                            </div>
                        </div>

                        <div className="border-t pt-4 max-h-[500px] overflow-y-auto space-y-4">
                            {quiz.questions.map((q, idx) => (
                                <div key={q.id} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                    {/* Question Header with Edit/Delete buttons */}
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="flex items-start gap-2 flex-1">
                                            <span className="bg-indigo-100 text-indigo-800 text-sm font-bold px-3 py-1 rounded-lg">
                                                Câu {idx + 1}:
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-gray-800 font-medium">
                                                    <MathJaxWrapper content={formatMathText((q as any).question || (q as any).mainQuestion || '')} />
                                                </p>
                                            </div>
                                        </div>

                                        {/* Edit/Delete Buttons */}
                                        {onUpdateQuestions && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleEditQuestion(q)}
                                                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Sửa câu hỏi"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteQuestion(q.id)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Xóa câu hỏi"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* MCQ Options */}
                                    {q.type === QuestionType.MCQ && (
                                        <div className="ml-8 space-y-1">
                                            {((q as any).options || []).map((opt: string, i: number) => {
                                                const letter = String.fromCharCode(65 + i);
                                                const isCorrect = letter === (q as any).correctAnswer;
                                                // Strip existing prefix like "A. ", "B. ", "a. ", "a) "
                                                const cleanOpt = opt.replace(/^[A-Da-d][.)]\s*/, '');
                                                return (
                                                    <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isCorrect ? 'bg-green-100 text-green-800 font-semibold' : 'text-gray-600'}`}>
                                                        <span className={`font-bold ${isCorrect ? 'text-green-700' : 'text-gray-500'}`}>{letter}.</span>
                                                        <span><MathJaxWrapper content={formatMathText(cleanOpt)} /></span>
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
                                                // Strip existing prefix like "A. ", "B. ", "a. ", "a) "
                                                const cleanOpt = opt.replace(/^[A-Da-d][.)]\s*/, '');
                                                return (
                                                    <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isCorrect ? 'bg-green-100 text-green-800 font-semibold' : 'text-gray-600'}`}>
                                                        <span className={`font-bold ${isCorrect ? 'text-green-700' : 'text-gray-500'}`}>{letter}.</span>
                                                        <span><MathJaxWrapper content={formatMathText(cleanOpt)} /></span>
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
                                                    <span className="text-gray-700">{String.fromCharCode(97 + i)}. <MathJaxWrapper content={formatMathText(item.statement)} /></span>
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
                                                Đáp án: <span className="font-bold text-green-700"><MathJaxWrapper content={formatMathText((q as any).correctAnswer)} /></span>
                                            </p>
                                        </div>
                                    )}

                                    {/* MATCHING Pairs */}
                                    {q.type === QuestionType.MATCHING && (
                                        <div className="ml-8 space-y-1">
                                            {((q as any).pairs || []).map((pair: any, i: number) => (
                                                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm">
                                                    <span className="text-gray-800 font-medium"><MathJaxWrapper content={formatMathText(pair.left)} /></span>
                                                    <span className="text-gray-400">→</span>
                                                    <span className="text-green-700 font-semibold"><MathJaxWrapper content={formatMathText(pair.right)} /></span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* DRAG_DROP */}
                                    {q.type === QuestionType.DRAG_DROP && (
                                        <div className="ml-8 space-y-2">
                                            <p className="text-sm text-gray-600"><MathJaxWrapper content={formatMathText((q as any).text)} /></p>
                                            <div className="flex flex-wrap gap-2">
                                                {((q as any).blanks || []).map((blank: string, i: number) => (
                                                    <span key={i} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">
                                                        <MathJaxWrapper content={formatMathText(blank)} />
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* ORDERING */}
                                    {q.type === QuestionType.ORDERING && (
                                        <div className="ml-8 space-y-1">
                                            {((q as any).correctOrder || (q as any).items || []).map((item: string, i: number) => (
                                                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm">
                                                    <span className="w-6 h-6 flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                                                        {i + 1}
                                                    </span>
                                                    <span className="text-gray-700"><MathJaxWrapper content={formatMathText(item)} /></span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* IMAGE_QUESTION */}
                                    {q.type === QuestionType.IMAGE_QUESTION && (
                                        <div className="ml-8 space-y-2">
                                            {(q as any).geometry ? (
                                                typeof (q as any).geometry === 'string' && (q as any).geometry.includes('\\begin{tikzpicture}') ? (
                                                    <TikZPreview code={(q as any).geometry} />
                                                ) : (
                                                    <GeometryPreview data={(q as any).geometry} />
                                                )
                                            ) : (q as any).image && (
                                                (q as any).image.includes('\\begin{tikzpicture}') ? (
                                                    <TikZPreview code={(q as any).image} />
                                                ) : (
                                                    <img src={(q as any).image} alt="Question" className="max-h-32 rounded-lg border" />
                                                )
                                            )}
                                            {((q as any).options || []).map((opt: string, i: number) => {
                                                const letter = String.fromCharCode(65 + i);
                                                const isCorrect = letter === (q as any).correctAnswer;
                                                // Strip existing prefix like "A. ", "B. ", "a. ", "a) "
                                                const cleanOpt = opt.replace(/^[A-Da-d][.)]\s*/, '');
                                                return (
                                                    <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isCorrect ? 'bg-green-100 text-green-800 font-semibold' : 'text-gray-600'}`}>
                                                        <span className="font-bold">{letter}.</span>
                                                        <span><MathJaxWrapper content={formatMathText(cleanOpt)} /></span>
                                                        {isCorrect && <span className="ml-auto text-green-600">✓</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* DROPDOWN */}
                                    {q.type === QuestionType.DROPDOWN && (
                                        <div className="ml-8 space-y-2">
                                            <p className="text-sm text-gray-600"><MathJaxWrapper content={formatMathText((q as any).text)} /></p>
                                            <div className="space-y-1">
                                                {((q as any).blanks || []).map((blank: any, i: number) => (
                                                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm">
                                                        <span className="text-gray-500">Ô {i + 1}:</span>
                                                        <span className="font-bold text-green-700"><MathJaxWrapper content={blank.correctAnswer} /></span>
                                                        <span className="text-gray-400 text-xs">({(blank.options || []).join(', ')})</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* UNDERLINE */}
                                    {q.type === QuestionType.UNDERLINE && (
                                        <div className="ml-8 space-y-2">
                                            <p className="text-sm text-gray-600 mb-2">
                                                <strong>Câu:</strong> <MathJaxWrapper content={(q as any).sentence} />
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {((q as any).words || []).map((word: string, i: number) => {
                                                    const isCorrect = ((q as any).correctWordIndexes || []).includes(i);
                                                    return (
                                                        <span
                                                            key={i}
                                                            className={`px-2 py-1 rounded text-sm ${isCorrect
                                                                ? 'bg-green-100 text-green-800 font-semibold underline'
                                                                : 'bg-gray-100 text-gray-600'
                                                                }`}
                                                        >
                                                            <MathJaxWrapper content={word} />
                                                            {isCorrect && <span className="ml-1 text-green-600">✓</span>}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* CATEGORIZATION */}
                                    {q.type === QuestionType.CATEGORIZATION && (
                                        <div className="ml-8 space-y-3">
                                            {((q as any).instruction) && (
                                                <p className="text-sm text-amber-700 italic bg-amber-50 p-2 rounded">
                                                    <MathJaxWrapper content={(q as any).instruction} />
                                                </p>
                                            )}
                                            {((q as any).categories || []).map((cat: any) => {
                                                const itemsInCat = ((q as any).items || []).filter((item: any) => item.categoryId === cat.id);
                                                return (
                                                    <div key={cat.id} className="border rounded-lg p-3 bg-gray-50">
                                                        <p className="font-bold text-indigo-700 text-sm mb-2">
                                                            <MathJaxWrapper content={cat.name} />
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {itemsInCat.length === 0 ? (
                                                                <span className="text-gray-400 text-xs italic">Không có mục nào</span>
                                                            ) : (
                                                                itemsInCat.map((item: any) => (
                                                                    <span key={item.id} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                                                        <MathJaxWrapper content={item.content} />
                                                                    </span>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {/* Hiển thị items không thuộc nhóm nào */}
                                            {(() => {
                                                const itemsWithNoCategory = ((q as any).items || []).filter((item: any) =>
                                                    !item.categoryId || item.categoryId === ''
                                                );
                                                if (itemsWithNoCategory.length > 0) {
                                                    return (
                                                        <div className="border border-dashed rounded-lg p-3 bg-gray-100">
                                                            <p className="font-bold text-gray-500 text-sm mb-2">Không thuộc nhóm nào:</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {itemsWithNoCategory.map((item: any) => (
                                                                    <span key={item.id} className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs font-medium">
                                                                        <MathJaxWrapper content={item.content} />
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    )}

                                    {/* WORD_SCRAMBLE */}
                                    {q.type === QuestionType.WORD_SCRAMBLE && (
                                        <div className="ml-8 space-y-2">
                                            <div className="flex flex-wrap gap-1">
                                                <span className="text-sm text-gray-500 mr-2">Chữ cái:</span>
                                                {((q as any).letters || []).map((letter: string, i: number) => (
                                                    <span key={i} className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded font-bold text-sm">
                                                        {letter}
                                                    </span>
                                                ))}
                                            </div>
                                            <p className="text-sm">
                                                <span className="text-gray-500">Đáp án:</span>
                                                <span className="font-bold text-green-700 ml-2">{(q as any).correctWord}</span>
                                            </p>
                                            {(q as any).hint && (
                                                <p className="text-xs text-amber-600 italic">💡 Gợi ý: {(q as any).hint}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* RIDDLE */}
                                    {q.type === QuestionType.RIDDLE && (
                                        <div className="ml-8 space-y-2">
                                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                                                {((q as any).riddleLines || []).map((line: string, i: number) => (
                                                    <p key={i} className="text-amber-900 italic text-sm">{line}</p>
                                                ))}
                                            </div>
                                            <p className="text-sm">
                                                <span className="text-gray-500">{(q as any).answerLabel || 'Đáp án'}:</span>
                                                <span className="font-bold text-green-700 ml-2">{(q as any).correctAnswer}</span>
                                            </p>
                                            {(q as any).hint && (
                                                <p className="text-xs text-blue-600 italic">💡 Gợi ý: {(q as any).hint}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Question Type Badge */}
                                    <div className="mt-2 ml-8">
                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                            {getTypeLabel(q.type)}
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

            {/* Edit Question Modal */}
            {editingQuestion && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-800">✏️ Sửa câu hỏi</h2>
                            <button
                                onClick={handleCloseEditModal}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Question Text */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nội dung câu hỏi
                                </label>
                                <textarea
                                    value={editQuestionText}
                                    onChange={(e) => setEditQuestionText(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Options for MCQ */}
                            {(editingQuestion.type === QuestionType.MCQ || editingQuestion.type === QuestionType.MULTIPLE_SELECT) && editOptions.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Các đáp án
                                    </label>
                                    <div className="space-y-2">
                                        {editOptions.map((opt, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <span className="w-6 text-center font-bold text-gray-500">
                                                    {String.fromCharCode(65 + i)}.
                                                </span>
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) => {
                                                        const newOptions = [...editOptions];
                                                        newOptions[i] = e.target.value;
                                                        setEditOptions(newOptions);
                                                    }}
                                                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Correct Answer for MCQ/SHORT_ANSWER */}
                            {(editingQuestion.type === QuestionType.MCQ || editingQuestion.type === QuestionType.SHORT_ANSWER) && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Đáp án đúng
                                    </label>
                                    <input
                                        type="text"
                                        value={editCorrectAnswer}
                                        onChange={(e) => setEditCorrectAnswer(e.target.value.toUpperCase())}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder={editingQuestion.type === QuestionType.MCQ ? "A, B, C hoặc D" : "Nhập đáp án"}
                                    />
                                </div>
                            )}

                            {/* RIDDLE Edit */}
                            {editingQuestion.type === QuestionType.RIDDLE && (
                                <div className="space-y-4">
                                    {/* Riddle Lines */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Các dòng câu đố
                                        </label>
                                        <div className="space-y-2">
                                            {editRiddleLines.map((line, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="w-6 text-center text-gray-500 text-sm">{i + 1}.</span>
                                                    <input
                                                        type="text"
                                                        value={line}
                                                        onChange={(e) => {
                                                            const newLines = [...editRiddleLines];
                                                            newLines[i] = e.target.value;
                                                            setEditRiddleLines(newLines);
                                                        }}
                                                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                                                    />
                                                    {editRiddleLines.length > 2 && (
                                                        <button
                                                            onClick={() => {
                                                                const newLines = editRiddleLines.filter((_, idx) => idx !== i);
                                                                setEditRiddleLines(newLines);
                                                            }}
                                                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            {editRiddleLines.length < 5 && (
                                                <button
                                                    onClick={() => setEditRiddleLines([...editRiddleLines, ''])}
                                                    className="text-sm text-blue-600 hover:underline"
                                                >
                                                    + Thêm dòng
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Answer Label */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Label câu hỏi (VD: "Từ bỏ sắc", "Từ để nguyên")
                                        </label>
                                        <input
                                            type="text"
                                            value={editAnswerLabel}
                                            onChange={(e) => setEditAnswerLabel(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                                            placeholder="Từ bỏ sắc, Từ để nguyên..."
                                        />
                                    </div>

                                    {/* Correct Answer */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Đáp án đúng (1 tiếng)
                                        </label>
                                        <input
                                            type="text"
                                            value={editCorrectAnswer}
                                            onChange={(e) => setEditCorrectAnswer(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                            placeholder="Nhập đáp án (1 từ)..."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* TRUE_FALSE Edit */}
                            {editingQuestion.type === QuestionType.TRUE_FALSE && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Các mệnh đề (Đúng/Sai)
                                    </label>
                                    {editItems.map((item, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                            <span className="text-gray-500 text-sm">{String.fromCharCode(97 + i)}.</span>
                                            <input
                                                type="text"
                                                value={item.statement || ''}
                                                onChange={(e) => {
                                                    const newItems = [...editItems];
                                                    newItems[i] = { ...newItems[i], statement: e.target.value };
                                                    setEditItems(newItems);
                                                }}
                                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                            <select
                                                value={item.isCorrect ? 'true' : 'false'}
                                                onChange={(e) => {
                                                    const newItems = [...editItems];
                                                    newItems[i] = { ...newItems[i], isCorrect: e.target.value === 'true' };
                                                    setEditItems(newItems);
                                                }}
                                                className="px-2 py-1 border rounded-lg text-sm"
                                            >
                                                <option value="true">Đúng</option>
                                                <option value="false">Sai</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* MATCHING Edit */}
                            {editingQuestion.type === QuestionType.MATCHING && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Các cặp nối
                                    </label>
                                    {editPairs.map((pair, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                            <input
                                                type="text"
                                                value={pair.left || ''}
                                                onChange={(e) => {
                                                    const newPairs = [...editPairs];
                                                    newPairs[i] = { ...newPairs[i], left: e.target.value };
                                                    setEditPairs(newPairs);
                                                }}
                                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                placeholder="Vế trái"
                                            />
                                            <span className="text-gray-400">→</span>
                                            <input
                                                type="text"
                                                value={pair.right || ''}
                                                onChange={(e) => {
                                                    const newPairs = [...editPairs];
                                                    newPairs[i] = { ...newPairs[i], right: e.target.value };
                                                    setEditPairs(newPairs);
                                                }}
                                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                                placeholder="Vế phải"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* WORD_SCRAMBLE Edit */}
                            {editingQuestion.type === QuestionType.WORD_SCRAMBLE && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Từ đúng
                                        </label>
                                        <input
                                            type="text"
                                            value={editCorrectWord}
                                            onChange={(e) => setEditCorrectWord(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                            placeholder="Nhập từ đúng..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Các chữ cái (đã xáo trộn)
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {editLetters.map((letter, i) => (
                                                <input
                                                    key={i}
                                                    type="text"
                                                    value={letter}
                                                    onChange={(e) => {
                                                        const newLetters = [...editLetters];
                                                        newLetters[i] = e.target.value.slice(0, 1);
                                                        setEditLetters(newLetters);
                                                    }}
                                                    className="w-10 h-10 text-center border rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                                                    maxLength={1}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* MULTIPLE_SELECT correctAnswers */}
                            {editingQuestion.type === QuestionType.MULTIPLE_SELECT && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Đáp án đúng (chọn nhiều)
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {['A', 'B', 'C', 'D'].map((letter) => (
                                            <label key={letter} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={editCorrectAnswers.includes(letter)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setEditCorrectAnswers([...editCorrectAnswers, letter].sort());
                                                        } else {
                                                            setEditCorrectAnswers(editCorrectAnswers.filter(a => a !== letter));
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-green-600"
                                                />
                                                <span className="font-medium">{letter}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={handleCloseEditModal}
                                    variant="secondary"
                                    className="flex-1"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    onClick={handleSaveEditedQuestion}
                                    variant="primary"
                                    className="flex-1"
                                >
                                    💾 Lưu thay đổi
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default QuizPreview;
