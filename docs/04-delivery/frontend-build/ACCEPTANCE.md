# TaxLens Product Build Acceptance

| Stage | Outcome | Status | Required evidence |
| --- | --- | --- | --- |
| 0 | Git-safe bootstrap | Complete | Fresh branch from current `origin/main`, stash retained, assets verified |
| 1 | Frontend foundation | Complete | Install, lint, typecheck, build, routes, desktop/mobile browser and brand smoke |
| 2 | Locked design system | Complete | Showcase, component tests, responsive shell, accessibility primitives, auth/security and persistence contracts |
| 3 | Dashboard and transactions | P3 complete | Contract tests, visual snapshots, accessibility, and responsive browser evidence |
| 4 | Exceptions, invoices, readiness | P3 complete | Persisted 92-to-100 contract journey passes in Playwright |
| 5 | Sales capture | P3 complete | Sale, QR, cash, intent, and history UI journeys pass |
| 6 | SHB operations | P3 complete | Portfolio, merchant, case, run, audit, and compliance browser journeys pass |
| 7 | Public confirmation | P3 complete | Confirmed, expired, and invalid UI states pass across three viewports |
| 8 | Integrated UI gate | Complete | 41 Vitest and 33 Playwright tests pass; production build succeeds |
| 9 | Production data wiring | Partial | Same-origin authenticated clients exist; integrated-main response gaps remain owner-blocked |
| 10 | Agent runner | Blocked outside P3 | P2/main lacks the streamed execution and approval contracts consumed by the P3 UI |
| 11 | Realtime payments | Blocked outside P3 | Integrated webhook does not yet produce the allocation/status transition required by the UI |
| 12 | Settings and appearance | Complete | Light/dark/system, import journey, accessibility, and responsive parity pass |
| 13 | Real SHB data and traces | Partial | P3 UI and sanitized trace contracts pass; live tenant/RBAC behavior requires owner verification |
| 14 | Product release gate | In progress | P3 frontend gate passes; live six-scene rehearsal and cross-role backend contracts remain |

No stage is accepted by visual appearance alone. A user-facing action must reach its persisted backend outcome and the relevant read models must refresh.

`P3 complete` means the P3-owned product surface and contract behavior are verified. It does not claim that a missing P1/P2/P4/P5 runtime contract is complete.
