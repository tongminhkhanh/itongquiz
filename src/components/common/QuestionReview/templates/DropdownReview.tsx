import React, { memo } from 'react';
import MathContent from '../MathContent';

interface DropdownReviewProps {
    question: any;
    studentAnswer: any; // Record<string, string> e.g. { "0": "Option A" }
    status: 'correct' | 'wrong' | 'skipped';
}

/**
 * DropdownReview: Hiển thị chọn từ danh sách thả xuống (Inline fill-in-the-blank)
 * DB: question.text = "Hôm nay [blank1] mang [blank2]"
 * Blanks: question.blanks = [{id, correctAnswer, options}]
 */
const DropdownReview: React.FC<DropdownReviewProps> = memo(({ question, studentAnswer, status }) => {
    const blanks = question.blanks || [];
    const response = (typeof studentAnswer === 'object' && studentAnswer !== null) ? studentAnswer : {};

    // Map correct answers
    const correctAnswerMap: Record<string, string> = {};
    blanks.forEach((blank: any, idx: number) => {
        const key = blank.id || String(idx);
        correctAnswerMap[key] = blank.correctAnswer || blank.answer || '';
    });

    const textContent = question.text || question.questionText || '';

    // Regex for placeholders like [0], [blank1], [[drop1]], {{drop1}}
    const placeholderRegex = /(\[\[.*?\]\]|\{\{.*?\}\}|\[.*?\])/g;

    const safeRender = (val: any) => {
        if (typeof val === 'object' && val !== null) return JSON.stringify(val);
        return String(val || '');
    };

    const renderContent = () => {
        if (!textContent) return null;

        const parts = textContent.split(placeholderRegex);
        return parts.map((part: string, idx: number) => {
            if (placeholderRegex.test(part)) {
                // Extract ID from [ID], [[ID]], {{ID}}
                const dropId = part.replace(/[\[\]\{\}]/g, '');
                const sAns = response[dropId] || response[String(idx)] || '...';
                const cAns = correctAnswerMap[dropId];
                const isItemCorrect = String(sAns).trim() === String(cAns).trim();

                return (
                    <span key={idx} className={`inline-dropdown-review ${isItemCorrect ? 'correct' : 'wrong'}`}>
                        <span className="student-val">{safeRender(sAns)}</span>
                        {!isItemCorrect && cAns && (
                            <span className="correct-hint"> (Đúng: {safeRender(cAns)})</span>
                        )}
                    </span>
                );
            }
            return <MathContent key={idx} content={part} className="inline-text" />;
        });
    };

    return (
        <div className="dropdown-review-template">
            <div className="content-display inline-fill">
                {renderContent() || (
                    <div className="blanks-list">
                        {blanks.map((blank: any, idx: number) => {
                            const key = blank.id || String(idx);
                            const sAns = response[key] || '(Trống)';
                            const cAns = correctAnswerMap[key];
                            const isCorrect = String(sAns).trim() === String(cAns).trim();

                            return (
                                <div key={idx} className={`blank-item ${isCorrect ? 'correct' : 'wrong'}`}>
                                    <span className="blank-label">Chỗ trống {idx + 1}:</span>
                                    <span className="student-ans">{safeRender(sAns)}</span>
                                    {!isCorrect && <span className="correct-ans"> (Đáp án: {safeRender(cAns)})</span>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
});

export default DropdownReview;
