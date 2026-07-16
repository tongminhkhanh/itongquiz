/** Shared scoring fallback for every supported quiz question type. */

export type AnswerStatus = 'correct' | 'wrong' | 'skipped';

export interface ScoringResult {
    status: AnswerStatus;
    isCorrect: boolean;
    correctAnswer: any;
    studentAnswer: any;
    feedback?: string;
}

export const normalizeMCQ = (value: any): string => {
    if (typeof value !== 'string') return String(value || '');
    const match = value.match(/^([A-Za-z0-9])[.\)\-\s]/);
    return match ? match[1].toUpperCase() : value.trim().toUpperCase();
};

export const normalizeShortAnswer = (value: any): string => {
    if (typeof value !== 'string') return String(value || '').trim();
    return value.toLowerCase().replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
};

const isEmptyAnswer = (answer: any): boolean => (
    answer === undefined
    || answer === null
    || answer === ''
    || (Array.isArray(answer) && answer.length === 0)
    || (typeof answer === 'object' && !Array.isArray(answer) && Object.keys(answer).length === 0)
);

const parseArrayValue = (value: any): any[] => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string' || !value.trim()) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const valueId = (value: any): string => String(
    value && typeof value === 'object' ? (value.id ?? value.value ?? '') : (value ?? '')
);

const compareArrays = (student: any[], correct: any[]): boolean => (
    student.length === correct.length
    && student.every((value, index) => valueId(value) === valueId(correct[index]))
);

const normalizeTrueFalseAnswers = (question: any): Record<string, boolean> => {
    const normalized: Record<string, boolean> = {};
    if (Array.isArray(question?.items)) {
        question.items.forEach((item: any, index: number) => {
            if (item && typeof item === 'object' && 'isCorrect' in item) {
                normalized[item.id || `item-${index}`] = Boolean(item.isCorrect);
            }
        });
    }
    if (Object.keys(normalized).length > 0) return normalized;

    let source = question?.correctAnswer ?? question?.correctAnswers;
    if (typeof source === 'string') {
        try { source = JSON.parse(source); } catch { /* scalar fallback below */ }
    }
    if (source && typeof source === 'object' && !Array.isArray(source)) {
        Object.entries(source).forEach(([key, value]) => { normalized[key] = Boolean(value); });
    }
    return normalized;
};

const normalizeMultipleSelectChoices = (value: any, options: any[] = []): string[] => {
    const optionText = (option: any): string => String(
        option && typeof option === 'object' ? (option.text ?? option.content ?? option.label ?? '') : (option ?? '')
    ).trim().toUpperCase();
    const toLabel = (raw: any): string => {
        if (typeof raw === 'number' && Number.isFinite(raw)) return String.fromCharCode(65 + raw);
        const normalized = String(raw ?? '').trim().toUpperCase();
        if (!normalized || /^[A-Z]$/.test(normalized)) return normalized;
        const index = options.findIndex((option) => optionText(option) === normalized);
        return index >= 0 ? String.fromCharCode(65 + index) : normalized;
    };

    let values: any[];
    if (Array.isArray(value)) {
        values = value;
    } else if (value && typeof value === 'object') {
        values = Object.keys(value).filter((key) => Boolean(value[key])).map((key) => {
            const index = key.startsWith('item-') ? Number(key.slice(5)) : Number.NaN;
            return Number.isFinite(index) ? String.fromCharCode(65 + index) : key;
        });
    } else if (typeof value === 'string') {
        const parsed = parseArrayValue(value);
        values = parsed.length > 0 ? parsed : value.split('|');
    } else {
        values = value === undefined || value === null ? [] : [value];
    }
    return Array.from(new Set(values.map(toLabel).filter(Boolean))).sort();
};

const normalizeMatchingMap = (answer: any, pairs: Array<{ left: any; right: any }>): Record<string, string> => {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return {};
    const result: Record<string, string> = {};
    Object.entries(answer).forEach(([rawLeft, rawRight]) => {
        if (rawLeft === 'selectedLeft' || rawLeft === '__shuffledIds' || typeof rawRight !== 'string') return;
        const leftIndex = rawLeft.match(/^l-(\d+)$/i);
        const rightIndex = rawRight.match(/^r-(\d+)$/i);
        const left = leftIndex ? pairs[Number(leftIndex[1])]?.left ?? rawLeft : rawLeft;
        const right = rightIndex ? pairs[Number(rightIndex[1])]?.right ?? rawRight : rawRight;
        result[String(left)] = String(right);
    });
    return result;
};

const checkShortAnswer = (question: any, answer: any): boolean => {
    const text = String(question?.question ?? question?.text ?? '');
    const correctAnswers = Array.isArray(question?.correctAnswers) ? question.correctAnswers : [];
    if (/\[blank\]|\[_+\]|_{3,}|\[\d+\]/.test(text) && correctAnswers.length > 0 && answer && typeof answer === 'object') {
        return correctAnswers.every((correct: any, index: number) => {
            const studentValue = normalizeShortAnswer(answer[index] ?? answer[String(index)]).replace(/^'/, '');
            return normalizeShortAnswer(correct).replace(/^'/, '').split('|').map((item) => item.trim()).includes(studentValue);
        });
    }

    const studentValue = normalizeShortAnswer(answer).replace(/^'/, '');
    const source = question?.correctAnswer ?? question?.correctAnswers ?? '';
    const accepted = Array.isArray(source)
        ? source.map((item) => normalizeShortAnswer(item).replace(/^'/, ''))
        : normalizeShortAnswer(source).replace(/^'/, '').split('|').map((item) => item.trim());
    return accepted.includes(studentValue);
};

const checkOrdering = (question: any, answer: any): boolean => {
    let correctOrder = Array.isArray(question?.correctOrder) ? question.correctOrder : parseArrayValue(question?.correctAnswer);
    if (correctOrder.length === 0 && Array.isArray(question?.items)) {
        correctOrder = Array.from({ length: question.items.length }, (_, index) => index);
    }
    if (correctOrder.length === 0) return false;
    if (Array.isArray(answer)) return compareArrays(answer, correctOrder);
    if (answer && typeof answer === 'object') {
        return correctOrder.every((item, index) => Number(answer[item]) === index + 1);
    }
    return false;
};

const checkDragDrop = (question: any, answer: any): boolean => {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return false;
    const blanks = Array.isArray(question?.blanks) ? question.blanks : [];
    if (blanks.length === 0) return false;
    let text = String(question?.text ?? question?.question ?? '');
    if (!text.includes('[')) text = blanks.map((_: any, index: number) => `[blank_${index}]`).join(' ');
    const blankIndexes: number[] = [];
    text.split(/(\[.*?\])/g).forEach((part, index) => {
        if (part.startsWith('[') && part.endsWith(']')) blankIndexes.push(index);
    });
    return blankIndexes.length === blanks.length && blankIndexes.every((blankIndex, index) => (
        String(answer[blankIndex] ?? '') === String(blanks[index] ?? '')
    ));
};

const checkDropdown = (question: any, answer: any): boolean => {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return false;
    const blanks = Array.isArray(question?.blanks) ? question.blanks : [];
    return blanks.length > 0 && blanks.every((blank: any) => (
        String(answer[blank.id] ?? '') === String(blank.correctAnswer ?? '')
    ));
};

const checkUnderline = (question: any, answer: any): boolean => {
    if (!Array.isArray(answer)) return false;
    const expected = Array.isArray(question?.correctWordIndexes)
        ? question.correctWordIndexes
        : parseArrayValue(question?.correctAnswer);
    const student = answer.map(Number).sort((a, b) => a - b);
    const correct = expected.map(Number).sort((a, b) => a - b);
    return student.length === correct.length && student.every((value, index) => value === correct[index]);
};

const checkCategorization = (question: any, answer: any): boolean => {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return false;
    const items = Array.isArray(question?.items) ? question.items : [];
    if (items.length > 0) {
        return items.every((item: any) => item.categoryId ? answer[item.id] === item.categoryId : !answer[item.id]);
    }
    const expected = question?.correctAnswer ?? question?.pairs;
    if (!expected || typeof expected !== 'object' || Array.isArray(expected)) return false;
    const sorted = (value: Record<string, any>) => JSON.stringify(Object.keys(value).sort().reduce<Record<string, any>>((result, key) => {
        result[key] = value[key];
        return result;
    }, {}));
    return sorted(answer) === sorted(expected);
};

const checkWordScramble = (question: any, answer: any): boolean => {
    const letters = Array.isArray(question?.letters) ? question.letters : [];
    const studentWord = Array.isArray(answer) ? answer.map((index: number) => letters[index] ?? '').join('') : String(answer ?? '');
    const correctWord = String(question?.correctWord ?? question?.correctAnswer ?? '');
    return studentWord.toLowerCase().replace(/\s+/g, '') === correctWord.toLowerCase().replace(/\s+/g, '');
};

const checkErrorCorrection = (question: any, answer: any): boolean => {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return false;
    const expectedWrong = normalizeShortAnswer(question?.wrongWord ?? question?.distractors ?? '');
    const expectedCorrect = normalizeShortAnswer(question?.correctWord ?? question?.correctAnswer ?? '');
    const studentWrong = normalizeShortAnswer(answer.wrongWord ?? '');
    const studentCorrect = normalizeShortAnswer(answer.correctWord ?? '');
    return Boolean(studentWrong && studentCorrect) && studentWrong === expectedWrong && studentCorrect === expectedCorrect;
};

export const checkAnswer = (question: any, answer: any): ScoringResult => {
    if (isEmptyAnswer(answer)) {
        return { status: 'skipped', isCorrect: false, studentAnswer: answer, correctAnswer: question.correctAnswer };
    }

    let isCorrect = false;
    switch (question.type) {
        case 'MCQ':
        case 'IMAGE_MCQ':
        case 'IMAGE_QUESTION':
            isCorrect = normalizeMCQ(answer) === normalizeMCQ(question.correctAnswer);
            break;
        case 'SHORT_ANSWER':
        case 'RIDDLE':
            isCorrect = checkShortAnswer(question, answer);
            break;
        case 'TRUE_FALSE': {
            const correctAnswers = normalizeTrueFalseAnswers(question);
            const keys = Object.keys(correctAnswers);
            if (answer && typeof answer === 'object' && !Array.isArray(answer)) {
                isCorrect = keys.length > 0 && keys.every((key) => answer[key] === correctAnswers[key]);
            } else {
                const expected = keys.length === 1 ? correctAnswers[keys[0]] : question.correctAnswer;
                isCorrect = String(answer).toLowerCase() === String(expected).toLowerCase();
            }
            break;
        }
        case 'MATCHING': {
            const pairs = Array.isArray(question?.pairs) ? question.pairs : [];
            const studentPairs = normalizeMatchingMap(answer, pairs);
            isCorrect = pairs.length > 0 && Object.keys(studentPairs).length === pairs.length && pairs.every((pair: any) => (
                studentPairs[String(pair.left ?? '')] === String(pair.right ?? '')
            ));
            break;
        }
        case 'MULTIPLE_SELECT': {
            const studentChoices = normalizeMultipleSelectChoices(answer, question.options || []);
            const correctChoices = normalizeMultipleSelectChoices(question.correctAnswers ?? question.correctAnswer, question.options || []);
            isCorrect = compareArrays(studentChoices, correctChoices);
            break;
        }
        case 'DRAG_DROP':
            isCorrect = checkDragDrop(question, answer);
            break;
        case 'ORDERING':
            isCorrect = checkOrdering(question, answer);
            break;
        case 'DROPDOWN':
            isCorrect = checkDropdown(question, answer);
            break;
        case 'UNDERLINE':
            isCorrect = checkUnderline(question, answer);
            break;
        case 'CATEGORIZATION':
            isCorrect = checkCategorization(question, answer);
            break;
        case 'WORD_SCRAMBLE':
            isCorrect = checkWordScramble(question, answer);
            break;
        case 'ERROR_CORRECTION':
            isCorrect = checkErrorCorrection(question, answer);
            break;
        case 'GEOMETRY':
            isCorrect = normalizeShortAnswer(answer) === normalizeShortAnswer(question.correctAnswer);
            break;
        default:
            isCorrect = JSON.stringify(answer) === JSON.stringify(question.correctAnswer);
            break;
    }

    return {
        status: isCorrect ? 'correct' : 'wrong',
        isCorrect,
        studentAnswer: answer,
        correctAnswer: question.correctAnswer,
    };
};
