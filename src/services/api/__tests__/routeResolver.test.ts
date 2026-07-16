import { describe, it, expect } from 'vitest';
import { resolveApiRoute } from '../routeResolver';

describe('resolveApiRoute', () => {
    it('resolves login route', () => {
        const r = resolveApiRoute('login');
        expect(r.method).toBe('POST');
        expect(r.path({})).toBe('/api/login');
        expect(r.auth).toBe('session');
    });

    it('resolves get_questions route with query', () => {
        const r = resolveApiRoute('get_questions');
        expect(r.method).toBe('GET');
        expect(r.path({})).toBe('/api/questions');
        expect(r.query?.({ quizId: 'a b' })?.toString()).toBe('quizId=a+b');
    });

    it('resolves delete_quiz without body', () => {
        const r = resolveApiRoute('delete_quiz');
        expect(r.method).toBe('DELETE');
        expect(r.body).toBeUndefined();
    });

    it('resolves update_quiz as PUT', () => {
        const r = resolveApiRoute('update_quiz');
        expect(r.method).toBe('PUT');
        expect(r.path({ id: '123' })).toBe('/api/quizzes/123');
        expect(r.path({ quizId: '456' })).toBe('/api/quizzes/456');
    });

    it('resolves start_assignment_attempt as POST', () => {
        const r = resolveApiRoute('start_assignment_attempt');
        expect(r.method).toBe('POST');
        expect(r.path({ assignmentId: '789' })).toBe('/api/assignments/789/start');
        expect(r.auth).toBe('session');
    });

    it('uses soft archive routes for classes', () => {
        const archive = resolveApiRoute('delete_class');
        expect(archive.method).toBe('PATCH');
        expect(archive.path({ classId: 'lop 5A' })).toBe('/api/classes/lop%205A/archive');
        expect(archive.body?.('delete_class', { classId: 'c1' })).toMatchObject({ archived: true });

        const restore = resolveApiRoute('restore_class');
        expect(restore.method).toBe('PATCH');
        expect(restore.body?.('restore_class', { classId: 'c1' })).toMatchObject({ archived: false });
    });

    it('supports requesting archived classes only when explicitly enabled', () => {
        const route = resolveApiRoute('get_classes');
        expect(route.query?.({})?.toString()).toBe('');
        expect(route.query?.({ includeArchived: true })?.toString()).toBe('includeArchived=true');
    });

    it('resolves get_game_loop_dashboard as GET session', () => {
        const r = resolveApiRoute('get_game_loop_dashboard');
        expect(r.method).toBe('GET');
        expect(r.path({})).toBe('/api/game-loop/dashboard');
        expect(r.auth).toBe('session');
    });

    it('resolves get_gift_shop_orders query params', () => {
        const r = resolveApiRoute('get_gift_shop_orders');
        const qs = r.query?.({ studentId: 's1', classId: 'c1', actorIsAdmin: true })?.toString();
        expect(qs).toContain('studentId=s1');
        expect(qs).toContain('classId=c1');
        expect(qs).toContain('actorIsAdmin=true');
    });

    it('resolves upsert_phieu to /api/gas with GAS body', () => {
        const r = resolveApiRoute('upsert_phieu');
        expect(r.path({})).toBe('/api/gas');
        const body = r.body?.('upsert_phieu', { foo: 'bar' });
        expect(body?.action).toBe('upsert_phieu');
        expect(body?.foo).toBe('bar');
        // Must not mutate original payload
        const orig = { foo: 'bar' };
        r.body?.('upsert_phieu', orig);
        expect(Object.keys(orig)).toEqual(['foo']);
    });

    it('resolves get_public_phieu as public', () => {
        const r = resolveApiRoute('get_public_phieu');
        expect(r.auth).toBe('public');
        expect(r.path({ publicToken: 'tok 1' })).toBe('/api/phieu/public/tok%201');
    });

    it('resolves ai_chat as session', () => {
        const r = resolveApiRoute('ai_chat');
        expect(r.auth).toBe('session');
    });

    it('resolves get_announcement with the public policy', () => {
        const r = resolveApiRoute('get_announcement');
        expect(r.auth).toBe('public');
    });

    it('resolves the admin-only bulk teacher password reset route', () => {
        const r = resolveApiRoute('reset_all_teacher_passwords');
        expect(r.method).toBe('POST');
        expect(r.auth).toBe('session');
        expect(r.path({})).toBe('/api/admin/teachers/reset-passwords');
    });

    it('resolves get_hw_assignments to /api/gas with GAS body', () => {
        const r = resolveApiRoute('get_hw_assignments');
        expect(r.path({})).toBe('/api/gas');
        const body = r.body?.('get_hw_assignments', {});
        expect(body?.action).toBe('get_hw_assignments');
    });

    it('throws on unknown action', () => {
        expect(() => resolveApiRoute('does_not_exist')).toThrow(
            'Unknown API action: does_not_exist',
        );
    });
});
