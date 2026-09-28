# PromptWorks — Curated AI skills, news and rankings

A marketing-and-commerce platform for curated AI **skills** (prompts, workflows and templates),
**AI news**, and **tool rankings**, built with Next.js (App Router), Prisma + PostgreSQL and Auth.js.

- **Public site** — browse/search skills, read news, view rankings, purchase paid skills and unlock
  prompt content.
- **Admin console** — full content management (skills, articles, rankings), user management,
  order monitoring, and a statistics dashboard.

## Tech stack

| Layer       | Technology                                            |
| ----------- | ----------------------------------------------------- |
| Framework   | Next.js 16 (App Router, Server Components, Turbopack) |
| UI          | React 19 + Tailwind CSS v4 + lucide-react            |
| ORM / DB    | Prisma 6 + PostgreSQL                                 |
| Auth        | Auth.js (NextAuth v5) + Google OAuth                  |
| Validation  | Zod                                                  |
| Payments    | Pluggable gateway (mock provider for development)     |

## Project structure

```
app/
  admin/                  Admin console (protected)
    page.tsx              Dashboard: KPI cards + revenue/order/top-skills charts
    skills/ …             Skills: list, new, detail, edit, delete, publish
    tools/ …              Tools: list, new, detail, edit, delete, publish
    articles/ …           Articles: list, new, detail, edit, delete, publish
    rankings/ …           Rankings: list, new, detail, edit, delete, publish, recalc
    orders/ …             Orders: list + detail
    webhook-events/ …     Payment webhooks: reconciliation of unmatched transfers
    users/ …              Users: list + detail, block/unblock, role change
    statistics/           Charts for revenue, users, sales
  tools/                  Public tool catalog: list + detail
  api/                    API routes (auth, orders, SePay webhook, R2 uploads)
  …
src/
  application/            Application services / use cases (commands + queries)
  domain/                 Domain types & repository interfaces
  infrastructure/         Repositories, auth, payments, composition root (DI)
  presentation/           React components, server actions, view models
  lib/                    Utils, validation, site config
prisma/
  schema.prisma           Database schema
  migrations/             Prisma migrations
  seed.ts                 Seed/demo data
```

## Database overview (`prisma/schema.prisma`)

- **Identity** — `User` (role `CUSTOMER | ADMIN`, status `ACTIVE | BLOCKED`), Auth.js
  `Account`, `Session`, `VerificationToken`.
- **Taxonomy** — `Industry`, `SkillCategory`, `UseCase`, `AITool`.
- **Skill catalog** — `Skill`, `SkillVersion` (versioned prompt content), `SkillPrice`
  (per-currency pricing, stored in minor units), link tables for taxonomy/tools.
- **Tool catalog** — `Tool` (type `DOWNLOADABLE | EMBED_WIDGET | MCP_SERVER | WEB_APP`,
  billing `FREE | ONE_TIME | SUBSCRIPTION`, `status` reuses `ContentStatus`),
  `ToolVersion` (the latest release, package file or script URL) and `ToolPrice`
  (per-currency, minor units, `durationDays` where `0` = lifetime).
- **News** — `NewsArticle`, `NewsCategory`, `NewsToolLink`.
- **Rankings** — `Ranking` (period `WEEK | MONTH | QUARTER | ALL_TIME`), `RankingEntry`
  (per-tool score/views/favorites/clicks).
- **Engagement** — `SkillFavorite`, `SkillView`, `ToolClick`.
- **Commerce** — `Order` (status `PENDING | PAID | EXPIRED | CANCELED | FAILED | REFUNDED`),
  `PaymentTransaction`, `SkillAccess` (granted by `ORDER`, `ADMIN_GRANT` or `PROMOTION`).
- **Audit** — `AuditLog` for admin actions.

## Admin console

The console lives under `/admin` (requires the `ADMIN` role) and uses a persistent left-hand
sidebar. Every module provides:

| Module      | List | Filters/search | Detail | Create | Edit | Delete | Extras               |
| ----------- | ---- | -------------- | ------ | ------ | ---- | ------ | -------------------- |
| Dashboard   | —    | —              | —      | —      | —    | —      | KPI cards, revenue-by-month bars, order-status donut, top skills, recent orders |
| Statistics  | —    | —              | —      | —      | —    | —      | Revenue chart, user health, sales table |
| Skills      | ✔    | q, status, access | ✔   | ✔      | ✔    | ✔      | Publish/unpublish, versioned content |
| Tools       | ✔    | q, status, type, pricing | ✔ | ✔    | ✔    | ✔      | Publish/unpublish, latest version + package upload |
| Articles    | ✔    | q, status      | ✔      | ✔      | ✔    | ✔      | Publish/unpublish, category/tools |
| Rankings    | ✔    | —              | ✔      | ✔      | ✔    | ✔      | Publish/unpublish, recalculate scores |
| Orders      | ✔    | q, status      | ✔      | —      | —    | —      | Read-only: orders are system-generated |
| Users       | ✔    | q, role, status| ✔      | —      | —    | —      | Block/unblock, promote/demote role |

Admin mutations are performed through server actions (`src/presentation/actions/admin-actions.ts`)
and recorded to `AuditLog`.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Required for every environment:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
AUTH_SECRET="$(openssl rand -base64 32)"
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
```

Payments (optional — see [Payments](#payments) for details):

```bash
SEPAY_API_KEY="..."            # my.sepay.vn
SEPAY_BANK_CODE="MB"
SEPAY_ACCOUNT_NUMBER="..."
SEPAY_ACCOUNT_NAME="..."
```

Video demo uploads (optional — see [Video uploads](#video-uploads-cloudflare-r2)):

```bash
R2_ACCOUNT_ID="..."            # Cloudflare dashboard
R2_ACCESS_KEY_ID="..."         # R2 API token (Object Read & Write)
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="..."
R2_PUBLIC_URL="https://pub-xxxx.r2.dev"
```

`.env*` is git-ignored (only `.env.example` is committed). Never put a real
database URL, API key or OAuth secret in this README.

### 3. Create the database

```bash
npm run db:deploy        # apply migrations
npm run db:seed          # load demo content + admin/customer users
```

Seed accounts: `admin@promptworks.app` (ADMIN) and `explorer@promptworks.app` (CUSTOMER).
Sign-in uses Google OAuth — grant the admin role to a Google account, or use an existing admin
session.

### 4. Run the app

```bash
npm run dev              # http://localhost:3000
```

Visit `/admin` to open the dashboard.

## Available scripts

| Script             | Description                              |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Start the dev server (Turbopack)         |
| `npm run build`    | Production build + type check            |
| `npm run start`    | Start the production server              |
| `npm run lint`     | Run ESLint                               |
| `npm run db:generate` | Regenerate the Prisma client          |
| `npm run db:migrate`  | Create & apply a new migration        |
| `npm run db:deploy`   | Apply pending migrations              |
| `npm run db:seed`     | Reset & seed demo data                |
| `npm run db:studio`   | Open Prisma Studio                     |

## Payments

Bank-transfer checkout through [SePay (BankHub)](https://my.sepay.vn) with
[VietQR](https://vietqr.io) QR codes. If the `SEPAY_*` variables are absent the
app falls back to a mock provider, so the whole flow is demoable locally without
a bank account.

### Flow

1. `POST /api/orders` creates a `PENDING` order. The server decides the amount,
   currency, 15-minute expiry and order code — the client never sends them.
2. The order code (`SKILL-…`, ≤25 chars) is the transfer content and is also
   embedded in the QR as `addInfo`, so a plain VietQR scan carries the code.
3. `POST /api/orders/{id}/payment` returns the QR plus the receiving account.
   The buyer pays in their banking app; the modal polls the order status.
4. SePay calls `POST /api/hooks/sepays`. That endpoint is the **only** place that
   can mark an order `PAID`, in this order:
   API key check → raw webhook log → extract order code → amount/account
   verification → DB transaction (payment + order + `SkillAccess` + audit) →
   purchase email.
5. The order page's access check sees the new `SkillAccess` row and unlocks.

### Webhook endpoint

`POST /api/hooks/sepays` — register this URL in the SePay dashboard. The API key
is read from `Authorization: Apikey …` (also accepts `Bearer`/`token`/`x-api-key`)
and compared in constant time. Authentication happens **before** the payload is
inspected, so an unauthorised caller gets 401 whatever it sends.

> The SePay docs also describe an HMAC-SHA256 signature scheme. This app uses the
> API key scheme above; keep the two in sync with whatever the dashboard's webhook
> configuration actually sends, otherwise SePay will be rejected with 401.

| Situation                              | Status | Meaning                                  |
| -------------------------------------- | ------ | ---------------------------------------- |
| Wrong / missing API key                | 401    | Not authorised; SePay must not retry      |
| Server not configured (`SEPAY_API_KEY` missing) | 503 | Transient; SePay retries later    |
| Malformed payload                      | 400    | Corrupt data; retrying cannot help        |
| Everything else, including "no matching order" | 200 | Logged in `webhook_events` for reconciliation |

Deliberate choices worth knowing before changing this code:

- **The raw log is written before reconciliation.** A transfer that matches no
  order is still real money in the account, so it must stay traceable.
- **Duplicate events are ignored, but interrupted ones are not.** A retry of an
  event still in `RECEIVED` state is processed again, so a crash mid-webhook
  cannot swallow a payment. The second line of defence is
  `UNIQUE(providerTransactionId)` on `payment_transactions`.
- **Outgoing (debit) transfers are logged and rejected, not retried.** SePay uses
  `in`/`out` in the transaction webhook and `credit`/`debit` in the IPN; either way an
  outgoing transfer is written to `webhook_events` as `REJECTED` and answered with
  200. Returning 400 would make SePay retry a payload that can never succeed. Any
  money leaving the receiving account is an exception worth investigating in
  `/admin/webhook-events`, which labels such rows "Out".
- **Bank timestamps are Vietnam time.** SePay sends `2026-09-26 10:30:00` with no
  offset; parsing that naively shifts everything by 7 hours. `transactionDate` is
  therefore normalised to ISO-8601 UTC (see `sepay/transaction-date.ts`) while the
  untouched payload stays in `rawPayload`.
- **A failed email never fails the payment.** Access is granted in the
  transaction; the customer keeps it even if the email does not arrive.

Reconcile transfers that matched no order at `/admin/webhook-events`
(`RECEIVED` / `MATCHED` / `REJECTED` / `FAILED` counters included).

### Not implemented yet

- **Email delivery is a console notifier.** `consolePurchaseDeliveryNotifier` logs
  the delivery line instead of sending it, so no mail provider is wired up yet. The
  port is in place (`PurchaseDeliveryNotifier`), so adding a provider is a matter of
  one adapter plus environment variables — no change to the payment flow.

## File uploads (Cloudflare R2)

`Skill.videoDemoUrl` accepts any public link (YouTube, Vimeo, direct MP4) and can
also be filled by uploading a file straight to R2 from the admin skill form. The
same flow uploads the downloadable package of a `Tool`. The browser never proxies
the bytes through Next.js: the server only signs URLs, so a 2GB file costs a
handful of small API calls instead of a request that lives for hours.

Every request declares its `kind`:

| `kind`      | Used by                    | Key prefix        | Accepted content                                                             |
| ----------- | -------------------------- | ----------------- | ---------------------------------------------------------------------------- |
| `media`     | `VideoDemoField` (skills)  | `skill-videos/`   | MP4, WebM, MOV, MKV, PDF, JPEG, PNG, WebP, GIF                                 |
| `tool-file` | `ToolFileField` (tools)    | `tool-files/`     | ZIP/TAR/7z/RAR, EXE, MSI, DMG, PKG, DEB, RPM, AppImage, JS/PY/SH scripts, JSON, YAML, TXT |

### Setup

1. Cloudflare Dashboard → R2 → **Account API Tokens** → create a token with
   *Object Read & Write*; note the Access Key ID and Secret Access Key.
2. Create a bucket and put the five `R2_*` variables in `.env` (see
   `.env.example`). `R2_PUBLIC_URL` is the bucket's `r2.dev` domain in dev or a
   custom domain in production. Without those variables the upload UI is skipped
   and the URL field still works.
3. Apply the bucket CORS policy — the client reads each part's `ETag` header to
   complete the upload, so it must be exposed:

```bash
r2 bucket cors set <bucket-name> --file docs/r2-cors.json
```

Edit the `AllowedOrigins` in `docs/r2-cors.json` before applying it, or the
browser will block the upload.

### Flow

| Size                            | Path                                                                   |
| ------------------------------- | ---------------------------------------------------------------------- |
| `< 50MB`                        | `POST /api/upload/r2/presign` → single presigned `PUT`                  |
| `>= 50MB`                       | `POST /api/upload/r2/init-multipart` → one presigned `PUT` per 10MB part |
| any                             | `POST /api/upload/r2/complete-multipart` (or `/abort-multipart` on cancel) |

Presigned URLs live 15 minutes. Every endpoint calls `requireAdmin()`, and
`buildObjectKey()` generates the key server-side (`skill-videos/YYYY-MM-DD/<uuid>-<name>.<ext>`)
from an allowlist of content types, so admins cannot write outside the prefix or
upload arbitrary types. Tool packages are checked on **both** MIME type and file
extension, because browsers report binaries such as `.dmg` or `.AppImage` as
`application/octet-stream` or an empty string.

## Business rules

- **Skill access** — free skills are readable by all visitors; paid skills require a purchase
  (`SkillAccess` linked to a `PAID` order). `revokedAt` disables access. List and
  detail pages show an "Owned" badge and drop the buy button for skills the
  visitor already owns; the lookup is one query per page, not one per card.
- **Tool catalog** — `/tools` only lists `PUBLISHED` rows; the admin form manages a single
  `isLatest` `ToolVersion` per tool, so editing a version updates the existing row instead of
  appending history. `appUrl` for `WEB_APP` tools is stored inside `Tool.config` and edited
  through its own field, so the JSON box and the form can never disagree. Checkout and
  license keys are not implemented yet: the detail page shows pricing and a
  "checkout coming soon" note.
- **Rich text** — `NewsArticle.content`, `Skill.description`, `Tool.description` and
  `SkillVersion.instructions` hold HTML from the admin Tiptap editor. Rendering
  always goes through `sanitizeRichText()` (allowlist in `src/lib/rich-text.ts`)
  and falls back to plain text for rows written before the editor existed.
  `SkillVersion.content` stays a plain textarea: it is a prompt users copy, not
  prose.
- **Money** — all amounts are stored in **minor units**, and conversions go through the
  `Money` value object in `src/domain/shared/money.ts` because the exponent is
  currency-dependent: `USD` 2 decimals, `VND` 0 decimals. Never hard-code `* 100` or
  `/ 100`; bank webhooks report *major* units, so compare via `matchesAmount()`.
- **Order codes** — generated server-side, unique, and used as the bank transfer
  content. `Order.productType` records what was sold (`SKILL` today) so other
  product types can be added without changing the payment flow.
- **Ranking score** — `score = views + favorites × 8 + clicks × 4`, recalculated from live
  engagement within the ranking's period.
- **Users** — accounts are created through authentication; admins block/unblock accounts and
  change roles, but cannot delete them.
- **Audit** — destructive and publish actions write an `AuditLog` entry with the acting admin.
