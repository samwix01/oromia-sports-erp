# 10 — Open Decisions Register

The proposal is explicit that most specifics must be confirmed during the 4–6 week assessment. **Claude Code must implement these as configuration with obviously fictional defaults and reference the ID in a `// DECISION: OD-xx` comment.** Never hardcode an assumed answer.

| ID | Decision | Default used in code until decided | Owner |
|---|---|---|---|
| OD-01 | Hosting location & provider (in-country data centre, government cloud, commercial cloud) | Containerised, provider-agnostic; S3-compatible storage | Bureau ICT + product owner |
| OD-02 | RPO / RTO and support hours | RPO 24h, RTO 8h (placeholders) | Bureau + Wavlan |
| OD-03 | Authority matrix: role names, reporting hierarchy, delegations, approval steps per workflow | Role templates in 01 §4; steps in 05 §3 | Bureau product owner, federations |
| OD-04 | Applicable data-protection requirements, lawful basis, retention schedules | Minimum-necessary; retention classes flagged, no auto-delete | Institutional legal specialists |
| OD-05 | Which identity documents are accepted and whether full ID numbers (e.g. Fayda) may be stored | Hash + last 4 digits only | Bureau + legal |
| OD-06 | National/international interfaces (EFF, FIFA Connect, CAF, Ethiopian Athletics Federation, World Athletics, national cycling/volleyball bodies) — permissions & method | References only; manual entry with verification date | Each federation + national bodies |
| OD-07 | Each federation's technical rules: categories, roster limits, tie-breaks, registration windows, entry standards, timing precision, penalty regulations | Plugin `defaultRuleSet()` marked **draft / fictional** | Federation technical authorities |
| OD-08 | SMS / email providers | Console + SMTP adapters | Bureau ICT |
| OD-09 | Fiscal year & reporting periods | Ethiopian FY, start Hamle 1; monthly periods | Bureau finance |
| OD-10 | Authoritative territory list (zones, woredas, city administrations) and boundaries | Fictional demo territories | Bureau / regional planning |
| OD-11 | Minors: age threshold, guardian consent, public display of minors in results | Under 18; name + club only, no photo/DOB | Bureau + federations + safeguarding lead |
| OD-12 | Volleyball scope: indoor, beach or both | Indoor; beach behind feature flag | Volleyball federation |
| OD-13 | Cycling official name, disciplines and race formats | Road race + time trial | Cycling federation |
| OD-14 | Ticketing/payments (provider, business case) | Disabled (feature flag) | Bureau finance |
| OD-15 | AI assistant model/provider, data residency, logging | Not built until Phase 5 | Bureau + ICT + governance review |
| OD-16 | Recognised federation register (full list beyond the four) | 4 federations seeded; onboarding flow for more | Bureau |
| OD-17 | Finance system to reference (name, reference formats, integration) | Free-text `finance_reference` with format regex config | Bureau finance |
| OD-18 | Languages beyond Afaan Oromo (Amharic, English) and translation ownership | om default, am + en catalogues | Bureau communications |
| OD-19 | Pilot footprint: Bureau HQ, two contrasting territorial offices, ~5 sports bodies, which events | Configurable; demo uses fictional sites | Bureau product owner |
| OD-20 | Software ownership, source escrow, data export & exit arrangements | Full data export endpoints from day one (CSV + JSON per module) | Contract |

## Inception confirmation register (from the proposal)

Request from the Bureau and federations during assessment: establishment instruments and organograms; federation recognition and national-affiliation evidence; competition regulations; registration and result samples; approved forms; facility inventory; finance workflows; application and infrastructure inventories; data-handling requirements; hosting and support expectations; capital and recurrent budget availability.

When any of these arrive, update the default above, record the decision (date, decided by, document reference) in `docs/decisions/OD-xx.md`, and open tasks for the code changes.
