# CLAUDE.md — Oromia Digital Sports Hub (ERP)

This file is read by Claude Code at the start of every session. Keep it short and current.
Full specifications live in `docs/blueprint/`. Read the relevant spec **before** writing code for a module.

## What we are building

A regional sports ERP for the **Oromia Culture and Sport Bureau**: one shared platform, separate
federation workspaces, and a foundation that any recognised sport can join.

- First four federation workspaces: **Football, Athletics, Volleyball, Cycling** (see `docs/blueprint/06-sport-plugins.md`).
- Five pillars: Digital Bureau & Federations · Sports Operations · Sports Development · Digital Facilities · Sports Intelligence.
- Proponent/delivery partner: Wavlan Technology. Status: concept → assessment → pilot. Nothing here is an approved government programme.

## Spec index (read before touching a module)

| Topic | File |
|---|---|
| Scope, users, glossary | `docs/blueprint/01-product-scope.md` |
| Architecture, stack, repo layout | `docs/blueprint/02-architecture.md` |
| Domain model & schema | `docs/blueprint/03-domain-model.md` |
| Access control, privacy, audit | `docs/blueprint/04-security-and-access.md` |
| Workflow & approval engine | `docs/blueprint/05-workflows.md` |
| Sport plugin contract + 4 federations | `docs/blueprint/06-sport-plugins.md` |
| Module-by-module functional specs | `docs/blueprint/07-module-specs.md` |
| Milestones and task cards | `docs/blueprint/08-build-plan.md` |
| Testing & acceptance scenarios | `docs/blueprint/09-testing-and-acceptance.md` |
| Open decisions (do NOT hardcode) | `docs/blueprint/10-open-decisions.md` |

## Stack (summary — rationale in 02-architecture.md)

- Monorepo: **pnpm workspaces + Turborepo**, TypeScript everywhere (strict mode).
- API: **NestJS** modular monolith, REST + OpenAPI, Zod for validation (`nestjs-zod`).
- DB: **PostgreSQL 16 + PostGIS**, **Drizzle ORM** + SQL migrations, Row-Level Security for scope isolation.
- Jobs: **Redis + BullMQ**. Files: **S3-compatible (MinIO)**. Identity: **Keycloak** (OIDC, MFA).
- Web: **Next.js (App Router)** + Tailwind + shadcn/ui, **next-intl** (om, am, en). PWA + IndexedDB for offline capture.
- Tests: Vitest (unit), Testcontainers (integration), Playwright (e2e).

## Commands

```bash
pnpm install
pnpm dev                 # docker compose up (postgres, redis, minio, keycloak) + api + web
pnpm db:migrate          # apply migrations
pnpm db:seed             # load FICTIONAL demo data only
pnpm test                # unit
pnpm test:int            # integration (Testcontainers)
pnpm test:e2e            # Playwright acceptance scenarios
pnpm lint && pnpm typecheck
```

## Non-negotiable domain rules

These come straight from the proposal. Violating any of them is a bug, even if a user asks for it in a ticket.

1. **Identity ≠ registration ≠ eligibility.** A verified person is not automatically eligible for anything. Check category, qualification, affiliation, disciplinary status and rule-set separately.
2. **Affiliations are dated and sport-scoped.** A club change in one sport never alters eligibility in another.
3. **Results are never overwritten.** Every correction creates a new version that references the previous one, with decision, reason and actor. Original values stay queryable.
4. **The system flags; humans decide.** Duplicates, eligibility exceptions, protests, selections, sanctions, fitness and spending are decided by an authorised person. Code may *suggest*, never *decide*.
5. **Missing is not zero.** Reports and dashboards must show "no report received" distinctly from "reported 0". Every indicator carries source, period, owner, verification status and denominator.
6. **Never combine raw performances across sports** into a single ranking. Never rank federations by medals alone.
7. **Least privilege by sport × organisation × role × territory.** A Bureau dashboard is not access to medical, safeguarding or confidential federation records. Maker ≠ approver ≠ reconciler.
8. **Restricted data stays restricted.** Medical/safeguarding cases live in the `restricted` schema with separate policies; other modules only see clearance *status*.
9. **No official ledger.** Finance holds references and approvals; the accounting ledger stays in the designated finance system.
10. **No fabricated data.** Seed/demo data must be obviously fictional (e.g. "Demo Club A"). Never invent Oromia statistics, federation counts, budgets or real people's names.
11. **Rules are configuration, not code constants.** Categories, roster limits, tie-breaks, registration windows, qualification types, units/precision → versioned rule sets owned by each federation.
12. **External systems remain authoritative.** National/international IDs (EFF, FIFA, CAF, etc.) are stored as references with issuer + verification date; we never claim to issue them.

## Engineering conventions

- Module boundaries: each domain module owns its tables (own Postgres schema) and exposes a service interface. **No cross-module table access**; use the module's public service or domain events.
- Every mutating endpoint: Zod-validated input → permission check (`@RequirePermission`) → service → audit event. No exceptions.
- All tables: `id uuid` (v7), `created_at`, `created_by`, `updated_at`, `updated_by`, `version int` (optimistic lock). Soft-delete only where spec says so; most records use status instead.
- Dates stored as UTC `timestamptz` / ISO `date`. Display supports **Ethiopian calendar** toggle. Fiscal year = Ethiopian FY (configurable start, default Hamle 1).
- All user-visible strings go through i18n keys. No hard-coded English in components.
- Money: `numeric(18,2)` + currency code (default ETB). Never floats.
- New feature = migration + service + API + tests + i18n keys + permission entries + audit events. Update the relevant spec in `docs/blueprint/` if behaviour changes.
- Commit style: Conventional Commits (`feat(registry): …`). One task card per PR where possible.

## How to work a task

1. Find the task card in `docs/blueprint/08-build-plan.md` (IDs like `M2-T04`).
2. Read the specs it references. Check `10-open-decisions.md` — if the task depends on an open item, implement it as configuration with a sensible fictional default and leave a `// DECISION: OD-xx` comment.
3. Write tests from the card's acceptance criteria first, then implement.
4. Run `pnpm lint typecheck test test:int` before declaring done. Tick the card's checkbox.
