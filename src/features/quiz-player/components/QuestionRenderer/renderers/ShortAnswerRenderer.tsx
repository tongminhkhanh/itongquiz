import React from 'react';
import { BaseRendererProps } from '../types';

/**
 * ShortAnswerRenderer: Renders a simple text input for short answers.
 */
const ShortAnswerRenderer: React.FC<BaseRendererProps> = ({
    question: q,
    answers,
    onAnswerChange,
}) => {
    return (
        <div className="space-y-4">
            <div className="relative group">
                <input
                    type="text"
                    value={answers[q.id] || ''}
                    onChange={(e) => onAnswerChange(q.id, e.target.value)}
                    placeholder="Nhập câu trả lời của bạn vào đây..."
                    className="w-full p-4 text-[16px] md:text-lg border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none bg-gray-50/50 hover:bg-white"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    ⌨️
                </div>
            </div>
            <p className="text-xs text-gray-500 italic pl-1">
                * Lưu ý: Kiểm tra kỹ chính tả trước khi chuyển câu tiếp theo.
            </p>
        </div>
    );
};

export default React.memo(ShortAnswerRenderer);
