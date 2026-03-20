import React, { memo } from 'react';
import MathContent from '../MathContent';
import { CheckCircle, XCircle } from 'lucide-react';

interface MatchingReviewProps {
    question: any;
    studentAnswer: any;
    status: 'correct' | 'wrong' | 'skipped';
}

/**
 * MatchingReview: Render matching pairs (left-right) 
 * DB format: question.pairs = [{left: "...", right: "..."}] 
 * studentAnswer = Record<string, string> e.g. {leftId: rightId}
 */
const MatchingReview: React.FC<MatchingReviewProps> = memo(({ question, studentAnswer, status }) => {
    const pairs = question.pairs || [];
    const response = (typeof studentAnswer === 'object' && studentAnswer !== null) ? studentAnswer : {};

    // Parse correct answers
    let correctAnswer = question.correctAnswer || {};
    if (typeof correctAnswer === 'string') {
        try { correctAnswer = JSON.parse(correctAnswer); } catch { }
    }

    // If pairs exist in DB format [{left, right}]
    if (pairs.length > 0) {
        return (
            <div className="matching-review-template">
                <div className="pairs-list">
                    {pairs.map((pair: any, idx: number) => {
                        const leftText = typeof pair === 'string' ? pair : (pair.left || pair.text || `Item ${idx + 1}`);
                        const correctRight = typeof pair === 'string' ? '' : (pair.right || pair.match || '');

                        // Try to find what student answered for this pair
                        const pairKey = pair.id || `pair-${idx}` || String(idx);
                        const studentRight = response[pairKey] || response[leftText] || response[String(idx)] || '';

                        const isCorrect = studentRight === correctRight
                            || (correctAnswer[pairKey] && studentRight === correctAnswer[pairKey]);

                        return (
                            <div key={idx} className={`pair-item ${isCorrect ? 'correct' : 'wrong'}`}>
                                <div className="pair-side left">
                                    <MathContent content={leftText} />
                                </div>
                                <div className="pair-connector">→</div>
                                <div className="pair-side right student">
                                    <span className={`pair-answer ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                        {isCorrect ? (
                                            <CheckCircle className="w-4 h-4 inline mr-1" />
                                        ) : (
                                            <XCircle className="w-4 h-4 inline mr-1" />
                                        )}
                                        {studentRight || '(Chưa nối)'}
                                    </span>
                                    {!isCorrect && correctRight && (
                                        <div className="correct-hint">
                                            (Đ.án: <MathContent content={correctRight} />)
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Fallback for old leftItems/rightItems format
    const leftItems = question.leftItems || [];
    const rightItems = question.rightItems || [];

    if (leftItems.length > 0) {
        const pairsList = leftItems.map((left: any) => {
            const studentRightId = response[left.id];
            const correctRightId = correctAnswer[left.id];
            const studentRight = rightItems.find((r: any) => r.id === studentRightId);
            const correctRight = rightItems.find((r: any) => r.id === correctRightId);
            return { left, studentRight, correctRight, isCorrect: studentRightId === correctRightId };
        });

        return (
            <div className="matching-review-template">
                <div className="pairs-list">
                    {pairsList.map((pair: any, idx: number) => (
                        <div key={idx} className={`pair-item ${pair.isCorrect ? 'correct' : 'wrong'}`}>
                            <div className="pair-side left">
                                <MathContent content={pair.left.text} />
                            </div>
                            <div className="pair-connector">→</div>
                            <div className="pair-side right student">
                                <MathContent content={pair.studentRight?.text || '(Chưa nối)'} />
                                {!pair.isCorrect && pair.correctRight && (
                                    <div className="correct-hint">
                                        (Đ.án: <MathContent content={pair.correctRight.text} />)
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // No data at all
    return (
        <div className="matching-review-template">
            <div className="no-data">(Không có dữ liệu ghép nối)</div>
        </div>
    );
});

export default MatchingReview;
