# iTongQuiz Security Policy

**Last updated:** 2026-07-18

## Current authentication model

- Teacher, administrator, and student operations use signed JWT sessions.
- Protected Worker routes validate JWTs and derive identity/role from the verified payload.
- Shared browser API tokens and `X-API-Token` authentication are not supported.
- AI provider credentials remain in Cloudflare Worker secrets. Browser code calls `/api/ai/chat` with its JWT.
- Passwords are stored with salted PBKDF2 records; legacy records are migrated through the existing account flow.

Rotating `JWT_SECRET` invalidates every active session. Plan a coordinated logout whenever it changes.

## Secret management

Production Worker secrets:

- `JWT_SECRET`
- `CLIPROXY_TOKEN`

Provision them from a trusted terminal inside `workers/`:

```bash
npx wrangler secret put JWT_SECRET --config wrangler.toml
npx wrangler secret put CLIPROXY_TOKEN --config wrangler.toml
```

Never place credentials in:

- a variable beginning with `VITE_`;
- source code, documentation, tests, examples, or CSV files;
- GitHub issue text, build logs, screenshots, or chat messages;
- `localStorage` or other browser-readable storage.

The committed `.env.example` contains public URLs/flags and empty placeholders only. Local values belong in ignored `.env.local` files.

## Sensitive data

Production/staging exports must not be committed. The `data/migration/` directory is ignored except for its policy README. Test fixtures must use invented identities and non-production credentials.

Student data sent to AI must be minimized. Do not include names, phone numbers, account identifiers, or cross-student records when aggregate learning metrics are sufficient.

## Required checks

Run before every push:

```bash
npm run security:check
npm run test:run
npx vite build
npx tsc -p workers/tsconfig.json
```

`npm run security:scan` rejects tracked environment files, migration exports, private-key files, high-confidence secret literals, and secret-like `VITE_*` variables. The same check runs in GitHub Actions.

## Incident response

When a secret or personal-data export reaches Git:

1. Revoke/rotate the credential immediately.
2. Invalidate affected sessions if authentication material is involved.
3. Remove the data from the current tree.
4. Rewrite all affected Git refs and force-push the cleaned history.
5. Require collaborators and deployment systems to fetch a clean clone.
6. Verify a fresh clone with the security scanner before redeploying.

History rewriting does not revoke a credential; rotation must happen first.

## Reporting

Do not open a public issue containing a vulnerability, token, password, or personal data. Contact the repository owner privately with the affected component, reproduction steps, impact, and a redacted proof.
