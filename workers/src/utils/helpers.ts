// Shared helpers for Workers API routes
// Extracted from legacy GAS compatibility handler

import { jsonResponse } from './response';

// ============ Map question data for D1 insert ============
export function mapQuestionForSave(q: any, quizId: string): any[] {
    let options = '';
    let items = '';
    let textField = '';
    let blanksField = '';
    let distractorsField = '';
    let sentenceField = '';
    let wordsField = '';
    let correctWordIndexesField = '';
    const imageField = q.image || '';

    if (q.type === 'MCQ') {
        options = (q.options || []).join('|');
    } else if (q.type === 'IMAGE_QUESTION') {
        options = (q.options || []).join('|');
        distractorsField = JSON.stringify(q.optionImages || []);
    } else if (q.type === 'TRUE_FALSE') {
        items = JSON.stringify(q.items || []);
    } else if (q.type === 'MATCHING') {
        items = JSON.stringify(q.pairs || []);
    } else if (q.type === 'MULTIPLE_SELECT') {
        options = (q.options || []).join('|');
    } else if (q.type === 'DRAG_DROP' || q.type === 'DROPDOWN') {
        textField = q.text || '';
        blanksField = JSON.stringify(q.blanks || []);
        distractorsField = JSON.stringify(q.distractors || []);
    } else if (q.type === 'CATEGORIZATION') {
        items = JSON.stringify(q.items || []);
        distractorsField = JSON.stringify(q.categories || []);
    } else if (q.type === 'ORDERING') {
        items = JSON.stringify(q.items || []);
        q.correctAnswer = JSON.stringify(q.correctOrder || []);
    } else if (q.type === 'UNDERLINE') {
        items = JSON.stringify(q.words || []);
        q.correctAnswer = JSON.stringify(q.correctWordIndexes || []);
        sentenceField = q.sentence || q.hint || '';
        wordsField = JSON.stringify(q.words || []);
        correctWordIndexesField = JSON.stringify(q.correctWordIndexes || []);
    } else if (q.type === 'RIDDLE') {
        items = JSON.stringify(q.items || q.riddleLines || []);
        textField = q.text || q.answerLabel || '';
        sentenceField = q.sentence || q.hint || '';
    } else if (q.type === 'WORD_SCRAMBLE') {
        items = JSON.stringify(q.letters || []);
        textField = q.text || q.hint || '';
        q.correctAnswer = q.correctWord || q.correctAnswer || '';
    } else if (q.type === 'ERROR_CORRECTION') {
        textField = q.text || q.passage || '';
        distractorsField = q.wrongWord || q.distractors || '';
        q.correctAnswer = q.correctWord || q.correctAnswer || '';
    }

    const correctAnswer = q.type === 'MULTIPLE_SELECT'
        ? JSON.stringify(q.correctAnswers || [])
        : (q.correctAnswer || '');

    const questionText = q.type === 'TRUE_FALSE' ? q.mainQuestion : q.question;

    const result = [
        q.id, quizId, q.type, questionText || '', options, correctAnswer,
        items, textField, blanksField, distractorsField, sentenceField,
        wordsField, correctWordIndexesField, imageField,
    ];

    // Ensure no undefined/null values are sent to D1 bind, which causes silent drops/throws
    return result.map(v => (v === undefined || v === null) ? '' : String(v));
}

// ============ Map assignment from DB row ============
export function mapAssignment(a: any): any {
    return {
        id: a.id, quizId: a.quiz_id, classId: a.class_id,
        studentId: a.student_id || '', deadline: a.deadline,
        maxAttempts: Number(a.max_attempts) || 1, status: a.status,
        createdAt: a.created_at,
    };
}

export function mapAssignments(rows: any[]): any[] {
    return rows.map(mapAssignment);
}

// ============ SHA-256 hash helper ============
export async function hashSHA256(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(input));
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============ Map pet data from DB row ============
export function mapPetData(pet: any): any {
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
export function mapShopItem(i: any): any {
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
export async function handleValidateAnswers(db: D1Database, body: any): Promise<Response> {
    const quizId = body.quizId;
    const studentAnswers = body.answers || {};

    const questions = await db.prepare('SELECT * FROM questions WHERE quiz_id = ?').bind(quizId).all();
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

        if (qType === 'MCQ' || qType === 'SHORT_ANSWER' || qType === 'IMAGE_QUESTION') {
            if (qType === 'SHORT_ANSWER') {
                isCorrect = String(studentAnswer || '').trim().toLowerCase() === String(correctAnswer || '').trim().toLowerCase();
            } else {
                let normalizedCorrect = String(correctAnswer || '').trim().toUpperCase();
                const normalizedStudent = String(studentAnswer || '').trim().toUpperCase();
                const letterMatch = normalizedCorrect.match(/^([A-Z])[.)]\s*/);
                if (letterMatch) normalizedCorrect = letterMatch[1];
                isCorrect = normalizedStudent === normalizedCorrect;
            }
        } else if (qType === 'MULTIPLE_SELECT') {
            try {
                const correct = JSON.parse(correctAnswer);
                const student = Array.isArray(studentAnswer) ? studentAnswer : [];
                isCorrect = correct.length === student.length && correct.every((a: string) => student.includes(a));
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
                const pairs = JSON.parse(items);
                const studentPairs = studentAnswer || {};
                isCorrect = pairs.every((pair: any) => studentPairs[pair.left] === pair.right);
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
        details.push({ questionId: qId, isCorrect, correctAnswer });
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
