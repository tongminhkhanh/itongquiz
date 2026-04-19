import React from 'react';
import { BaseRendererProps } from '../types';
import MathSpan from '../atoms/MathSpan';

/**
 * TrueFalseRenderer: Renders a True/False Question.
 */
const TrueFalseRenderer: React.FC<BaseRendererProps> = ({
    question: q,
    answers,
    onAnswerChange,
}) => {
    const items = q.items ?? [];

    return (
        <div className="space-y-2">
            {items.map((item, i) => {
                const itemKey = item.id || `item-${i}`;
                const val = answers[q.id]?.[itemKey];
                
                return (
                    <div key={itemKey} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <span className="text-gray-700 mr-4 flex-1 text-sm flex gap-2">
                            <span className="font-semibold">{String.fromCharCode(97 + i)}.</span>
                            <MathSpan content={item.statement} className="flex-1" />
                        </span>
                        <div className="flex gap-2 flex-shrink-0">
                            <button
                                onClick={() => onAnswerChange(q.id, true, itemKey)}
                                className={`w-10 h-8 rounded font-bold text-sm transition-colors ${
                                    val === true 
                                        ? 'bg-green-500 text-white shadow-md' 
                                        : 'bg-white border border-gray-300 text-gray-400 hover:bg-gray-100'
                                }`}
                            >Đ</button>
                            <button
                                onClick={() => onAnswerChange(q.id, false, itemKey)}
                                className={`w-10 h-8 rounded font-bold text-sm transition-colors ${
                                    val === false 
                                        ? 'bg-red-500 text-white shadow-md' 
                                        : 'bg-white border border-gray-300 text-gray-400 hover:bg-gray-100'
                                }`}
                            >S</button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default React.memo(TrueFalseRenderer);
