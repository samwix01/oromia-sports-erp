# 02 — Architecture

The proposal asks for: *"a modular application with clear business-domain boundaries, a transactional database, controlled document storage and a separate reporting model. Confirm hosting, recovery, capacity and interface requirements before selecting deployment topology."* This document turns that into a concrete, portable design.

## 1. Architecture decisions (ADRs)

| # | Decision | Why | Revisit if |
|---|---|---|---|
| ADR-01 | **Modular monolith** (one deployable API, strict module boundaries) | Small team, pilot scale, easier ops on constrained infrastructure; modules can be extracted later | Load or team size demands independent scaling |
| ADR-02 | **TypeScript end-to-end** (NestJS + Next.js) | One language for API, web, offline PWA, shared Zod schemas | — |
| ADR-03 | **PostgreSQL 16 + PostGIS**, schema-per-module | Transactional integrity, RLS, geo for activity map, mature ops | — |
| ADR-04 | **Row-Level Security** as a second line of defence behind app-level permission checks | Federation/organisation separation must survive an app bug | — |
| ADR-05 | **Keycloak** for identity (OIDC, MFA, SMS/OTP) | Self-hostable — hosting may need to be in-country (OD-01) | A national SSO becomes mandatory |
| ADR-06 | **Reporting schema with materialised views**, refreshed by jobs | "Separate reporting model" without new infra in phase 1; can move to a warehouse later | Analytical load hurts OLTP |
| ADR-07 | **S3-compatible object storage (MinIO)** for documents/evidence | Portable on-prem or cloud; versioning + object lock for evidence | — |
| ADR-08 | **Sport plugins** behind a typed contract | Shared model, separate technical rules (proposal's core principle) | — |
| ADR-09 | **Container deployment** (Docker Compose for pilot, Kubernetes-ready Helm later) | Hosting undecided; keep portable | — |
| ADR-10 | **PWA + IndexedDB** offline capture for attendance, results, accreditation scans | Connectivity at venues/routes is unreliable; offline status must be visible | Native app is required |

## 2. Repository layout

```
oromia-sports-erp/
├─ CLAUDE.md
├─ docs/blueprint/               ← this spec
├─ apps/
│  ├─ api/                       ← NestJS modular monolith
│  │  └─ src/
│  │     ├─ core/                ← config, db, auth guard, audit interceptor, i18n, errors
│  │     ├─ modules/
│  │     │  ├─ iam/              ← users, role assignments, scopes, permission registry
│  │     │  ├─ territories/
│  │     │  ├─ institutions/     ← organisations, federation directory, committees, signatories
│  │     │  ├─ people/           ← Person, roles, affiliations, external IDs, duplicates
│  │     │  ├─ clubs/            ← Club 360 views, discipline sections, squads
│  │     │  ├─ qualifications/
│  │     │  ├─ documents/
│  │     │  ├─ workflow/         ← generic submission/approval engine
│  │     │  ├─ plans-grants/
│  │     │  ├─ obligations/      ← obligations register, reporting calendar, action queue
│  │     │  ├─ competitions/     ← sport-agnostic core
│  │     │  ├─ accreditation/
│  │     │  ├─ disputes/         ← protests, appeals, disciplinary decisions
│  │     │  ├─ development/
│  │     │  ├─ talent/
│  │     │  ├─ facilities/       ← assets, bookings, maintenance, equipment
│  │     │  ├─ restricted/       ← safeguarding & medical clearance (isolated)
│  │     │  ├─ notifications/
│  │     │  ├─ service-desk/
│  │     │  ├─ imports/
│  │     │  ├─ integration/
│  │     │  ├─ reporting/
│  │     │  └─ assistant/        ← phase 5
│  │     └─ main.ts
│  ├─ web/                       ← Next.js: institutional portal + workspaces
│  ├─ public-portal/             ← Next.js: public notices, calendars, results (static/ISR)
│  └─ worker/                    ← BullMQ workers (imports, reports, notifications, MV refresh)
├─ packages/
│  ├─ contracts/                 ← Zod schemas + OpenAPI-generated client shared by api/web
│  ├─ sport-sdk/                 ← SportPlugin interface, family base classes, test harness
│  ├─ sports/
│  │  ├─ football/
│  │  ├─ athletics/
│  │  ├─ volleyball/
│  │  └─ cycling/
│  ├─ ethiopian-calendar/        ← EC ↔ GC conversion, fiscal-year helpers
│  ├─ ui/                        ← shared components (shadcn based), design tokens
│  ├─ i18n/                      ← message catalogues: om (Afaan Oromo), am, en
│  └─ config/                    ← eslint, tsconfig, prettier
├─ infra/
│  ├─ docker-compose.yml         ← postgres+postgis, redis, minio, keycloak, mailhog
│  ├─ keycloak/realm-export.json
│  ├─ helm/                      ← later
│  └─ backup/                    ← pgBackRest config + restore drill script
├─ db/
│  ├─ migrations/                ← SQL (drizzle-kit generated + hand-written RLS)
│  └─ seed/                      ← fictional demo data only
└─ tests/e2e/                    ← Playwright acceptance scenarios (09-testing)
```

## 3. Module rules

- Each module = its own Postgres schema (`people.person`, `competitions.result_version`, …).
- A module may **read** another module's data only via that module's exported service or a read-only view the owning module publishes (e.g. `people.v_person_public`).
- Cross-module side effects use **domain events** (in-process event bus, persisted to `core.outbox` for reliability; worker relays to BullMQ for async consumers).
- `restricted` exposes **status only** (`cleared | not_cleared | pending | expired`) via `RestrictedClearanceService.getStatus(personId, purpose)`.
- Lint rule (`eslint-plugin-boundaries`) enforces imports: `modules/X` may import only `core`, `packages/*`, and `modules/Y/public-api.ts`.

## 4. Request pipeline (API)

```
HTTP → Keycloak JWT validation → load ActorContext (user, role assignments, scopes)
     → Zod validation → @RequirePermission(perm, scopeResolver) → service
     → DB transaction with `SET LOCAL app.actor_id / app.scopes` (feeds RLS)
     → audit event + outbox event in same transaction → response
```

## 5. Data tiers

| Tier | Store | Notes |
|---|---|---|
| OLTP | PostgreSQL (schemas per module) | RLS on all tables carrying `org_id`/`sport_id`/`territory_id` |
| Restricted | PostgreSQL `restricted` schema, separate DB role | Column encryption (pgcrypto) for case notes; separate audit stream |
| Documents/evidence | MinIO buckets: `documents`, `evidence` (object lock), `imports`, `public` | SHA-256 hash stored in DB; presigned URLs, short TTL |
| Reporting | `reporting` schema: facts, dimensions, materialised views | Refreshed nightly + on-demand; each MV row carries `as_of`, `source`, `coverage` |
| Search | Postgres full-text + trigram (`pg_trgm`) | Also used for duplicate-person matching |
| Cache/queues | Redis | BullMQ queues: `imports`, `notifications`, `reporting`, `integration`, `outbox` |

## 6. Offline capture

Used for: session attendance, match/meet result entry, accreditation gate scans, inspections.

- Next.js PWA with service worker; local store in IndexedDB (Dexie).
- Every offline record carries `client_id`, `device_id`, `captured_at`, `base_version`.
- Sync endpoint `/sync/push` accepts batches; server detects conflicts when `base_version` ≠ current → creates a **conflict record** for human resolution. Never last-write-wins for results.
- UI always shows connection status and pending-sync count (proposal: "offline status must be visible").
- Accreditation credentials are signed (Ed25519) tokens in QR; scanners verify offline and sync a revocation list.

## 7. Internationalisation & calendar

- Locales: `om` (Afaan Oromo, Qubee/Latin) default, `am` (Amharic, Ge'ez script), `en`. Fallback chain om → en.
- Fonts: include Noto Sans Ethiopic for Ge'ez.
- Calendar: store Gregorian; user preference displays Ethiopian calendar via `packages/ethiopian-calendar`.
- Fiscal year: Ethiopian FY (Hamle 1 → Sene 30), configurable (OD-09). Plans, grants and reporting periods are keyed by `fiscal_year` + `period`.
- Phone numbers: E.164 with `+251` default; SMS provider abstracted (OD-08).

## 8. Integration

- **Imports** (phase 1): CSV/XLSX templates per entity → staged table → validation report → duplicate check → data-steward approval → commit. Every import has a reconciliation report (rows in / accepted / rejected / held).
- **Outbound/inbound APIs** (later): `integration` module with per-partner API clients, OAuth2 client credentials, scopes, rate limits, signed webhooks, dead-letter queue with manual replay.
- **External IDs**: stored in `people.external_identifier (issuer, scheme, value, verified_at, verified_by)`. Football FIFA/CAF/EFF references are football-only and conditional (OD-06).
- **Finance**: `plans-grants` stores `finance_reference` (external voucher/commitment numbers). No ledger.

## 9. Environments & operations

| Env | Purpose |
|---|---|
| `local` | Docker Compose, seeded fictional data |
| `dev` | Shared integration, auto-deployed from `main` |
| `pilot-staging` | Federation UAT, anonymised/approved sample data |
| `pilot-prod` | Live pilot |

- CI (GitHub Actions): lint, typecheck, unit, integration (Testcontainers), e2e (Playwright vs compose), OpenAPI diff, migration check, dependency audit, container image scan.
- Observability: OpenTelemetry → Prometheus/Grafana + Loki; health endpoints; uptime alerts.
- Backups: pgBackRest (full weekly, diff daily, WAL archiving), MinIO bucket replication. **Restore drill is an acceptance gate** (script in `infra/backup/restore-drill.sh`, results logged).
- RPO/RTO: placeholders 24h/8h until agreed (OD-02).

## 10. Performance assumptions (pilot)

Pilot targets, to be revised after assessment: ≤ 500 concurrent users, ≤ 200k person records, p95 API < 400 ms for list/detail, result publication < 5 s after validation, command-centre MVs refresh < 10 min.
