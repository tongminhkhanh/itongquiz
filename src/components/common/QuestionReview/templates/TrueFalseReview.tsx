import React, { memo } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import MathContent from '../MathContent';

interface TrueFalseReviewProps {
    question: any;
    studentAnswer: any; // Record<string, boolean> e.g. {"item-0": true, "item-1": false}
    status: 'correct' | 'wrong' | 'skipped';
}

/**
 * TrueFalseReview: Render TRUE_FALSE answers as a clean list instead of raw JSON
 * studentAnswer format: { "item-0": true, "item-1": false } or string "true"/"false"
 */
const TrueFalseReview: React.FC<TrueFalseReviewProps> = memo(({ question, studentAnswer, status }) => {
    const items = question.items || [];
    const correctAnswer = question.correctAnswer;

    // Handle simple true/false (single statement)
    if (typeof studentAnswer === 'string' || typeof studentAnswer === 'boolean') {
        const studentVal = String(studentAnswer).toLowerCase() === 'true';
        const correctVal = typeof correctAnswer === 'string'
            ? correctAnswer.toLowerCase() === 'true'
            : Boolean(correctAnswer);

        return (
            <div className="true-false-review-template">
                <div className="tf-simple-row">
                    <span className="tf-label">Câu trả lời:</span>
                    <span className={`tf-value ${studentVal === correctVal ? 'correct' : 'wrong'}`}>
                        {studentVal ? '✅ Đúng' : '❌ Sai'}
                    </span>
                    {studentVal !== correctVal && (
                        <span className="tf-correct-hint"> (Đáp án: {correctVal ? 'Đúng' : 'Sai'})</span>
                    )}
                </div>
            </div>
        );
    }

    // Handle multi-item format: { "item-0": true, "item-1": false }
    if (typeof studentAnswer === 'object' && studentAnswer !== null) {
        // Parse correct answers
        let correctAnswers: Record<string, boolean> = {};
        if (typeof correctAnswer === 'object' && correctAnswer !== null) {
            correctAnswers = correctAnswer;
        } else if (typeof correctAnswer === 'string') {
            try { correctAnswers = JSON.parse(correctAnswer); } catch { }
        }

        return (
            <div className="true-false-review-template">
                <div className="tf-items-list">
                    {items.length > 0 ? (
                        items.map((item: any, idx: number) => {
                            const key = item.id || `item-${idx}`;
                            const itemText = typeof item === 'string' ? item : (item.text || item.statement || `Phát biểu ${idx + 1}`);
                            const studentVal = studentAnswer[key];
                            const correctVal = correctAnswers[key];
                            const isCorrect = studentVal === correctVal;

                            return (
                                <div key={key} className={`tf-item-row ${isCorrect ? 'correct' : 'wrong'}`}>
                                    <span className="tf-item-index">{idx + 1}.</span>
                                    <MathContent content={itemText} className="tf-item-text" />
                                    <span className="tf-item-answer">
                                        {isCorrect ? (
                                            <CheckCircle className="w-4 h-4 text-green-500 inline" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-red-500 inline" />
                                        )}
                                        <span className="tf-item-val">{studentVal ? ' Đúng' : ' Sai'}</span>
                                        {!isCorrect && (
                                            <span className="tf-correct-hint"> (Đ.án: {correctVal ? 'Đúng' : 'Sai'})</span>
                                        )}
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        // No items metadata - just render the answer entries
                        Object.entries(studentAnswer).map(([key, val], idx) => {
                            const correctVal = correctAnswers[key];
                            const isCorrect = val === correctVal;

                            return (
                                <div key={key} className={`tf-item-row ${isCorrect ? 'correct' : 'wrong'}`}>
                                    <span className="tf-item-index">{idx + 1}.</span>
                                    <span className="tf-item-answer">
                                        {isCorrect ? (
                                            <CheckCircle className="w-4 h-4 text-green-500 inline" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-red-500 inline" />
                                        )}
                                        <span className="tf-item-val">{val ? ' Đúng' : ' Sai'}</span>
                                        {!isCorrect && correctVal !== undefined && (
                                            <span className="tf-correct-hint"> (Đ.án: {correctVal ? 'Đúng' : 'Sai'})</span>
                                        )}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    }

    // Fallback
    return (
        <div className="true-false-review-template">
            <span className="tf-no-answer">(Bỏ trống)</span>
        </div>
    );
});

export default TrueFalseReview;
