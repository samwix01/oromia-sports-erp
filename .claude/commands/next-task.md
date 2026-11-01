---
description: Pick up the next unchecked task card from the build plan and implement it
---

1. Read `CLAUDE.md` and `docs/blueprint/08-build-plan.md`.
2. Find the first unchecked task card (`- [ ]`) in milestone order. If $ARGUMENTS names a card ID, use that one instead.
3. Read every spec the card references plus `docs/blueprint/10-open-decisions.md`.
4. Summarise the plan in ≤ 10 bullets (files to create/change, tests to write, open decisions touched) and proceed.
5. Write tests from the card's acceptance criteria first, then implement.
6. Run `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int` (and `pnpm test:e2e` if the card touches UI flows). Fix until green.
7. Check the work against the 12 non-negotiable rules in `CLAUDE.md`.
8. Tick the card in `08-build-plan.md`, update any spec whose behaviour changed, and commit with a Conventional Commit message referencing the card ID.
