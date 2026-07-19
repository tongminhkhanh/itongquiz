import type { Quiz, StudentResult } from '../../../types';
import { checkAnswer } from '../../../utils/question/scoring.util';
import type { ResultDisplayOverride } from './types';

const isAnswerSkipped = (value: unknown): boolean => (
  value === undefined
  || value === null
  || value === ''
  || (Array.isArray(value) && value.length === 0)
  || (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0)
);

export const calculateOverrideFromAnswers = (
  result: StudentResult,
  answers: Record<string, unknown>,
  quiz?: Quiz,
): ResultDisplayOverride | null => {
  const answerEntries = Object.entries(answers || {}).filter(([key]) => !key.startsWith('_'));
  if (answerEntries.length === 0) return null;

  const questionsById = new Map(
    (quiz?.questions || []).map(question => [String(question.id), question]),
  );
  let correctedCount = 0;
  answerEntries.forEach(([questionId, answerData]) => {
    if (answerData && typeof answerData === 'object' && ('selectedAnswer' in answerData || 'questionSnapshot' in answerData)) {
      const selectedAnswer = (answerData as any).selectedAnswer;
      if (isAnswerSkipped(selectedAnswer)) return;
      const gradingQuestion = (answerData as any).questionSnapshot || questionsById.get(String(questionId));
      if (gradingQuestion?.type) {
        if (checkAnswer(gradingQuestion, selectedAnswer).isCorrect) correctedCount += 1;
        return;
      }
      if ((answerData as any).isCorrect === true) correctedCount += 1;
      return;
    }
    if (isAnswerSkipped(answerData)) return;
    const gradingQuestion = questionsById.get(String(questionId));
    if (gradingQuestion?.type) {
      if (checkAnswer(gradingQuestion, answerData).isCorrect) correctedCount += 1;
      return;
    }
    if (answerData && typeof answerData === 'object' && (answerData as any).isCorrect === true) {
      correctedCount += 1;
      return;
    }
    if (result.validationDetails?.find(item => item.questionId === questionId)?.isCorrect) correctedCount += 1;
  });

  const totalQuestions = quiz?.questions.length
    || (result.totalQuestions && result.totalQuestions > 0 ? result.totalQuestions : answerEntries.length);
  const score = totalQuestions > 0
    ? Math.round((correctedCount / totalQuestions) * 100) / 10
    : result.score;
  return { correctCount: correctedCount, totalQuestions, score };
};
