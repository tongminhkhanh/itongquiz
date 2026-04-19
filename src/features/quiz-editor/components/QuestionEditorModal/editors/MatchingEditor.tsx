/**
 * MatchingEditor.tsx
 * Editor for MATCHING question type.
 */
import React from 'react';
import type { MatchingEditorDraft } from '../../../types/quiz-editor.types';
import { FieldRow, TextInput } from './shared';

interface MatchingEditorProps {
    draft: MatchingEditorDraft;
    onChange: (next: MatchingEditorDraft) => void;
}

const MatchingEditor: React.FC<MatchingEditorProps> = ({ draft, onChange }) => (
    <FieldRow label="Các cặp nối">
        <div className="space-y-2">
            {draft.pairs.map((pair, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                    <TextInput
                        value={pair.left}
                        onChange={(e) => {
                            const next = [...draft.pairs];
                            next[i] = { ...next[i], left: e.target.value };
                            onChange({ ...draft, pairs: next });
                        }}
                        placeholder="Vế trái"
                    />
                    <span className="text-gray-400 flex-shrink-0">→</span>
                    <TextInput
                        value={pair.right}
                        onChange={(e) => {
                            const next = [...draft.pairs];
                            next[i] = { ...next[i], right: e.target.value };
                            onChange({ ...draft, pairs: next });
                        }}
                        placeholder="Vế phải"
                    />
                </div>
            ))}
        </div>
    </FieldRow>
);

export default MatchingEditor;
