import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JWTPayload } from '../workers/src/utils/jwt';

let currentUser: JWTPayload;

vi.mock('../workers/src/middleware/jwtAuth', () => ({
  verifyJWTMiddleware: vi.fn(async () => ({ user: currentUser })),
  requireTeacher: vi.fn((user: JWTPayload) => user.role === 'teacher' || user.role === 'admin'),
}));

import {
  handleCertificatePreview,
  handleCreateBatch,
  handleGetCertificateImage,
  handleGetNotifications,
  handleMarkNotificationRead,
} from '../workers/src/routes/certificates';

class FakeStatement {
  readonly sql: string;
  readonly db: FakeDB;
  bindings: unknown[] = [];

  constructor(sql: string, db: FakeDB) {
    this.sql = sql;
    this.db = db;
  }

  bind(...values: unknown[]) {
    this.bindings = values;
    return this;
  }

  first<T>() {
    return Promise.resolve(this.db.first(this.sql, this.bindings) as T | null);
  }

  all<T>() {
    return Promise.resolve({ results: this.db.all(this.sql, this.bindings) as T[] });
  }

  run() {
    this.db.runs.push(this);
    return Promise.resolve({ success: true });
  }
}

class FakeDB {
  statements: FakeStatement[] = [];
  batches: FakeStatement[][] = [];
  runs: FakeStatement[] = [];
  first: (sql: string, bindings: unknown[]) => unknown = () => null;
  all: (sql: string, bindings: unknown[]) => unknown[] = () => [];

  prepare(sql: string) {
    const statement = new FakeStatement(sql, this);
    this.statements.push(statement);
    return statement;
  }

  batch(statements: FakeStatement[]) {
    this.batches.push(statements);
    return Promise.resolve(statements.map(() => ({ success: true })));
  }
}

function requestBody(overrides: Record<string, unknown> = {}) {
  return new Request('https://example.test/api/certificate-batches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request_id: 'request-1',
      template_id: 'template-1',
      title: 'Chứng nhận tháng 7',
      class_id: 'class-1',
      student_ids: ['student-1'],
      ...overrides,
    }),
  });
}

function createEnv(db: FakeDB) {
  return {
    DB: db,
    JWT_SECRET: 'test-secret',
    CERTIFICATE_QUEUE: { send: vi.fn(async () => undefined) },
    CERT_IMAGES: { get: vi.fn(async () => null) },
  } as any;
}

describe('certificate worker authorization and integrity', () => {
  beforeEach(() => {
    currentUser = {
      id: 'teacher-1',
      username: 'teacher-1',
      role: 'teacher',
      school_id: 'teacher-1',
    };
  });

  it('rejects a class owned by another teacher', async () => {
    const db = new FakeDB();
    db.first = (sql) => sql.includes('FROM classes')
      ? { id: 'class-1', name: '5A', teacher_username: 'teacher-2' }
      : null;

    const response = await handleCreateBatch(requestBody(), createEnv(db));

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: 'CERTIFICATE_CLASS_FORBIDDEN' },
    });
    expect(db.batches).toHaveLength(0);
  });

  it('rejects malformed student_ids before querying D1', async () => {
    const db = new FakeDB();

    const response = await handleCreateBatch(
      requestBody({ student_ids: 'student-1' }),
      createEnv(db),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: 'CERTIFICATE_VALIDATION_ERROR' },
    });
    expect(db.statements).toHaveLength(0);
  });

  it('rejects students outside the selected class', async () => {
    const db = new FakeDB();
    db.first = (sql) => sql.includes('FROM classes')
      ? { id: 'class-1', name: '5A', teacher_username: 'teacher-1' }
      : null;
    db.all = () => [];

    const response = await handleCreateBatch(requestBody(), createEnv(db));

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: 'CERTIFICATE_STUDENT_SCOPE_INVALID' },
    });
    expect(db.batches).toHaveLength(0);
  });

  it('creates one atomic D1 batch and derives student metadata server-side', async () => {
    const db = new FakeDB();
    db.first = (sql) => {
      if (sql.includes('FROM classes')) {
        return { id: 'class-1', name: '5A', teacher_username: 'teacher-1' };
      }
      if (sql.includes('FROM certificate_templates')) {
        return { id: 'template-1', school_id: null, created_by: 'admin', is_active: 1 };
      }
      return null;
    };
    db.all = (sql) => sql.includes('FROM students')
      ? [{ id: 'student-1', full_name: 'Nguyễn Văn A' }]
      : [];
    const env = createEnv(db);

    const response = await handleCreateBatch(requestBody({
      achievement_prefix: 'Đã tiến bộ vượt bậc',
      date_line: 'Ít Ong, ngày 20 tháng 7 năm 2026',
    }), env);
    const payload = await response.json() as { data: { batch_id: string; status: string } };

    expect(response.status).toBe(201);
    expect(payload.data.status).toBe('pending');
    expect(db.batches).toHaveLength(1);
    expect(db.batches[0]).toHaveLength(2);
    expect(db.batches[0][0].bindings).toContain('Đã tiến bộ vượt bậc');
    expect(db.batches[0][0].bindings).toContain('Ít Ong, ngày 20 tháng 7 năm 2026');
    expect(db.batches[0][1].bindings).toContain('Nguyễn Văn A');
    expect(env.CERTIFICATE_QUEUE.send).toHaveBeenCalledWith({ batchId: payload.data.batch_id });
  });

  it('returns the existing batch for a repeated request_id', async () => {
    const db = new FakeDB();
    db.first = (sql) => sql.includes('FROM certificate_batches')
      ? { id: 'batch-existing', status: 'pending' }
      : null;
    const env = createEnv(db);

    const response = await handleCreateBatch(requestBody(), env);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { batch_id: 'batch-existing', status: 'pending' },
    });
    expect(db.batches).toHaveLength(0);
    expect(env.CERTIFICATE_QUEUE.send).not.toHaveBeenCalled();
  });

  it('blocks a student from previewing another student certificate', async () => {
    currentUser = { id: 'student-2', username: 'student-2', role: 'student' };
    const db = new FakeDB();
    db.first = () => ({
      id: 'cert-1',
      student_id: 'student-1',
      teacher_id: 'teacher-1',
      status: 'sent',
    });

    const response = await handleCertificatePreview(
      new Request('https://example.test/api/certificates/preview/cert-1'),
      createEnv(db),
      'cert-1',
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: 'CERTIFICATE_PREVIEW_FORBIDDEN' },
    });
  });

  it('serves a certificate image only to its owning student', async () => {
    currentUser = { id: 'student-1', username: 'student-1', role: 'student' };
    const db = new FakeDB();
    db.first = () => ({
      student_id: 'student-1',
      teacher_id: 'teacher-1',
      status: 'sent',
      png_r2_key: 'certs/cert-1.png',
    });
    const env = createEnv(db);
    env.CERT_IMAGES.get.mockResolvedValue({
      body: new Uint8Array([1, 2, 3]),
      httpMetadata: { contentType: 'image/png' },
      httpEtag: '"etag-1"',
    });

    const response = await handleGetCertificateImage(
      new Request('https://example.test/api/certificates/cert-1/image'),
      env,
      'cert-1',
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(env.CERT_IMAGES.get).toHaveBeenCalledWith('certs/cert-1.png');
  });

  it('does not reveal a certificate image to another student', async () => {
    currentUser = { id: 'student-2', username: 'student-2', role: 'student' };
    const db = new FakeDB();
    db.first = () => ({
      student_id: 'student-1',
      teacher_id: 'teacher-1',
      status: 'sent',
      png_r2_key: 'certs/cert-1.png',
    });
    const env = createEnv(db);

    const response = await handleGetCertificateImage(
      new Request('https://example.test/api/certificates/cert-1/image'),
      env,
      'cert-1',
    );

    expect(response.status).toBe(403);
    expect(env.CERT_IMAGES.get).not.toHaveBeenCalled();
  });

  it('does not serve a revoked certificate image to its former owner', async () => {
    currentUser = { id: 'student-1', username: 'student-1', role: 'student' };
    const db = new FakeDB();
    db.first = () => ({ student_id: 'student-1', teacher_id: 'teacher-1', status: 'revoked', png_r2_key: 'certs/cert-1.png' });
    const env = createEnv(db);

    const response = await handleGetCertificateImage(
      new Request('https://example.test/api/certificates/cert-1/image'), env, 'cert-1',
    );

    expect(response.status).toBe(409);
    expect(env.CERT_IMAGES.get).not.toHaveBeenCalled();
  });

  it('returns only authenticated-user notifications with parsed data', async () => {
    currentUser = { id: 'student-1', username: 'student-1', role: 'student' };
    const db = new FakeDB();
    db.all = () => [{
      id: 'notification-1', type: 'certificate_issued', title: 'New', body: 'Done',
      data: '{"certificate_id":"cert-1"}', is_read: 0, created_at: '2026-07-14T00:00:00.000Z',
    }];

    const response = await handleGetNotifications(
      new Request('https://example.test/api/certificates/notifications'), createEnv(db),
    );
    const payload = await response.json() as any;

    expect(response.status).toBe(200);
    expect(payload.data[0]).toMatchObject({ is_read: false, data: { certificate_id: 'cert-1' } });
    expect(db.statements[0].bindings).toEqual(['student-1', 'student']);
  });

  it('cannot mark another user notification as read', async () => {
    currentUser = { id: 'student-2', username: 'student-2', role: 'student' };
    const db = new FakeDB();
    db.first = () => null;

    const response = await handleMarkNotificationRead(
      new Request('https://example.test/api/certificates/notifications/notification-1/read', { method: 'PATCH' }),
      createEnv(db),
      'notification-1',
    );

    expect(response.status).toBe(404);
    expect(db.runs).toHaveLength(0);
  });
});
