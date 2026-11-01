# 09 — Testing Strategy and Acceptance Scenarios

## 1. Test pyramid

| Layer | Tool | What |
|---|---|---|
| Unit | Vitest | Plugins (pure), eligibility rules, calendar, workflow transitions, masking serialisers |
| Contract | Zod + OpenAPI diff | Breaking API changes fail CI |
| Integration | Vitest + Testcontainers (Postgres/PostGIS, Redis, MinIO) | Services + DB + RLS + triggers + jobs |
| Permission matrix | Generated tests | Every seeded role × every permission × in-scope / out-of-scope record |
| E2E | Playwright | Acceptance scenarios below, run in om and en |
| Load | k6 | 02 §10 targets |
| Security | ZAP baseline, Trivy, npm audit | CI + pre-release |

Fixtures use **fictional** organisations and people only (`Demo Club A`, `Demo Athlete 001`). Never real names.

## 2. Foundation acceptance gate (Phase 1)

From the proposal: *demonstrate organisation separation, least-privilege access, representative imports, duplicate handling, correction history and a restore drill; each federation reviews its registry fields and roles before live entries open.*

| # | Check | Automated test |
|---|---|---|
| F1 | Organisation separation: Club A ≠ Club B; Football ≠ Athletics; Zone X ≠ Zone Y | `tests/e2e/foundation/separation.spec.ts` + RLS integration |
| F2 | Least privilege: platform.admin cannot read person records; Bureau dashboard ≠ record access | permission matrix |
| F3 | Representative import with reconciliation report | `imports.int.spec.ts` |
| F4 | Duplicate detection → human decision → (reversible) merge | `duplicates.e2e.spec.ts` |
| F5 | Correction history retained and viewable | `corrections.e2e.spec.ts` |
| F6 | Plan approval cycle with return & resubmit | `plan-approval.e2e.spec.ts` |
| F7 | Missing report shown as overdue, not zero | `obligations.int.spec.ts` |
| F8 | Restore drill passes, timing recorded | `infra/backup/restore-drill.sh` |
| F9 | Each federation signs off registry fields & roles | manual checklist (`docs/acceptance/foundation-signoff.md`) |

## 3. Operational acceptance scenarios (Phase 2) — one Playwright spec per sport

### 3.1 Football (`tests/e2e/football/entry-to-correction.spec.ts`)
1. Club admin submits player registration; registrar raises identity query; club responds; registrar verifies.
2. Club submits team entry; eligibility engine passes all but one (`exception`); registrar overrides with reason.
3. Competition manager appoints referee + commissioner (qualification check passes).
4. Referee submits match result offline → syncs; technical reviewer validates; manager publishes → standings update.
5. Opponent lodges protest within deadline → result `under_protest` on portal.
6. Committee upholds → corrected version seq 2 created; v1 `superseded` and still visible in history; standings recomputed; decision document linked.

### 3.2 Athletics (`tests/e2e/athletics/meet-to-correction.spec.ts`)
1. Club submits entries for 100m and long jump; one athlete fails entry standard → exception → rejected with reason.
2. Start lists/heats generated; lanes assigned; officials appointed.
3. Results submitted with wind; long-jump attempts recorded; reviewer validates; published; advancement to final computed.
4. Measurement correction (1 attempt) → new version; places and advancement recomputed; original retained; record candidate re-evaluated (no auto-ratification).

### 3.3 Volleyball (`tests/e2e/volleyball/match-to-dispute.spec.ts`)
1. Rosters submitted; libero limit enforced; registrar verifies.
2. Courts and referee/scorer allocated.
3. Scorer submits 3–2 set scores; validator flags a set not won by 2 → returned → corrected → validated → standings apply match points.
4. Disputed score → remains `under_protest` until decision confirms.

### 3.4 Cycling (`tests/e2e/cycling/race-to-protest.spec.ts`)
1. Organiser submits race + route version; permit evidence uploaded; readiness checklist completed.
2. Rider entries; start list approved; bibs issued; accreditation credentials issued.
3. Timing imported (CSV) + one incident logged; commissaires apply time penalty; classification validated & published.
4. Protest upheld → penalty removed → corrected classification published; history retained.

Each scenario also asserts: rule-set version pinned; access boundaries (other federation cannot see); credential revocation works; offline conflict produced when two devices edit the same draft; report figures reconcile with source records.

## 4. Pilot KPIs (proposed benchmarks — agree during assessment)

| KPI | Definition | Proposed benchmark | Source |
|---|---|---|---|
| Data completeness | Mandatory-field completion in accepted pilot records | ≥ 95%; flagged identity conflicts resolved or held before accreditation | `reporting.mv_data_completeness` |
| Technical operations | Witnessed entry-to-result cycle per federation | 4/4; first live event accepted before each sport's expansion | acceptance records |
| Reporting discipline | Agreed submissions on time in final two periods | ≥ 90% | obligations |
| User adoption | Designated operational users completing an assigned task in final pilot month | ≥ 80% | audit events |
| Processing efficiency | Median registration time vs observed baseline | target agreed after baseline | workflow timestamps |
| Facilities & development | Verified utilisation, maintenance closure, retention, completed referrals | vs agreed denominators | facilities / development MVs |
| Security & recovery | Permission tests + restore drill pass; no unresolved critical defect | pass | CI reports |

Programme-level targets from the deck (for 2030, need agreed baselines): ≥ 90% of active recognised bodies reporting digitally; ≥ 95% of approved in-scope competitions with validated results.

## 5. Definition of Done (every task)

- Tests from acceptance criteria written and passing; coverage of new code ≥ 80% lines (plugins ≥ 95%).
- Permissions registered + matrix test updated; audit events emitted.
- i18n keys added for om/am/en (placeholders allowed for am/om with `TODO-translate` marker tracked in a report).
- Migration reversible or documented forward-only; RLS policy on any new scoped table.
- OpenAPI updated; relevant spec in `docs/blueprint/` updated if behaviour changed.
