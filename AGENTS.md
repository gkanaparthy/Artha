# Repository Guidelines

## Project Structure & Module Organization
- Main app code lives in `src/` (Next.js App Router + TypeScript).
- Routes and API handlers are under `src/app/` (`src/app/api/*`, `src/app/(dashboard)/*`).
- Reusable UI components are in `src/components/` (`ui/`, `layout/`, `views/`, onboarding, subscription).
- Business logic and integrations are in `src/lib/` (SnapTrade, auth, encryption, Stripe, analytics services).
- Database schema is in `prisma/schema.prisma`; operational scripts live in `scripts/`.
- Static assets are in `public/`; long-form docs and plans are in `docs/`.
- Separate video rendering project (Remotion) is in `video/`.

## Build, Test, and Development Commands
- `npm run dev`: start local dev server.
- `npm run build`: production build (Next.js).
- `npm run start`: run the built app.
- `npm run lint`: run ESLint across the repo.
- `npx prisma generate`: regenerate Prisma client after schema changes.
- `npx prisma db push`: sync schema to the configured DB.

## Coding Style & Naming Conventions
- TypeScript-first; keep types explicit for service and API boundaries.
- Prettier config: 2-space indent, semicolons, single quotes, trailing commas (`es5`).
- ESLint uses `eslint-config-next` + TypeScript rules; fix lint issues before PRs.
- Keep API route files in `route.ts` per App Router conventions.

## Testing Guidelines
- No formal unit/integration test runner is currently configured.
- Minimum quality gate is `npm run lint` plus manual verification of impacted flows (auth, sync, metrics, tagging).
- Include reproducible validation steps in each PR.

## Commit & Pull Request Guidelines
- Follow existing history style: concise, imperative subject lines, often with prefixes like `fix:`, `feat:`, `feat(seo):`.
- Keep commits scoped to one change area.
- PRs should include: purpose, key files, manual test evidence, migration/env notes, and screenshots for UI changes.
- Husky pre-commit hook blocks dangerous Prisma reset commands and potential hardcoded secrets; do not bypass it.

## Agent Guardrails
- Never run destructive database commands like `prisma migrate reset` or `prisma db push --force-reset` without explicit approval.
- Treat SnapTrade SDK payloads as snake_case (`trade.option_symbol`, not `trade.optionSymbol`).
- In API routes, derive `userId` from session/auth only; never trust request-provided user IDs.
- Stripe webhook verification requires raw body (`req.text()`), not parsed JSON.
- Ensure middleware matcher exclusions keep SEO endpoints reachable (`/robots.txt`, `/sitemap.xml`).

## Security & Configuration Tips
- Use `.env.local` for secrets; never hardcode API keys, IDs, or DB credentials.
- Review `docs/security-assessment.md` and `docs/deployment-guide.md` before auth, encryption, cron, or production changes.
