import React from 'react';
import { X } from 'lucide-react';
import type { Question } from '../../../types';
import type { AnyEditorDraft } from '../../../features/quiz-editor/types/quiz-editor.types';
import QuestionEditorModal from '../../../features/quiz-editor/components/QuestionEditorModal/QuestionEditorModal';
import type { useSmartDistractors } from '../../../features/quiz-editor/hooks/useSmartDistractors';

interface EditorOverlayProps {
    editingQuestion: Question | null;
    draft: AnyEditorDraft | null;
    isAddMode: boolean;
    onDraftChange: (updater: (draft: AnyEditorDraft) => AnyEditorDraft) => void;
    onSave: () => void;
    onClose: () => void;
    distractors: ReturnType<typeof useSmartDistractors>;
}

const EditorOverlay: React.FC<EditorOverlayProps> = ({
    editingQuestion,
    draft,
    isAddMode,
    onDraftChange,
    onSave,
    onClose,
    distractors,
}) => editingQuestion && draft ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-bold text-lg">{isAddMode ? 'Thêm câu hỏi mới' : 'Sửa câu hỏi'}</h3>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                    <X className="w-5 h-5" />
                </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
                <QuestionEditorModal
                    editingQuestion={editingQuestion}
                    draft={draft}
                    onDraftChange={onDraftChange}
                    onSave={onSave}
                    onCancel={onClose}
                    isGeneratingDistractors={distractors.isGeneratingDistractors}
                    distractorCount={distractors.distractorCount}
                    distractorError={distractors.distractorError}
                    onSetDistractorCount={distractors.setDistractorCount}
                    onGenerateDistractors={(id, count) => distractors.generateDistractors(id, count, true)}
                />
            </div>
        </div>
    </div>
) : null;

export default EditorOverlay;
