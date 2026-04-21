import React from 'react';
import { BaseRendererProps } from '../types';
import MathSpan from '../atoms/MathSpan';
import ChoiceIndicator from '../atoms/ChoiceIndicator';

/**
 * MCQRenderer: Renders a Multiple Choice Question.
 * Enhanced to handle potential nested options or complex data structures.
 */
const MCQRenderer: React.FC<BaseRendererProps> = ({
    question: q,
    answers,
    onAnswerChange,
}) => {
    const rawOptions = (q as any).options ?? [];
    
    // Normalize options: Ensure we're dealing with a flat array or handle groups
    // If options[0] is an array, we treat it as a grouped MCQ (rare but happens in some source data)
    const isGrouped = Array.isArray(rawOptions[0]) && rawOptions.length > 0;

    if (isGrouped) {
        return (
            <div className="space-y-8">
                {(rawOptions as any[]).map((group, gIdx) => (
                    <div key={gIdx} className="space-y-3">
                        {rawOptions.length > 1 && (
                            <div className="text-sm font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-md inline-block">
                                Nhóm {gIdx + 1}
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {group.map((opt: string, idx: number) => {
                                const label = String.fromCharCode(65 + idx);
                                const answerKey = q.id;
                                // For grouped answers, we might need a composite key, 
                                // but standard MCQ expects a single value per ID.
                                // We'll assume the client handles the mapping or we default to last selected.
                                const isSelected = answers[answerKey] === `${gIdx}-${label}`;
                                
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => onAnswerChange(answerKey, `${gIdx}-${label}`)}
                                        className={`text-left p-3 rounded-lg border transition-all flex items-center ${
                                            isSelected
                                                ? 'border-orange-500 bg-orange-50 text-orange-900 ring-1 ring-orange-500'
                                                : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <ChoiceIndicator label={label} isSelected={isSelected} />
                                        <MathSpan content={typeof opt === 'string' ? opt.replace(/^[A-Za-z][.)]\s*/, '') : String(opt)} className="flex-1" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Standard Flat Layout
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rawOptions.map((opt, idx) => {
                const label = String.fromCharCode(65 + idx);
                const isSelected = answers[q.id] === label;
                
                return (
                    <button
                        key={idx}
                        onClick={() => onAnswerChange(q.id, label)}
                        className={`text-left p-4 rounded-xl border-2 transition-all flex items-center group ${
                            isSelected
                                ? 'border-orange-500 bg-orange-50 text-orange-900 shadow-sm'
                                : 'border-gray-100 bg-white hover:border-orange-200 hover:bg-gray-50/50'
                        }`}
                    >
                        <ChoiceIndicator label={label} isSelected={isSelected} />
                        <div className="flex-1 min-w-0">
                            <MathSpan content={typeof opt === 'string' ? opt.replace(/^[A-Za-z][.)]\s*/, '') : String(opt)} className="text-gray-800 font-medium leading-relaxed block overflow-hidden text-ellipsis" />
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export default React.memo(MCQRenderer);
