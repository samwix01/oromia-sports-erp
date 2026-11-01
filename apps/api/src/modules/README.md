# Domain modules

One folder per module (see docs/blueprint/02-architecture.md §2). Each module owns its Postgres schema and
exposes a `public-api.ts`. Importing anything else from another module fails `pnpm lint`
(`tools/check-boundaries.mjs`).
