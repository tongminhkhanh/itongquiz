# D1 migration registry reconciliation

## Why this exists

The production D1 schema was historically applied with direct SQL commands, while Wrangler's `d1_migrations` table remained empty. As a result, `wrangler d1 migrations apply` attempted to replay every migration and could damage a database whose schema was already current.

## One-time reconciliation performed 2026-07-16

- Pre-write Time Travel bookmark: `00000072-00000000-000050aa-a697d60163723c07d0851c4f3438aad8`.
- Repaired partial `0003` state by creating the missing `idx_questions_tags` index.
- Final registry: 25 rows, IDs 1–25, from `0002_add_quiz_tags.sql` through `0026_live_exam_hardening.sql`.
- Final Wrangler status: `No migrations to apply!`.
- Business-table row counts were unchanged before and after reconciliation.

1. Take a D1 Time Travel bookmark.
2. Capture `sqlite_master` and business-table row counts.
3. Verify each migration from `0002` through `0026` against the final production schema and required data effects.
4. Repair any partial migration effect before changing the registry.
5. Move rollback SQL out of `workers/migrations`; rollback files must never be discoverable as forward migrations.
6. Insert the verified migration filenames into `d1_migrations` in filename order using `workers/scripts/bootstrap_d1_migration_registry.sql`.
7. Confirm `wrangler d1 migrations list --remote` reports no pending migrations.
8. Confirm business row counts and production smoke tests are unchanged.

## Operational rules

- Forward migrations belong only in `workers/migrations`.
- Rollback or destructive recovery SQL belongs in `workers/rollbacks`.
- Never rename a migration after it has been registered in production.
- Never edit an already-registered migration to represent a new schema change; create the next numbered file instead.
- Before `wrangler d1 migrations apply --remote`, always run `wrangler d1 migrations list --remote` and inspect the exact pending filenames.
- Take a Time Travel bookmark immediately before every production migration.
- Do not run the bootstrap script again as part of normal deployment. It is idempotent, but it exists only to document and reproduce the historical registry bootstrap.

## Verification commands

From `workers/`, with the correct Cloudflare credentials loaded:

```powershell
node scripts/audit_d1_migrations.mjs
npx wrangler d1 migrations list itongquiz-db --remote --config wrangler.toml
npx wrangler d1 execute itongquiz-db --remote --config wrangler.toml --command "SELECT id,name,applied_at FROM d1_migrations ORDER BY id" --json
```

Expected result after reconciliation: no pending migrations and 25 registry rows from `0002_add_quiz_tags.sql` through `0026_live_exam_hardening.sql`.

## Rollback

Registry reconciliation does not alter business rows. If a registry entry is incorrect, stop deployments and restore the database using the Time Travel bookmark captured immediately before reconciliation. Do not delete arbitrary registry rows while deployments are active.
