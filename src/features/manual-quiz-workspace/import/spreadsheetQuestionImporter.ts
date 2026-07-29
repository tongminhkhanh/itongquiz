import Papa from 'papaparse';
import { QuestionType } from '../../../types';
import type { ManualQuizQuestion } from '../types/manualQuizWorkspace.types';
import {
    appendImportCandidate,
    createEmptyQuestionImportResult,
    type QuestionImportCandidate,
    type QuestionImportResult,
    type QuestionImportStatus,
    type QuizImportMetadata,
} from './questionImport.types';
import {
    enforceQuestionImportCount,
    normalizeImportKey,
    parseQuizImportMetadataPairs,
    validateQuestionImportFile,
} from './questionImportPolicy';

const HEADER_ALIASES: Record<string, string[]> = {
    type: ['type', 'loai', 'loai_cau_hoi', 'dạng', 'dang'],
    question: ['question', 'cau_hoi', 'nội_dung', 'noi_dung'],
    optionA: ['optiona', 'option_a', 'dap_an_a', 'đáp_án_a'],
    optionB: ['optionb', 'option_b', 'dap_an_b', 'đáp_án_b'],
    optionC: ['optionc', 'option_c', 'dap_an_c', 'đáp_án_c'],
    optionD: ['optiond', 'option_d', 'dap_an_d', 'đáp_án_d'],
    correctAnswer: ['correctanswer', 'correct_answer', 'dap_an_dung', 'đáp_án_đúng'],
    difficulty: ['difficulty', 'do_kho', 'độ_khó'],
    points: ['points', 'diem', 'điểm'],
    explanation: ['explanation', 'loi_giai', 'lời_giải'],
    subject: ['subject', 'mon', 'môn'],
    image: ['image', 'anh', 'ảnh'],
    imageAlt: ['imagealt', 'image_alt', 'mo_ta_anh', 'mô_tả_ảnh'],
    title: ['title', 'quiz_title', 'ten_de', 'tên_đề'],
    classLevel: ['classlevel', 'class_level', 'khoi', 'khối', 'lop', 'lớp'],
    category: ['category', 'danh_muc', 'môn', 'mon'],
    timeLimit: ['timelimit', 'time_limit', 'thoi_gian', 'thời_gian'],
    tags: ['tags', 'the', 'thẻ', 'nhan', 'nhãn'],
};

let candidateCounter = 0;
const createCandidateId = (): string => {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return `import-candidate-${uuid}`;
    candidateCounter += 1;
    return `import-candidate-${candidateCounter}`;
};

const normalizeHeader = (value: string): string => normalizeImportKey(value);

const normalizeRow = (row: Record<string, unknown>): Record<string, unknown> => {
    const source = new Map(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
    return Object.fromEntries(Object.entries(HEADER_ALIASES).map(([canonical, aliases]) => {
        const value = aliases.map(normalizeHeader).map((alias) => source.get(alias)).find((entry) => entry !== undefined);
        return [canonical, value];
    }));
};

const text = (value: unknown): string => String(value ?? '').trim();

const normalizeQuestionType = (value: unknown, options: string[]): { type: QuestionType; inferred: boolean } => {
    const raw = text(value).toUpperCase().replace(/[\s-]+/g, '_');
    const aliases: Record<string, QuestionType> = {
        TRAC_NGHIEM: QuestionType.MCQ,
        MOT_DAP_AN: QuestionType.MCQ,
        NHIEU_DAP_AN: QuestionType.MULTIPLE_SELECT,
        TRA_LOI_NGAN: QuestionType.SHORT_ANSWER,
    };
    const normalized = aliases[raw] ?? raw as QuestionType;
    if ([
        QuestionType.MCQ,
        QuestionType.MULTIPLE_SELECT,
        QuestionType.SHORT_ANSWER,
        QuestionType.IMAGE_QUESTION,
    ].includes(normalized)) {
        return { type: normalized, inferred: false };
    }
    return { type: options.length >= 2 ? QuestionType.MCQ : QuestionType.SHORT_ANSWER, inferred: true };
};

const parseDifficulty = (value: unknown): 1 | 2 | 3 => {
    const numeric = Number(value);
    return numeric === 2 || numeric === 3 ? numeric : 1;
};

const parsePoints = (value: unknown): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
};

const createQuestion = (
    row: Record<string, unknown>,
    type: QuestionType,
    options: string[],
    correctAnswer: string,
): ManualQuizQuestion => {
    const base = {
        id: `import-question-${createCandidateId()}`,
        type,
        difficulty: parseDifficulty(row.difficulty),
        points: parsePoints(row.points),
        explanation: text(row.explanation) || undefined,
        subject: text(row.subject) || undefined,
        image: text(row.image) || undefined,
        imageAlt: text(row.imageAlt) || undefined,
    };
    if (type === QuestionType.MCQ || type === QuestionType.IMAGE_QUESTION) {
        return { ...base, type, question: text(row.question), options, correctAnswer } as ManualQuizQuestion;
    }
    if (type === QuestionType.MULTIPLE_SELECT) {
        return {
            ...base,
            type,
            question: text(row.question),
            options,
            correctAnswers: correctAnswer.split(/[;,]/).map((item) => item.trim()).filter(Boolean),
        } as ManualQuizQuestion;
    }
    return { ...base, type: QuestionType.SHORT_ANSWER, question: text(row.question), correctAnswer } as ManualQuizQuestion;
};

const metadataFromRow = (row: Record<string, unknown>): QuizImportMetadata => {
    const normalized = normalizeRow(row);
    return parseQuizImportMetadataPairs([
        ['title', normalized.title],
        ['classLevel', normalized.classLevel],
        ['category', normalized.category],
        ['timeLimit', normalized.timeLimit],
        ['tags', normalized.tags],
    ]);
};

const classifyRow = (row: Record<string, unknown>, sourceRow: number): QuestionImportCandidate => {
    const normalized = normalizeRow(row);
    const questionText = text(normalized.question);
    const options = ['optionA', 'optionB', 'optionC', 'optionD']
        .map((key) => text(normalized[key]))
        .filter(Boolean);
    const rawAnswerTokens = text(normalized.correctAnswer).split(/[;,]/).map((entry) => entry.trim()).filter(Boolean);
    const answerTokens = rawAnswerTokens.map((entry) => {
        const direct = entry.toUpperCase();
        if (/^[A-D]$/.test(direct)) return direct;
        const optionIndex = options.findIndex((option) => option.toLocaleLowerCase('vi') === entry.toLocaleLowerCase('vi'));
        return optionIndex >= 0 ? String.fromCharCode(65 + optionIndex) : direct;
    });
    const answer = answerTokens.join(',');
    const normalizedType = normalizeQuestionType(normalized.type, options);
    const issues: string[] = [];
    let status: QuestionImportStatus = 'accepted';

    if (!questionText) {
        issues.push('Thiếu nội dung câu hỏi.');
        status = 'rejected';
    }
    if (normalizedType.inferred) {
        issues.push('Loại câu hỏi chưa được nhận diện; hệ thống đã tạm suy đoán.');
        if (status !== 'rejected') status = 'needsReview';
    }
    if ([QuestionType.MCQ, QuestionType.IMAGE_QUESTION, QuestionType.MULTIPLE_SELECT].includes(normalizedType.type) && options.length < 2) {
        issues.push('Cần ít nhất hai phương án.');
        if (status !== 'rejected') status = 'needsReview';
    }
    if (answerTokens.length === 0) {
        issues.push('Thiếu đáp án đúng.');
        if (status !== 'rejected') status = 'needsReview';
    }
    if ((normalizedType.type === QuestionType.MCQ || normalizedType.type === QuestionType.IMAGE_QUESTION)
        && answerTokens.length > 0
        && (answerTokens.length !== 1 || !/^[A-D]$/.test(answerTokens[0]) || !options[answerTokens[0].charCodeAt(0) - 65])) {
        issues.push('Đáp án đúng không khớp với phương án hiện có.');
        if (status !== 'rejected') status = 'needsReview';
    }
    if (normalizedType.type === QuestionType.MULTIPLE_SELECT
        && answerTokens.some((entry) => !/^[A-D]$/.test(entry) || !options[entry.charCodeAt(0) - 65])) {
        issues.push('Đáp án đúng không khớp với phương án hiện có.');
        if (status !== 'rejected') status = 'needsReview';
    }

    return {
        id: createCandidateId(),
        sourceRow,
        sourceLabel: `Dòng ${sourceRow}`,
        status,
        issues,
        question: createQuestion(normalized, normalizedType.type, options, answer),
    };
};

export const parseSpreadsheetRows = (
    rows: Record<string, unknown>[],
    metadata: QuizImportMetadata = {},
): QuestionImportResult => {
    const result = createEmptyQuestionImportResult();
    result.metadata = { ...metadataFromRow(rows[0] ?? {}), ...metadata };
    rows.forEach((row, index) => appendImportCandidate(result, classifyRow(row, index + 2)));
    return enforceQuestionImportCount(result);
};

export const parseQuestionCsvText = (csvText: string): QuestionImportResult => {
    const parsed = Papa.parse<Record<string, unknown>>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
    });
    return parseSpreadsheetRows(parsed.data);
};

const worksheetRows = (worksheet: readonly (readonly unknown[])[]): Record<string, unknown>[] => {
    const headers = (worksheet[0] ?? []).map((value) => text(value));
    return worksheet.slice(1)
        .filter((row) => row.some((value) => text(value) !== ''))
        .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
};

const worksheetMetadata = (worksheet: readonly (readonly unknown[])[]): QuizImportMetadata => {
    const pairs = worksheet
        .filter((row) => row.some((value) => text(value) !== ''))
        .map((row) => [row[0], row[1]] as const)
        .filter(([key]) => !['truong', 'field', 'key'].includes(normalizeImportKey(key)));
    return parseQuizImportMetadataPairs(pairs);
};

const readFile = <T extends string | ArrayBuffer>(file: File, mode: 'text' | 'arrayBuffer'): Promise<T> => {
    if (mode === 'text' && typeof file.text === 'function') return file.text() as Promise<T>;
    if (mode === 'arrayBuffer' && typeof file.arrayBuffer === 'function') return file.arrayBuffer() as Promise<T>;
    return new Promise<T>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error || new Error('Không thể đọc tệp.'));
        reader.onload = () => resolve(reader.result as T);
        if (mode === 'text') reader.readAsText(file);
        else reader.readAsArrayBuffer(file);
    });
};

export const importQuestionSpreadsheet = async (file: File): Promise<QuestionImportResult> => {
    const extension = validateQuestionImportFile(file);
    if (file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv')) {
        return parseQuestionCsvText(await readFile<string>(file, 'text'));
    }
    if (extension !== 'xlsx') {
        throw new Error('Tệp đã chọn không phải định dạng XLSX.');
    }
    const { default: readWorkbook } = await import('read-excel-file/browser');
    const workbook = await readWorkbook(await readFile<ArrayBuffer>(file, 'arrayBuffer'));
    const questionSheet = workbook.find((sheet) => ['cau_hoi', 'questions'].includes(normalizeImportKey(sheet.sheet)))
        ?? workbook.find((sheet) => !['thong_tin_de', 'metadata', 'info'].includes(normalizeImportKey(sheet.sheet)));
    const metadataSheet = workbook.find((sheet) => ['thong_tin_de', 'metadata', 'info'].includes(normalizeImportKey(sheet.sheet)));
    const metadata = metadataSheet ? worksheetMetadata(metadataSheet.data) : {};
    return questionSheet && questionSheet.data.length > 0
        ? parseSpreadsheetRows(worksheetRows(questionSheet.data), metadata)
        : createEmptyQuestionImportResult();
};
