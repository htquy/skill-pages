<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Modular monolith rules (microservice-ready)

This repo is a **modular monolith**: one Next.js app and one PostgreSQL database, but
strictly split by module so any module can be extracted into a microservice without
rewriting business logic. The full specification lives in
`../ai-monolith-project-skills/15-microservice-modular-architecture.md`; the rules below
are the short version every change must follow.

1. **No cross-schema joins in application/domain.**
   - PostgreSQL is split into schemas: `authentication`, `apps`, `payment`, `catalog`, `audit`.
   - Never write a Prisma `include`/`join` (or raw SQL) that reaches from one module's
     tables into another module's tables. Talk through a **Service Interface / Facade**
     instead (e.g. `AppsService` calls `UserRepository.findById`, it does not join `User`).
   - When a module becomes a microservice, only its facade call is swapped for HTTP/gRPC.

2. **All HTTP handling lives in Controller classes.**
   - Controllers live in `src/server/controllers/` (`OAuthController`, `AppsController`,
     `OrderController`, `PaymentController`, `CatalogController`, `UploadController`).
   - `app/api/**/route.ts` files are **thin routing wrappers** (3–5 lines): parse params,
     forward to the controller, return the response. No business logic, validation or
     status-code decisions inside route files.

3. **New modules mirror the existing layering:** `src/domain/<module>` (types + repository
   interfaces), `src/application/<module>` (services/use-cases), `src/infrastructure`
   (repositories + `composition.ts`), `src/server/controllers` (HTTP), `app/**` (routes/pages).

4. **Enterprise SSO uses OAuth2 + PKCE (S256 only)** under `/api/auth/oauth/*`. Never add
   the `plain` code-challenge method.

5. **Entitlements go through the hub** `GET /api/apps/:slug/check-access` (alias
   `/entitlement`) and `GET /api/apps/:slug/menus`. Do not hand-roll subscription checks
   in feature code.

Keep the Prisma schema grouped by `@@schema` and update this file's rules together with
the architecture doc when a module is added or moved.

