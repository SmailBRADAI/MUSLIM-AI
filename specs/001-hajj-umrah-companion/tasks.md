# Tasks: Rafiq al-Manasik (رفيق المناسك) — Hajj & Umrah Companion

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [contracts/](./contracts/)
**Format**: `[ID] [P?] [Story] Description` — `[P]` can run in parallel (different files, no dependency). Paths are under `apps/hajj-umrah/` unless noted.

## Phase 1: Setup

- [x] T001 Import the Figma Make prototype into `apps/hajj-umrah` (PR #1)
- [x] T002 Precache the build and self-host fonts with vite-plugin-pwa (PR #1)
- [x] T003 [P] Add Vitest + Testing Library and a first smoke test in `tests/unit/`
- [x] T004 [P] Add Playwright with `tests/e2e/offline.spec.ts` (load, go offline, reload) and axe checks (found and fixed two palette contrast failures: `--muted` darkened, new `--gold-text`)
- [x] T042 Rename the app to رفيق المناسك / Rafiq al-Manasik / رفیق المناسک (FR-016)
- [x] T043 [P] Content reviewer role: `content/reviewers.json`, `.github/CODEOWNERS` requiring a role holder on `apps/hajj-umrah/content/`
- [x] T005 Add GitHub Actions CI at repo root `.github/workflows/hajj-umrah.yml`: typecheck, unit, build, e2e

## Phase 2: Foundation (blocks all stories)

- [x] T006 Split `src/App.tsx` into `src/app/`, `src/screens/` and `src/components/` with no visual change
- [x] T007 [P] Move UI strings to `src/i18n/{ar,en,ur}.json` with a typed `useT()` hook and language context
- [x] T008 [P] Add `src/data/db.ts` (IndexedDB via `idb`) for settings, progress and installed packs; migrate the two localStorage keys
- [x] T009 Add content types in `src/data/types.ts` matching `contracts/content-pack.schema.json`
- [x] T010 Add `scripts/validate-content.ts`: schema check, unique journey/stage/step ids, per-language review status, every i18n key present in all 3 languages, `approved` requires reviewer and date, reviewer must be listed in `content/reviewers.json`; run in CI
- [x] T011 [P] `ReviewBadge` component: shows "reviewed" only for `approved`, otherwise "pending scholarly review"
- [x] T012 [P] `RulingTag` component for rukn / wajib / sunnah / mustahabb; shows both views when Ibn Baz and Ibn Al-Uthaymeen differ

**Checkpoint**: app looks the same as PR #1, all state in IndexedDB, content can be validated.

## Phase 3: User story 2 — Language and journey on first launch (P1)

- [x] T013 [US2] Onboarding screen: language choice, then Umrah or Hajj, then Hajj type
- [x] T014 [US2] Persist choices in IndexedDB; route to Home when onboarding is done; prototype users are kept on Umrah; slow storage never forces onboarding
- [x] T015 [US2] Settings screen: change language and journey without losing progress (progress is stored per journey); a failed save is reported
- [x] T016 [P] [US2] e2e: onboarding in each language checks `dir`, `lang` and selected guide (Umrah guide, or "being prepared" for Hajj until T031)

## Phase 4: User story 1 — Follow the Umrah offline (P1) 🎯 MVP

- [x] T017 [US1] `content/journeys/umrah.json` with Ihram, Tawaf, two rak'ahs, Sa'i, halq/taqsir, rulings per Ibn Baz and Ibn Al-Uthaymeen, all `status: "draft"` with sources listed
- [x] T018 [P] [US1] `content/i18n/{ar,en,ur}/umrah.json` texts for every step (title, instruction, details, common mistakes)
- [x] T019 [US1] `src/data/progress.ts`: complete, undo, current step; write to IndexedDB before updating UI
- [x] T020 [US1] Guide screen driven by journey data: step card, ruling tag, review badge, next step, details, common mistakes, other schools, sources (supplications link and audio wait for T035, T036)
- [x] T021 [P] [US1] `TawafDiagram` and `SaiDiagram` components with fixed direction in all languages
- [x] T022 [US1] Home "Continue my journey" shows real current step and progress
- [x] T023 [US1] Previous step and step list navigation; out-of-order completion allowed
- [x] T024 [P] [US1] Unit tests for progress logic; e2e: full Umrah offline in each language
- [x] T047 [US1] Step place (FR-019): required `place` on every step of every journey (schema, types, validation, versions bumped), and a "you are here" `PlaceVisual` at the top of each Guide step with the place highlighted and captioned in ar/en/ur; unit and e2e tests (including axe)
- [ ] T049 [US1] Enrich the Umrah from the booklet «صفة العمرة المصورة» (FR-024): extraction notes in `content/sources/`, missing points added in ar/en/ur with sources (draft), new step `umrah.ihram-rules`, differences left for the content reviewer; original SVG illustrations (miqat map, ihram dress, Tawaf route with the Hijr, Sa'i with the green markers, ihram prohibitions and permitted things) with reviewed labels (`diagramItems`); unit and e2e tests with axe

**Checkpoint**: MVP — the spec's SC-001 and SC-004 pass with draft content.

## Phase 5: User story 3 — Prepare for offline use (P1)

- [x] T025 [US3] `scripts/build-packs.ts` emits `public/packs/{lang}/{version}/` and a `manifest.json` with sizes
- [x] T026 [US3] `src/data/packs.ts`: download to Cache Storage (retry from the start for text packs; byte-range resume with audio, see plan), verify, then mark installed; request `navigator.storage.persist()`
- [x] T027 [US3] Download screen (the "Offline content" section of Settings): per-pack size, audio off by default, progress, cancel, errors
- [x] T028 [US3] "Ready offline" card on Home from installed pack metadata (language, size, version date)
- [x] T029 [US3] Online-only update check that never blocks the installed version
- [x] T030 [P] [US3] e2e: interrupted download is not marked ready; cleared storage prompts re-download

## Test site

- [x] T046 Publish `main` to GitHub Pages for testing on a phone; app works under a sub-path (relative manifest paths)

## Phase 6: User story 4 — Hajj by day (P2)

- [x] T031 [US4] Content for `hajj-tamattu`, `hajj-qiran`, `hajj-ifrad` by day (8–13 Dhu al-Hijjah), draft status; Hajj stages are a day or a named part (`kind`: Tamattu' Umrah, arrival, farewell)
- [x] T032 [US4] Day view grouping steps by stage; Tamattu' starts with the Umrah; Home's journey cards open the chosen journey (Hajj asks the type)
- [x] T033 [US4] Ruling notes for steps where schools differ (other schools as `otherSchools` notes; where Ibn Baz and Ibn Al-Uthaymeen differ on a detail, the details give both views)

## Phase 7: User story 5 — Supplications (P2)

- [ ] T034 [US5] `content/supplications.json` with Arabic, transliteration, translations, source, grading, specific-or-general flag
- [ ] T035 [US5] Supplications screen and per-step list; never label a general remembrance as specific to a step
- [ ] T036 [US5] Offline audio playback for downloaded audio

## Phase 8: User stories 6 and 7 — Map and search (P3)

- [ ] T037 [US6] Offline landmarks map from OpenStreetMap vector tiles with MapLibre GL JS, lazily loaded, with ODbL attribution
- [ ] T038 [P] [US7] Offline search over installed pack text in the current language

## Phase 8b: User story 8 — Live mode (P2)

- [x] T048 [US8] Live mode (FR-020–FR-023): opt-in toggle in the Guide, location watched on the device only while on and visible; bundled approximate geodata (`src/data/places-geo.ts`, OpenStreetMap, pending verification) and offline geofence matching with accuracy limits and most-specific match (`src/data/geofence.ts`); step suggestion by journey order and, for Hajj, today's Dhu al-Hijjah day (`src/data/live.ts`); live card with "seems to be in/near", boundary-sign note, "Go to this step" and the place visual; error states; ar/en/ur strings; unit tests (geofence, accuracy, suggestion, UI with mocked geolocation) and e2e with simulated location and axe

## Phase 9: Polish and release

- [ ] T039 Accessibility pass: 200% text, screen readers in all 3 languages, contrast audit of the palette
- [ ] T040 Size budget check in CI (P1 pack < 15 MB without audio)
- [ ] T041 Content review: reviewer approves each item; validator confirms 100% approved before release (SC-002)

## Phase 10: App stores

- [ ] T044 Wrap the PWA with Capacitor for iOS and Android; native file storage behind `src/data/packs.ts`
- [ ] T045 Store listings, icons and privacy labels (no data collected)

## Dependencies

- Phase 2 blocks all user stories. US2 and US1 can proceed in parallel after Phase 2; US3 depends on T017–T018 (content to pack).
- US4 and US5 reuse the Guide screen from US1.
- US8 (T048) reuses the Guide, the step places and `PlaceVisual` (T047); its geodata is verified before release with T037's OpenStreetMap data.
- T041 needs at least one holder of the content reviewer role (T043).
- T036 waits on the open audio clarification.
