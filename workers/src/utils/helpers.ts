// Shared helpers for Workers API routes
// Shared Worker route helpers

import { jsonResponse } from './response';
import { Question, Assignment, PetData, ShopItem, ResultRow } from '../types';
import { CURRENT_MATH_FORMAT_VERSION, prepareIncomingQuestion } from '../services/questionMath';

// ============ Map question data for D1 insert ============
export function mapQuestionForSave(q: Partial<Question> & { type: string }, quizId: string): string[] {
    const normalizedQuestion = prepareIncomingQuestion(q) as Partial<Question> & { type: string };
    let options = '';
    let items = '';
    let textField = '';
    let blanksField = '';
    let distractorsField = '';
    let sentenceField = '';
    let wordsField = '';
    let correctWordIndexesField = '';
    const imageField = normalizedQuestion.image || '';

    // Legacy object mapping to strings after server-owned normalization/validation.
    const anyQ = normalizedQuestion as any;

    if (normalizedQuestion.type === 'MCQ') {
        options = (anyQ.options || []).join('|');
    } else if (normalizedQuestion.type === 'IMAGE_QUESTION') {
        options = (anyQ.options || []).join('|');
        distractorsField = JSON.stringify(anyQ.optionImages || []);
    } else if (normalizedQuestion.type === 'TRUE_FALSE') {
        items = JSON.stringify(anyQ.items || []);
    } else if (normalizedQuestion.type === 'MATCHING') {
        items = JSON.stringify(anyQ.pairs || []);
    } else if (normalizedQuestion.type === 'MULTIPLE_SELECT') {
        options = (anyQ.options || []).join('|');
    } else if (normalizedQuestion.type === 'DRAG_DROP' || normalizedQuestion.type === 'DROPDOWN') {
        textField = anyQ.text || '';
        blanksField = JSON.stringify(anyQ.blanks || []);
        distractorsField = JSON.stringify(anyQ.distractors || []);
    } else if (normalizedQuestion.type === 'CATEGORIZATION') {
        items = JSON.stringify(anyQ.items || []);
        distractorsField = JSON.stringify(anyQ.categories || []);
    } else if (normalizedQuestion.type === 'ORDERING') {
        items = JSON.stringify(anyQ.items || []);
        anyQ.correctAnswer = JSON.stringify(anyQ.correctOrder || []);
    } else if (normalizedQuestion.type === 'UNDERLINE') {
        items = JSON.stringify(anyQ.words || []);
        anyQ.correctAnswer = JSON.stringify(anyQ.correctWordIndexes || []);
        sentenceField = anyQ.sentence || anyQ.hint || '';
        wordsField = JSON.stringify(anyQ.words || []);
        correctWordIndexesField = JSON.stringify(anyQ.correctWordIndexes || []);
    } else if (normalizedQuestion.type === 'RIDDLE') {
        items = JSON.stringify(anyQ.items || anyQ.riddleLines || []);
        textField = anyQ.text || anyQ.answerLabel || '';
        sentenceField = anyQ.sentence || anyQ.hint || '';
    } else if (normalizedQuestion.type === 'WORD_SCRAMBLE') {
        items = JSON.stringify(anyQ.letters || []);
        textField = anyQ.text || anyQ.hint || '';
        anyQ.correctAnswer = anyQ.correctWord || anyQ.correctAnswer || '';
    } else if (normalizedQuestion.type === 'ERROR_CORRECTION') {
        textField = anyQ.text || anyQ.passage || '';
        distractorsField = anyQ.wrongWord || anyQ.distractors || '';
        anyQ.correctAnswer = anyQ.correctWord || anyQ.correctAnswer || '';
    }

    const correctAnswer = normalizedQuestion.type === 'MULTIPLE_SELECT'
        ? JSON.stringify(anyQ.correctAnswers || anyQ.correctAnswer || [])
        : (anyQ.correctAnswer || normalizedQuestion.correct_answer || '');

    const questionText = normalizedQuestion.type === 'TRUE_FALSE'
        ? (anyQ.mainQuestion || normalizedQuestion.question || anyQ.question)
        : (normalizedQuestion.question || anyQ.question);

    let tagsField = '';
    if (Array.isArray(normalizedQuestion.tags)) {
        tagsField = normalizedQuestion.tags.join(',');
    } else if (typeof normalizedQuestion.tags === 'string') {
        tagsField = normalizedQuestion.tags;
    }

    const subjectField = String((anyQ.subject ?? anyQ.subject_code ?? '') || '');
    const skillCodeField = String((anyQ.skillCode ?? anyQ.skill_code ?? '') || '');
    const subskillCodeField = String((anyQ.subskillCode ?? anyQ.subskill_code ?? '') || '');
    const rawDifficulty = Number(anyQ.difficulty ?? anyQ.difficulty_level ?? anyQ.difficultyLevel);
    const difficultyField = rawDifficulty === 1 || rawDifficulty === 2 || rawDifficulty === 3
        ? rawDifficulty
        : '';
    const rawPoints = Number(anyQ.points);
    const pointsField = Number.isFinite(rawPoints) && rawPoints >= 0 ? rawPoints : '';
    const explanationField = typeof anyQ.explanation === 'string' ? anyQ.explanation : '';
    const imageAltField = typeof anyQ.imageAlt === 'string'
        ? anyQ.imageAlt
        : (typeof anyQ.image_alt === 'string' ? anyQ.image_alt : '');
    const normalizeRichContent = (value: unknown, fallback: string): string => {
        let candidate = value;
        if (typeof candidate === 'string') {
            try { candidate = JSON.parse(candidate); } catch { candidate = null; }
        }
        if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return '';
        const record = candidate as Record<string, unknown>;
        if (record.version !== 1 || !Array.isArray(record.blocks) || record.blocks.length > 100) return '';
        const blocks = record.blocks.map((block, index) => {
            if (!block || typeof block !== 'object' || Array.isArray(block)) return null;
            const source = block as Record<string, unknown>;
            const type = source.type === 'bulletList' || source.type === 'orderedList' ? source.type : 'paragraph';
            const align = source.align === 'center' || source.align === 'right' || source.align === 'justify' ? source.align : 'left';
            const children = Array.isArray(source.children) ? source.children.slice(0, 500).map((child) => {
                if (!child || typeof child !== 'object' || Array.isArray(child)) return null;
                const item = child as Record<string, unknown>;
                if (item.type === 'lineBreak') return { type: 'lineBreak' };
                if (item.type === 'math' && typeof item.latex === 'string') return { type: 'math', latex: item.latex.slice(0, 4000) };
                if (item.type === 'text' && typeof item.text === 'string') return {
                    type: 'text', text: item.text.slice(0, 10000),
                    ...(item.bold ? { bold: true } : {}), ...(item.italic ? { italic: true } : {}), ...(item.underline ? { underline: true } : {}),
                };
                return null;
            }).filter(Boolean) : [];
            return { id: typeof source.id === 'string' ? source.id.slice(0, 120) : `rt-block-${index}`, type, align, children };
        }).filter(Boolean);
        if (!blocks.length) return '';
        return JSON.stringify({ version: 1, blocks });
    };
    const questionContentField = normalizeRichContent(anyQ.questionContent ?? anyQ.question_content_json, questionText || '');
    const explanationContentField = normalizeRichContent(anyQ.explanationContent ?? anyQ.explanation_content_json, explanationField);

    const result = [
        normalizedQuestion.id || '', quizId, normalizedQuestion.type, questionText || '', options, correctAnswer,
        items, textField, blanksField, distractorsField, sentenceField,
        wordsField, correctWordIndexesField, imageField, tagsField,
        subjectField, skillCodeField, subskillCodeField, difficultyField,
        CURRENT_MATH_FORMAT_VERSION, pointsField, explanationField, imageAltField,
        questionContentField, explanationContentField,
    ];

    return result.map(v => (v === undefined || v === null) ? '' : String(v));
}

// ============ Map assignment from DB row ============
export function mapAssignment(a: Assignment): any {
    return {
        id: a.id, quizId: a.quiz_id, classId: a.class_id,
        studentId: a.student_id || '', deadline: a.deadline,
        maxAttempts: Number(a.max_attempts) || 1, status: a.status,
        createdAt: a.created_at,
    };
}

export function mapAssignments(rows: Assignment[]): any[] {
    return rows.map(mapAssignment);
}

// ============ SHA-256 hash helper ============
export async function hashSHA256(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(input));
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============ Map pet data from DB row ============
export function mapPetData(pet: PetData): any {
    return {
        petId: pet.pet_id,
        petName: pet.pet_name,
        level: Number(pet.level) || 1,
        exp: Number(pet.exp) || 0,
        expToNext: Number(pet.exp_to_next) || 100,
        mood: pet.mood || 'happy',
        items: typeof pet.items === 'string' ? JSON.parse(pet.items) : [],
        lastActive: pet.last_active || '',
        imageUrl: pet.image_url || '',
    };
}

// ============ Map shop item from DB row ============
export function mapShopItem(i: ShopItem): any {
    return {
        itemId: i.item_id,
        name: i.name,
        price: Number(i.price) || 0,
        type: i.type || 'ACCESSORY',
        category: i.category || '',
        assetUrl: i.asset_url || '',
    };
}


// ============ VALIDATE ANSWERS (Server-side anti-cheat) ============
export async function handleValidateAnswers(
    db: D1Database,
    body: any,
    options: { includeCorrectAnswers?: boolean; questionIds?: string[] } = {},
): Promise<Response> {
    const quizId = body.quizId;
    const studentAnswers = body.answers || {};
    const isSkippedAnswer = (value: any): boolean => (
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0)
    );

    const questionIds = options.questionIds;
    const questions = questionIds
        ? await db.prepare(
            `SELECT * FROM questions WHERE id IN (${questionIds.map(() => '?').join(', ')})`
        ).bind(...questionIds).all()
        : await db.prepare('SELECT * FROM questions WHERE quiz_id = ?').bind(quizId).all();
    if (questions.results.length === 0) {
        return jsonResponse({ status: 'error', message: 'No questions found for quiz: ' + quizId });
    }

    let correctCount = 0;
    const details: any[] = [];

    for (const row of questions.results as any[]) {
        const qId = row.id;
        const qType = row.type;
        const correctAnswer = row.correct_answer;
        const items = row.items;
        const distractors = row.distractors;
        const studentAnswer = studentAnswers[qId];
        let isCorrect = false;

        // 🛡️ Guard: A skipped answer is ALWAYS wrong, even if the correct answer in DB is empty
        const isSkipped = isSkippedAnswer(studentAnswer);

        if (isSkipped) {
            isCorrect = false;
        } else if (qType === 'MCQ' || qType === 'SHORT_ANSWER' || qType === 'IMAGE_QUESTION') {
            if (qType === 'SHORT_ANSWER') {
                const cleanStudent = String(studentAnswer || '').trim().replace(/^'/, '').toLowerCase();
                const cleanCorrect = String(correctAnswer || '').trim().replace(/^'/, '').toLowerCase();
                // Support multiple correct answers separated by |
                const correctOptions = cleanCorrect.split('|').map(s => s.trim());
                isCorrect = correctOptions.includes(cleanStudent);
            } else {
                let normalizedCorrect = String(correctAnswer || '').trim().toUpperCase();
                const normalizedStudent = String(studentAnswer || '').trim().toUpperCase();
                const letterMatch = normalizedCorrect.match(/^([A-Z])[.)]\s*/);
                if (letterMatch) normalizedCorrect = letterMatch[1];
                isCorrect = normalizedStudent === normalizedCorrect;
            }
        } else if (qType === 'MULTIPLE_SELECT') {
            try {
                let correctRaw: any[] = [];
                const normalizedCorrectAnswer = String(correctAnswer || '').trim();

                if (normalizedCorrectAnswer.startsWith('[') && normalizedCorrectAnswer.endsWith(']')) {
                    const parsed = JSON.parse(normalizedCorrectAnswer);
                    correctRaw = Array.isArray(parsed) ? parsed : [];
                } else {
                    // Fallback for pipe-separated format (A|B|C)
                    correctRaw = normalizedCorrectAnswer.split('|');
                }

                const normalizeChoices = (values: any[]): string[] => (
                    Array.from(
                        new Set(
                            values
                                .map((v: any) => String(v ?? '').trim().toUpperCase())
                                .filter(Boolean)
                        )
                    ).sort()
                );

                const correct = normalizeChoices(correctRaw);
                const student = normalizeChoices(Array.isArray(studentAnswer) ? studentAnswer : []);
                isCorrect = correct.length > 0 &&
                    student.length > 0 &&
                    correct.length === student.length &&
                    correct.every((choice, idx) => choice === student[idx]);
            } catch { isCorrect = false; }
        } else if (qType === 'TRUE_FALSE') {
            try {
                const itemsData = JSON.parse(items);
                const studentItems = studentAnswer || {};
                isCorrect = itemsData.every((item: any, i: number) => {
                    const itemId = item.id || ('item-' + i);
                    return String(studentItems[itemId]) === String(item.isCorrect);
                });
            } catch { isCorrect = false; }
        } else if (qType === 'MATCHING') {
            try {
                const storedPairs = JSON.parse(row.pairs || '[]');
                const pairs = Array.isArray(storedPairs) && storedPairs.length > 0
                    ? storedPairs
                    : JSON.parse(items || '[]');
                const studentPairs = studentAnswer || {};
                const pairId = (value: any, index: number, side: 'left' | 'right') => (
                    String(value && typeof value === 'object'
                        ? (value.id ?? value.key ?? `${side}-${index + 1}`)
                        : (value ?? ''))
                );
                isCorrect = pairs.length > 0 && pairs.every((pair: any, index: number) => (
                    studentPairs[pairId(pair.left, index, 'left')] === pairId(pair.right, index, 'right')
                ));
            } catch { isCorrect = false; }
        } else if (qType === 'ORDERING') {
            try {
                const correctOrder = JSON.parse(correctAnswer);
                isCorrect = JSON.stringify(studentAnswer) === JSON.stringify(correctOrder);
            } catch { isCorrect = false; }
        } else if (qType === 'DRAG_DROP' || qType === 'DROPDOWN') {
            try {
                const blanks = JSON.parse(row.blanks);
                let studentBlanks = studentAnswer || [];
                if (qType === 'DRAG_DROP' && !Array.isArray(studentAnswer) && typeof studentAnswer === 'object' && studentAnswer !== null) {
                    const sortedKeys = Object.keys(studentAnswer).sort((a, b) => Number(a) - Number(b));
                    studentBlanks = sortedKeys.map(k => studentAnswer[k]);
                }
                if (qType === 'DRAG_DROP') {
                    const sArr = Array.isArray(studentBlanks) ? studentBlanks : [];
                    isCorrect = blanks.length === sArr.length && blanks.every((b: string, i: number) => String(b).trim().toLowerCase() === String(sArr[i] || '').trim().toLowerCase());
                } else {
                    isCorrect = blanks.every((blank: any) => String(studentAnswer[blank.id] || '').trim().toLowerCase() === String(blank.correctAnswer || '').trim().toLowerCase());
                }
            } catch { isCorrect = false; }
        } else if (qType === 'CATEGORIZATION') {
            try {
                const itemsData = JSON.parse(items || '[]');
                const sAns = studentAnswer || {};
                isCorrect = itemsData.length > 0 && itemsData.every((item: any) => !item.categoryId || sAns[item.id] === item.categoryId);
            } catch { isCorrect = false; }
        } else if (qType === 'UNDERLINE') {
            try {
                const correctIndexes = JSON.parse(correctAnswer || '[]');
                const studentIndexes = Array.isArray(studentAnswer) ? studentAnswer : [];
                const sortedCorrect = [...correctIndexes].sort((a: number, b: number) => a - b);
                const sortedStudent = [...studentIndexes].sort((a: number, b: number) => a - b);
                isCorrect = sortedCorrect.length === sortedStudent.length && sortedCorrect.every((idx: number, i: number) => idx === sortedStudent[i]);
            } catch { isCorrect = false; }
        } else if (qType === 'WORD_SCRAMBLE') {
            try {
                const letters = JSON.parse(items || '[]');
                const studentIdxArr = Array.isArray(studentAnswer) ? studentAnswer : [];
                const studentWord = studentIdxArr.map((idx: number) => letters[idx] || '').join('');
                isCorrect = studentWord.trim().toLowerCase().replace(/\s+/g, '') === String(correctAnswer).trim().toLowerCase().replace(/\s+/g, '');
            } catch { isCorrect = false; }
        } else if (qType === 'RIDDLE') {
            isCorrect = String(studentAnswer || '').trim().toLowerCase() === String(correctAnswer || '').trim().toLowerCase();
        } else if (qType === 'ERROR_CORRECTION') {
            try {
                const ecStudentWrong = String((studentAnswer?.wrongWord) || '').trim().toLowerCase();
                const ecStudentCorrect = String((studentAnswer?.correctWord) || '').trim().toLowerCase();
                isCorrect = ecStudentWrong === String(distractors || '').trim().toLowerCase() && ecStudentCorrect === String(correctAnswer || '').trim().toLowerCase();
            } catch { isCorrect = false; }
        }

        if (isCorrect) correctCount++;
        const detail: Record<string, any> = { questionId: qId, isCorrect };
        if (options.includeCorrectAnswers) {
            detail.correctAnswer = String(correctAnswer || '').replace(/^'/, '');
        }
        details.push(detail);
    }

    const total = questions.results.length;
    const score = total > 0 ? Math.round((correctCount / total) * 10 * 10) / 10 : 0;

    return jsonResponse({ status: 'success', score, correctCount, total, details });
}

// ============ Parse request body ============
export async function parseBody(request: Request): Promise<any> {
    try {
        const text = await request.text();
        return JSON.parse(text);
    } catch {
        return null;
    }
}

// ============ Extract ID from path ============
// e.g. /api/quizzes/quiz-123 -> "quiz-123"
export function extractIdFromPath(path: string, prefix: string): string {
    const remaining = path.replace(prefix, '');
    // Remove leading slash and any trailing segments
    const parts = remaining.replace(/^\//, '').split('/');
    return parts[0] || '';
}
