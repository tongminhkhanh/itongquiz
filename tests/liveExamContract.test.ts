import { describe, expect, it, vi } from 'vitest';
import type { JWTPayload } from '../workers/src/utils/jwt';

let currentUser: JWTPayload = { id: 'teacher-a', username: 'teacher-a', role: 'teacher' };
vi.mock('../workers/src/middleware/jwtAuth', () => ({
  verifyJWTMiddleware: vi.fn(async () => ({ user: currentUser })),
  requireTeacher: vi.fn((user: JWTPayload) => user.role === 'teacher' || user.role === 'admin'),
  isStudent: vi.fn((user: JWTPayload) => user.role === 'student'),
}));

import * as LiveExamService from '../workers/src/services/liveExamService';
import { handleLiveExamRoutes } from '../workers/src/routes/liveExam';

class ContractStatement {
  bind() { return this; }
  async first() { return null; }
  async all() { return { results: [] }; }
  async run() { return { success: true, meta: { changes: 1 } }; }
}

const contractDb = {
  prepare: () => new ContractStatement(),
  batch: async () => [],
};

const endpointCases = [
  ['POST', '/api/live-exam/create', 'teacher'],
  ['GET', '/api/live-exam/live-1', 'teacher'],
  ['POST', '/api/live-exam/live-1/control', 'teacher'],
  ['DELETE', '/api/live-exam/live-1', 'teacher'],
  ['GET', '/api/live-exam/live-1/participants', 'teacher'],
  ['POST', '/api/live-exam/join', 'student'],
  ['GET', '/api/live-exam/live-1/status', 'student'],
  ['POST', '/api/live-exam/live-1/submit', 'student'],
  ['POST', '/api/live-exam/live-1/activity', 'student'],
  ['GET', '/api/live-exam/live-1/results', 'student'],
  ['GET', '/api/live-exam/live-1/chat', 'student'],
  ['POST', '/api/live-exam/live-1/chat/message', 'student'],
  ['POST', '/api/live-exam/live-1/chat/announcement', 'teacher'],
  ['PUT', '/api/live-exam/live-1/chat/settings', 'teacher'],
  ['PUT', '/api/live-exam/live-1/chat/message-1/hide', 'teacher'],
  ['GET', '/api/live-exam/teacher/teacher-a/sessions', 'teacher'],
  ['GET', '/api/live-exam/live-1/analytics', 'teacher'],
  ['POST', '/api/live-exam/live-1/track-timing', 'student'],
] as const;

describe('live exam public contracts', () => {
  it.each(endpointCases)('dispatches %s %s', async (method, path, role) => {
    currentUser = role === 'student'
      ? { id: 'student-a', username: 'student-a', role: 'student' }
      : { id: 'teacher-a', username: 'teacher-a', role: 'teacher' };
    const request = new Request(`https://test${path}`, {
      method,
      headers: method === 'GET' || method === 'DELETE' ? undefined : { 'Content-Type': 'application/json' },
      body: method === 'GET' || method === 'DELETE' ? undefined : '{}',
    });

    const response = await handleLiveExamRoutes(
      request,
      { DB: contractDb, JWT_SECRET: 'test' } as any,
      path,
      method,
    );
    const payload = await response.json() as { message?: string };

    expect(payload.message).not.toBe('Live Exam endpoint not found');
  });

  it('keeps the service barrel runtime API stable', () => {
    expect(Object.keys(LiveExamService).sort()).toEqual([
      'LiveExamServiceError',
      'calculateScoresAndClose',
      'checkAndAutoCloseExpiredExams',
      'createLiveExam',
      'createWaitingRoomChatMessage',
      'deleteLiveExam',
      'endExamEarly',
      'generateAccessCode',
      'getLiveExamByAccessCode',
      'getLiveExamById',
      'getParticipants',
      'getWaitingRoomChat',
      'hideWaitingRoomChatMessage',
      'joinSession',
      'markInactiveParticipants',
      'openSession',
      'startExam',
      'submitAnswers',
      'updateActivity',
      'updateWaitingRoomChatEnabled',
    ]);
  });
});
