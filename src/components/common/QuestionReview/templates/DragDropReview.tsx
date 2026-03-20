import React, { memo } from 'react';
import MathContent from '../MathContent';

interface DragDropReviewProps {
    question: any;
    studentAnswer: any; // Record<string, string> e.g. { "0": "Từ A", "1": "Từ B" }
    status: 'correct' | 'wrong' | 'skipped';
}

/**
 * DragDropReview: Render drag-and-drop fill-in-the-blank answers
 * DB: question.text = "Hôm nay [blank1] mang [blank2]"
 * Blanks stored in question.blanks = [{id, correctAnswer, options}]
 */
const DragDropReview: React.FC<DragDropReviewProps> = memo(({ question, studentAnswer, status }) => {
    const blanks = question.blanks || [];
    const response = (typeof studentAnswer === 'object' && studentAnswer !== null) ? studentAnswer : {};

    // Resolve correct answers from blanks array
    const correctAnswerMap: Record<string, string> = {};
    blanks.forEach((blank: any, idx: number) => {
        const key = blank.id || String(idx);
        correctAnswerMap[key] = blank.correctAnswer || blank.answer || '';
    });

    // Also try question.correctAnswer if blanks don't have answers
    const qCorrectAnswer = question.correctAnswer;
    if (typeof qCorrectAnswer === 'object' && qCorrectAnswer !== null) {
        Object.entries(qCorrectAnswer).forEach(([k, v]: [string, any]) => {
            if (!correctAnswerMap[k]) correctAnswerMap[k] = String(v);
        });
    }

    // Get the text content that contains placeholders
    const textContent = question.text || question.questionText || '';

    // Try to split by placeholder patterns: [[drop1]], [blank1], {{drop1}}, or indexed [0], [1]
    const placeholderRegex = /(\[\[.*?\]\]|\{\{.*?\}\})/g;

    if (textContent && placeholderRegex.test(textContent)) {
        // Render inline with placeholders replaced
        const parts = textContent.split(/(\[\[.*?\]\]|\{\{.*?\}\})/g);
        return (
            <div className="drag-drop-review-template">
                <div className="content-display inline-fill">
                    {parts.map((part: string, idx: number) => {
                        if ((part.startsWith('[[') && part.endsWith(']]')) || (part.startsWith('{{') && part.endsWith('}}'))) {
                            const dropId = part.slice(2, -2);
                            const sAns = response[dropId] || '...';
                            const cAns = correctAnswerMap[dropId];
                            const isItemCorrect = sAns === cAns;

                            return (
                                <span key={idx} className={`inline-drop-review ${isItemCorrect ? 'correct' : 'wrong'}`}>
                                    <span className="student-val">{safeRender(sAns)}</span>
                                    {!isItemCorrect && cAns && (
                                        <span className="correct-hint"> ({safeRender(cAns)})</span>
                                    )}
                                </span>
                            );
                        }
                        return <MathContent key={idx} content={part} className="inline-text" />;
                    })}
                </div>
            </div>
        );
    }

    // Fallback: No inline text, just list blanks
    return (
        <div className="drag-drop-review-template">
            <div className="blanks-list">
                {blanks.map((blank: any, idx: number) => {
                    const key = blank.id || String(idx);
                    const sAns = response[key] || response[String(idx)] || '(Trống)';
                    const cAns = correctAnswerMap[key] || '';
                    const isCorrect = sAns === cAns;

                    return (
                        <div key={idx} className={`blank-item ${isCorrect ? 'correct' : 'wrong'}`}>
                            <span className="blank-label">Ô {idx + 1}:</span>
                            <span className={`blank-answer ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                {safeRender(sAns)}
                            </span>
                            {!isCorrect && cAns && (
                                <span className="correct-hint"> (Đ.án: {safeRender(cAns)})</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

// Helper: safely render any value to string
const safeRender = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
};

export default DragDropReview;
