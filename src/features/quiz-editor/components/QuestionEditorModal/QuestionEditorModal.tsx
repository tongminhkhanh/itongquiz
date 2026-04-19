/**
 * QuestionEditorModal.tsx
 *
 * The single modal container for editing any question type.
 *
 * Architecture:
 *   - Receives `editingQuestion` + `draft` from `useQuestionEditor` hook
 *   - Renders a shared top section (question text + difficulty + image)
 *   - Dispatches to the correct type-specific Editor component
 *   - Has Save / Cancel buttons that call the hook's `saveEdit` / `closeEditor`
 *
 * No state lives here — it is a pure rendering layer over the hook.
 */
import React, { useRef } from 'react';
import { X, Save } from 'lucide-react';
import { QuestionType } from '../../../../types';
import type { Question } from '../../../../types';
import type { AnyEditorDraft, Difficulty } from '../../types/quiz-editor.types';
import { getTypeLabel } from '../../index';

// Editor components (colocated — no lazy needed; modal itself is conditionally rendered)
import { MCQEditor, MultipleSelectEditor } from './editors/MCQEditor';
import TrueFalseEditor from './editors/TrueFalseEditor';
import MatchingEditor from './editors/MatchingEditor';
import DragDropEditor from './editors/DragDropEditor';
import OrderingEditor from './editors/OrderingEditor';
import ImageQuestionEditor from './editors/ImageQuestionEditor';
import DropdownEditor from './editors/DropdownEditor';
import UnderlineEditor from './editors/UnderlineEditor';
import CategorizationEditor from './editors/CategorizationEditor';
import WordScrambleEditor from './editors/WordScrambleEditor';
import RiddleEditor from './editors/RiddleEditor';
import ErrorCorrectionEditor from './editors/ErrorCorrectionEditor';
import { FieldRow, TextInput } from './editors/shared';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface QuestionEditorModalProps {
    editingQuestion: Question;
    draft: AnyEditorDraft;
    onDraftChange: (updater: (prev: AnyEditorDraft) => AnyEditorDraft) => void;
    onSave: () => void;
    onCancel: () => void;
    // Distractor panel
    isGeneratingDistractors?: boolean;
    distractorCount?: number;
    distractorError?: string | null;
    onSetDistractorCount?: (n: number) => void;
    onGenerateDistractors?: (questionId: string, count: number, inEditMode: boolean) => void;
}

// ---------------------------------------------------------------------------
// Shared question text + difficulty section
// ---------------------------------------------------------------------------

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
    { value: 1, label: 'Dễ' },
    { value: 2, label: 'Trung bình' },
    { value: 3, label: 'Khó' },
];

const SharedHeaderEditor: React.FC<{
    draft: AnyEditorDraft;
    onDraftChange: (updater: (prev: AnyEditorDraft) => AnyEditorDraft) => void;
}> = ({ draft, onDraftChange }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const questionField =
        draft.type === QuestionType.TRUE_FALSE ? 'mainQuestion' : 'question';

    const questionValue =
        draft.type === QuestionType.TRUE_FALSE
            ? (draft as { mainQuestion: string }).mainQuestion
            : (draft as { question: string }).question;

    return (
        <div className="space-y-3">
            <FieldRow label="Nội dung câu hỏi">
                <textarea
                    ref={textareaRef}
                    value={questionValue}
                    onChange={(e) =>
                        onDraftChange((prev) => ({ ...prev, [questionField]: e.target.value }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                    placeholder="Nhập nội dung câu hỏi..."
                />
            </FieldRow>

            <div className="flex items-center gap-4">
                <FieldRow label="Độ khó">
                    <div className="flex gap-2">
                        {DIFFICULTIES.map(({ value, label }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() =>
                                    onDraftChange((prev) => ({ ...prev, difficulty: value }))
                                }
                                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                                    draft.difficulty === value
                                        ? 'bg-blue-500 text-white border-blue-500'
                                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </FieldRow>

                {/* Image field (available for most types except TRUE_FALSE which doesn't use it) */}
                {draft.type !== QuestionType.TRUE_FALSE &&
                    draft.type !== QuestionType.IMAGE_QUESTION &&
                    draft.type !== QuestionType.DROPDOWN && (
                        <div className="flex-1">
                            <FieldRow label="📎 URL hình đính kèm (tùy chọn)">
                                <TextInput
                                    value={(draft as { image?: string }).image ?? ''}
                                    onChange={(e) =>
                                        onDraftChange((prev) => ({
                                            ...prev,
                                            image: e.target.value,
                                        }))
                                    }
                                    placeholder="https://..."
                                />
                            </FieldRow>
                        </div>
                    )}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Type-specific editor dispatcher
// ---------------------------------------------------------------------------

const TypeEditorDispatcher: React.FC<{
    draft: AnyEditorDraft;
    onDraftChange: (updater: (prev: AnyEditorDraft) => AnyEditorDraft) => void;
    isGeneratingDistractors: boolean;
    distractorCount: number;
    distractorError: string | null;
    onSetDistractorCount?: (n: number) => void;
    onGenerateDistractors?: () => void;
}> = ({
    draft,
    onDraftChange,
    isGeneratingDistractors,
    distractorCount,
    distractorError,
    onSetDistractorCount,
    onGenerateDistractors,
}) => {
    switch (draft.type) {
        case QuestionType.MCQ:
            return (
                <MCQEditor
                    draft={draft}
                    onChange={(next) => onDraftChange(() => next)}
                    isGeneratingDistractors={isGeneratingDistractors}
                    distractorCount={distractorCount}
                    distractorError={distractorError}
                    onSetDistractorCount={onSetDistractorCount}
                    onGenerateDistractors={onGenerateDistractors}
                />
            );

        case QuestionType.MULTIPLE_SELECT:
            return (
                <MultipleSelectEditor
                    draft={draft}
                    onChange={(next) => onDraftChange(() => next)}
                    isGeneratingDistractors={isGeneratingDistractors}
                    distractorCount={distractorCount}
                    distractorError={distractorError}
                    onSetDistractorCount={onSetDistractorCount}
                    onGenerateDistractors={onGenerateDistractors}
                />
            );

        case QuestionType.TRUE_FALSE:
            return (
                <TrueFalseEditor
                    draft={draft}
                    onChange={(next) => onDraftChange(() => next)}
                />
            );

        case QuestionType.SHORT_ANSWER:
            return (
                <FieldRow label="Đáp án đúng">
                    <TextInput
                        value={draft.correctAnswer}
                        onChange={(e) =>
                            onDraftChange((prev) => ({
                                ...prev,
                                correctAnswer: e.target.value,
                            }))
                        }
                        placeholder="Nhập đáp án"
                    />
                </FieldRow>
            );

        case QuestionType.MATCHING:
            return (
                <MatchingEditor
                    draft={draft}
                    onChange={(next) => onDraftChange(() => next)}
                />
            );

        case QuestionType.DRAG_DROP:
            return (
                <DragDropEditor
                    draft={draft}
                    onChange={(next) => onDraftChange(() => next)}
                />
            );

        case QuestionType.ORDERING:
            return (
                <OrderingEditor
                    draft={draft}
                    onChange={(next) => onDraftChange(() => next)}
                />
            );

        case QuestionType.IMAGE_QUESTION:
            return (
                <ImageQuestionEditor
                    draft={draft}
                    onChange={(next) => onDraftChange(() => next)}
                />
            );

        case QuestionType.DROPDOWN:
            return (
                <DropdownEditor
                    draft={draft}
                    onChange={(next) => onDraftChange(() => next)}
                />
            );

        case QuestionType.UNDERLINE:
            return (
                <UnderlineEditor
                    draft={draft}
                    onChange={(next) => onDraftChange(() => next)}
                />
            );

        case QuestionType.CATEGORIZATION:
            return (
                <CategorizationEditor
                    draft={draft}
                    onChange={(next) => onDraftChange(() => next)}
                />
            );

        case QuestionType.WORD_SCRAMBLE:
            return (
                <WordScrambleEditor
                    draft={draft}
                    onChange={(next) => onDraftChange(() => next)}
                />
            );

        case QuestionType.RIDDLE:
            return (
                <RiddleEditor
                    draft={draft}
                    onChange={(next) => onDraftChange(() => next)}
                />
            );

        case QuestionType.ERROR_CORRECTION:
            return (
                <ErrorCorrectionEditor
                    draft={draft}
                    onChange={(next) => onDraftChange(() => next)}
                />
            );

        default:
            return (
                <p className="text-sm text-gray-500">
                    Loại câu hỏi này chưa có editor. Vui lòng liên hệ admin.
                </p>
            );
    }
};

// ---------------------------------------------------------------------------
// QuestionEditorModal
// ---------------------------------------------------------------------------

const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
    editingQuestion,
    draft,
    onDraftChange,
    onSave,
    onCancel,
    isGeneratingDistractors = false,
    distractorCount = 3,
    distractorError = null,
    onSetDistractorCount,
    onGenerateDistractors,
}) => {
    const typeLabel = getTypeLabel(editingQuestion.type);

    const handleGenerateDistractors = onGenerateDistractors
        ? () => onGenerateDistractors(editingQuestion.id, distractorCount, true)
        : undefined;

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && onCancel()}
        >
            {/* Modal */}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Sửa câu hỏi</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Loại:{' '}
                            <span className="font-semibold text-indigo-600">{typeLabel}</span>
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Đóng"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                    {/* Shared header (question text + difficulty + optional image) */}
                    <SharedHeaderEditor draft={draft} onDraftChange={onDraftChange} />

                    {/* Divider */}
                    <div className="border-t border-gray-100" />

                    {/* Type-specific editor */}
                    <TypeEditorDispatcher
                        draft={draft}
                        onDraftChange={onDraftChange}
                        isGeneratingDistractors={isGeneratingDistractors}
                        distractorCount={distractorCount}
                        distractorError={distractorError}
                        onSetDistractorCount={onSetDistractorCount}
                        onGenerateDistractors={handleGenerateDistractors}
                    />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Huỷ
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                    >
                        <Save className="w-4 h-4" />
                        Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(QuestionEditorModal);
