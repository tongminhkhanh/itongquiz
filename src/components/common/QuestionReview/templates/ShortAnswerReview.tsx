import React, { memo } from 'react';
import MathContent from '../MathContent';

interface ShortAnswerReviewProps {
    question: any;
    studentAnswer: any;
    status: 'correct' | 'wrong' | 'skipped';
}

const ShortAnswerReview: React.FC<ShortAnswerReviewProps> = memo(({ question, studentAnswer, status }) => {
    return (
        <div className="short-answer-review-template">
            <div className={`answer-box ${status}`}>
                <div className="answer-row">
                    <span className="label">Câu trả lời của bạn:</span>
                    <span className="value">
                        {typeof studentAnswer === 'object' && studentAnswer !== null
                            ? JSON.stringify(studentAnswer)
                            : (studentAnswer || '(Bỏ trống)')}
                    </span>
                </div>

                {status !== 'correct' && (
                    <div className="answer-row correct-row">
                        <span className="label">Đáp án đúng:</span>
                        <span className="value">
                            {typeof question.correctAnswer === 'object' && question.correctAnswer !== null
                                ? JSON.stringify(question.correctAnswer)
                                : question.correctAnswer}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
});

export default ShortAnswerReview;
