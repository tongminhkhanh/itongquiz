import { QuestionType } from '../../../types';

export type QuizIntent = 'EXAM' | 'PRACTICE';
export type QuizSourceMode = 'TOPIC' | 'DOCUMENT';

export interface QuestionTypeAllocation {
  type: QuestionType;
  count: number;
}

export interface QuizBlueprint {
  intent: QuizIntent;
  sourceMode: QuizSourceMode;
  totalQuestions: number;
  typeAllocations: QuestionTypeAllocation[];
  difficultyLevels: {
    level1: number;
    level2: number;
    level3: number;
  };
}

const uniqueQuestionTypes = (types: QuestionType[]): QuestionType[] => {
  const seen = new Set<QuestionType>();
  return types.filter((type) => {
    if (seen.has(type)) return false;
    seen.add(type);
    return true;
  });
};

export function buildBalancedTypeAllocations(
  types: QuestionType[],
  total: number,
): QuestionTypeAllocation[] {
  const uniqueTypes = uniqueQuestionTypes(types);
  if (uniqueTypes.length === 0) return [];

  const safeTotal = Number.isInteger(total) && total > 0 ? total : 0;
  const baseCount = Math.floor(safeTotal / uniqueTypes.length);
  const remainder = safeTotal % uniqueTypes.length;

  return uniqueTypes.map((type, index) => ({
    type,
    count: baseCount + (index < remainder ? 1 : 0),
  }));
}

export function validateQuizBlueprint(blueprint: QuizBlueprint): string[] {
  const errors: string[] = [];

  if (!Number.isInteger(blueprint.totalQuestions)
    || blueprint.totalQuestions < 1
    || blueprint.totalQuestions > 40) {
    errors.push('Tổng số câu phải từ 1 đến 40.');
  }

  if (blueprint.typeAllocations.length === 0) {
    errors.push('Cần chọn ít nhất một dạng câu.');
  }

  if (blueprint.typeAllocations.some(({ count }) => !Number.isInteger(count) || count < 0)) {
    errors.push('Số câu theo từng dạng phải là số nguyên không âm.');
  }

  const uniqueTypes = new Set(blueprint.typeAllocations.map(({ type }) => type));
  if (uniqueTypes.size !== blueprint.typeAllocations.length) {
    errors.push('Mỗi dạng câu chỉ được xuất hiện một lần.');
  }

  const typeTotal = blueprint.typeAllocations.reduce((sum, allocation) => sum + allocation.count, 0);
  if (typeTotal !== blueprint.totalQuestions) {
    errors.push(`Tổng số câu theo dạng phải bằng ${blueprint.totalQuestions}.`);
  }

  const difficultyValues = Object.values(blueprint.difficultyLevels);
  if (difficultyValues.some((count) => !Number.isInteger(count) || count < 0)) {
    errors.push('Số câu theo độ khó phải là số nguyên không âm.');
  }

  const difficultyTotal = difficultyValues.reduce((sum, count) => sum + count, 0);
  if (difficultyTotal !== blueprint.totalQuestions) {
    errors.push(`Tổng số câu theo độ khó phải bằng ${blueprint.totalQuestions}.`);
  }

  return errors;
}
