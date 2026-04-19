import React from 'react';
import { QuestionType } from '../../../../../types';
import { BaseRendererProps } from '../types';
import MathSpan from '../atoms/MathSpan';

/**
 * ImageQuestionRenderer: Renders an MCQ question with prominent images.
 */
const ImageQuestionRenderer: React.FC<BaseRendererProps> = ({
    question: q,
    answers,
    onAnswerChange,
}) => {
    const optionImages: string[] = (q as any).optionImages || [];
    const hasOptionImages = optionImages.some((img: string) => img && img.trim());
    const options = (q as any).options || [];

    return (
        <div className="space-y-4">
            {/* Options - Grid layout */}
            {hasOptionImages ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {options.map((opt: string, idx: number) => {
                        const label = String.fromCharCode(65 + idx);
                        const isSelected = answers[q.id] === label;
                        const imgUrl = optionImages[idx];
                        return (
                            <button
                                key={idx}
                                onClick={() => onAnswerChange(q.id, label)}
                                className={`relative rounded-xl border-2 transition-all overflow-hidden flex flex-col ${
                                    isSelected
                                        ? 'border-orange-500 ring-2 ring-orange-300 shadow-lg'
                                        : 'border-gray-200 hover:border-orange-300 hover:shadow-md'
                                }`}
                            >
                                {/* Label badge */}
                                <span className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-md ${
                                    isSelected
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-white/90 text-gray-600 border border-gray-300'
                                }`}>
                                    {label}
                                </span>

                                {/* Option Image */}
                                {imgUrl && (
                                    <img
                                        src={imgUrl}
                                        alt={`Option ${label}`}
                                        className="w-full h-40 object-cover bg-gray-50"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                )}

                                {/* Option Text */}
                                {opt && opt.trim() && (
                                    <div className={`p-3 text-left w-full flex-1 ${imgUrl ? 'border-t border-gray-100 bg-white' : 'pt-10'}`}>
                                        <MathSpan content={opt} className="text-sm font-medium text-gray-800" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            ) : (
                /* Fallback to standard MCQ layout if no option images */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {options.map((opt: string, idx: number) => {
                        const label = String.fromCharCode(65 + idx);
                        const isSelected = answers[q.id] === label;
                        return (
                            <button
                                key={idx}
                                onClick={() => onAnswerChange(q.id, label)}
                                className={`text-left p-3 rounded-lg border transition-all flex items-center ${
                                    isSelected
                                        ? 'border-orange-500 bg-orange-50 text-orange-900 ring-1 ring-orange-500'
                                        : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                                }`}
                            >
                                <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 ${
                                    isSelected ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 text-gray-500'
                                }`}>
                                    {label}
                                </span>
                                <MathSpan content={opt} className="flex-1" />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default React.memo(ImageQuestionRenderer);
