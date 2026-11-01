# Oromia Digital Sports Hub — Build Blueprint

Blueprint for building the Oromia Digital Sports 2030 ERP with Claude Code. Derived from the Wavlan Technology concept note and executive presentation (23 Oct 2026).

## How to start

1. Create an empty Git repository and copy this folder's contents into it (keep `CLAUDE.md` at the root).
2. Open the repo in Claude Code. It reads `CLAUDE.md` automatically.
3. Run the first milestone:
   ```
   /next-task
   ```
   or type: *"Read CLAUDE.md and docs/blueprint/08-build-plan.md, then implement M0-T01."*
4. Work one task card per session/PR. Review each PR before merging; tick cards as they land.

## What's inside

| File | Purpose |
|---|---|
| `CLAUDE.md` | Always-loaded project brief: stack, commands, 12 non-negotiable domain rules, conventions |
| `docs/blueprint/01-product-scope.md` | Pillars → modules, users & roles, workflow families, glossary |
| `docs/blueprint/02-architecture.md` | ADRs, repo layout, module rules, offline, i18n/Ethiopian calendar, ops |
| `docs/blueprint/03-domain-model.md` | Entities and key columns for every module, ERD |
| `docs/blueprint/04-security-and-access.md` | Scoped RBAC, RLS, classification, minors, audit, resilience |
| `docs/blueprint/05-workflows.md` | Generic approval engine, result lifecycle, eligibility engine, action queue |
| `docs/blueprint/06-sport-plugins.md` | Plugin contract + Football, Athletics, Volleyball, Cycling schedules |
| `docs/blueprint/07-module-specs.md` | Screens, APIs, events and rules per module |
| `docs/blueprint/08-build-plan.md` | Milestones M0–M10 with ~70 task cards and acceptance criteria |
| `docs/blueprint/09-testing-and-acceptance.md` | Test strategy, foundation & operational gates, pilot KPIs, DoD |
| `docs/blueprint/10-open-decisions.md` | 20 items to confirm in assessment — implemented as config, never hardcoded |
| `.claude/commands/` | Slash commands: `/next-task`, `/review-rules` |

## Important

Everything here is proposed scope for validation. Rule defaults, roles and figures are placeholders until the Bureau and federations confirm them (see `10-open-decisions.md`).

## Local development

Requires Node 22, pnpm 9 and Docker.

```bash
cp .env.example .env
pnpm install
pnpm infra:up          # Postgres+PostGIS, Redis, MinIO, Keycloak, MailHog
pnpm dev               # API on :4000 (docs at /api/docs), web on :3000
```

- Health: `GET http://localhost:4000/api/v1/health` (503 if any dependency is down)
- Web: http://localhost:3000 — Afaan Oromo by default; switch language, workspace and Ethiopian/Gregorian calendar in the header
- Keycloak admin: http://localhost:8080 (admin / admin, local only) · MinIO console: http://localhost:9001 · MailHog: http://localhost:8025
