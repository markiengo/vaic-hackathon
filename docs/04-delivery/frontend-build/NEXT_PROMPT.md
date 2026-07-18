# Fresh Session Bootstrap

Continue the TaxLens P3 frontend release integration without reopening settled product decisions or taking another role's Sprint 4 work.

1. Read `AGENTS.md`, `frontend-design-consistency-cf1ebe.md`, `docs/04-delivery/frontend-build/STATE.md`, and `ACCEPTANCE.md`.
2. Read only the current stage's relevant canonical docs and source files.
3. Verify branch, `git status`, HEAD, recovery stash, last `log.md` entry, and the last accepted test evidence.
4. Work only in `p3-frontend-design-consistency-final`; implement P3 frontend integration, user-facing states, browser tests, and `docs/demo-script.md`.
5. Run the complete unit gate, update `log.md` and state, stage exact paths, and make one logical commit.
6. Return the unit, status, commit, tests, changed-file manifest, and next unit; never invoke another Codex process from inside the child session.

If the six-scene rehearsal exposes a missing backend, matching, agent, seed/reset, or infrastructure contract, record exact evidence and stop that path. Do not edit P1/P2/P4/P5 files unless Tan explicitly widens scope. The pitch deck is deferred and must remain untouched.

Stop safely on a wrong branch, unexpected dirty integration state, failed required test, missing commit, or state/HEAD mismatch. Never reset, clean, force push, silently alter another worktree, or claim partial work as a completed product.
