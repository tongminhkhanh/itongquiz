import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migrationsDir = path.join(root, 'workers', 'migrations');
const rollbacksDir = path.join(root, 'workers', 'rollbacks');
const bootstrapPath = path.join(root, 'workers', 'scripts', 'bootstrap_d1_migration_registry.sql');

function migrationFiles(): string[] {
  return fs.readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

describe('D1 migration layout', () => {
  it('keeps rollback SQL outside the forward migration directory', () => {
    const migrations = migrationFiles();
    expect(migrations.some((name) => /rollback|drop/i.test(name))).toBe(false);
    expect(fs.existsSync(path.join(rollbacksDir, '0019_drop_phieu_nhanxet.sql'))).toBe(true);
  });

  it('keeps the historical registry bootstrap aligned with migration filenames', () => {
    const migrations = migrationFiles();
    const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
    const registered = [...bootstrap.matchAll(/\('([^']+\.sql)'\)/g)]
      .map((match) => match[1])
      .sort();

    // The bootstrap is a frozen one-time history for the 0002-0026 production schema.
    // New migrations are applied normally by Wrangler and must not rewrite that history.
    expect(registered).toEqual(migrations.slice(0, registered.length));
    expect(new Set(registered).size).toBe(registered.length);
    expect(registered).toHaveLength(25);
    const numericPrefixes = migrations.map((name) => name.slice(0, 4));
    expect(new Set(numericPrefixes).size).toBe(numericPrefixes.length);
    expect(migrations.at(-1)).toBe('0029_canonicalize_system_announcements.sql');
  });
});
