---
description: Audit the current diff against the project's non-negotiable domain rules
---

Review `git diff main...HEAD` (or the files in $ARGUMENTS) against the 12 non-negotiable rules in `CLAUDE.md` and the engineering conventions. For each rule, report PASS / RISK / FAIL with file:line evidence. Specifically check:

- Any UPDATE/DELETE path on result versions, audit events or decisions
- Any automated decision (merge, eligibility, selection, sanction, spending) without a human approval step
- Any aggregate that treats missing data as zero, or lacks source/period/denominator
- Any new table with org/sport/territory columns but no RLS policy
- Any endpoint without `@RequirePermission`, Zod validation or audit
- Any hard-coded rule value that should be in a rule set, or any un-referenced open decision
- Any hard-coded user-facing string, float money, or non-fictional seed data
- Cross-module imports outside `public-api.ts`

Finish with a short list of required fixes.
