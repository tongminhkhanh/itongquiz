import { z } from 'zod';

export interface GeneratedQuizSchemaIssue {
  path: Array<string | number>;
  code: string;
  message: string;
}

export const GENERATED_QUIZ_SCHEMA_USER_MESSAGE =
  'AI tạo một số câu chưa đúng cấu trúc. Vui lòng thử tạo lại đề hoặc giảm số dạng câu trong một lần.';

export class GeneratedQuizSchemaError extends Error {
  readonly code = 'AI_QUIZ_SCHEMA_INVALID';

  constructor(public readonly issues: GeneratedQuizSchemaIssue[]) {
    super(GENERATED_QUIZ_SCHEMA_USER_MESSAGE);
    this.name = 'GeneratedQuizSchemaError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const toGeneratedQuizSchemaIssues = (
  issues: z.core.$ZodIssue[],
): GeneratedQuizSchemaIssue[] => issues.map((issue) => ({
  path: issue.path.filter(
    (part): part is string | number => typeof part === 'string' || typeof part === 'number',
  ),
  code: issue.code,
  message: issue.message,
}));

const FRIENDLY_SCHEMA_FIELDS: Record<string, string> = {
  options: 'phương án trả lời',
  correctAnswer: 'đáp án đúng',
  correctAnswers: 'các đáp án đúng',
  blanks: 'ô điền đáp án',
  items: 'danh sách nội dung',
  categories: 'nhóm phân loại',
  pairs: 'cặp nối',
  correctOrder: 'thứ tự đúng',
  explanation: 'lời giải thích',
  difficultyLevel: 'mức độ câu hỏi',
  type: 'dạng câu hỏi',
};

const getSchemaIssueUserMessage = (issues: GeneratedQuizSchemaIssue[]): string => {
  const questionNumbers = [...new Set(issues.flatMap((issue) => (
    issue.path[0] === 'questions' && typeof issue.path[1] === 'number'
      ? [issue.path[1] + 1]
      : []
  )))].sort((left, right) => left - right);
  const friendlyFields = [...new Set(issues.flatMap((issue) => (
    issue.path
      .filter((part): part is string => typeof part === 'string')
      .map((part) => FRIENDLY_SCHEMA_FIELDS[part])
      .filter((part): part is string => Boolean(part))
  )))];

  if (questionNumbers.length === 0) return GENERATED_QUIZ_SCHEMA_USER_MESSAGE;

  const shownQuestions = questionNumbers.slice(0, 5).join(', ');
  const remainingQuestions = questionNumbers.length - 5;
  const questionSummary = `câu ${shownQuestions}${
    remainingQuestions > 0 ? ` và ${remainingQuestions} câu khác` : ''
  }`;
  const fieldSummary = friendlyFields.length > 0
    ? ` ở phần ${friendlyFields.slice(0, 2).join(' hoặc ')}`
    : '';
  return `AI chưa sửa được cấu trúc ${questionSummary}${fieldSummary}. Vui lòng thử tạo lại đề; các câu hợp lệ sẽ được giữ nguyên trong lượt sửa.`;
};

export const getQuizGenerationUserMessage = (error: unknown): string => {
  if (error instanceof GeneratedQuizSchemaError) {
    return getSchemaIssueUserMessage(error.issues);
  }
  if (error instanceof z.ZodError) {
    return GENERATED_QUIZ_SCHEMA_USER_MESSAGE;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Đã xảy ra lỗi khi tạo đề.';
};
