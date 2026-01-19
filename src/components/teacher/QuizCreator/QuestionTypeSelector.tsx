/**
 * Question Type Selector Component
 * 
 * Checkbox group for selecting question types.
 */

import React from 'react';
import { QuestionType } from '../../../types';

const QUESTION_TYPE_CONFIG = [
    { type: QuestionType.MCQ, label: 'Trắc nghiệm', emoji: '📝' },
    { type: QuestionType.TRUE_FALSE, label: 'Đúng / Sai', emoji: '✅' },
    { type: QuestionType.SHORT_ANSWER, label: 'Điền đáp án', emoji: '✏️' },
    { type: QuestionType.MATCHING, label: 'Nối cột', emoji: '🔗' },
    { type: QuestionType.MULTIPLE_SELECT, label: 'Chọn nhiều', emoji: '☑️' },
    { type: QuestionType.DRAG_DROP, label: 'Kéo thả', emoji: '🎯' },
    { type: QuestionType.ORDERING, label: 'Sắp xếp thứ tự', emoji: '🔢' },
    { type: QuestionType.IMAGE_QUESTION, label: 'Câu hỏi hình', emoji: '🖼️' },
    { type: QuestionType.DROPDOWN, label: 'Dropdown', emoji: '🔽' },
    { type: QuestionType.UNDERLINE, label: 'Gạch chân', emoji: '✏️' },
    { type: QuestionType.CATEGORIZATION, label: 'Phân loại', emoji: '📦' },
];

interface QuestionTypeSelectorProps {
    selectedTypes: Record<string, boolean>;
    onChange: (types: Record<string, boolean>) => void;
}

export const QuestionTypeSelector: React.FC<QuestionTypeSelectorProps> = ({
    selectedTypes,
    onChange,
}) => {
    const handleToggle = (type: QuestionType) => {
        onChange({
            ...selectedTypes,
            [type]: !selectedTypes[type],
        });
    };

    return (
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <label className="block text-sm font-bold text-indigo-800 mb-3">
                Dạng câu hỏi muốn tạo:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {QUESTION_TYPE_CONFIG.map(({ type, label, emoji }) => (
                    <label
                        key={type}
                        className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${selectedTypes[type]
                            ? 'bg-indigo-100 border-2 border-indigo-400'
                            : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <input
                            type="checkbox"
                            checked={selectedTypes[type] || false}
                            onChange={() => handleToggle(type)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="text-lg">{emoji}</span>
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

export default QuestionTypeSelector;
