# 08 — Build Plan: Milestones and Task Cards

How to use: work milestones in order. Each task card is sized for one Claude Code session / one PR. Start a session with:

> Read CLAUDE.md and docs/blueprint/08-build-plan.md. Implement task **M1-T03**. Read the specs it references first. Write tests from its acceptance criteria before implementing. Run lint, typecheck and tests, then tick the card.

Mapping to the proposal's roadmap:

| Proposal phase | Milestones | Exit gate |
|---|---|---|
| Phase 0 — Assessment (4–6 wks) | **M0** scaffold + clickable prototype | Prototype demoed to Bureau product owner & federation reps |
| Phase 1 — Foundation (8–12 wks indicative) | **M1** platform core · **M2** registries · **M3** governance & reporting | *Foundation acceptance gate* |
| Phase 2 — Four-sport operations | **M4** competitions core · **M5** sport plugins · **M6** event services | *Operational acceptance gate* per federation |
| Pilot | **M7** pilot hardening | Pilot KPIs (09 §4) |
| Phase 3 — Development | **M8** | Safeguarding & outcome definitions approved |
| Phase 4 — Facilities | **M9** | Per-site survey accepted |
| Phase 5 — Intelligence & AI | **M10** | Definitions + permission enforcement demonstrated |

---

## M0 — Scaffold & prototype

- [x] **M0-T01 Monorepo scaffold.** pnpm + Turborepo; apps `api`, `web`, `public-portal`, `worker`; packages per 02 §2; strict tsconfig; ESLint (incl. `eslint-plugin-boundaries`), Prettier; Husky + commitlint. *AC:* `pnpm lint typecheck test` green on empty apps; boundaries rule fails on an illegal cross-module import (add a test fixture).
- [x] **M0-T02 Local infra.** `infra/docker-compose.yml`: postgres16+postgis, redis, S3-compatible storage, keycloak (realm import), mailhog. `pnpm dev` brings everything up. *AC:* health endpoint reports db/redis/object storage/keycloak OK.
- [x] **M0-T03 CI.** GitHub Actions: install, lint, typecheck, unit, integration (Testcontainers), build images, Trivy scan. *AC:* PR pipeline < 15 min.
- [x] **M0-T04 Design system & shell.** Tailwind + shadcn/ui in `packages/ui`; app shell with workspace switcher (Bureau / Football / Athletics / Volleyball / Cycling), language switcher (om/am/en), calendar toggle (EC/GC), connection-status indicator. Noto Sans Ethiopic. *AC:* switching locale changes all shell strings; no hard-coded strings (lint rule for JSX literals).
- [x] **M0-T05 Ethiopian calendar package.** EC↔GC conversion, formatting in om/am/en, fiscal year helpers (configurable start). *AC:* property tests round-trip 1900–2100 GC; known fixtures (e.g. Meskerem 1 / Enkutatash dates, leap Pagume 6) pass.
- [x] **M0-T06 Clickable prototype.** Static screens with **fictional** data for: command centre, federation workspace home (×4), Athlete 360, Club 360, entry review, result entry (football + athletics), plan approval inbox. Banner: "Illustrative — no live Oromia data". *AC:* navigable in browser; used in assessment workshops.

## Release 1 status (2026-11-02)

Built and tested (14 integration tests on Postgres 16): built-in login with lockout and TOTP (ADR-05 revised),
role templates with org × sport × territory scope, hash-chained append-only audit, workflow engine
(submit / approve / return / reject / resubmit / withdraw, maker ≠ checker), organisations with recognition
workflow, people registry with dated sport-scoped affiliations, masking and duplicate flagging, user
administration, live command centre, ERP screens in om/am/en.

Still open from M1–M3 (carried into Release 2): RLS policies (M1-T04), automatic audit coverage meta-test
(M1-T05), documents/S3 (M1-T07), workflow SLA → action items and version diff (M1-T08), notifications
(M1-T09), delegation and access-review report (M1-T10), committees/office terms/signatories (M2-T01),
discipline sections (M2-T02), affiliation change/transfer workflow (M2-T04), reversible merge (M2-T05),
external IDs and correction requests (M2-T06), qualifications (M2-T07), imports (M2-T09), and all of M3
except the first command-centre indicators.

## M1 — Platform core

- [ ] **M1-T01 DB foundation.** Drizzle setup, schema-per-module, uuid v7, base columns, migration runner, `core.outbox`, `audit.event` with hash chain + INSERT-only grant. *Refs:* 03 §15. *AC:* attempt to UPDATE/DELETE audit rows fails; chain verifier detects tampering in test.
- [ ] **M1-T02 Auth & ActorContext.** Keycloak OIDC in web + API JWT guard; `iam.user_account` auto-link; ActorContext loads assignments; MFA enforced for privileged roles (Keycloak policy). *AC:* e2e login; privileged user without MFA is blocked.
- [x] **M1-T03 Permission registry & `@RequirePermission`.** Static registry of permissions per module; role templates seeded from 04 §1; scope resolution (org descendants, territory descendants, sport). *AC:* unit matrix tests for every seeded role × 10 representative permissions.
- [ ] **M1-T04 RLS plumbing.** Transaction interceptor sets `app.*` settings; RLS policy helpers; template policies. *AC:* integration tests — Football registrar cannot read Athletics affiliation rows **even via raw SQL in the request transaction**.
- [ ] **M1-T05 Audit interceptor.** Auto-audit mutations with before/after (redacted per classification) and `read_sensitive` reads. *AC:* every controller mutation in the codebase is covered (meta-test scans routes).
- [x] **M1-T06 Territories & reference data.** `territories`, `ref.sport/discipline/category/rule_set` tables + admin APIs; seed fictional territories + the 4 sports. *AC:* tree API returns nested hierarchy; rule set config validated by plugin schema stub.
- [ ] **M1-T07 Documents.** S3 storage integration, presigned upload/download, versions, SHA-256, ClamAV scan job, classification. *AC:* infected test file quarantined; download of confidential doc audited.
- [ ] **M1-T08 Workflow engine.** Definitions, submissions, versions, step log, guards registry, segregation-of-duties, return/resubmit with diff, SLA job → action items. *Refs:* 05 §1–3. *AC:* generic test workflow passes all transitions; same actor cannot submit & approve; return without reason rejected.
- [ ] **M1-T09 Notifications.** In-app + email (mailhog) + SMS adapter interface (console driver in dev); i18n templates. *AC:* workflow return triggers in-app + email to submitter in their locale.
- [ ] **M1-T10 Users & role assignment UI.** Invite, assign with scope picker, delegation, access-review report. *AC:* club admin can invite users only into their club with ≤ their roles.

## M2 — Registries (Foundation)

- [ ] **M2-T01 Institutions & federation directory.** Organisation CRUD (via workflow for clubs), committees, office terms, signatories, recognition records, org affiliations; directory UI. *AC:* club recognition workflow end-to-end; recognised club appears in federation directory.
- [ ] **M2-T02 Discipline sections & squads.** *AC:* multi-sport club shows separate football and volleyball sections with distinct obligations.
- [ ] **M2-T03 Person registry.** Person model (Ethiopian naming), identity evidence (hash + last4), roles, guardian links, masking serialisers, assisted registration flag. *AC:* non-sensitive viewer sees masked DOB/phone; minor flagged.
- [ ] **M2-T04 Affiliations.** Dated, sport-scoped, exclusion constraint honouring `allowMultiClub`; registration & change workflows. *AC:* club change in football does not touch athletics affiliation; overlapping active football affiliation rejected by DB.
- [ ] **M2-T05 Duplicate detection & review.** pg_trgm + DOB tolerance + phone + evidence hash scoring; candidate queue; decide (same/different/held) with reason; reversible merge. *AC:* seeded near-duplicates detected; nothing auto-merged; merge reversible.
- [ ] **M2-T06 External identifiers & correction requests.** *AC:* correction approved by registrar updates field and keeps history.
- [ ] **M2-T07 Qualifications register.** Types per sport, claims, verification workflow, expiry job → action items. *AC:* expiring-in-60-days list correct; football licence types not selectable for athletics.
- [ ] **M2-T08 Athlete 360 & Club 360 UIs.** Tabs per 07; timeline of dated roles. *AC:* a person with athletics athlete + football coach roles displays both, each scoped to viewer permissions.
- [ ] **M2-T09 Imports framework.** XLSX templates, staging, validation report, duplicate check, steward approval, commit, reconciliation report, idempotency. *AC:* importing 5,000 fictional rows produces exact in/accepted/rejected/held counts; re-run is a no-op.

## M3 — Governance, obligations, initial reporting (Foundation)

- [ ] **M3-T01 Obligations & reporting calendar.** RRULE obligations, instance generation, overdue job, action items; calendar UI (EC/GC). *AC:* missing monthly report shows `overdue`, not 0.
- [ ] **M3-T02 Action queue.** Unified "My actions" + Bureau exceptions; closure requires evidence per type. *AC:* closing an evidence-required action without evidence fails.
- [ ] **M3-T03 Plans & grants (approval).** Plan builder, activities, budget lines (numeric), `plan_approval` workflow with `funding_available` guard (stub reads a configured envelope), funding decision with finance reference. *AC:* full cycle submit → review → return → resubmit → finance check → approve with version history.
- [ ] **M3-T04 Delivery reports & evidence.** *AC:* activity status moves to `verified` only after reviewer accepts evidence.
- [ ] **M3-T05 Indicator registry & reporting schema.** Indicator definitions table, MV framework with `as_of/coverage`, refresh jobs, suppression. Initial indicators: federation coverage, onboarded orgs, registered unique people by sport/territory/sex/age band, pending actions, obligation compliance, data completeness. *AC:* each indicator API returns definition + numerator + denominator + coverage + as_of.
- [ ] **M3-T06 Command centre v1 + federation view v1.** Tiles + action queue + drill-down within permissions. *AC:* territorial coordinator sees only own territory; drill-down lands on source records.
- [ ] **M3-T07 Public portal v1 & service desk.** Notices, federation directory, enquiry form → service desk tickets with SLA. *AC:* Afaan Oromo default; Lighthouse a11y ≥ 90.
- [ ] **M3-T08 Foundation acceptance pack.** Automated suite for gate (09 §2) + restore drill script + permission test report. *AC:* gate checklist report generated as PDF/HTML artefact in CI.

## M4 — Competitions core

- [ ] **M4-T01 sport-sdk.** Plugin interface, family base classes, conformance test harness, web component registry. *Refs:* 06 §1. *AC:* dummy plugin passes conformance.
- [ ] **M4-T02 Rule-set editor & approval.** Form generated from plugin Zod schema, version diff, approval workflow, pinning to competitions. *AC:* competition keeps pinned version after a new version is approved.
- [ ] **M4-T03 Competitions, stages, events, categories.** Lifecycle states; multi-sport games container. *AC:* All-Oromia-Games-style container with 2 sports shares accreditation scope but separate result authority.
- [ ] **M4-T04 Entries & eligibility engine.** Core rules + plugin rules, per-member outcomes, exception review, override with reason. *Refs:* 05 §5. *AC:* suspended athlete → fail; unresolved duplicate → exception; override audited.
- [ ] **M4-T05 Scheduling & clash detection.** Plugin generators; venue/route/official/athlete clash checks. *AC:* official double-booked in overlapping events flagged.
- [ ] **M4-T06 Official appointments.** Qualification + conflict checks; confirm/decline. *AC:* official with expired qualification cannot be confirmed without override.
- [ ] **M4-T07 Result versions & lifecycle.** Append-only versions, trigger allowing only status updates, validate/publish/return, segregation submit≠validate. *Refs:* 05 §4. *AC:* correction creates seq+1, old superseded, original still queryable.
- [ ] **M4-T08 Offline result capture.** PWA + IndexedDB + `/sync/push`, conflict records, visible sync status. *AC:* two devices editing same draft offline → conflict record, no silent overwrite.
- [ ] **M4-T09 Standings/classification snapshots & public results.** Recompute on publish/supersede; status badges on portal. *AC:* upheld protest updates standings and shows "Corrected on <date>".

## M5 — Sport plugins (one card per sport, then witnessed scenario)

- [ ] **M5-T01 Football plugin.** Rule set, match sheet/result schemas, events log, standings with configurable tie-breakers, card-accumulation *proposals*. *AC:* Schedule A scenario automated (09 §3.1).
- [ ] **M5-T02 Athletics plugin.** Event catalogue, integer marks, attempts/heights, heats/lanes/flights, advancement, wind & conditions, record candidates. *AC:* Schedule B scenario automated; corrected measurement re-ranks and updates advancement.
- [ ] **M5-T03 Volleyball plugin.** Indoor first (beach behind flag), set validation, match points, tie-breakers. *AC:* Schedule C scenario automated.
- [ ] **M5-T04 Cycling plugin.** Route versions, permits & readiness evidence, start lists, timing (ms), same-time gap rule, penalties, classifications. *AC:* Schedule D scenario automated; GPS never accepted as official timing source.
- [ ] **M5-T05 Federation workspaces.** Nav and home dashboards per sport using plugin `ui` hooks. *AC:* each workspace only lists its own sport's records.

## M6 — Event services

- [ ] **M6-T01 Accreditation.** Credential types, zones, bulk issue, Ed25519 QR, badge PDF, revocation. *AC:* revoked credential rejected by offline scanner after sync.
- [ ] **M6-T02 Gate scanner PWA.** Offline verification, scan log sync. *AC:* 1,000 scans offline sync without loss.
- [ ] **M6-T03 Protests, decisions, appeals, sanctions.** Deadline guards, case files, decision documents, linkage to result corrections. *AC:* late protest is flagged inadmissible-by-default but committee can decide otherwise with reason.
- [ ] **M6-T04 Event-day command view.** Prepare → Accredit → Operate → Validate → Publish & reconcile → Close & learn, with readiness checklists and incident log. *AC:* event cannot be closed while results unvalidated or incidents open without reason.
- [ ] **M6-T05 Operational acceptance pack.** Per-federation witnessed cycle checklist incl. eligibility exception + corrected/disputed result, rule versions, access boundaries, credential revocation, offline conflicts, report reconciliation.

## M7 — Pilot hardening

- [ ] **M7-T01 Performance & load test** (k6) against 02 §10 targets.
- [ ] **M7-T02 Security review:** ASVS L2 checklist, pen-test fixes, permission test suite report.
- [ ] **M7-T03 Observability & alerting** (OTel, Grafana dashboards, uptime, audit-chain verification alert).
- [ ] **M7-T04 Backup/restore drill** automated + documented RPO/RTO evidence.
- [ ] **M7-T05 Training & help:** in-app guided tasks per role (om/am/en), admin guide, registrar guide, official guide (`docs/guides/`).
- [ ] **M7-T06 Pilot KPI dashboard** (09 §4) with owners and sources.
- [ ] **M7-T07 Runbooks:** incident response, user support, data correction, release.

## M8 — Sports development (Phase 3)

- [ ] **M8-T01 Programmes, sites, sessions, enrolments, offline attendance.** *AC:* dashboard shows unique people ≠ enrolments ≠ attendances.
- [ ] **M8-T02 Coach & official education** (courses, attendance, assessments → qualification progression).
- [ ] **M8-T03 Talent: observations, trials, referrals, development plans.**
- [ ] **M8-T04 Selections** with mandatory criteria document & reasons; approval workflow.
- [ ] **M8-T05 Women's & girls' sport programme views** + regional coverage gaps (absent evidence ≠ no activity).
- [ ] **M8-T06 Restricted module:** case intake, encrypted notes, case officer access, clearance status API. *AC:* no non-case-officer role can read `restricted.case` even with DB-level query in request context.

## M9 — Digital facilities (Phase 4)

- [ ] **M9-T01 Asset register + map.** **M9-T02 Bookings** with exclusion constraint + verified use. **M9-T03 Inspections, defects, work orders** (evidence-based closure). **M9-T04 Equipment custody.** **M9-T05 Cycling routes/permits UI.** **M9-T06 Optional ticketing/gate integration** (feature-flagged, OD-14).

## M10 — Intelligence & AI (Phase 5)

- [ ] **M10-T01 Historical reporting & warehouse option** (evaluate moving `reporting` to a separate DB/ClickHouse).
- [ ] **M10-T02 Activity map v2** (choropleths with coverage overlays).
- [ ] **M10-T03 Assistant:** permission-filtered tool functions, source citations, freshness, refusal of unsupported totals, read-only; red-team test set of 50 questions incl. excluded judgements. *AC:* 100% of answers cite sources; 0 actions executed without human approval.
