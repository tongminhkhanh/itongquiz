const asAcceptedAnswerArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item ?? '').trim()).filter(Boolean);
    }
    const raw = String(value ?? '').trim();
    if (!raw) return [];
    return raw.split('|').map((item) => item.trim()).filter(Boolean);
};

export const getAcceptedAnswers = (questionOrAnswer: unknown): string[] => {
    if (questionOrAnswer && typeof questionOrAnswer === 'object' && !Array.isArray(questionOrAnswer)) {
        const question = questionOrAnswer as Record<string, unknown>;
        const explicit = asAcceptedAnswerArray(question.acceptedAnswers ?? question.accepted_answers);
        if (explicit.length > 0) return explicit;
        return asAcceptedAnswerArray(question.correctAnswer ?? question.correct_answer);
    }
    return asAcceptedAnswerArray(questionOrAnswer);
};

export const normalizeAcceptedAnswer = (value: unknown, caseSensitive = false): string => {
    const normalized = String(value ?? '')
        .replace(/[\r\n\t]/gu, ' ')
        .replace(/\s+/gu, ' ')
        .trim()
        .replace(/^'/u, '');
    return caseSensitive ? normalized : normalized.toLocaleLowerCase('vi');
};

export const matchesAcceptedAnswer = (
    studentAnswer: unknown,
    questionOrAnswer: unknown,
    caseSensitive?: boolean,
): boolean => {
    const question = questionOrAnswer && typeof questionOrAnswer === 'object' && !Array.isArray(questionOrAnswer)
        ? questionOrAnswer as Record<string, unknown>
        : null;
    const useCaseSensitive = caseSensitive ?? (question?.caseSensitive === true || question?.case_sensitive === true);
    const student = normalizeAcceptedAnswer(studentAnswer, useCaseSensitive);
    if (!student) return false;
    return getAcceptedAnswers(questionOrAnswer)
        .some((answer) => normalizeAcceptedAnswer(answer, useCaseSensitive) === student);
};
