import type { QuizBlueprint } from '../../features/quiz-generator/domain/quizBlueprint';
import type { QuizAuditIssue } from './quizAudit';
import type { GeneratedQuestion, GeneratedQuizPayload } from './schemas/quizGenerationSchema';

export interface QuizRepairRequest {
  blueprint: QuizBlueprint;
  quiz: GeneratedQuizPayload;
  issues: QuizAuditIssue[];
}

export interface QuizRepairPlan {
  removalIndexes: number[];
  replacementIndexes: number[];
  missingCount: number;
  requestedCount: number;
}

export class QuizGenerationValidationError extends Error {
  constructor(public readonly issues: QuizAuditIssue[]) {
    super(issues.map((issue) => issue.message).join(' '));
    this.name = 'QuizGenerationValidationError';
  }
}

const uniqueSortedIndexes = (indexes: number[], maxExclusive: number): number[] => [...new Set(indexes)]
  .filter((index) => Number.isInteger(index) && index >= 0 && index < maxExclusive)
  .sort((left, right) => left - right);

export function createQuizRepairPlan(input: QuizRepairRequest): QuizRepairPlan {
  const removalIndexes = uniqueSortedIndexes(
    input.issues
      .filter((issue) => issue.code === 'QUESTION_COUNT_MISMATCH')
      .flatMap((issue) => issue.questionIndexes),
    input.quiz.questions.length,
  );
  const removalSet = new Set(removalIndexes);
  const replacementIndexes = uniqueSortedIndexes(
    input.issues
      .filter((issue) => issue.code !== 'QUESTION_COUNT_MISMATCH')
      .flatMap((issue) => issue.questionIndexes)
      .filter((index) => !removalSet.has(index)),
    input.quiz.questions.length,
  );
  const remainingCount = input.quiz.questions.length - removalIndexes.length;
  const missingCount = Math.max(0, input.blueprint.totalQuestions - remainingCount);

  return {
    removalIndexes,
    replacementIndexes,
    missingCount,
    requestedCount: replacementIndexes.length + missingCount,
  };
}

export function buildQuizRepairPrompt(input: QuizRepairRequest): string {
  const plan = createQuizRepairPlan(input);
  const allocation = input.blueprint.typeAllocations
    .map(({ type, count }) => `${type}: ${count} câu`)
    .join('\n');
  const issueSummary = input.issues
    .map((issue) => `- ${issue.code}: ${issue.message}`)
    .join('\n');
  const targetSummary = plan.replacementIndexes.length > 0
    ? plan.replacementIndexes.map((index) => index + 1).join(', ')
    : 'không có';

  return `
Bạn đang sửa một đề đã được kiểm tra bằng mã.
Tạo đúng ${plan.requestedCount} câu thay thế và chỉ trả về JSON hợp lệ.

BLUEPRINT BẮT BUỘC:
- Intent: ${input.blueprint.intent}
- Nguồn: ${input.blueprint.sourceMode}
- Tổng cuối cùng: ${input.blueprint.totalQuestions} câu
- Phân bổ dạng câu:
${allocation}
- Độ khó: mức 1 = ${input.blueprint.difficultyLevels.level1}, mức 2 = ${input.blueprint.difficultyLevels.level2}, mức 3 = ${input.blueprint.difficultyLevels.level3}

CÁC CÂU CẦN THAY THẾ THEO VỊ TRÍ: ${targetSummary}
SỐ CÂU CÒN THIẾU CẦN BỔ SUNG: ${plan.missingCount}
CÁC LỖI CẦN KHẮC PHỤC:
${issueSummary}

Không viết lại các câu hợp lệ. Không trả lại toàn bộ đề gốc.
JSON trả về phải có dạng {"title":"Phần sửa","questions":[...]} và mỗi câu phải có explanation cùng difficultyLevel.
`;
}

const preserveQuestionId = (
  original: GeneratedQuestion,
  replacement: GeneratedQuestion,
): GeneratedQuestion => {
  if (!original.id) return replacement;
  return { ...replacement, id: original.id } as GeneratedQuestion;
};

export function mergeRepairedQuestions(
  original: GeneratedQuizPayload,
  repaired: GeneratedQuizPayload,
  issues: QuizAuditIssue[],
): GeneratedQuizPayload {
  const removalIndexes = uniqueSortedIndexes(
    issues
      .filter((issue) => issue.code === 'QUESTION_COUNT_MISMATCH')
      .flatMap((issue) => issue.questionIndexes),
    original.questions.length,
  );
  const removalSet = new Set(removalIndexes);
  const replacementIndexes = uniqueSortedIndexes(
    issues
      .filter((issue) => issue.code !== 'QUESTION_COUNT_MISMATCH')
      .flatMap((issue) => issue.questionIndexes)
      .filter((index) => !removalSet.has(index)),
    original.questions.length,
  );
  const replacementSet = new Set(replacementIndexes);

  if (repaired.questions.length < replacementIndexes.length) {
    throw new Error('AI không trả về đủ câu để thay thế các vị trí lỗi.');
  }

  let repairCursor = 0;
  const questions: GeneratedQuestion[] = [];
  original.questions.forEach((question, index) => {
    if (removalSet.has(index)) return;
    if (replacementSet.has(index)) {
      questions.push(preserveQuestionId(question, repaired.questions[repairCursor]));
      repairCursor += 1;
      return;
    }
    questions.push(question);
  });

  questions.push(...repaired.questions.slice(repairCursor));
  return { ...original, questions };
}
