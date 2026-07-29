import type { QuestionImportResult, QuizImportMetadata } from './questionImport.types';

export const QUESTION_IMPORT_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const QUESTION_IMPORT_MAX_QUESTIONS = 200;
export const QUESTION_IMPORT_EXTENSIONS = ['csv', 'xlsx', 'docx'] as const;

export type QuestionImportExtension = typeof QUESTION_IMPORT_EXTENSIONS[number];

export class QuestionImportPolicyError extends Error {
    constructor(
        message: string,
        readonly code: 'UNSUPPORTED_FILE' | 'FILE_TOO_LARGE' | 'TOO_MANY_QUESTIONS',
    ) {
        super(message);
        this.name = 'QuestionImportPolicyError';
    }
}

export const getQuestionImportExtension = (fileName: string): QuestionImportExtension | null => {
    const extension = fileName.split('.').pop()?.trim().toLowerCase();
    return QUESTION_IMPORT_EXTENSIONS.includes(extension as QuestionImportExtension)
        ? extension as QuestionImportExtension
        : null;
};

export const validateQuestionImportFile = (
    file: Pick<File, 'name' | 'size'>,
): QuestionImportExtension => {
    const extension = getQuestionImportExtension(file.name);
    if (!extension) {
        throw new QuestionImportPolicyError(
            'Chỉ hỗ trợ tệp CSV, XLSX hoặc DOCX.',
            'UNSUPPORTED_FILE',
        );
    }
    if (file.size > QUESTION_IMPORT_MAX_FILE_BYTES) {
        throw new QuestionImportPolicyError(
            'Tệp vượt quá giới hạn 10 MB. Hãy giảm kích thước tệp rồi thử lại.',
            'FILE_TOO_LARGE',
        );
    }
    return extension;
};

export const normalizeImportKey = (value: unknown): string => String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const metadataKey = (key: unknown): keyof QuizImportMetadata | null => {
    const normalized = normalizeImportKey(key);
    if (['ten_de', 'title', 'quiz_title'].includes(normalized)) return 'title';
    if (['khoi', 'khoi_lop', 'lop', 'class', 'classlevel', 'class_level'].includes(normalized)) return 'classLevel';
    if (['mon', 'subject', 'category', 'danh_muc'].includes(normalized)) return 'category';
    if (['thoi_gian', 'thoi_gian_lam_bai', 'time', 'timelimit', 'time_limit'].includes(normalized)) return 'timeLimit';
    if (['the', 'tags', 'nhan'].includes(normalized)) return 'tags';
    return null;
};

const metadataValue = (
    key: keyof QuizImportMetadata,
    value: unknown,
): QuizImportMetadata[keyof QuizImportMetadata] | undefined => {
    const raw = String(value ?? '').trim();
    if (!raw) return undefined;
    if (key === 'timeLimit') {
        const minutes = Number(raw.match(/\d+(?:[.,]\d+)?/)?.[0].replace(',', '.'));
        return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : undefined;
    }
    if (key === 'tags') {
        return raw.split(/[;,]/).map((tag) => tag.trim()).filter(Boolean);
    }
    return raw;
};

export const parseQuizImportMetadataPairs = (
    pairs: Array<readonly [unknown, unknown]>,
): QuizImportMetadata => {
    const metadata: QuizImportMetadata = {};
    for (const [rawKey, rawValue] of pairs) {
        const key = metadataKey(rawKey);
        if (!key) continue;
        const value = metadataValue(key, rawValue);
        if (value !== undefined) {
            (metadata as Record<string, unknown>)[key] = value;
        }
    }
    return metadata;
};

export const enforceQuestionImportCount = (
    result: QuestionImportResult,
): QuestionImportResult => {
    const candidates = [...result.accepted, ...result.needsReview, ...result.rejected];
    if (candidates.length <= QUESTION_IMPORT_MAX_QUESTIONS) return result;

    const allowedIds = new Set(candidates
        .sort((left, right) => left.sourceRow - right.sourceRow)
        .slice(0, QUESTION_IMPORT_MAX_QUESTIONS)
        .map((candidate) => candidate.id));
    const removedCount = candidates.length - QUESTION_IMPORT_MAX_QUESTIONS;
    return {
        ...result,
        warnings: [
            ...result.warnings,
            `Tệp có quá nhiều câu hỏi. Hệ thống chỉ giữ ${QUESTION_IMPORT_MAX_QUESTIONS} câu đầu và bỏ qua ${removedCount} câu còn lại.`,
        ],
        accepted: result.accepted.filter((candidate) => allowedIds.has(candidate.id)),
        needsReview: result.needsReview.filter((candidate) => allowedIds.has(candidate.id)),
        rejected: result.rejected.filter((candidate) => allowedIds.has(candidate.id)),
    };
};
