# 01 — Product Scope, Users and Glossary

Source: *Oromia Digital Sports Infrastructure 2030 — Concept Note* (Wavlan Technology, 23 Oct 2026) and the matching executive presentation.

## 1. Mission

Enable Oromia to **manage, develop, operate, connect and measure** its sports ecosystem through trusted regional digital infrastructure. Leadership must be able to trace any reported outcome back to: an approved programme → responsible organisation → competition or session → supporting evidence → reporting period.

## 2. The five pillars → system modules

| Pillar | System modules (see 07-module-specs.md) |
|---|---|
| **1. Digital Bureau & Federations** | `portal-public`, `institutions` (federation directory), `documents`, `workflow` (applications & approvals), `plans-grants`, `obligations`, `service-desk`, `notifications` |
| **2. Sports Operations** | `people` (Athlete 360), `clubs` (Club 360), `qualifications` (coach & official mgmt), `competitions` (core + sport plugins), `accreditation`, `disputes` |
| **3. Sports Development** | `development` (programmes, sessions, attendance), `talent` (observations, trials, referrals, selection), `education` (courses), `restricted` (safeguarding/medical status) |
| **4. Digital Facilities** | `facilities` (assets, venues, routes), `bookings`, `maintenance`, `equipment`, `ticketing` (optional, later) |
| **5. Sports Intelligence** | `reporting` (indicator registry, command centre), `geo` (activity map), `assistant` (AI, phase 5 only) |
| **Cross-cutting** | `iam` (identity, roles, scopes), `audit`, `imports` (migration & data exchange), `integration` (external APIs), `i18n`, `offline-sync` |

## 3. Ecosystem layers

| Layer | Role in the platform |
|---|---|
| Bureau leadership | Regional priorities, programme oversight, investment, verified reporting |
| Federation workspaces | Governance + technical operations for each sport (4 initially) |
| Territorial delivery | Zonal, woreda and city offices manage assigned programmes and evidence |
| Clubs, schools, academies | Maintain approved records, deliver programmes, submit entries and referrals |
| Participants & officials | Registration, assignment, training and correction services |
| Facility & event operators | Venues, equipment, bookings, safety tasks, event services |
| National & specialist systems | Exchange permitted information via agreements or validated imports |

## 4. User groups (personas → roles)

Roles are seeded as **templates**; actual role names, hierarchies and delegations are confirmed in assessment (OD-03).

### Institutional

| Persona | Role key(s) | Main jobs |
|---|---|---|
| Executive sponsor / Bureau leadership | `bureau.executive` | Command centre, exceptions, steering decisions |
| Bureau product owner | `bureau.product_owner` | Priorities, acceptance, configuration change control |
| Bureau reviewer (programmes) | `bureau.reviewer` | Review federation plans/submissions |
| Bureau finance officer | `bureau.finance` | Funding availability checks, reconciliation of references |
| Bureau authorising officer | `bureau.approver` | Final decisions on plans and grants |
| Federation president / secretariat | `fed.president`, `fed.secretariat` | Governance records, obligations, correspondence |
| Federation registrar | `fed.registrar` | Verify people, clubs, affiliations; resolve duplicates |
| Technical / competition department | `fed.competition_manager`, `fed.technical_reviewer` | Rules, entries, scheduling, appointments, result validation |
| Development & inclusion team | `fed.development_officer` | Programmes, referrals, camps, women's & youth pathways |
| Federation finance | `fed.finance` | Budgets, acquittals |
| Communications | `fed.communications`, `bureau.communications` | Public notices, circulars |
| Territorial coordinator | `territory.coordinator` | Local programmes, evidence, follow-up |
| Data steward | `data.steward` | Record quality, duplicate queues, imports |
| ICT operations / platform admin | `platform.admin` | Users, config, integrations — **no default access to personal records** |

### Ecosystem

| Persona | Role key(s) | Boundary |
|---|---|---|
| Club / academy administrator | `club.admin` | Own profile, rosters, entries, obligations |
| Athlete | `person.self` | Own record, applications, correction requests |
| Guardian | `person.guardian` | Linked minor's record per policy (OD-11) |
| Coach | `coach` | Assigned programmes and participants |
| Referee / technical official | `official` | Availability, appointments, declarations, result submission |
| School / university focal | `school.focal` | Agreed participation & referrals |
| Facility / race operator | `facility.operator` | Assigned assets, bookings, readiness evidence |
| Medical / safeguarding professional | `restricted.case_officer` | Restricted cases only |
| Media / public | anonymous | Public portal only |
| Sponsor / supplier | `partner.viewer` | Contracted deliverables only; **no athlete access** |
| National body (system) | API client | Permitted recognition checks / reporting |

## 5. Workflow families (for onboarding any sport)

New sports join via a **family template** + their own rule set (see 06-sport-plugins.md):

| Family | Examples | Core structures |
|---|---|---|
| `team_match` | Football, volleyball, basketball, handball | Squads, fixtures, scores, standings |
| `measured_timed` | Athletics, cycling, swimming | Heats, distances/times, units, verified performances |
| `combat_judged` | Taekwondo, wrestling, boxing, gymnastics | Weight/age categories, draws, judges, scoring rules |
| `racket_mind` | Table tennis, tennis, chess | Pairings, sets/rounds, rating references |
| `traditional_para` | Traditional sports, para sport | Approved formats, classifications, access needs |

## 6. In scope vs out of scope

**In scope (platform):** registries, workflows, documents, plans & grant tracking, competitions, results, accreditation, development, facilities, reporting, controlled AI assistance (phase 5).

**Out of scope / boundaries:**
- Official accounting ledger (stays in finance system — we store references).
- Issuing recognition, national affiliation or internationally recognised qualifications.
- Election or recognition outcomes (we record authorised decisions only).
- Automated selection, sanctions, doping determinations, fitness-to-compete or spending approval.
- Road-use / safety approvals for cycling (competent authorities approve; we store evidence).
- Hardware (turnstiles, biometrics, sensors, CCTV) — optional site packages after survey.
- Unrestricted regional medical database.

## 7. Glossary

| Term | Meaning |
|---|---|
| **Person** | One human, one record, region-wide. Holds many dated roles. |
| **Affiliation** | Dated link Person ↔ Organisation ↔ Sport (± discipline, category). |
| **Registration** | A season/competition-scoped admission of a person or team, created by a workflow. |
| **Eligibility check** | Rule evaluation for a specific entry; produces pass / fail / exception-for-review. |
| **Organisation** | Bureau, territorial office, federation, club, school, academy, facility operator, national body. |
| **Discipline section** | Sport-specific section of a multi-sport club (own squads, staff, obligations). |
| **Rule set** | Versioned federation-owned configuration (categories, limits, tie-breaks, units). |
| **Event** | Generic competitive unit: football match, athletics event session, volleyball match, cycling race stage. |
| **Result version** | Immutable snapshot of a result with status and decision trail. |
| **Obligation** | Something an organisation must submit by a date (report, document, renewal). |
| **Evidence** | Document/photo/file/data supporting a claim of delivery; required to close actions. |
| **Indicator** | Registered metric with definition, numerator, denominator, source, owner, refresh. |
| **Territory** | Region → zone → woreda / city administration → (kebele, optional). |
