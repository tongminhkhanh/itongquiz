import React, { memo } from 'react';
import MathContent from '../MathContent';
import { CheckCircle, XCircle } from 'lucide-react';

interface MultipleSelectReviewProps {
    question: any;
    studentAnswer: any; // string[] e.g. ["A", "C"] OR Record<string, boolean> e.g. {"item-0": true}
    status: 'correct' | 'wrong' | 'skipped';
}

/**
 * MultipleSelectReview: Hỗ trợ chọn nhiều đáp án
 */
const MultipleSelectReview: React.FC<MultipleSelectReviewProps> = memo(({ question, studentAnswer, status }) => {
    const options = question.options || [];

    // Normalize student choices
    let studentChoices: string[] = [];
    if (Array.isArray(studentAnswer)) {
        studentChoices = studentAnswer;
    } else if (typeof studentAnswer === 'object' && studentAnswer !== null) {
        // Handle format: { "item-0": true, "A": true }
        studentChoices = Object.keys(studentAnswer).filter(key => studentAnswer[key]).map(key => {
            if (key.startsWith('item-')) {
                const idx = parseInt(key.replace('item-', ''), 10);
                return String.fromCharCode(65 + idx);
            }
            return key;
        });
    }

    // Normalize correct answers
    let correctAnswers: string[] = [];
    if (Array.isArray(question.correctAnswers)) {
        correctAnswers = question.correctAnswers;
    } else if (Array.isArray(question.correctAnswer)) {
        correctAnswers = question.correctAnswer;
    } else if (typeof question.correctAnswer === 'string') {
        try {
            const parsed = JSON.parse(question.correctAnswer);
            if (Array.isArray(parsed)) correctAnswers = parsed;
        } catch {
            correctAnswers = [question.correctAnswer];
        }
    }

    return (
        <div className="multiple-select-review-template">
            <div className="options-grid">
                {options.map((option: any, idx: number) => {
                    const label = String.fromCharCode(65 + idx);
                    const isStudentChoice = studentChoices.includes(label);
                    const isCorrectOption = correctAnswers.includes(label);

                    let itemClass = "option-item multiple";
                    if (isStudentChoice) itemClass += " student-choice";
                    if (isCorrectOption) itemClass += " correct-option";

                    return (
                        <div key={idx} className={itemClass}>
                            <div className="checkbox-indicator">
                                {isStudentChoice ? (
                                    isCorrectOption ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />
                                ) : (
                                    <div className={`w-4 h-4 border rounded ${isActuallyCorrect(label, correctAnswers) ? 'border-green-500' : 'border-gray-300'}`} />
                                )}
                            </div>
                            <span className="option-label">{label}.</span>
                            <MathContent content={typeof option === 'string' ? option : option.text} className="option-text" />
                            {isStudentChoice && <span className="choice-tag student">Bé chọn</span>}
                            {isCorrectOption && <span className="choice-tag correct">Đáp án đúng</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

// Helper for more robust comparison
const isActuallyCorrect = (label: string, correctList: string[]) => {
    return correctList.some(c => String(c).trim().toUpperCase() === String(label).trim().toUpperCase());
};

export default MultipleSelectReview;
