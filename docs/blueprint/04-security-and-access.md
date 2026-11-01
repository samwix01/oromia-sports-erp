# 04 — Security, Access Control, Privacy and Audit

The proposal's control framework: least privilege by **sport, organisation, role and territory**; data classification; versioned, logged, reviewable changes; privacy and retention; secure integration; tested resilience. This is a proposed framework, **not** a claim of certification or legal compliance — applicable law (e.g. Ethiopia's Personal Data Protection Proclamation) must be confirmed by authorised specialists (OD-04).

## 1. Access model: RBAC + scope (ABAC-lite)

A user has **role assignments**. Each assignment = `role` × `scope`:

```
scope = { org_id?, include_descendants: bool, sport_id?, territory_id?, include_sub_territories: bool, valid_from, valid_to }
```

A permission check passes when **any** active assignment grants the permission **and** the target record falls within that assignment's scope.

```ts
// apps/api/src/core/auth/require-permission.decorator.ts
@RequirePermission('people.affiliation.approve', {
  scope: (req) => ({ orgId: req.body.orgId, sportId: req.body.sportId }),
})
```

### Permission naming
`<module>.<entity>.<action>` — actions: `read`, `read_sensitive`, `create`, `update`, `submit`, `review`, `approve`, `return`, `reject`, `publish`, `export`, `configure`.

### Segregation of duties (enforced in workflow engine)
- The actor who **submits** a step cannot **approve** the same submission.
- `result.submit` and `result.validate` must be different people for the same event.
- `funding.decide` ≠ `acquittal.reconcile`.
- `duplicate.decide` requires `fed.registrar` or `data.steward` and is logged with a reason.
- Self-service: a user can never approve anything about their own person record or their own organisation's submission.

### Role template matrix (seed; adjust in OD-03)

| Permission area | bureau.executive | bureau.reviewer | bureau.approver | bureau.finance | fed.secretariat | fed.registrar | fed.competition_manager | fed.technical_reviewer | club.admin | official | coach | territory.coordinator | data.steward | platform.admin |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Command centre (aggregates) | R | R | R | R | own fed | – | own fed | – | – | – | – | own territory | R | – |
| Plans: submit | – | – | – | – | ✓ | – | – | – | – | – | – | ✓ | – | – |
| Plans: review/approve | – | review | approve | funding check | – | – | – | – | – | – | – | – | – | – |
| Person: read basic | agg only | – | – | – | own fed | own fed | own fed | own fed | own club | assigned events | own participants | own territory programmes | ✓ (masked) | – |
| Person: read sensitive (DOB, ID evidence) | – | – | – | – | – | own fed | – | – | own club (limited) | – | – | – | ✓ | – |
| Affiliation: approve | – | – | – | – | – | ✓ | – | – | request | – | – | – | – | – |
| Entries: submit | – | – | – | – | – | – | – | – | ✓ | – | – | – | – | – |
| Entries: review | – | – | – | – | – | ✓ | ✓ | – | – | – | – | – | – | – |
| Results: submit | – | – | – | – | – | – | – | – | – | ✓ (assigned) | – | – | – | – |
| Results: validate/publish | – | – | – | – | – | – | publish | validate | – | – | – | – | – | – |
| Users & config | – | – | – | – | own fed users | – | – | – | own club users | – | – | – | – | ✓ (no data read) |
| Restricted cases | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

Restricted cases are accessible only to `restricted.case_officer` assignments, never inherited.

## 2. Row-Level Security (defence in depth)

Every request opens a transaction and sets:

```sql
SET LOCAL app.actor_id = '<uuid>';
SET LOCAL app.scope_org_ids = '{...}';        -- expanded descendants
SET LOCAL app.scope_sport_ids = '{...}';
SET LOCAL app.scope_territory_ids = '{...}';  -- expanded descendants
SET LOCAL app.is_bureau_aggregate = 'false';
```

Example policy:

```sql
ALTER TABLE people.affiliation ENABLE ROW LEVEL SECURITY;
CREATE POLICY affiliation_scope ON people.affiliation
  USING (
    org_id = ANY (current_setting('app.scope_org_ids')::uuid[])
    OR sport_id = ANY (current_setting('app.scope_sport_ids')::uuid[])
       AND EXISTS (SELECT 1 FROM institutions.organisation o
                   WHERE o.id = org_id
                     AND o.territory_id = ANY (current_setting('app.scope_territory_ids')::uuid[]))
  );
```

- Integration tests (M1) must prove: a Football registrar cannot read Athletics affiliations; Club A cannot read Club B rosters; a territorial coordinator cannot see another zone.
- Reporting MVs are owned by a reporting role; aggregate endpoints apply **small-cell suppression** (default `min_cell_size = 5`) so minors or sensitive circumstances are not identifiable.

## 3. Data classification

| Class | Examples | Handling |
|---|---|---|
| `public` | Published results, calendars, notices, approved club names | Public portal; cacheable |
| `internal` | Plans, budgets, fixtures drafts, workflow comments | Authenticated + scoped |
| `confidential` | Person records, DOB, contact, ID evidence, guardian links, disciplinary files | Scoped + field masking; export requires `export` permission and is logged |
| `restricted` | Safeguarding, welfare, medical | `restricted` schema; encrypted notes; case-officer only; separate audit |

Field-level masking in API serialisers: e.g. `date_of_birth` → year only, phone → `+2519****1234` unless `read_sensitive`.

## 4. Minors & guardians

- `is_minor` computed from DOB (age < 18; threshold configurable).
- Minors' records: no public photo or DOB; public results show name + club only if federation policy allows (OD-11).
- Guardian access and consent scopes per approved policy; assisted registration flow records who assisted.

## 5. Authentication

- Keycloak realm `oromia-sports`. OIDC Authorization Code + PKCE for web.
- MFA (TOTP or SMS OTP) **required** for: all `bureau.*`, `fed.*`, `data.steward`, `platform.admin`, anyone with `approve`/`publish`/`export`.
- Session timeout: 30 min idle for privileged roles; refresh token rotation.
- Account lifecycle: invitation by an authorised admin within scope → activation → periodic access review (quarterly report of assignments per org).

## 6. Audit

- Every mutation, every `read_sensitive`, every export, every login/permission change → `audit.event`.
- Hash-chained; nightly job verifies chain and alerts on break.
- Audit UI: per-record history (who/what/when/why) for authorised reviewers; "explain this value" from any result or indicator.

## 7. Privacy & retention

- Minimum necessary fields; purpose recorded on role assignments and exports.
- `retention_class` on documents and personal records; scheduled job flags records past retention for steward review (no auto-delete in pilot).
- Correction requests flow (person → registrar) with evidence and decision.
- Data subject export (own record) for `person.self`.

## 8. Integration security

- OAuth2 client-credentials per partner; scopes per dataset; IP allow-lists where possible.
- Signed webhooks (HMAC-SHA256), replay protection (timestamp + nonce).
- Failed messages → dead-letter queue, visible in admin UI, manual replay with audit.

## 9. Application security baseline

- OWASP ASVS L2 as target checklist; dependency + container scanning in CI; secrets in env/Vault, never in repo.
- Rate limiting (per IP + per user), CSRF on cookie flows, strict CSP on web, upload scanning (ClamAV) and MIME sniffing for documents.
- Pen test + permission test suite before pilot go-live (acceptance gate). No unresolved critical defect at go-live.

## 10. Resilience

- Backups (see 02-architecture §9); **restore drill** is part of Foundation and Pilot acceptance.
- Incident response runbook in `docs/runbooks/` (create in M7).
