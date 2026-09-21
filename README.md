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
    articles/ …           Articles: list, new, detail, edit, delete, publish
    rankings/ …           Rankings: list, new, detail, edit, delete, publish, recalc
    orders/ …             Orders: list + detail
    users/ …              Users: list + detail, block/unblock, role change
    statistics/           Charts for revenue, users, sales
  api/                    API routes (auth, orders, payments, skill content)
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
# DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/ai_discovery_platform"
DATABASE_URL=postgresql://postgres:Ra9WjSfeL0ihrJ7Z@db.fpqrrbdzeqmlnsjvgfeb.supabase.co:6543/postgres?sslmode=require
AUTH_SECRET="$(openssl rand -base64 32)"
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
```

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

## Business rules

- **Skill access** — free skills are readable by all visitors; paid skills require a purchase
  (`SkillAccess` linked to a `PAID` order). `revokedAt` disables access.
- **Prices** — `SkillPrice.amount` is stored in minor currency units (e.g. `900` = `$9.00`); the
  admin form accepts major units and converts on save.
- **Ranking score** — `score = views + favorites × 8 + clicks × 4`, recalculated from live
  engagement within the ranking's period.
- **Users** — accounts are created through authentication; admins block/unblock accounts and
  change roles, but cannot delete them.
- **Audit** — destructive and publish actions write an `AuditLog` entry with the acting admin.