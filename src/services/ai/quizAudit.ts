import { QuestionType } from '../../types';
import type { QuizBlueprint } from '../../features/quiz-generator/domain/quizBlueprint';
import type { GeneratedQuestion, GeneratedQuizPayload } from './schemas/quizGenerationSchema';

export type QuizAuditCode =
  | 'QUESTION_COUNT_MISMATCH'
  | 'TYPE_COUNT_MISMATCH'
  | 'DIFFICULTY_COUNT_MISMATCH'
  | 'DUPLICATE_QUESTION'
  | 'INVALID_ANSWER'
  | 'MISSING_EXPLANATION';

export interface QuizAuditIssue {
  code: QuizAuditCode;
  questionIndexes: number[];
  message: string;
  repairable: boolean;
}

const normalize = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\d+(?:[.,]\d+)?/g, '#')
  .replace(/[^a-z0-9#]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const similarity = (left: string, right: string): number => {
  const a = new Set(normalize(left).split(' ').filter(Boolean));
  const b = new Set(normalize(right).split(' ').filter(Boolean));
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
};

const questionText = (question: GeneratedQuestion): string => (
  question.type === QuestionType.TRUE_FALSE ? question.mainQuestion : question.question
);

const hasValidLetterAnswer = (answer: string, optionCount: number): boolean => {
  if (!/^[A-Z]$/.test(answer)) return false;
  return answer.charCodeAt(0) - 65 < optionCount;
};

const hasInvalidAnswer = (question: GeneratedQuestion): boolean => {
  if (question.type === QuestionType.MCQ || question.type === QuestionType.IMAGE_QUESTION) {
    return !hasValidLetterAnswer(question.correctAnswer, question.options.length);
  }
  if (question.type === QuestionType.MULTIPLE_SELECT) {
    return new Set(question.correctAnswers).size !== question.correctAnswers.length
      || question.correctAnswers.some((answer) => !hasValidLetterAnswer(answer, question.options.length));
  }
  if (question.type === QuestionType.DROPDOWN) {
    return question.blanks.some((blank) => !blank.options.includes(blank.correctAnswer));
  }
  if (question.type === QuestionType.CATEGORIZATION) {
    const categoryIds = new Set(question.categories.map(({ id }) => id));
    return question.items.some(({ categoryId }) => !categoryIds.has(categoryId));
  }
  if (question.type === QuestionType.UNDERLINE) {
    return question.correctWordIndexes.some((index) => index >= question.words.length);
  }
  return false;
};

export function auditGeneratedQuiz(
  quiz: GeneratedQuizPayload,
  blueprint: QuizBlueprint,
): QuizAuditIssue[] {
  const issues: QuizAuditIssue[] = [];
  const questions = quiz.questions;

  if (questions.length !== blueprint.totalQuestions) {
    issues.push({
      code: 'QUESTION_COUNT_MISMATCH',
      questionIndexes: questions.length > blueprint.totalQuestions
        ? questions.map((_, index) => index).slice(blueprint.totalQuestions)
        : [],
      message: `Đề có ${questions.length} câu, blueprint yêu cầu ${blueprint.totalQuestions} câu.`,
      repairable: true,
    });
  }

  for (const allocation of blueprint.typeAllocations) {
    const indexes = questions
      .map((question, index) => question.type === allocation.type ? index : -1)
      .filter((index) => index >= 0);
    if (indexes.length !== allocation.count) {
      issues.push({
        code: 'TYPE_COUNT_MISMATCH',
        questionIndexes: indexes,
        message: `${allocation.type} có ${indexes.length} câu, blueprint yêu cầu ${allocation.count} câu.`,
        repairable: true,
      });
    }
  }

  const allowedTypes = new Set(blueprint.typeAllocations.map(({ type }) => type));
  const unexpectedTypeIndexes = questions
    .map((question, index) => allowedTypes.has(question.type) ? -1 : index)
    .filter((index) => index >= 0);
  if (unexpectedTypeIndexes.length > 0) {
    issues.push({
      code: 'TYPE_COUNT_MISMATCH',
      questionIndexes: unexpectedTypeIndexes,
      message: 'Đề chứa dạng câu không có trong blueprint.',
      repairable: true,
    });
  }

  const difficultyExpected = [
    blueprint.difficultyLevels.level1,
    blueprint.difficultyLevels.level2,
    blueprint.difficultyLevels.level3,
  ];
  for (let level = 1; level <= 3; level += 1) {
    const indexes = questions
      .map((question, index) => question.difficultyLevel === level ? index : -1)
      .filter((index) => index >= 0);
    if (indexes.length !== difficultyExpected[level - 1]) {
      issues.push({
        code: 'DIFFICULTY_COUNT_MISMATCH',
        questionIndexes: indexes,
        message: `Mức độ ${level} có ${indexes.length} câu, blueprint yêu cầu ${difficultyExpected[level - 1]} câu.`,
        repairable: true,
      });
    }
  }

  for (let leftIndex = 0; leftIndex < questions.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < questions.length; rightIndex += 1) {
      if (similarity(questionText(questions[leftIndex]), questionText(questions[rightIndex])) >= 0.88) {
        issues.push({
          code: 'DUPLICATE_QUESTION',
          questionIndexes: [leftIndex, rightIndex],
          message: `Câu ${leftIndex + 1} và câu ${rightIndex + 1} có nội dung gần trùng nhau.`,
          repairable: true,
        });
      }
    }
  }

  questions.forEach((question, index) => {
    if (!question.explanation.trim()) {
      issues.push({
        code: 'MISSING_EXPLANATION',
        questionIndexes: [index],
        message: `Câu ${index + 1} thiếu lời giải.`,
        repairable: true,
      });
    }
    if (hasInvalidAnswer(question)) {
      issues.push({
        code: 'INVALID_ANSWER',
        questionIndexes: [index],
        message: `Câu ${index + 1} có đáp án không hợp lệ.`,
        repairable: true,
      });
    }
  });

  return issues;
}
