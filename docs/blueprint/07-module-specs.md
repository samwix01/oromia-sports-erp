# 07 — Module Specifications

Format per module: **Purpose · Phase · Key screens · API surface · Domain events · Rules**. Endpoints are prefixed `/api/v1`. All list endpoints support `?q=&page=&pageSize=&sort=&filter[...]` and return `{ data, page, total }`.

---

## M-IAM — Identity, roles, scopes · Phase 1

- **Screens:** My account (locale, calendar pref, MFA); Users in my organisation; Invite user; Role assignments (with scope picker: org tree, sport, territory, validity); Delegations; Access review report.
- **API:** `GET /me`, `GET/POST /users`, `POST /users/:id/assignments`, `DELETE /assignments/:id`, `POST /delegations`, `GET /access-review?orgId=`.
- **Events:** `iam.assignment.granted|revoked`, `iam.user.activated`.
- **Rules:** admins can only grant roles ≤ their own within their scope; `platform.admin` manages config but gets no personal-data read.

## M-TER — Territories · Phase 1

- Import region → zone → woreda/city hierarchy (OD-10 for the authoritative list). Optional boundary geometries for the map.
- **API:** `GET /territories/tree`, `POST /territories/import`.

## M-INST — Institutions & federation directory · Phase 1

- **Screens:** Federation directory (public/internal views); Organisation profile (recognition evidence, statutes, committees, office terms, signatories, affiliations); Organisation onboarding (club recognition workflow); Org tree.
- **API:** `GET/POST /organisations`, `GET /organisations/:id`, `POST /organisations/:id/committees`, `POST /committees/:id/terms`, `POST /organisations/:id/signatories`, `POST /organisations/:id/recognition` (starts `org_recognition`).
- **Events:** `institutions.organisation.recognised|suspended`.
- **Rules:** recognition is recorded from an authorising decision; the platform never grants recognition by itself.

## M-PEOPLE — Athlete 360 · Phase 1

- **Screens:** Person search (trigram, masked); Register person (assisted mode flag); Athlete 360 (tabs: Profile · Roles & affiliations timeline · Registrations · Results (per sport) · Qualifications · Development · Documents · External IDs · Clearance status · History); Duplicate review queue (side-by-side, signals, decision + reason); Correction requests; Merge (reversible).
- **API:** `GET /people?q=`, `POST /people` (via `person_registration`), `GET /people/:id/360`, `POST /people/:id/affiliations` (via workflow), `POST /people/:id/external-ids`, `GET /duplicates?status=open`, `POST /duplicates/:id/decide`, `POST /people/:id/corrections`, `POST /people/merge`.
- **Events:** `people.person.created|verified|merged`, `people.affiliation.activated|ended`.
- **Rules:** duplicate check runs on create/import (name trigram + DOB ± tolerance + phone + evidence hash); score ≥ threshold → candidate; **never auto-merge**. Affiliation overlap constraint per sport.

## M-CLUB — Club 360 · Phase 1 (profile) / Phase 2 (competition tabs)

- **Screens:** Club 360 (tabs: Institution · Sport sections · Squads/rosters · Staff & qualifications · Competition activity · Documents & compliance · Facilities & equipment · Finance refs & messages · Action queue).
- **API:** `GET /clubs/:id/360`, `POST /clubs/:id/sections`, `GET/POST /sections/:id/squads`, `POST /squads/:id/members`.
- **Rules:** multi-sport clubs keep separate sections with their own obligations.

## M-QUAL — Coach & official management · Phase 1 (register) / Phase 2 (appointments)

- **Screens:** Qualification types (per sport); Qualification register; Verify claim; Expiry dashboard (≤60/30 days); Availability calendar; Conflict declarations.
- **API:** `GET/POST /qualification-types`, `GET/POST /qualifications`, `POST /qualifications/:id/verify`, `GET /qualifications/expiring?days=60`, `POST /people/:id/availability`, `POST /people/:id/conflicts`.
- **Rules:** platform stores evidence; it does not issue externally recognised qualifications. Football licence categories never applied to other sports.

## M-DOC — Documents · Phase 1

- Versioned documents with classification, retention class, SHA-256, virus scan, preview (PDF/image), presigned download with audit.
- **API:** `POST /documents` (multipart or presigned upload flow), `POST /documents/:id/versions`, `GET /documents/:id`, `GET /documents/:id/download`.

## M-WF — Workflow engine · Phase 1

See 05-workflows.md. **Screens:** My inbox (to act on), My submissions, Submission detail (versions diff, step log, attachments, actions), Workflow definitions (admin, read-only in pilot).
**API:** `POST /submissions`, `POST /submissions/:id/actions {action, reason, attachments}`, `GET /inbox`, `GET /submissions/:id`.

## M-OBL — Obligations, reporting calendar, action queue · Phase 1

- **Screens:** Obligation register (by org type/sport); Reporting calendar (Ethiopian/Gregorian); My actions; Org compliance view; Bureau exceptions queue.
- **Jobs:** daily instance generation from RRULEs; overdue marking; action creation.
- **Rules:** missing submission = `overdue` (visible), never counted as zero activity.

## M-PLAN — Plans & grants · Phase 1 (plan approval) / Phase 2+ (delivery & acquittal)

- **Screens:** Annual plan builder (activities by pillar, owners, territories, budget lines, milestones, targets); Plan review; Funding decision; Delivery reports with evidence; Acquittal; Plan vs delivery dashboard.
- **API:** `GET/POST /plans`, `POST /plans/:id/activities`, `POST /activities/:id/budget-lines`, `POST /plans/:id/submit`, `POST /activities/:id/delivery-reports`, `POST /funding-decisions/:id/acquittals`.
- **Rules:** finance references only; no ledger. Fiscal year = Ethiopian FY.

## M-COMP — Competitions core · Phase 2

- **Screens:** Competition list/calendar; Create competition (pick sport → plugin format form, pin rule set); Categories & entry standards; Entries inbox (eligibility results, exceptions); Schedule builder (plugin generator + manual edits, venue/route allocation, clash detection: venue, official, athlete in two events); Event detail (participants, officials, readiness checklist, result versions); Result entry (plugin form; offline-capable); Validation queue; Publication; Standings/classifications; Records.
- **API:** `GET/POST /competitions`, `POST /competitions/:id/categories`, `POST /competitions/:id/entries`, `GET /competitions/:id/entries?eligibility=exception`, `POST /entries/:id/members/:mid/override`, `POST /competitions/:id/schedule/generate`, `GET/PATCH /events/:id`, `POST /events/:id/appointments`, `POST /events/:id/results` (new version), `POST /result-versions/:id/validate|publish|return`, `GET /competitions/:id/standings`.
- **Events:** `competitions.result.published|superseded`, `competitions.entry.accepted`, `competitions.event.completed`.
- **Rules:** see 05 §4–5 and 06. Multi-sport games share logistics/accreditation, each federation controls its technical results.

## M-ACC — Accreditation & event desk · Phase 2

- **Screens:** Delegations; Credential types & zones; Issue credentials (bulk from accepted entries + appointments); Print/digital badge (QR); Gate scanner (PWA, offline); Revocation; Scan reports.
- **Rules:** QR = signed token (credential id, zones, validity, kid). Revocation list synced to scanners; scans logged with offline flag.

## M-DISP — Protests, appeals, discipline · Phase 2

- **Screens:** Lodge protest (deadline countdown); Case file (evidence, hearings, decision drafting); Decisions register; Sanctions register; Appeals.
- **Rules:** auto-proposed sanctions (e.g. card accumulation) are **proposals** pending committee decision. Decisions link to result corrections.

## M-DEV — Sports development · Phase 3 (pilot may start basic programmes earlier)

- **Screens:** Programmes (school, community, academy, camp, women & girls, para); Sites & sessions; Enrolment; Attendance (offline, bulk tick); Equipment needs; Coach course management; Programme dashboard (unique people vs enrolments vs attendances, retention).
- **Rules:** measure unique people separately from enrolments and attendances; women's/youth/para access tracked at every stage; assisted registration available.

## M-TAL — Talent pathway · Phase 3

- **Screens:** Observations; Trials (sign-up, results per sport); Referrals (send/accept/outcome); Development plans & milestones; Selections (criteria document, candidate list, reasons, approval); Pathway funnel (per sport, per territory).
- **Rules:** no cross-sport talent ranking; selection reasons mandatory; no promise of national selection; national referrals only via authorised processes.

## M-RES — Restricted (safeguarding & medical clearance) · Phase 3 (clearance status may be needed in Phase 2)

- **Screens (case officers only):** Case intake (restricted reporting channel), case file, referrals to professionals, clearance issuance.
- **Other modules see:** clearance status badge only.

## M-FAC — Facilities · Phase 4 (basic asset register in Phase 1 for venue IDs)

- **Screens:** Asset register (map + list, filters by sport suitability, condition, accessibility); Asset detail (spaces, capacity, operator, documents, photos); Booking calendar (request, conflicts, approve, cancel); Verified use (attendance count, evidence); Inspections (checklists per asset type, offline); Defects & work orders; Equipment inventory & custody; Cycling routes (versions, map, checkpoints, permits, readiness).
- **Rules:** a booking is not proof of utilisation; utilisation indicators use verified use only. Hardware packages (turnstiles, biometrics, sensors, displays, timing links) are optional integrations scoped after site survey.

## M-TKT — Ticketing & gate (optional) · Phase 4+

Only after business case approval (OD-14). Payment provider integration (e.g. Telebirr/Chapa/bank) via `integration`; reconciliation of entry totals vs payment references.

## M-RPT — Reporting & command centre · Phase 1 (initial) → Phase 5 (advanced)

- **Indicator registry screen:** every indicator shows definition, numerator/denominator, source, owner, refresh time, coverage, verification status.
- **Command centre (Bureau):** tiles — Programme delivery (approved / delivered / verified / overdue), Participation (unique athletes, affiliations, programme retention), Competitions (scheduled / completed / validated / disputed by sport), Facilities & investment (verified use, readiness issues, maintenance, financial exceptions), Coverage (recognised / active / onboarded bodies vs approved denominator). Each tile drills to source records within the viewer's permissions. Action/evidence queue panel.
- **Federation view:** same model scoped to one sport + sport-specific panels.
- **Activity map (PostGIS + MapLibre):** clubs, programmes, facilities, reporting gaps by territory (gaps shown distinctly from zero).
- **Exports:** CSV/XLSX/PDF with footer: source, period, as_of, coverage, suppression note.
- **Rules:** missing ≠ zero; small-cell suppression; no medal-only federation ranking.

## M-AI — Sports intelligence assistant · Phase 5 only

- Retrieval over **permitted** reporting views and records (permission filter applied before retrieval), tool-calling to typed read-only query functions (e.g. `listOverdueObligations`, `expiringQualifications`, `eventsAwaitingResults`, `openWorkOrders`, `programmeRetention`).
- Answers must cite source records/indicators, period and freshness; state when data is incomplete; decline unsupported totals.
- **Read-only.** Any record change → it drafts, a human approves via normal workflow.
- Excluded: athlete selection, sanctions, doping determinations, fitness to compete, spending approval, predictive performance models (separate governance).
- Model/provider choice and data residency: OD-15. Log prompts/answers to `audit` with redaction.

## M-PUB — Public sports portal · Phase 1 (notices, directory) / Phase 2 (calendars, results)

- Afaan Oromo first; approved notices, calendars, published results with status badges, federation directory (public fields), service guidance, enquiry/complaint form → service desk.
- ISR/static generation; no personal data beyond what federation policy publishes.

## M-SD — Communication & service desk · Phase 1

- Targeted circulars (by org type, sport, territory) with read receipts; enquiries/complaints with SLA and routing.

## M-IMP — Imports & migration · Phase 1

- Templates (XLSX) per entity: organisations, people, affiliations, qualifications, venues, historical results.
- Flow: upload → staging → validation report (row errors with i18n messages) → duplicate check → steward approval → commit → reconciliation report. Idempotent re-runs by `source_key`.

## M-INT — Integration · Phase 2+

- API clients, scopes, webhooks, dead-letter queue UI. National systems only under access agreements (OD-06).
