import { describe, expect, it } from 'vitest';
import type { Env, Question } from '../workers/src/types';
import {
    buildResultSkillBreakdownFromData,
    buildWeaknessProfileFromData,
    type ResultRowWithAnswers,
} from '../workers/src/services/weaknessProfile';
import { handleResultRoutes } from '../workers/src/routes/results';

function createAnswerEntry(selectedAnswer: any, isCorrect: boolean, questionSnapshot?: Record<string, any>) {
    return {
        selectedAnswer,
        isCorrect,
        ...(questionSnapshot ? { questionSnapshot } : {}),
    };
}

function createResult(overrides: Partial<ResultRowWithAnswers>): ResultRowWithAnswers {
    return {
        id: 1,
        student_name: 'Lan',
        class_name: '2A',
        quiz_id: 'quiz-math',
        quiz_title: 'Quiz',
        score: 7,
        correct_count: 7,
        total_questions: 10,
        time_taken: 12,
        submitted_at: '2026-04-21T10:00:00.000Z',
        answers: '{}',
        ...overrides,
    };
}

function createQuestion(overrides: Partial<Question>): Question {
    return {
        id: 'q1',
        quiz_id: 'quiz-math',
        type: 'MCQ',
        question: 'Question',
        correct_answer: 'A',
        options: 'A|B|C|D',
        items: '',
        text_field: '',
        blanks: '',
        distractors: '',
        sentence: '',
        words: '',
        correct_word_indexes: '',
        image: '',
        tags: '',
        subject: '',
        skill_code: '',
        subskill_code: '',
        ...overrides,
    };
}

function createFakeDb(results: ResultRowWithAnswers[], questions: Question[]) {
    return {
        prepare(query: string) {
            return {
                bind(...params: any[]) {
                    return {
                        async first<T>() {
                            if (query.includes('FROM results WHERE id = ?')) {
                                return (results.find((result) => String(result.id) === String(params[0])) || null) as T;
                            }
                            throw new Error(`Unhandled first query: ${query}`);
                        },
                        async all<T>() {
                            if (query.includes('FROM results') && query.includes('student_name = ? AND class_name = ?')) {
                                const [studentName, className] = params;
                                const filtered = results
                                    .filter((result) => result.student_name === studentName && result.class_name === className)
                                    .sort((left, right) => right.submitted_at.localeCompare(left.submitted_at))
                                    .slice(0, 5);

                                return { results: filtered as T[] };
                            }

                            if (query.includes('FROM questions WHERE quiz_id IN')) {
                                const filtered = questions.filter((question) => params.includes(question.quiz_id));
                                return { results: filtered as T[] };
                            }

                            throw new Error(`Unhandled all query: ${query}`);
                        },
                    };
                },
            };
        },
    } as any;
}

describe('weakness profile analytics', () => {
    it('prefers explicit metadata over tags and reports unclassified coverage', () => {
        const result = createResult({
            answers: JSON.stringify({
                q1: createAnswerEntry('B', false),
                q2: createAnswerEntry('A', true),
                q3: createAnswerEntry('C', false),
            }),
        });

        const questions = [
            createQuestion({
                id: 'q1',
                subject: 'math',
                skill_code: 'phan_so',
                tags: '#ngu_phap,#tieng_viet',
            }),
            createQuestion({
                id: 'q2',
                quiz_id: 'quiz-tv',
                subject: '',
                skill_code: '',
                tags: '#ngu_phap,#tieng_viet',
            }),
            createQuestion({
                id: 'q3',
                quiz_id: 'quiz-tv',
                subject: '',
                skill_code: '',
                tags: '#gia_dinh,#trang_nguyen',
            }),
        ];

        const breakdown = buildResultSkillBreakdownFromData(result, questions);
        const allSkills = breakdown.subjects.flatMap((subject) => subject.skills);

        expect(allSkills).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ subject: 'math', skillCode: 'phan_so' }),
                expect.objectContaining({ subject: 'vietnamese', skillCode: 'luyen_tu_va_cau' }),
            ]),
        );
        expect(breakdown.unclassifiedQuestionCount).toBe(1);
        expect(breakdown.coveragePercent).toBe(67);
    });

    it('aggregates up to five recent results by student_name + class_name and applies status rules', () => {
        const baseResult = createResult({
            id: 100,
            quiz_id: 'quiz-math',
            submitted_at: '2026-04-21T10:00:00.000Z',
            answers: JSON.stringify({
                q_math_1: createAnswerEntry('B', false),
                q_tv_1: createAnswerEntry('A', true),
            }),
        });

        const recentResults = [
            baseResult,
            createResult({
                id: 101,
                quiz_id: 'quiz-math',
                submitted_at: '2026-04-20T10:00:00.000Z',
                answers: JSON.stringify({
                    q_math_2: createAnswerEntry('B', false),
                    q_tv_2: createAnswerEntry('B', false),
                }),
            }),
            createResult({
                id: 102,
                quiz_id: 'quiz-math',
                submitted_at: '2026-04-19T10:00:00.000Z',
                answers: JSON.stringify({
                    q_math_3: createAnswerEntry('A', true),
                }),
            }),
            createResult({
                id: 103,
                quiz_id: 'quiz-math',
                submitted_at: '2026-04-18T10:00:00.000Z',
                answers: JSON.stringify({
                    q_tv_3: createAnswerEntry('A', true),
                }),
            }),
            createResult({
                id: 104,
                quiz_id: 'quiz-math',
                submitted_at: '2026-04-17T10:00:00.000Z',
                answers: JSON.stringify({
                    q_tv_4: createAnswerEntry('A', true),
                }),
            }),
            createResult({
                id: 105,
                quiz_id: 'quiz-math',
                submitted_at: '2026-04-16T10:00:00.000Z',
                answers: JSON.stringify({
                    q_math_4: createAnswerEntry('B', false),
                }),
            }),
            createResult({
                id: 106,
                class_name: '2B',
                quiz_id: 'quiz-math',
                submitted_at: '2026-04-21T11:00:00.000Z',
                answers: JSON.stringify({
                    q_math_5: createAnswerEntry('B', false),
                }),
            }),
        ];

        const questions = [
            createQuestion({ id: 'q_math_1', subject: 'math', skill_code: 'phan_so', quiz_id: 'quiz-math' }),
            createQuestion({ id: 'q_math_2', subject: 'math', skill_code: 'phan_so', quiz_id: 'quiz-math' }),
            createQuestion({ id: 'q_math_3', subject: 'math', skill_code: 'phan_so', quiz_id: 'quiz-math' }),
            createQuestion({ id: 'q_math_4', subject: 'math', skill_code: 'phan_so', quiz_id: 'quiz-math' }),
            createQuestion({ id: 'q_math_5', subject: 'math', skill_code: 'phan_so', quiz_id: 'quiz-math' }),
            createQuestion({ id: 'q_tv_1', quiz_id: 'quiz-tv', subject: '', skill_code: '', tags: '#ngu_phap,#tieng_viet' }),
            createQuestion({ id: 'q_tv_2', quiz_id: 'quiz-tv', subject: '', skill_code: '', tags: '#ngu_phap,#tieng_viet' }),
            createQuestion({ id: 'q_tv_3', quiz_id: 'quiz-tv', subject: '', skill_code: '', tags: '#ngu_phap,#tieng_viet' }),
            createQuestion({ id: 'q_tv_4', quiz_id: 'quiz-tv', subject: '', skill_code: '', tags: '#ngu_phap,#tieng_viet' }),
        ];

        const profile = buildWeaknessProfileFromData(baseResult, recentResults.slice(0, 5), questions);
        const flatSkills = profile.subjects.flatMap((subject) => subject.skills);
        const mathSkill = flatSkills.find((skill) => skill.skillCode === 'phan_so');
        const tvSkill = flatSkills.find((skill) => skill.skillCode === 'luyen_tu_va_cau');

        expect(profile.basedOnResultIds).toEqual(['100', '101', '102', '103', '104']);
        expect(mathSkill).toEqual(expect.objectContaining({
            attempted: 3,
            correct: 1,
            wrong: 2,
            accuracy: 33,
            status: 'weak',
        }));
        expect(tvSkill).toEqual(expect.objectContaining({
            attempted: 4,
            correct: 3,
            wrong: 1,
            accuracy: 75,
            status: 'stable',
        }));
    });

    it('serves new result analytics endpoints and returns 404 for missing results', async () => {
        const result = createResult({
            id: 201,
            quiz_id: 'quiz-math',
            answers: JSON.stringify({
                q1: createAnswerEntry('B', false),
                q2: createAnswerEntry('A', true),
            }),
        });

        const additionalResult = createResult({
            id: 202,
            quiz_id: 'quiz-tv',
            submitted_at: '2026-04-20T10:00:00.000Z',
            answers: JSON.stringify({
                q3: createAnswerEntry('B', false),
            }),
        });

        const differentClassResult = createResult({
            id: 203,
            class_name: '3A',
            submitted_at: '2026-04-21T11:00:00.000Z',
            answers: JSON.stringify({
                q4: createAnswerEntry('B', false),
            }),
        });

        const questions = [
            createQuestion({ id: 'q1', subject: 'math', skill_code: 'phan_so', quiz_id: 'quiz-math' }),
            createQuestion({ id: 'q2', subject: 'math', skill_code: 'phan_so', quiz_id: 'quiz-math' }),
            createQuestion({ id: 'q3', quiz_id: 'quiz-tv', subject: '', skill_code: '', tags: '#ngu_phap,#tieng_viet' }),
            createQuestion({ id: 'q4', subject: 'math', skill_code: 'phan_so', quiz_id: 'quiz-math' }),
        ];

        const db = createFakeDb([result, additionalResult, differentClassResult], questions);
        const env: Env = {
            DB: db,
            API_SECRET_TOKEN: 'token',
            CLIPROXY_API: '',
            CLIPROXY_TOKEN: '',
        };

        const breakdownResponse = await handleResultRoutes(
            new Request('https://example.com/api/results/201/skill-breakdown', { method: 'GET' }),
            env,
            '/api/results/201/skill-breakdown',
            'GET',
        );
        const breakdownJson = await breakdownResponse.json() as any;

        expect(breakdownResponse.status).toBe(200);
        expect(breakdownJson.resultId).toBe('201');
        expect(breakdownJson.subjects[0].skills[0]).toEqual(expect.objectContaining({
            skillCode: 'phan_so',
            attempted: 2,
            accuracy: 50,
        }));

        const profileResponse = await handleResultRoutes(
            new Request('https://example.com/api/results/201/weakness-profile', { method: 'GET' }),
            env,
            '/api/results/201/weakness-profile',
            'GET',
        );
        const profileJson = await profileResponse.json() as any;

        expect(profileResponse.status).toBe(200);
        expect(profileJson.studentName).toBe('Lan');
        expect(profileJson.basedOnResultIds).toEqual(['201', '202']);
        expect(profileJson.coveragePercent).toBe(100);

        const missingResponse = await handleResultRoutes(
            new Request('https://example.com/api/results/999/weakness-profile', { method: 'GET' }),
            env,
            '/api/results/999/weakness-profile',
            'GET',
        );
        const missingJson = await missingResponse.json() as any;

        expect(missingResponse.status).toBe(404);
        expect(missingJson.message).toContain('Result not found');
    });
});
