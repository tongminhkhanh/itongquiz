import { QuestionType } from '../../../types';
import { createManualQuestionDraft } from '../../../components/TeacherDashboard/quiz-preview/questionTypes';
import { validateQuestionForAuthoring } from '../validation/questionValidators';
import type { ManualQuizQuestion } from '../types/manualQuizWorkspace.types';
import {
    appendImportCandidate,
    createEmptyQuestionImportResult,
    type QuestionImportCandidate,
    type QuestionImportResult,
} from './questionImport.types';
import {
    enforceQuestionImportCount,
    QUESTION_IMPORT_MAX_QUESTIONS,
    validateQuestionImportJson,
} from './questionImportPolicy';

type JsonRecord = Record<string, unknown>;

const TYPE_MAP: Record<string, QuestionType> = {
    SINGLE_CHOICE: QuestionType.MCQ,
    TRUE_FALSE: QuestionType.TRUE_FALSE,
    SHORT_ANSWER: QuestionType.SHORT_ANSWER,
    MATCHING: QuestionType.MATCHING,
    MULTIPLE_CHOICE: QuestionType.MULTIPLE_SELECT,
    DRAG_DROP_FILL: QuestionType.DRAG_DROP,
    ORDERING: QuestionType.ORDERING,
    IMAGE_QUESTION: QuestionType.IMAGE_QUESTION,
    DROPDOWN: QuestionType.DROPDOWN,
    UNDERLINE: QuestionType.UNDERLINE,
    CATEGORIZATION: QuestionType.CATEGORIZATION,
    WORD_ASSEMBLY: QuestionType.WORD_SCRAMBLE,
    RIDDLE: QuestionType.RIDDLE,
};

const asRecord = (value: unknown): JsonRecord | null => (
    value && typeof value === 'object' && !Array.isArray(value)
        ? value as JsonRecord
        : null
);
const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const difficulty = (value: unknown): 1 | 2 | 3 | null => {
    if (value === 'NHAN_BIET' || value === 1) return 1;
    if (value === 'THONG_HIEU' || value === 2) return 2;
    if (value === 'VAN_DUNG' || value === 3) return 3;
    return null;
};
const id = (prefix: string): string => {
    const uuid = globalThis.crypto?.randomUUID?.();
    return `${prefix}-${uuid || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
};
const optionText = (value: unknown): string => {
    const record = asRecord(value);
    return text(record?.text ?? value);
};
const optionId = (value: unknown, index: number): string => {
    const record = asRecord(value);
    return text(record?.id) || `OP${index + 1}`;
};
const sourceLabel = (record: JsonRecord, index: number): string => text(record.id) || `Câu ${index + 1}`;

const answerIndex = (answer: unknown, options: unknown[]): number => {
    const target = text(answer);
    const byId = options.findIndex((option, index) => optionId(option, index) === target);
    if (byId >= 0) return byId;
    return options.findIndex((option) => optionText(option) === target);
};

const DRAG_DROP_PLACEHOLDER_PATTERN = /\{\{\{([A-Za-z][A-Za-z0-9_-]*)\}\}\}|\{\{([A-Za-z][A-Za-z0-9_-]*)\}\}/g;

const findOpeningBrace = (value: string, closingIndex: number): number => {
    let depth = 0;
    for (let index = closingIndex; index >= 0; index -= 1) {
        if (value[index] === '}') depth += 1;
        if (value[index] === '{') {
            depth -= 1;
            if (depth === 0) return index;
        }
    }
    return -1;
};

const isLatexRequiredArgument = (value: string, placeholderIndex: number): boolean => {
    const beforePlaceholder = value.slice(0, placeholderIndex);
    if (/\\(?:dfrac|tfrac|frac|sqrt)\s*$/.test(beforePlaceholder)) return true;

    let previousIndex = placeholderIndex - 1;
    while (previousIndex >= 0 && /\s/.test(value[previousIndex])) previousIndex -= 1;
    if (value[previousIndex] !== '}') return false;

    const previousGroupStart = findOpeningBrace(value, previousIndex);
    return previousGroupStart >= 0
        && /\\(?:dfrac|tfrac|frac)\s*$/.test(value.slice(0, previousGroupStart));
};

const parseDragDropContent = (value: unknown): { content: string; placeholders: string[] } => {
    const source = text(value);
    const placeholders: string[] = [];
    const content = source.replace(
        DRAG_DROP_PLACEHOLDER_PATTERN,
        (_full, wrappedId: string | undefined, standaloneId: string | undefined, offset: number) => {
            const placeholderId = wrappedId || standaloneId || '';
            placeholders.push(placeholderId);
            const needsLatexGroup = Boolean(wrappedId) || isLatexRequiredArgument(source, offset);
            return needsLatexGroup ? `{[${placeholderId}]}` : `[${placeholderId}]`;
        },
    );
    return { content, placeholders };
};

const buildQuestion = (record: JsonRecord, index: number): { question: ManualQuizQuestion; issues: string[] } => {
    const rawType = text(record.question_type);
    const type = TYPE_MAP[rawType];
    const points = Number(record.points);
    const level = difficulty(record.difficulty);
    const issues: string[] = [];
    if (!type) throw new Error(`Câu ${sourceLabel(record, index)} có question_type không được hỗ trợ: ${rawType || '(trống)'}.`);
    if (!level) issues.push('Độ khó phải là NHAN_BIET, THONG_HIEU hoặc VAN_DUNG.');
    if (!Number.isFinite(points) || points <= 0) issues.push('Điểm phải là số lớn hơn 0.');

    const base = createManualQuestionDraft(type) as ManualQuizQuestion & JsonRecord;
    base.id = id('q-json');
    base.points = Number.isFinite(points) && points > 0 ? points : 1;
    base.difficulty = level || 1;
    base.explanation = text(record.explanation) || undefined;

    const options = asArray(record.options);
    const labels = options.map((option, optionIndex) => String.fromCharCode(65 + optionIndex));
    const answerLetter = (answer: unknown): string => {
        const indexInOptions = answerIndex(answer, options);
        if (indexInOptions < 0) {
            issues.push(`Đáp án ${text(answer) || '(trống)'} không khớp với options.`);
            return '';
        }
        return labels[indexInOptions];
    };

    switch (rawType) {
        case 'SINGLE_CHOICE':
        case 'MULTIPLE_CHOICE': {
            base.question = text(record.question);
            base.options = options.map(optionText);
            if (rawType === 'SINGLE_CHOICE') base.correctAnswer = answerLetter(record.correct_answer);
            else base.correctAnswers = asArray(record.correct_answers).map(answerLetter).filter(Boolean);
            break;
        }
        case 'TRUE_FALSE':
            base.mainQuestion = text(record.question);
            if (asArray(record.items).length !== 4) issues.push('TRUE_FALSE phải có đúng 4 mệnh đề.');
            base.items = asArray(record.items).map((item, itemIndex) => {
                const itemRecord = asRecord(item) || {};
                if (typeof itemRecord.correct_answer !== 'boolean') issues.push(`Mệnh đề ${itemIndex + 1} phải có correct_answer là boolean.`);
                return { id: id(`tf-${itemIndex + 1}`), statement: text(itemRecord.statement), isCorrect: itemRecord.correct_answer === true };
            });
            break;
        case 'SHORT_ANSWER': {
            base.question = text(record.question);
            const answers = asArray(record.accepted_answers).map(text).filter(Boolean);
            base.correctAnswer = answers[0] || '';
            if (answers.length !== 1 || record.case_sensitive === true) {
                issues.push('Hệ thống hiện chấm một đáp án, không phân biệt hoa/thường; hãy rà soát accepted_answers/case_sensitive.');
            }
            break;
        }
        case 'MATCHING': {
            base.question = text(record.question);
            const left = asArray(record.left_items).map((item) => text(asRecord(item)?.text));
            const right = asArray(record.right_items).map((item) => text(asRecord(item)?.text));
            const matches = asArray(record.matches).map((match) => asRecord(match) || {});
            const leftIds = new Set(asArray(record.left_items).map((item) => text(asRecord(item)?.id)));
            const rightIds = new Set(asArray(record.right_items).map((item) => text(asRecord(item)?.id)));
            base.pairs = matches.map((match) => {
                const leftId = text(match.left);
                const rightId = text(match.right);
                if (!leftIds.has(leftId) || !rightIds.has(rightId)) issues.push(`MATCHING tham chiếu ID không tồn tại: ${leftId} → ${rightId}.`);
                return { left: left[asArray(record.left_items).findIndex((item) => text(asRecord(item)?.id) === leftId)] || leftId, right: right[asArray(record.right_items).findIndex((item) => text(asRecord(item)?.id) === rightId)] || rightId };
            });
            break;
        }
        case 'DRAG_DROP_FILL':
            base.question = text(record.question);
            {
                const parsedContent = parseDragDropContent(record.content);
                base.text = parsedContent.content;
                const dragItems = asArray(record.drag_items);
                const dragById = new Map(dragItems.map((item) => [text(asRecord(item)?.id), optionText(item)]));
                const placeholders = parsedContent.placeholders;
                const answers = asArray(record.answers).map((answer) => asRecord(answer) || {});
                const blankAnswers = answers.map((answer) => {
                    const blank = text(answer.blank);
                    const itemId = text(answer.item);
                    if (!placeholders.includes(blank) || !dragById.has(itemId)) issues.push(`DRAG_DROP_FILL tham chiếu blank/item không tồn tại: ${blank} → ${itemId}.`);
                    return dragById.get(itemId) || itemId;
                }).filter(Boolean);
                base.blanks = blankAnswers;
                base.distractors = [...dragById.values()].filter((item) => !blankAnswers.includes(item));
                if (placeholders.length === 0 || answers.length !== placeholders.length) issues.push('Mỗi placeholder kéo-thả phải có đúng một đáp án.');
            }
            break;
        case 'ORDERING':
            base.question = text(record.question);
            base.items = asArray(record.items).map((item) => text(asRecord(item)?.text));
            base.correctOrder = asArray(record.correct_order).map((answer) => asArray(record.items).findIndex((item) => text(asRecord(item)?.id) === text(answer)));
            break;
        case 'IMAGE_QUESTION':
            base.question = text(record.question);
            base.image = text(record.image_url);
            base.imageAlt = text(record.image_description);
            base.options = options.map(optionText);
            base.correctAnswer = answerLetter(record.correct_answer);
            if (!base.image) issues.push('Câu hỏi hình ảnh chưa có image_url; cần thêm ảnh trong trình soạn.');
            break;
        case 'DROPDOWN':
            base.question = text(record.question);
            base.text = text(record.content).replace(/\{\{([^}]+)\}\}/g, '[$1]');
            base.blanks = asArray(record.dropdowns).map((dropdown, dropdownIndex) => {
                const item = asRecord(dropdown) || {};
                return { id: text(item.id) || String(dropdownIndex + 1), options: asArray(item.options).map(text), correctAnswer: text(item.correct_answer) };
            });
            break;
        case 'UNDERLINE': {
            base.question = text(record.question);
            base.sentence = text(record.content);
            const parts = asArray(record.selectable_parts);
            base.words = parts.map((part) => text(asRecord(part)?.text));
            base.correctWordIndexes = asArray(record.correct_answers).map((answer) => parts.findIndex((part) => text(asRecord(part)?.id) === text(answer))).filter((value) => value >= 0);
            break;
        }
        case 'CATEGORIZATION': {
            base.question = text(record.question);
            const groups = asArray(record.groups);
            const categories = groups.map((group) => { const item = asRecord(group) || {}; return { id: text(item.id) || id('category'), name: text(item.name) }; });
            const groupIds = new Set(categories.map((group) => group.id));
            const sourceItems = asArray(record.items);
            const itemById = new Map(sourceItems.map((item) => [text(asRecord(item)?.id), text(asRecord(item)?.text)]));
            const answersByItem = new Map(asArray(record.answers).map((answer) => {
                const value = asRecord(answer) || {};
                return [text(value.item), text(value.group)] as const;
            }));
            const categoryItems = sourceItems.map((item) => {
                const value = asRecord(item) || {};
                const itemId = text(value.id);
                return { id: id('category-item'), content: itemById.get(itemId) || '', categoryId: answersByItem.get(itemId) || '' };
            });
            base.categories = categories;
            base.items = categoryItems;
            if (categoryItems.some((item) => !groupIds.has(item.categoryId))) issues.push('Một mục phân loại tham chiếu nhóm không tồn tại.');
            if (answersByItem.size !== sourceItems.length) issues.push('Mỗi item phân loại phải có đúng một đáp án group.');
            break;
        }
        case 'WORD_ASSEMBLY':
            base.question = text(record.question);
            {
                const parts = asArray(record.parts);
                const partById = new Map(parts.map((part) => [text(asRecord(part)?.id), text(asRecord(part)?.text)]));
                const correctOrder = asArray(record.correct_order).map(text);
                base.letters = parts.map((part) => text(asRecord(part)?.text));
                base.correctWord = text(record.correct_text) || correctOrder.map((partId) => partById.get(partId) || '').join(' ');
                if (correctOrder.some((partId) => !partById.has(partId)) || correctOrder.length !== parts.length) issues.push('WORD_ASSEMBLY.correct_order phải chứa đủ ID phần ghép, mỗi ID một lần.');
            }
            break;
        case 'RIDDLE': {
            base.question = text(record.question);
            base.riddleLines = text(record.riddle).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
            const answers = asArray(record.accepted_answers).map(text).filter(Boolean);
            base.correctAnswer = answers[0] || '';
            base.answerType = 'original';
            base.answerLabel = 'Đáp án';
            base.hint = text(record.hint) || undefined;
            if (answers.length !== 1 || record.case_sensitive === true) issues.push('Hệ thống hiện chấm một đáp án, không phân biệt hoa/thường; hãy rà soát accepted_answers/case_sensitive.');
            break;
        }
        default:
            throw new Error(`Câu ${sourceLabel(record, index)} không được hỗ trợ.`);
    }
    return { question: base as ManualQuizQuestion, issues };
};

const candidateFor = (record: JsonRecord, index: number): QuestionImportCandidate => {
    const label = sourceLabel(record, index);
    try {
        const built = buildQuestion(record, index);
        const validationIssues = validateQuestionForAuthoring(built.question)
            .filter((issue) => issue.severity === 'error')
            .map((issue) => issue.message);
        const issues = [...built.issues, ...validationIssues];
        return {
            id: id('import-candidate'),
            sourceRow: index + 1,
            sourceLabel: label,
            status: issues.length > 0 ? 'needsReview' : 'accepted',
            issues,
            question: built.question,
        };
    } catch (error) {
        return {
            id: id('import-candidate'),
            sourceRow: index + 1,
            sourceLabel: label,
            status: 'rejected',
            issues: [error instanceof Error ? error.message : 'Không thể chuyển đổi câu hỏi.'],
            question: createManualQuestionDraft(QuestionType.MCQ) as ManualQuizQuestion,
        };
    }
};

export const importQuestionJson = (value: string): QuestionImportResult => {
    validateQuestionImportJson(value);
    let parsed: unknown;
    try {
        parsed = JSON.parse(value);
    } catch (error) {
        throw new Error(`JSON không hợp lệ: ${error instanceof Error ? error.message : 'không thể phân tích cú pháp'}.`);
    }
    if (!Array.isArray(parsed)) throw new Error('JSON phải là một mảng câu hỏi [...] và không có object bọc ngoài.');
    if (parsed.length > QUESTION_IMPORT_MAX_QUESTIONS) throw new Error(`JSON chỉ được chứa tối đa ${QUESTION_IMPORT_MAX_QUESTIONS} câu hỏi.`);
    const result = createEmptyQuestionImportResult();
    const seenIds = new Set<string>();
    parsed.forEach((item, index) => {
        const record = asRecord(item);
        if (!record) {
            result.rejected.push({ id: id('import-candidate'), sourceRow: index + 1, sourceLabel: `Câu ${index + 1}`, status: 'rejected', issues: ['Mỗi phần tử phải là một object JSON.'], question: createManualQuestionDraft(QuestionType.MCQ) as ManualQuizQuestion });
            return;
        }
        const sourceId = text(record.id);
        if (sourceId && seenIds.has(sourceId)) {
            result.rejected.push({ id: id('import-candidate'), sourceRow: index + 1, sourceLabel: sourceId, status: 'rejected', issues: [`ID ${sourceId} bị trùng.`], question: createManualQuestionDraft(QuestionType.MCQ) as ManualQuizQuestion });
            return;
        }
        if (sourceId) seenIds.add(sourceId);
        appendImportCandidate(result, candidateFor(record, index));
    });
    return enforceQuestionImportCount(result);
};
