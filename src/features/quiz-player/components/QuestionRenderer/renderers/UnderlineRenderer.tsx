import React from 'react';
import { BaseRendererProps } from '../types';
import MathSpan from '../atoms/MathSpan';

/**
 * UnderlineRenderer: Renders an interactive word-clicking question.
 * Allows students to click on words/phrases to toggle underlines.
 */
const UnderlineRenderer: React.FC<BaseRendererProps> = ({
    question: q,
    answers,
    onAnswerChange,
}) => {
    // UnderlineQuestion structure ensures 'words' is an array of strings
    const words = (q as any).words || [];
    
    // userAnswer is an array of selected word indexes: number[]
    // Fallback to empty array if no answer yet
    const rawAnswer = answers[q.id];
    const selectedIndexes: number[] = Array.isArray(rawAnswer) ? rawAnswer : [];

    const handleToggle = (index: number) => {
        let newSelection: number[];
        if (selectedIndexes.includes(index)) {
            // Remove if already selected
            newSelection = selectedIndexes.filter(i => i !== index);
        } else {
            // Add to selection
            newSelection = [...selectedIndexes, index].sort((a, b) => a - b);
        }
        onAnswerChange(q.id, newSelection);
    };

    if (!words || words.length === 0) {
        return (
            <div className="p-4 bg-orange-50 text-orange-700 rounded-xl border border-orange-100 flex items-center gap-2">
                <span className="text-xl">💡</span>
                <span>Thông tin: Câu hỏi gạch chân không tìm thấy danh sách từ để chọn.</span>
            </div>
        );
    }

    return (
        <div className="underline-renderer-container pt-2">
            {/* Word Display Area */}
            <div className="flex flex-wrap gap-x-2 gap-y-4 items-center justify-center p-6 md:p-10 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200 min-h-[160px]">
                {words.map((word: string, idx: number) => {
                    const isSelected = selectedIndexes.includes(idx);
                    
                    return (
                        <button
                            key={idx}
                            onClick={() => handleToggle(idx)}
                            className={`group relative px-4 py-2 rounded-xl transition-all duration-200 active:scale-90 select-none ${
                                isSelected 
                                    ? 'bg-orange-500 text-white shadow-lg ring-2 ring-orange-200 ring-offset-2 scale-105 z-10' 
                                    : 'bg-white hover:bg-orange-50 text-gray-700 hover:text-orange-900 border border-gray-100 shadow-sm hover:shadow-md'
                            }`}
                        >
                            <span className="relative z-10">
                                <MathSpan 
                                    content={word} 
                                    className={`text-lg md:text-xl font-medium ${isSelected ? 'underline underline-offset-8 decoration-2' : ''}`} 
                                />
                            </span>
                            
                            {/* Tap Indicator for hover (Micro-interaction) */}
                            {!isSelected && (
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-1 bg-orange-400/30 group-hover:w-[70%] transition-all duration-300 rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>
            
            <div className="mt-8 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-full text-sm font-semibold">
                    <span className="w-5 h-5 flex items-center justify-center border-2 border-orange-300 rounded-full">!</span>
                    <span>Hãy nhấn vào các từ để gạch chân đáp án bạn chọn</span>
                </div>
                {selectedIndexes.length > 0 && (
                    <button 
                        onClick={() => onAnswerChange(q.id, [])}
                        className="text-gray-400 hover:text-orange-500 text-xs font-medium transition-colors"
                    >
                        Xóa tất cả gạch chân
                    </button>
                )}
            </div>
        </div>
    );
};

export default React.memo(UnderlineRenderer);
