/**
 * Unified Scoring Utility
 * 
 * Central brain for grading all 13 question types in iTongQuiz.
 * Ensures consistent results between student and teacher views.
 */

export type AnswerStatus = 'correct' | 'wrong' | 'skipped';

export interface ScoringResult {
    status: AnswerStatus;
    isCorrect: boolean;
    correctAnswer: any;
    studentAnswer: any;
    feedback?: string;
}

/**
 * Normalizes MCQ answers by stripping prefixes like "A. " or "1. "
 */
export const normalizeMCQ = (val: any): string => {
    if (typeof val !== 'string') return String(val || '');
    const match = val.match(/^([A-Za-z0-9])[\.\)\-\s]/);
    return match ? match[1].toUpperCase() : val.trim().toUpperCase();
};

/**
 * Normalizes short answers by trimming and removing control characters
 */
export const normalizeShortAnswer = (val: any): string => {
    if (typeof val !== 'string') return String(val || '').trim();
    return val.toLowerCase()
        .replace(/[\r\n\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Compares ordering answers by normalizing to a comma-separated string
 */
const compareOrdering = (student: any, correct: any): boolean => {
    const toIdStr = (val: any) => {
        if (Array.isArray(val)) {
            // Ép kiểu String cho từng phần tử để tránh lệch kiểu dữ liệu (Audit Fix)
            return val.map(v => String(typeof v === 'object' ? (v.id || v.value) : v)).join(',');
        }
        return String(val || '');
    };
    return toIdStr(student) === toIdStr(correct);
};

/**
 * Main scoring function
 */
export const checkAnswer = (question: any, answer: any): ScoringResult => {
    // 1. Handle Empty/Skipped
    const isEmpty = answer === undefined ||
        answer === null ||
        answer === '' ||
        (Array.isArray(answer) && answer.length === 0);

    if (isEmpty) {
        return {
            status: 'skipped',
            isCorrect: false,
            studentAnswer: answer,
            correctAnswer: question.correctAnswer
        };
    }

    let isCorrect = false;

    // 2. Question Type Specific Logic
    switch (question.type) {
        case 'MCQ':
        case 'IMAGE_MCQ':
            isCorrect = normalizeMCQ(answer) === normalizeMCQ(question.correctAnswer);
            break;

        case 'SHORT_ANSWER':
            isCorrect = normalizeShortAnswer(answer) === normalizeShortAnswer(question.correctAnswer);
            break;

        case 'ORDERING':
            isCorrect = compareOrdering(answer, question.correctOrder || question.correctAnswer);
            break;

        case 'TRUE_FALSE':
            isCorrect = String(answer).toLowerCase() === String(question.correctAnswer).toLowerCase();
            break;

        case 'MATCHING':
        case 'CATEGORIZATION':
            // Chuyển đổi pairs mảng -> object để so sánh với studentAnswer
            const normalizePairs = (p: any) => {
                if (Array.isArray(p)) {
                    const obj: any = {};
                    p.forEach(pair => {
                        if (pair.left && pair.right) obj[pair.left] = pair.right;
                    });
                    return JSON.stringify(Object.keys(obj).sort().reduce((acc: any, key) => {
                        acc[key] = obj[key];
                        return acc;
                    }, {}));
                }
                if (typeof p === 'object' && p !== null) {
                    return JSON.stringify(Object.keys(p).sort().reduce((acc: any, key) => {
                        acc[key] = p[key];
                        return acc;
                    }, {}));
                }
                return String(p);
            };
            isCorrect = normalizePairs(answer) === normalizePairs(question.correctAnswer || question.pairs);
            break;

        case 'UNDERLINE':
            // So sánh mảng index cho Gạch chân
            const studentIdxs = Array.isArray(answer) ? [...answer].sort().join(',') : '';
            const correctIdxs = Array.isArray(question.correctWordIndexes)
                ? [...question.correctWordIndexes].sort().join(',')
                : '';
            isCorrect = studentIdxs === correctIdxs;
            break;

        case 'WORD_SCRAMBLE':
            // So sánh từ ghép được cho Ghép từ
            const letters = question.letters || [];
            const studentWord = Array.isArray(answer)
                ? answer.map((idx: number) => letters[idx] || '').join('')
                : String(answer);
            isCorrect = studentWord.toUpperCase() === String(question.correctWord || question.correctAnswer).toUpperCase();
            break;

        default:
            // Fallback for types not yet fully implemented in new engine
            // Using loose comparison as safety net
            isCorrect = JSON.stringify(answer) === JSON.stringify(question.correctAnswer);
            break;
    }

    return {
        status: isCorrect ? 'correct' : 'wrong',
        isCorrect,
        studentAnswer: answer,
        correctAnswer: question.correctAnswer
    };
};
