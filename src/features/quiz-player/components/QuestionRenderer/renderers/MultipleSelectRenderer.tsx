import React from 'react';
import { CheckCircle } from 'lucide-react';
import { BaseRendererProps } from '../types';
import MathSpan from '../atoms/MathSpan';

/**
 * MultipleSelectRenderer: Renders a Multiple Select (Multi-choice) Question.
 */
const MultipleSelectRenderer: React.FC<BaseRendererProps> = ({
    question: q,
    answers,
    onAnswerChange,
}) => {
    const options = q.options ?? [];

    return (
        <div className="grid grid-cols-1 gap-2">
            {options.map((opt, idx) => {
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
                            onAnswerChange(q.id, newAnswers);
                        }}
                        className={`text-left p-3 rounded-lg border transition-all flex items-center ${
                            isSelected
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                                : 'border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${
                            isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300'
                        }`}>
                            {isSelected && <CheckCircle className="w-3 h-3" />}
                        </div>
                        <MathSpan content={opt} className="flex-1" />
                    </button>
                );
            })}
        </div>
    );
};

export default React.memo(MultipleSelectRenderer);
