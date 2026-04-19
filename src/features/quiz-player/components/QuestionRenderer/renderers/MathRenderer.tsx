import React from 'react';
import { BaseRendererProps } from '../types';
import MathSpan from '../atoms/MathSpan';
import LatexDropdown from '../atoms/LatexDropdown';

/**
 * MathRenderer: Specialized renderer for sub-types like Fractions, 
 * Math Inputs, and Math Dropdowns.
 */
const MathRenderer: React.FC<BaseRendererProps> = ({
    question: q,
    answers,
    onAnswerChange,
}) => {
    const mathType = (q as any).mathType;

    // 1. Fraction Renderer (Numerator & Denominator)
    if (mathType === 'fraction') {
        const val = answers[q.id] || { numerator: '', denominator: '' };
        return (
            <div className="flex flex-col items-center justify-center p-6 bg-indigo-50/30 rounded-2xl border-2 border-indigo-100">
                <div className="flex flex-col items-center">
                    <input
                        type="text"
                        value={val.numerator || ''}
                        onChange={(e) => onAnswerChange(q.id, { ...val, numerator: e.target.value })}
                        className="w-16 h-12 text-center text-xl font-bold border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        placeholder="?"
                    />
                    <div className="w-20 h-1 bg-gray-800 my-2 rounded-full" />
                    <input
                        type="text"
                        value={val.denominator || ''}
                        onChange={(e) => onAnswerChange(q.id, { ...val, denominator: e.target.value })}
                        className="w-16 h-12 text-center text-xl font-bold border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        placeholder="?"
                    />
                </div>
            </div>
        );
    }

    // 2. Math Dropdown (LaTeX options)
    if (mathType === 'math_dropdown') {
        const options = (q as any).options || [];
        return (
            <div className="flex justify-center p-4">
                <LatexDropdown
                    options={options}
                    value={answers[q.id] || ''}
                    onChange={(val) => onAnswerChange(q.id, val)}
                    placeholder="-- Chọn đáp án --"
                    className="scale-110"
                />
            </div>
        );
    }

    // Default: Math Input (Enhanced single input)
    return (
        <div className="flex justify-center p-4">
            <div className="relative group">
                <input
                    type="text"
                    value={answers[q.id] || ''}
                    onChange={(e) => onAnswerChange(q.id, e.target.value)}
                    placeholder="Nhập kết quả..."
                    className="w-48 p-4 text-center text-2xl font-bold border-2 border-indigo-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none bg-white"
                />
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 bg-indigo-500 text-white text-[10px] font-bold rounded uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    Math Input
                </div>
            </div>
        </div>
    );
};

export default React.memo(MathRenderer);
