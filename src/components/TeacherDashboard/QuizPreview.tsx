import React, { useState, useRef } from 'react';
import type { Quiz, Question, QuestionType as QType } from '../../types';
import { QuestionType } from '../../types';
import { Card, Button, Modal } from '../common';
import { X, Save, PlusCircle, FileDown, BookOpen, Library } from 'lucide-react';
import { generateQuizDocx } from '../../utils/docxGenerator';
import WorksheetExportModal from './WorksheetExportModal';
import { 
    QuestionCard, 
    QuestionEditorModal, 
    useQuestionEditor,
    useSmartDistractors,
    AnyEditorDraft,
} from '../../features/quiz-editor';
import { useAuthStore } from '../../../stores/authStore';
import { testBankService } from '../../services/testBankService';
import { TestBankModal } from '../../features/quiz-editor/components/TestBankModal';

interface QuizPreviewProps {
    quiz: Quiz | null;
    onSave: () => void;
    isSaving?: boolean;
    onUpdateQuestions?: (questions: Question[]) => void;
    onStartManual?: () => void;
    onRegenerateQuestion?: (question: Question) => Promise<Question | null>;
}

const QuizPreview: React.FC<QuizPreviewProps> = ({ 
    quiz, 
    onSave, 
    isSaving = false, 
    onUpdateQuestions, 
    onStartManual, 
    onRegenerateQuestion 
}) => {
    // 1. Editor Hook
    const {
        editingQuestion,
        draft,
        questionTextRef,
        openEditor,
        closeEditor,
        setDraft,
        saveEdit,
        isAddMode,
        openAddEditor,
    } = useQuestionEditor({
        quiz,
        onUpdateQuestions,
    });

    // 2. Smart Distractors Hook
    const distractorConfig = useSmartDistractors({
        quiz,
        onUpdateQuestions,
        onUpdateEditOptions: (options) => {
            setDraft((prev) => {
                if (
                    prev.type === QuestionType.MCQ ||
                    prev.type === QuestionType.MULTIPLE_SELECT ||
                    prev.type === QuestionType.IMAGE_QUESTION
                ) {
                    return { ...prev, options } as AnyEditorDraft;
                }
                return prev;
            });
        },
    });

    // 3. Regeneration State
    const [isGeneratingSingle, setIsGeneratingSingle] = useState<string | null>(null);

    // 4. Worksheet Export Modal
    const [showWorksheetModal, setShowWorksheetModal] = useState(false);

    const handleRegenerateSingleQuestion = async (q: Question) => {
        if (!onRegenerateQuestion || !quiz || !onUpdateQuestions) return;
        setIsGeneratingSingle(q.id);
        try {
            const newQ = await onRegenerateQuestion(q);
            if (newQ) {
                onUpdateQuestions(quiz.questions.map(existing => existing.id === q.id ? newQ : existing));
            }
        } finally {
            setIsGeneratingSingle(null);
        }
    };

    // 2. Add Type Selection State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newQuestionType, setNewQuestionType] = useState<QuestionType>(QuestionType.MCQ);

    // MathJax Ref
    const previewContainerRef = useRef<HTMLDivElement>(null);

    const handleConfirmAddStart = () => {
        // Create an empty dummy question structure depending on newQuestionType
        const dummyDraft: any = {
            id: `q-manual-${Date.now()}`,
            type: newQuestionType,
            difficulty: 1, // Default to level 1 for new manually added questions
        };

        // Basic defaults to prevent crash when mapper reads it. 
        if (newQuestionType === QuestionType.TRUE_FALSE) {
            dummyDraft.mainQuestion = '';
            dummyDraft.items = [];
        } else {
            dummyDraft.question = '';
        }
        
        openAddEditor(dummyDraft as Question);
        setShowAddModal(false);
    };

    // 5. Test Bank State
    const { username } = useAuthStore();
    const [showTestBank, setShowTestBank] = useState(false);

    const handleSaveToBank = async (q: Question) => {
        if (!username) return;
        await testBankService.saveQuestion(username, q, [q.type]);
    };

    return (
        <>
            {/* Worksheet Export Modal */}
            {showWorksheetModal && quiz && (
                <WorksheetExportModal
                    quiz={quiz}
                    onClose={() => setShowWorksheetModal(false)}
                />
            )}

            {/* Test Bank Modal */}
            <TestBankModal
                isOpen={showTestBank}
                onClose={() => setShowTestBank(false)}
                teacherId={username || ''}
                onAddQuestion={(q) => {
                    if (onUpdateQuestions && quiz) {
                        onUpdateQuestions([...quiz.questions, q]);
                    }
                }}
            />

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
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    onClick={() => quiz && generateQuizDocx(quiz)}
                                    variant="secondary"
                                    icon={<FileDown className="w-4 h-4" />}
                                >
                                    Tải file Word
                                </Button>
                                <button
                                    onClick={() => setShowWorksheetModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-sm hover:shadow-md transition-all"
                                    title="Xuất Vở Bài Tập để in"
                                >
                                    <BookOpen className="w-4 h-4" />
                                    <span className="hidden sm:inline">Xuất Vở</span>
                                </button>
                                <Button
                                    onClick={onSave}
                                    variant="success"
                                    loading={isSaving}
                                    icon={<Save className="w-4 h-4" />}
                                >
                                    {isSaving ? 'Đang lưu...' : 'Lưu đề'}
                                </Button>
                            </div>
                        </div>

                        <div ref={previewContainerRef} className="border-t pt-4 max-h-[500px] overflow-y-auto space-y-4 pr-2">
                            {/* NEW RENDER LOGIC */}
                            {quiz.questions.map((q, idx) => (
                                <QuestionCard
                                    key={q.id}
                                    question={q}
                                    index={idx}
                                    onEdit={() => openEditor(q)}
                                    onDelete={(id) => {
                                        if (onUpdateQuestions) {
                                            onUpdateQuestions(quiz.questions.filter(x => x.id !== id));
                                        }
                                    }}
                                    onRegenerate={() => handleRegenerateSingleQuestion(q)}
                                    // Save to bank
                                    onSaveToBank={handleSaveToBank}
                                    // Smart Distractor props
                                    isGeneratingSingle={isGeneratingSingle === q.id ? q.id : null}
                                    generatingDistractorId={distractorConfig.generatingDistractorId}
                                    showDistractorPopover={distractorConfig.showDistractorPopover}
                                    distractorCount={distractorConfig.distractorCount}
                                    distractorError={distractorConfig.distractorError}
                                    onGenerateDistractors={(id, count) => distractorConfig.generateDistractors(id, count, false)}
                                    onToggleDistractorPopover={distractorConfig.setShowDistractorPopover}
                                    onSetDistractorCount={distractorConfig.setDistractorCount}
                                />
                            ))}

                            {/* Add Question Button */}
                            {onUpdateQuestions && (
                                <div className="mt-4 border-t pt-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium text-gray-600">➕ Thêm câu hỏi:</span>
                                        {[
                                            { type: QuestionType.MCQ, label: 'Trắc nghiệm', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                                            { type: QuestionType.TRUE_FALSE, label: 'Đúng/Sai', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
                                            { type: QuestionType.SHORT_ANSWER, label: 'Điền đáp án', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
                                            { type: QuestionType.MATCHING, label: 'Nối cột', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
                                        ].map((btn) => (
                                            <button
                                                key={btn.type}
                                                onClick={() => {
                                                    setNewQuestionType(btn.type);
                                                    setShowAddModal(true);
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${btn.color}`}
                                            >
                                                {btn.label}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => {
                                                setNewQuestionType(QuestionType.MULTIPLE_SELECT);
                                                setShowAddModal(true);
                                            }}
                                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                        >
                                            + Dạng khác
                                        </button>
                                        <div className="w-px h-6 bg-gray-300 mx-1 border-r" />
                                        <button
                                            onClick={() => setShowTestBank(true)}
                                            className="px-3 py-1.5 rounded-lg text-sm font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Library className="w-4 h-4" /> Bốc từ kho
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-16 px-4 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4">
                            <PlusCircle className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-2">Chưa có dữ liệu đề thi</h3>
                        <p className="text-slate-500 max-w-xs mx-auto mb-6">
                            Vui lòng nhập thông tin bên trái và chọn phương thức tạo đề (AI hoặc Thủ công).
                        </p>
                        {onStartManual && (
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={onStartManual}
                                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95 text-sm"
                                >
                                    Bắt đầu tạo đề THỦ CÔNG
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Type Selection Modal for "Other" Type or all types before Add */}
            {showAddModal && (
                <Modal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    title="Thêm câu hỏi mới"
                    size="md"
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Chọn loại câu hỏi
                            </label>
                            <select
                                value={newQuestionType}
                                onChange={(e) => setNewQuestionType(e.target.value as QuestionType)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value={QuestionType.MCQ}>Trắc nghiệm (1 đáp án)</option>
                                <option value={QuestionType.MULTIPLE_SELECT}>Chọn nhiều đáp án</option>
                                <option value={QuestionType.TRUE_FALSE}>Đúng/Sai</option>
                                <option value={QuestionType.SHORT_ANSWER}>Điền đáp án ngắn</option>
                                <option value={QuestionType.MATCHING}>Nối cột</option>
                                <option value={QuestionType.DRAG_DROP}>Kéo thả (điền khuyết)</option>
                                <option value={QuestionType.DROPDOWN}>Dropdown (chọn từ danh sách)</option>
                                <option value={QuestionType.UNDERLINE}>Gạch chân</option>
                                <option value={QuestionType.ORDERING}>Sắp xếp</option>
                                <option value={QuestionType.CATEGORIZATION}>Phân loại</option>
                                <option value={QuestionType.WORD_SCRAMBLE}>Ghép chữ (Tiếng Anh)</option>
                                <option value={QuestionType.ERROR_CORRECTION}>Sửa lỗi sai</option>
                                <option value={QuestionType.IMAGE_QUESTION}>Hình học / Dựa vào hình</option>
                                <option value={QuestionType.RIDDLE}>Câu đố</option>
                            </select>
                        </div>
                        <div className="flex gap-2 justify-end pt-4">
                            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                                Hủy
                            </Button>
                            <Button variant="primary" onClick={handleConfirmAddStart}>
                                Tiếp tục
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* NEW Editor Modal that handles everything else */}
            {editingQuestion && draft && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="font-bold text-lg">{isAddMode ? 'Thêm câu hỏi mới' : 'Sửa câu hỏi'}</h3>
                            <button onClick={closeEditor} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            <QuestionEditorModal
                                editingQuestion={editingQuestion}
                                draft={draft}
                                onDraftChange={setDraft}
                                onSave={saveEdit}
                                onCancel={closeEditor}
                                isGeneratingDistractors={distractorConfig.isGeneratingDistractors}
                                distractorCount={distractorConfig.distractorCount}
                                distractorError={distractorConfig.distractorError}
                                onSetDistractorCount={distractorConfig.setDistractorCount}
                                onGenerateDistractors={(id, count) => distractorConfig.generateDistractors(id, count, true)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default QuizPreview;

