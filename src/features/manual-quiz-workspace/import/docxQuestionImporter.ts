import mammoth from 'mammoth';
import { QuestionType } from '../../../types';
import type { ManualQuizQuestion } from '../types/manualQuizWorkspace.types';
import {
    appendImportCandidate,
    createEmptyQuestionImportResult,
    type QuestionImportCandidate,
    type QuestionImportResult,
} from './questionImport.types';
import {
    enforceQuestionImportCount,
    parseQuizImportMetadataPairs,
    validateQuestionImportFile,
} from './questionImportPolicy';

let docxCandidateCounter = 0;
const createId = (prefix: string): string => {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return `${prefix}-${uuid}`;
    docxCandidateCounter += 1;
    return `${prefix}-${docxCandidateCounter}`;
};

interface DocxBlock {
    number: number;
    body: string;
}

const splitQuestionBlocks = (rawText: string): DocxBlock[] => {
    const normalized = rawText.replace(/\r/g, '').trim();
    const matches = Array.from(normalized.matchAll(/(?:^|\n)\s*Câu\s+(\d+)\s*[:.)-]\s*/gi));
    return matches.map((match, index) => ({
        number: Number(match[1]) || index + 1,
        body: normalized.slice((match.index || 0) + match[0].length, matches[index + 1]?.index ?? normalized.length).trim(),
    }));
};

const extractDocxMetadata = (rawText: string) => {
    const normalized = rawText.replace(/\r/g, '').trim();
    const firstQuestion = normalized.search(/(?:^|\n)\s*Câu\s+\d+\s*[:.)-]\s*/i);
    const header = firstQuestion >= 0 ? normalized.slice(0, firstQuestion) : normalized;
    const pairs = header
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const separator = line.indexOf(':');
            return separator > 0
                ? [line.slice(0, separator), line.slice(separator + 1)] as const
                : null;
        })
        .filter((pair): pair is readonly [string, string] => pair !== null);
    return parseQuizImportMetadataPairs(pairs);
};

const fieldValue = (lines: string[], pattern: RegExp): string | undefined => {
    const line = lines.find((entry) => pattern.test(entry));
    return line?.split(':').slice(1).join(':').trim() || undefined;
};

const parseBlock = ({ number, body }: DocxBlock): QuestionImportCandidate => {
    const lines = body.split('\n').map((line) => line.trim()).filter(Boolean);
    const optionLines = lines.filter((line) => /^[A-F][.)]\s*/i.test(line));
    const answerLine = lines.find((line) => /^(Đáp án|Dap an|Answer)\s*:/i.test(line));
    const explanationLine = lines.find((line) => /^(Giải thích|Giai thich|Lời giải|Loi giai)\s*:/i.test(line));
    const firstSpecialIndex = lines.findIndex((line) => /^[A-F][.)]\s*/i.test(line)
        || /^(Đáp án|Dap an|Answer|Giải thích|Giai thich|Lời giải|Loi giai|Điểm|Diem|Độ khó|Do kho|Môn|Mon)\s*:/i.test(line));
    const questionText = lines.slice(0, firstSpecialIndex < 0 ? lines.length : firstSpecialIndex).join(' ').trim();
    const options = optionLines.map((line) => line.replace(/^[A-F][.)]\s*/i, '').trim());
    const rawAnswer = answerLine?.split(':').slice(1).join(':').trim() || '';
    const explanation = explanationLine?.split(':').slice(1).join(':').trim() || undefined;
    const difficultyValue = Number(fieldValue(lines, /^(Độ khó|Do kho|Difficulty)\s*:/i));
    const pointsValue = Number(fieldValue(lines, /^(Điểm|Diem|Points?)\s*:/i)?.replace(',', '.'));
    const subject = fieldValue(lines, /^(Môn|Mon|Subject)\s*:/i);
    const answerTokens = rawAnswer.split(/[;,]/).map((token) => token.trim()).filter(Boolean);
    const normalizedAnswerTokens = answerTokens.map((token) => {
        const direct = token.toUpperCase();
        if (/^[A-F]$/.test(direct)) return direct;
        const optionIndex = options.findIndex((option) => option.toLocaleLowerCase('vi') === token.toLocaleLowerCase('vi'));
        return optionIndex >= 0 ? String.fromCharCode(65 + optionIndex) : direct;
    });
    const isMultipleSelect = options.length >= 2 && normalizedAnswerTokens.length > 1;
    const answer = options.length >= 2 ? normalizedAnswerTokens[0] || '' : rawAnswer;
    const issues: string[] = [];

    if (!questionText) issues.push('Thiếu nội dung câu hỏi.');
    if (options.length > 0 && options.length < 2) issues.push('Cần ít nhất hai phương án.');
    if (normalizedAnswerTokens.length === 0) issues.push('Thiếu đáp án đúng.');
    if (options.length > 0 && normalizedAnswerTokens.some((token) => !/^[A-F]$/.test(token) || !options[token.charCodeAt(0) - 65])) {
        issues.push('Đáp án đúng không khớp với phương án hiện có.');
    }

    const type = isMultipleSelect
        ? QuestionType.MULTIPLE_SELECT
        : options.length >= 2
            ? QuestionType.MCQ
            : QuestionType.SHORT_ANSWER;
    const base = {
        id: createId('import-docx-question'),
        question: questionText,
        difficulty: difficultyValue === 2 || difficultyValue === 3 ? difficultyValue : 1,
        points: Number.isFinite(pointsValue) && pointsValue > 0 ? pointsValue : 1,
        explanation,
        subject,
    };
    const question = (type === QuestionType.MULTIPLE_SELECT
        ? { ...base, type, options, correctAnswers: normalizedAnswerTokens }
        : type === QuestionType.MCQ
            ? { ...base, type, options, correctAnswer: answer }
            : { ...base, type, correctAnswer: answer }) as ManualQuizQuestion;

    return {
        id: createId('import-docx-candidate'),
        sourceRow: number,
        sourceLabel: `Câu ${number}`,
        status: !questionText ? 'rejected' : issues.length > 0 ? 'needsReview' : 'accepted',
        issues,
        question,
    };
};

export const parseDocxQuestionText = (rawText: string): QuestionImportResult => {
    const result = createEmptyQuestionImportResult();
    result.metadata = extractDocxMetadata(rawText);
    const blocks = splitQuestionBlocks(rawText);
    if (blocks.length === 0 && rawText.trim()) {
        appendImportCandidate(result, {
            id: createId('import-docx-candidate'),
            sourceRow: 1,
            sourceLabel: 'Nội dung chưa nhận diện',
            status: 'rejected',
            issues: ['Không nhận diện được cấu trúc “Câu 1: …”.'],
            question: {
                id: createId('import-docx-question'),
                type: QuestionType.SHORT_ANSWER,
                question: rawText.trim(),
                correctAnswer: '',
                difficulty: 1,
                points: 1,
            } as ManualQuizQuestion,
        });
        return enforceQuestionImportCount(result);
    }
    blocks.forEach((block) => appendImportCandidate(result, parseBlock(block)));
    return enforceQuestionImportCount(result);
};

const readArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
    return new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error || new Error('Không thể đọc tệp DOCX.'));
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.readAsArrayBuffer(file);
    });
};

export const importQuestionDocx = async (file: File): Promise<QuestionImportResult> => {
    const extension = validateQuestionImportFile(file);
    if (extension !== 'docx') {
        throw new Error('Tệp đã chọn không phải định dạng DOCX.');
    }
    const arrayBuffer = await readArrayBuffer(file);
    const runtimeBuffer = (globalThis as typeof globalThis & {
        Buffer?: { from(value: ArrayBuffer): unknown };
    }).Buffer;
    const source = runtimeBuffer
        ? { buffer: runtimeBuffer.from(arrayBuffer) }
        : { arrayBuffer };
    const extracted = await mammoth.extractRawText(source as Parameters<typeof mammoth.extractRawText>[0]);
    const result = parseDocxQuestionText(extracted.value);
    if (extracted.messages.length > 0) {
        result.warnings.push(...extracted.messages.map((message) => `DOCX: ${message.message}`));
    }
    return result;
};
