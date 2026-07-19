import type { Question } from '../../../types';
import { QuestionType } from '../../../types';

export const QUICK_ADD_TYPES = [
    { type: QuestionType.MCQ, label: 'Trắc nghiệm', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    { type: QuestionType.TRUE_FALSE, label: 'Đúng/Sai', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
    { type: QuestionType.SHORT_ANSWER, label: 'Điền đáp án', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
    { type: QuestionType.MATCHING, label: 'Nối cột', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
] as const;

export const QUESTION_TYPE_OPTIONS = [
    [QuestionType.MCQ, 'Trắc nghiệm (1 đáp án)'],
    [QuestionType.MULTIPLE_SELECT, 'Chọn nhiều đáp án'],
    [QuestionType.TRUE_FALSE, 'Đúng/Sai'],
    [QuestionType.SHORT_ANSWER, 'Điền đáp án ngắn'],
    [QuestionType.MATCHING, 'Nối cột'],
    [QuestionType.DRAG_DROP, 'Kéo thả (điền khuyết)'],
    [QuestionType.DROPDOWN, 'Dropdown (chọn từ danh sách)'],
    [QuestionType.UNDERLINE, 'Gạch chân'],
    [QuestionType.ORDERING, 'Sắp xếp'],
    [QuestionType.CATEGORIZATION, 'Phân loại'],
    [QuestionType.WORD_SCRAMBLE, 'Ghép chữ (Tiếng Anh)'],
    [QuestionType.ERROR_CORRECTION, 'Sửa lỗi sai'],
    [QuestionType.IMAGE_QUESTION, 'Hình học / Dựa vào hình'],
    [QuestionType.RIDDLE, 'Câu đố'],
] as const;

export const createManualQuestionDraft = (type: QuestionType): Question => {
    const draft: Record<string, unknown> = {
        id: `q-manual-${Date.now()}`,
        type,
        difficulty: 1,
    };

    if (type === QuestionType.TRUE_FALSE) {
        draft.mainQuestion = '';
        draft.items = [];
    } else {
        draft.question = '';
    }

    return draft as unknown as Question;
};
