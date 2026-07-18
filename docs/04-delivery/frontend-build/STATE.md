# TaxLens Product Build State

> Technical execution state for autonomous stage handoffs. Product requirements remain owned by `frontend-design-consistency-cf1ebe.md` and the canonical repository docs.

## Current checkpoint

- Branch: `p3-frontend-design-consistency-final`
- Base: `origin/main` at `13a3b74` after the P1, P2, P4, and P5 Sprint 3 integrations
- Recovery stash: `codex-pre-p3-frontend-design-consistency-20260718` (retain until pushed branch verification)
- Current stage: P3 frontend release integration and Sprint 4 demo rehearsal
- Last accepted evidence: lint, typecheck, 41 Vitest tests, production build, and 33 Playwright tests across desktop, compact, and mobile all pass
- Next unit: probe the six-scene demo against integrated `main`; adapt only P3 frontend contracts and report backend gaps to their Sprint 4 owners
- Demo clock: `2026-08-03`
- Hero period: `2026-07`

## Non-negotiable state

- Preserve `frontend/new-design/` and `frontend/reference/` byte-for-byte.
- Do not modify the existing P1 or P4 worktrees.
- Do not expose JWTs to browser JavaScript or private model reasoning to users.
- Do not execute a persistent agent tool before its individual approval.
- Use canonical POS routes and one shared ledger/readiness calculation path.
- Update `log.md`, run the unit gate, and commit exact paths before advancing.
- Do not modify P1 matching, P2 agent internals, P4 backend/infra, or P5 seed/reset/data files without Tan explicitly widening scope.
- Pitch deck work is deferred by product-owner direction; do not create or modify it in this run.

## Handoff protocol

Every fresh implementation session must verify the expected branch, clean checkpoint, current HEAD, recovery stash, acceptance state, and relevant test evidence before editing. If any value disagrees with Git or the repository, Git and tested code win; update this file before continuing.
