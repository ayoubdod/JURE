# Phase 6 definition-of-done notes

Evidence for browser sign-off. Status: PASS | FAIL | NEEDS BROWSER CHECK.

| Item | Status | Evidence |
| --- | --- | --- |
| Each fact appears fully in one place | PASS | Overview key-facts cards + type detail panes; `overviewLogic` / `adminOverviewLogic` tests |
| Header compact; work pane ~top 15% | NEEDS BROWSER CHECK | Header: `min-h-16`, `py-2`, `px-3 sm:px-5`; skeleton mirrors same |
| Overview ≈ one screen | NEEDS BROWSER CHECK | Three-column card grid + key facts; measure at 1280×800 |
| Exactly one primary CTA per type | PASS | `resolvePrimaryCta` + `resolvePrimaryCta.test.ts` |
| No duplicate action rows | PASS | Single header CTA / + New / More; sections use EmptyAction only |
| One shell, one modal host, one mobile pattern | PASS | `CaseWorkspaceShell`, `CaseWorkspaceModalHost`, `CaseWorkspaceNav` chip scroller |
| Nav counts on all three types | PASS | Nav items built with `count` / `countAriaLabel` in each `*DetailWorkspace` |
| Litigation top-level nav ≤ 7 | PASS | Lit group list in `LitigationDetailWorkspace` (≤7 parents) |
| Consultation: no drawer-era dependency | PASS | `ConsultationSessionBody` under `consultation-detail/`; grep: no `ConsultationSection` consumers |
| Legacy workspace removed | PASS | Phase 5 deleted matter workspace; Unknown uses shell |
| `?tab=`, `#follow-ups`, `?convert=1` | PASS | `aliasMatrix.test.ts`, `consultationDeepLinks.test.ts`, `stripConvertSearchParam` |
| Typecheck | PASS | `npx tsc --noEmit` exit 0 |
| Lint (no new issues vs baseline) | PASS | Workspace polish paths clean; pre-existing `consultation-rows` refresh warnings only |
| Tests pass | PASS | Vitest 12 files / 106+ tests |
| Shared skeleton, no double skeleton | PASS | `CaseWorkspacePage` → `CaseWorkspaceSkeleton` only |
| Empty states covered | PASS | OverviewEmpty / EmptyAction in overview + section panes |
| i18n key parity | PASS | `workspacesI18nParity.test.ts` (+ `AppMessages` / `types.ts` via tsc) |
| RTL logical classes | PASS | Detail/shell use `ms`/`me`/`border-e`/`text-start`; exceptions listed in Phase 6 deliverable |
| Focus return after modal | PASS | `pickModalFocusRestoreTarget` + ModalHost Proxy arm / dialog-close restore |
| `document.title` case ref | PASS | `CaseWorkspaceShell` effect sets/restores title |
| Header height measured | NEEDS BROWSER CHECK | Classes: `min-h-16`, `flex-wrap`, CTA `min-h-11` |
