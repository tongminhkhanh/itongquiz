import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../workers/src/routes/certificates', () => ({
  createBatch: vi.fn(),
  getBatches: vi.fn(),
  getBatchDetail: vi.fn(),
  preview: vi.fn(),
  uploadTemplate: vi.fn(),
  getTemplates: vi.fn(),
  getMyCertificates: vi.fn(),
  handleCertificateRoutes: vi.fn(async () => null),
}));

vi.mock('../workers/src/routes/adminCertificates', () => ({
  handleAdminCertificateRoutes: vi.fn(async () => null),
}));

vi.mock('../workers/src/routes/phieu', () => ({
  handlePhieuSubdomain: vi.fn(async () => null),
  handlePublicPhieuApi: vi.fn(async () => null),
  handlePhieuRoutes: vi.fn(async () => null),
}));

vi.mock('../workers/src/middleware/rateLimit', () => ({
  rateLimit: vi.fn(async () => null),
}));

let worker: typeof import('../workers/src/index').default;

beforeAll(async () => {
  worker = (await import('../workers/src/index')).default;
});

const env = {
  JWT_SECRET: 'test-secret',
  DB: {
    prepare() {
      throw new Error('D1 should not be reached before authentication');
    },
  },
} as any;

const request = (path: string, method: 'GET' | 'POST' = 'GET') => new Request(`https://phieu.thitong.site${path}`, {
  method,
  headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
  body: method === 'POST' ? '{}' : undefined,
});

describe('Worker root route dispatch', () => {
  it('routes the read-only math monitor before legacy handlers', async () => {
    const response = await worker.fetch(request('/api/admin/math-audit/issues?limit=1'), env);
    expect(response.status).toBe(401);
  });

  it('routes the disabled bulk-repair endpoint before legacy handlers', async () => {
    const response = await worker.fetch(request('/api/admin/math-audit/apply', 'POST'), env);
    expect(response.status).toBe(401);
  });

  it('still routes gamification mutations to JWT authentication', async () => {
    const response = await worker.fetch(request('/api/game-state', 'POST'), env);
    expect(response.status).toBe(401);
  });
});
